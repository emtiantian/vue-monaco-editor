/**
 * Monaco / Pyright Worker 环境配置。
 *
 * 设计目标：作为 npm 库发布后不依赖任何构建器专有语法（如 Vite 的 `?url` 导入），
 * 默认通过 CDN（jsDelivr）按当前安装的 monaco-editor / monaco-pyright-lsp 版本加载
 * worker，开箱即用；宿主应用可通过 `configureWorkers` 传入自有 worker URL（本地构建
 * 产物或私有 CDN），或完全接管 `getWorker`。
 *
 * 跨域 worker（CDN 与页面不同源）通过 createCrossOriginWorker 以 blob URL 中转加载。
 */
import monacoEditorPkg from 'monaco-editor/package.json'
import monacoPyrightPkg from 'monaco-pyright-lsp/package.json'
import { createCrossOriginWorker } from './create-cross-origin-worker'

declare global {
  // Monaco ESM worker 通过该全局变量解析模块根目录
  var _VSCODE_FILE_ROOT: string | undefined
}

export type WorkerLabel = 'editor' | 'json' | 'css' | 'html' | 'typescript' | 'javascript' | 'yaml'

/** 各 worker 的默认 CDN 路径（按已安装版本 pin） */
const MONACO_CDN_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${(monacoEditorPkg as { version: string }).version}`
const PYRIGHT_CDN_BASE = `https://cdn.jsdelivr.net/npm/monaco-pyright-lsp@${(monacoPyrightPkg as { version: string }).version}`

/**
 * yaml worker 默认地址（jsDelivr /+esm 打包端点）。
 *
 * monaco-yaml 是可选 peer，不能读取安装包版本号，这里硬编码 pin；
 * npm 包内的 yaml.worker.js 含裸模块导入不能直指，必须走 /+esm 打包端点。
 */
const YAML_WORKER_DEFAULT_URL = 'https://cdn.jsdelivr.net/npm/monaco-yaml@5.4.0/yaml.worker.js/+esm'

/** 完整 URL 形式（yaml 不在 monaco-editor 包内，统一存全量地址） */
const DEFAULT_WORKER_URLS: Record<WorkerLabel, string> = {
  editor: `${MONACO_CDN_BASE}/esm/vs/editor/editor.worker.js`,
  json: `${MONACO_CDN_BASE}/esm/vs/language/json/json.worker.js`,
  css: `${MONACO_CDN_BASE}/esm/vs/language/css/css.worker.js`,
  html: `${MONACO_CDN_BASE}/esm/vs/language/html/html.worker.js`,
  typescript: `${MONACO_CDN_BASE}/esm/vs/language/typescript/ts.worker.js`,
  javascript: `${MONACO_CDN_BASE}/esm/vs/language/typescript/ts.worker.js`,
  yaml: YAML_WORKER_DEFAULT_URL,
}

const LANGUAGE_WORKER_LABELS: Record<string, WorkerLabel> = {
  json: 'json',
  css: 'css',
  scss: 'css',
  less: 'css',
  html: 'html',
  handlebars: 'html',
  yaml: 'yaml',
}

/** JSON Schema 关联配置（与 monaco-yaml 的 Options['schemas'] 结构一致，避免依赖其类型） */
export interface YamlSchemaOption {
  fileMatch?: string[]
  uri?: string
  schema?: Record<string, unknown>
}

/** configureWorkers 的可选配置 */
export interface ConfigureWorkersOptions {
  /**
   * 自定义 worker URL。key 为 worker 标签（editor/json/css/html/typescript），
   * 值为脚本 URL（本地构建产物或私有 CDN）。
   * 传入 `false` 可禁用某种语言的专属 worker（回退 editor worker）。
   */
  workerUrls?: Partial<Record<WorkerLabel, string | false>>
  /** Pyright LSP worker 脚本 URL（monaco-pyright-lsp/dist/worker.js） */
  pyrightWorkerUrl?: string
  /**
   * yaml worker 脚本 URL（默认 jsDelivr /+esm 端点，见 YAML_WORKER_DEFAULT_URL）。
   * 传入 `false` 禁用 yaml 专属 worker（回退 editor worker，仅保留基础高亮）。
   * 需配合子入口 `vue-monaco-ide/yaml` 使用；未引入子入口时本项不生效。
   */
  yamlWorkerUrl?: string | false
  /** yaml 关联 JSON Schema（传入 monaco-yaml 的 schemas 配置） */
  yamlSchemas?: YamlSchemaOption[]
  /**
   * 完全接管 Monaco worker 的创建（等价于直接设置 self.MonacoEnvironment.getWorker）。
   * 适合使用 Vite `?worker` 导入的宿主应用。
   */
  getWorker?: (label: string) => Worker
}

const workerUrls: Partial<Record<WorkerLabel, string>> = {}
const disabledLabels = new Set<WorkerLabel>()
let customGetWorker: ((label: string) => Worker) | null = null
let configured = false
const yamlSchemas: YamlSchemaOption[] = []

function canonicalLabel(label: string): WorkerLabel {
  if (label === 'javascript')
    return 'typescript'
  if (label in DEFAULT_WORKER_URLS)
    return label as WorkerLabel
  return 'editor'
}

export function getWorkerLabelForLanguage(language: string): WorkerLabel | null {
  return LANGUAGE_WORKER_LABELS[language] || null
}

/**
 * 配置 worker URL / 自定义 worker 工厂。
 * 应在创建编辑器组件之前调用（如 app.use 插件时传入）。
 */
export function configureWorkers(options: ConfigureWorkersOptions): void {
  for (const [label, url] of Object.entries(options.workerUrls ?? {})) {
    if (url === false) {
      disabledLabels.add(canonicalLabel(label))
    }
    else if (url) {
      workerUrls[canonicalLabel(label)] = url
    }
  }
  if (options.pyrightWorkerUrl) {
    pyrightWorkerUrl = options.pyrightWorkerUrl
  }
  if (options.yamlWorkerUrl === false) {
    disabledLabels.add('yaml')
  }
  else if (options.yamlWorkerUrl) {
    workerUrls.yaml = options.yamlWorkerUrl
  }
  if (options.yamlSchemas) {
    yamlSchemas.push(...options.yamlSchemas)
  }
  if (options.getWorker) {
    customGetWorker = options.getWorker
  }
}

/** 获取 configureWorkers 配置的 yaml schemas（供子入口 subsets/yaml 使用） */
export function getYamlSchemas(): readonly YamlSchemaOption[] {
  return yamlSchemas
}

/** Pyright LSP worker 脚本 URL（可被 configureWorkers 覆盖，默认 CDN） */
let pyrightWorkerUrl: string = `${PYRIGHT_CDN_BASE}/dist/worker.js`

export function getPyrightWorkerUrl(): string {
  return pyrightWorkerUrl
}

function resolveWorkerUrl(label: WorkerLabel): string {
  const target = canonicalLabel(label)
  const custom = workerUrls[target]
  if (custom)
    return custom
  return DEFAULT_WORKER_URLS[target]
}

/**
 * 幂等地配置 Monaco Worker 环境。
 * 首次调用时只等待 editor + typescript worker，让编辑器尽快创建；
 * 其余 worker URL 按需解析。
 */
export async function ensureMonacoEnvironment(options: { labels?: string[] } = {}): Promise<void> {
  if (customGetWorker) {
    self.MonacoEnvironment = { getWorker: customGetWorker }
    configured = true
    return
  }

  // 宿主（或页面上另一份 monaco 使用方）已配置过 getWorker 时让宿主优先，
  // 避免覆写后破坏宿主自身的 worker 解析。
  const existingGetWorker = self.MonacoEnvironment?.getWorker
  if (existingGetWorker) {
    configured = true
    console.warn(
      '[vue-monaco-ide] self.MonacoEnvironment.getWorker 已被宿主配置，组件沿用宿主 worker 工厂；'
      + '如需本库的 CDN worker 方案，请勿提前设置 getWorker 或改用 configureWorkers({ getWorker })',
    )
    return
  }

  if (!configured) {
    configured = true

    // Monaco ESM 构建在 worker 内通过 FileAccess.asBrowserUri 解析模块时，
    // 需要 globalThis._VSCODE_FILE_ROOT 来替代 AMD 的 require.toUrl。
    const monacoRootUrl = getMonacoRootUrl(resolveWorkerUrl('editor'))
    globalThis._VSCODE_FILE_ROOT = monacoRootUrl

    const workerGlobalSetup = `globalThis._VSCODE_FILE_ROOT = ${JSON.stringify(monacoRootUrl)};`

    self.MonacoEnvironment = {
      getWorker(_, label) {
        const target = canonicalLabel(label)
        if (disabledLabels.has(target)) {
          // 已禁用的语言 worker 回退到 editor worker（仅失去语法服务，高亮不受影响）
          return createCrossOriginWorker(resolveWorkerUrl('editor'), {
            type: 'module',
            name: label,
            workerGlobalSetup,
          })
        }
        return createCrossOriginWorker(resolveWorkerUrl(target), {
          type: 'module',
          name: label,
          workerGlobalSetup,
        })
      },
    }
  }

  // 按需解析特定语言的 worker（目前 URL 是同步生成的，这里保留接口以兼容未来的异步解析）
  void options.labels
}

/**
 * 从 Monaco worker URL 推导 ESM 模块根目录。
 *
 * 支持 node_modules 路径（/monaco-editor/esm/）与 CDN 路径（/monaco-editor@x.y.z/esm/）。
 * 生产构建后 worker 可能被打包，此时回退到 worker 脚本所在目录，避免 FileAccess 直接崩溃。
 */
function getMonacoRootUrl(workerUrl: string): string {
  const url = new URL(workerUrl, import.meta.url)
  const monacoMatch = url.pathname.match(/(.*\/monaco-editor(?:@[^/]+)?\/esm\/)/)
  if (monacoMatch) {
    return `${url.origin}${monacoMatch[1]}`
  }
  return new URL('.', url).href
}
