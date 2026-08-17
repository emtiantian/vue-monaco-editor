import type { editor as EditorType, IDisposable } from 'monaco-editor'
import type * as monacoTypes from 'monaco-editor'
import type { UserFolder } from 'monaco-pyright-lsp/dist/message'
import { monaco } from '../utils/monaco'
import { MonacoPyrightProvider } from './pyright-lsp-provider'

let provider: MonacoPyrightProvider | null = null
/** 引用计数：多个编辑器实例共享全局 provider，归零时才真正销毁 worker */
let providerRefCount = 0
/** 进行中或已完成的初始化 promise，防止并发重复创建 Pyright provider */
let initPromise: Promise<void> | null = null
let globalModelListenersRegistered = false
/** 全局 model 监听 disposable，销毁时统一清理 */
let globalModelDisposables: IDisposable[] = []
const pythonModelDisposables = new Map<string, IDisposable>()
let initialUserFiles: Record<string, string> | undefined

/**
 * 全局初始化 Pyright Worker。
 * 整个应用生命周期只调用一次，注册 python 的 hover/completion/signature/rename/definition Provider。
 *
 * @param userFiles - 项目中的 Python 文件内容映射，path -> content
 */
export async function initPythonLsp(
  userFiles?: Record<string, string>,
): Promise<void> {
  providerRefCount++
  // 复用进行中或已完成的初始化，避免并发重复创建 Pyright provider
  if (initPromise)
    return initPromise

  initPromise = doInitPythonLsp(userFiles)
  return initPromise
}

async function doInitPythonLsp(
  userFiles?: Record<string, string>,
): Promise<void> {
  initialUserFiles = userFiles

  // worker 把 userFiles 固定写入 /typings 目录（createUserFiles("/typings", ...)），
  // 原路径 /skills/test.py 落在 /typings/skills/test.py。注入 userFiles 让 Pyright 文件系统
  // 拥有这些文件，再通过 extraPaths 指向 /typings 下的对应目录，使 from utils import
  // 等导入能解析到同目录模块，进而让跨文件类型检查（如 add("1","2") 类型不匹配）能报错。
  const nestedUserFiles = userFiles ? groupFilesByDirectory(userFiles) : undefined
  const extraPaths = computeExtraPaths(userFiles)

  // projectPath 用 '/tmp'：worker 的 /tmp 由 initFs 挂载为空 InMemory 目录，既存在
  // 又不含 typeshed-fallback（/typeshed-fallback）。若用 '/'，Pyright 会把整个 '/' 当
  // workspace 全量扫描 4457 个 typeshed 文件导致卡死；若用不存在的 '/skills' 同样卡死。
  // 用户文件不纳入 workspace 扫描，仅靠 extraPaths 参与 import 解析；文件内容同步仍由
  // syncAllPythonFilesToLsp 的 didOpen 负责，诊断回到 model 原始 uri（/skills/test.py）。
  provider = new MonacoPyrightProvider({
    projectPath: '/tmp',
    userFiles: nestedUserFiles,
    extraPaths,
    features: {
      hover: true,
      completion: true,
      signatureHelp: true,
      rename: true,
      findDefinition: true,
    },
  })

  try {
    await provider.init(monaco as unknown as typeof monacoTypes)
  }
  catch (err) {
    console.error('[PyrightLsp] init failed', err)
    provider = null
    initPromise = null
    // 回滚引用计数，避免反复失败导致计数泄漏、销毁时机错乱
    providerRefCount = Math.max(0, providerRefCount - 1)
    throw err
  }

  registerGlobalPythonModelListeners()
  await syncAllPythonFilesToLsp()
}

/**
 * 将初始化时传入的所有 Python 文件显式打开到 Pyright worker。
 *
 * 仅依赖 Monaco model 的 onDidCreateModel 监听器打开文件时，活动文件可能先于
 * 依赖文件（如 utils.py）被打开，导致 Pyright 首次解析 imports 失败、跨文件跳转
 * 返回 null。这里在 Provider 初始化完成后统一把所有项目文件 didOpen 一次，确保
 * 依赖文件已存在，随后 attachPythonLsp 再 touch 活动文件触发重新解析。
 */
async function syncAllPythonFilesToLsp() {
  if (!provider || !initialUserFiles)
    return

  for (const [path, content] of Object.entries(initialUserFiles)) {
    const uri = monaco.Uri.file(path).toString()
    await provider.lspClient.openDocument(uri, content)
  }
}

/**
 * 将扁平的 path -> content 映射按目录分组为嵌套对象，
 * 适配 monaco-pyright-lsp worker 的 createUserFiles 路径处理逻辑。
 *
 * @example
 *   groupFilesByDirectory({ '/skills/test.py': '...', '/skills/utils.py': '...' })
 *   // => { '/skills': { 'test.py': '...', 'utils.py': '...' } }
 */
function groupFilesByDirectory(files: Record<string, string>): UserFolder {
  const root: UserFolder = {}
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0)
      continue

    const dirParts = parts.slice(0, -1)
    const dirKey = dirParts.length > 0 ? `/${dirParts.join('/')}` : '/'
    const fileName = parts[parts.length - 1]

    if (!root[dirKey])
      root[dirKey] = {}

    const dir = root[dirKey] as UserFolder
    dir[fileName] = content
  }
  return root
}

/**
 * 计算用户文件在 worker 文件系统中的目录列表，用作 Pyright extraPaths。
 *
 * worker 把 userFiles 写入 /typings 前缀下，原路径 /skills/test.py 落在 /typings/skills/test.py。
 * Pyright 解析 from utils import 时会按 extraPaths 逐目录查找模块，因此需把每个用户文件
 * 所在目录（加 /typings 前缀）列入 extraPaths，使同目录/跨目录导入可解析。
 */
function computeExtraPaths(userFiles?: Record<string, string>): string[] {
  if (!userFiles)
    return []

  const dirs = new Set<string>()
  for (const path of Object.keys(userFiles)) {
    const parts = path.split('/').filter(Boolean)
    parts.pop() // 去掉文件名
    const dir = parts.length > 0 ? `/${parts.join('/')}` : '/'
    dirs.add(dir)
  }
  return Array.from(dirs).map(d => d === '/' ? '/typings' : `/typings${d}`)
}

/**
 * 注册全局 Monaco model 监听，把所有 Python model 同步给 Pyright worker。
 */
function registerGlobalPythonModelListeners() {
  if (globalModelListenersRegistered)
    return
  globalModelListenersRegistered = true

  // 同步已经存在的 Python model（例如 initPythonLsp 被延迟调用时）
  monaco.editor.getModels().forEach((model) => {
    if (model.getLanguageId() === 'python') {
      syncPythonModelToLsp(model)
    }
  })

  // 监听后续创建的 Python model
  globalModelDisposables.push(
    monaco.editor.onDidCreateModel((model) => {
      if (model.getLanguageId() === 'python') {
        syncPythonModelToLsp(model)
      }
    }),
  )

  // 监听即将释放的 Python model
  globalModelDisposables.push(
    monaco.editor.onWillDisposeModel((model) => {
      if (model.getLanguageId() === 'python') {
        unsyncPythonModelFromLsp(model)
      }
    }),
  )
}

/**
 * 将单个 Python model 打开给 Pyright，并监听其内容变化。
 */
function syncPythonModelToLsp(model: EditorType.ITextModel) {
  if (!provider)
    return

  const uri = model.uri.toString()

  // 避免重复绑定
  if (pythonModelDisposables.has(uri))
    return

  provider.lspClient.openDocument(uri, model.getValue())

  const disposable = model.onDidChangeContent((e) => {
    if (!provider)
      return
    // range-based 增量同步：用 e.changes 发增量 contentChanges（Monaco range 1-based -> LSP 0-based），
    // 避免大文件高频编辑时全量传输。doc.text 仍用全量 getValue 维护（见 changeDocumentWithChanges），
    // 保证短路比较准确；若增量 range 有误，后续请求前的全量 changeDocument 会纠正 worker 内文档。
    const changes = e.changes.map(c => ({
      range: {
        start: { line: c.range.startLineNumber - 1, character: c.range.startColumn - 1 },
        end: { line: c.range.endLineNumber - 1, character: c.range.endColumn - 1 },
      },
      text: c.text,
    }))
    provider.lspClient.changeDocumentWithChanges(uri, model.getValue(), changes)
  })

  pythonModelDisposables.set(uri, disposable)
}

/**
 * 从 Pyright 中关闭指定 Python model。
 */
function unsyncPythonModelFromLsp(model: EditorType.ITextModel) {
  if (!provider)
    return

  const uri = model.uri.toString()
  pythonModelDisposables.get(uri)?.dispose()
  pythonModelDisposables.delete(uri)

  provider.lspClient.closeDocument(uri)
}

/**
 * 将 LSP diagnostics 绑定到当前 editor 实例。
 * 当前实现下 diagnostics 回调已在 Provider init() 中全局注册，
 * 因此本函数仅做存在性检查，保留签名以兼容现有调用方。
 */
export function attachPythonLsp(editor: monacoTypes.editor.IStandaloneCodeEditor): void {
  if (!provider) {
    console.warn('[PyrightLsp] Provider not initialized')
    return
  }

  const model = editor.getModel()
  if (!model || model.getLanguageId() !== 'python')
    return

  const uri = model.uri.toString()
  const content = model.getValue()
  // 确保活动文件在 worker 中已 open（若已 open 则内部走 changeDocument 短路，基本 no-op）。
  // 依赖文件已由 syncAllPythonFilesToLsp（initPythonLsp 中 await）+ onDidCreateModel 同步，
  // import 解析无需 touchDocument 强制重触。
  provider.lspClient.openDocument(uri, content)
    .catch((err) => {
      console.error('[PyrightLsp] failed to open active python document', err)
    })
}

/**
 * 释放一次 Python LSP 引用。引用计数归零时才真正销毁 provider：terminate worker、
 * 清理全局 model 监听与文档同步状态，释放内存。
 *
 * 多个编辑器实例共享全局 provider，故用引用计数，只有最后一个实例卸载才销毁。
 * 销毁后状态全部重置，允许后续 initPythonLsp 重新初始化（qiankun 子应用重新挂载场景）。
 */
export function destroyPythonLsp(): void {
  providerRefCount = Math.max(0, providerRefCount - 1)
  if (providerRefCount > 0)
    return

  // 引用计数归零，真正销毁
  globalModelDisposables.forEach(d => d.dispose())
  globalModelDisposables = []
  globalModelListenersRegistered = false

  pythonModelDisposables.forEach(d => d.dispose())
  pythonModelDisposables.clear()

  provider?.lspClient.dispose()
  provider = null
  initPromise = null
  initialUserFiles = undefined
}

/** 指定 Monaco uri 是否已收到过 Pyright 诊断 */
export function hasReceivedDiagnostics(uri: string): boolean {
  return provider?.hasDiagnosticsFor(uri) ?? true
}

/**
 * 等待指定 Monaco uri 的首次 Pyright 诊断。
 * 已收到则立即 resolve(true)，否则等到收到（resolve(true)）或超时（resolve(false)）。
 */
export function waitForDiagnostics(uri: string, timeoutMs?: number): Promise<boolean> {
  if (!provider)
    return Promise.resolve(true)
  return provider.waitForDiagnostics(uri, timeoutMs)
}
