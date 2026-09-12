<script setup lang="ts">
import type { editor as EditorType, IDisposable, IPosition, IRange, Uri } from 'monaco-editor'
import type { FileNode, WebMonacoEditorEmits, WebMonacoEditorProps } from './types'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useFileStore, useMonacoModels } from './composables'
import EditorLoading from './editor-loading.vue'
import { t } from './i18n'
import { initializeWebCodeEditorThemes } from './themes'
import {
  clearPythonMarkers,
  configureTsDefaults,
  ensureLanguageLoaded,
  isJsTsLanguage,
  monaco,
  normalizeLanguageId,
  warmTsWorker,
} from './utils/monaco'
import { ensureMonacoEnvironment, getWorkerLabelForLanguage } from './utils/monaco-environment'
import { applyModelContentChanges } from './utils/text'
import { tryActivateYaml } from './utils/yaml-gate'

const props = withDefaults(defineProps<WebMonacoEditorProps>(), {
  theme: 'vs',
  loading: false,
})

const emit = defineEmits<WebMonacoEditorEmits>()

const store = useFileStore()
const { activeFile, updateContent } = store

// 尽早配置 TS/JS 语言服务默认值，确保后续创建的 model 都能被 worker 识别。
configureTsDefaults()

const editorContainer = ref<HTMLDivElement | null>(null)
let editor: EditorType.IStandaloneCodeEditor | null = null
let markerChangeDisposable: IDisposable | null = null
let editorOpenerDisposable: IDisposable | null = null
let pendingNavigation: { path: string, target: IRange | IPosition } | null = null
let modelSwitchGeneration = 0
let isFixingJsDiagnostics = false
/** 记录最近一次修正 JS/TS trailing marker 的 model 版本，避免同版本反复改写 */
let lastFixedMarkerVersion: { uri: string, versionId: number } | null = null
let currentEditorContent = ''

const isInitializing = ref(true)
const showLoading = computed(() => props.loading || isInitializing.value)
/**
 * Python LSP 首次分析中标记。
 *
 * initPythonLsp 完成仅代表 worker 就绪 + 文件已 didOpen，Pyright 仍需异步分析
 * （首次加载 typeshed、解析 imports）后才会推送诊断。期间在编辑器右下角显示轻量
 * 提示，收到首次诊断（或超时）后自动消失，不阻塞用户查看/编辑代码。
 */
const pythonLspAnalyzing = ref(false)
let isComponentMounted = false
let readyEmitted = false

const { ensureModel, startWatching } = useMonacoModels(store)

let pythonLspModule: typeof import('./webworker/python-lsp') | null = null
let pythonLspInitError: unknown = null
// 正在进行的 init promise，避免预加载与首次 attach 并发时重复创建 Pyright provider
let pythonLspPromise: Promise<typeof import('./webworker/python-lsp')> | null = null

/**
 * 按需初始化 Python LSP（Pyright）。
 * 仅在首次打开 Python 文件时动态加载 python-lsp。
 */

async function ensurePythonLsp() {
  if (pythonLspInitError)
    throw pythonLspInitError
  if (pythonLspModule)
    return pythonLspModule
  // 预加载（watch 触发）与首次打开 Python 文件（attach 触发）可能并发，
  // 复用同一 init promise，避免重复创建 Pyright provider
  if (pythonLspPromise)
    return pythonLspPromise

  pythonLspPromise = (async () => {
    const lspModule = await import('./webworker/python-lsp')

    // 收集当前所有 Python 文件
    const pythonFiles = store.state.files.filter(
      file => !file.isDirectory && normalizeLanguageId(file.language) === 'python',
    )

    // 把项目中的 Python 文件注入 Pyright 文件系统
    const userFiles: Record<string, string> = {}
    for (const file of pythonFiles) {
      userFiles[file.path] = file.content
    }

    try {
      await lspModule.initPythonLsp(userFiles)
      pythonLspModule = lspModule
      return pythonLspModule
    }
    catch (err) {
      pythonLspInitError = err
      throw err
    }
  })().finally(() => {
    pythonLspPromise = null
  })

  return pythonLspPromise
}

/**
 * 修正 Monaco TS worker 对未闭合括号等语法错误的 marker 位置。
 *
 * TS worker 常把缺少右括号这类错误报在文件末尾的 zero-width 位置，导致红色波浪线
 * 出现在最后一行而不是出错代码行。code-server / VS Code 的 typescript-language-features
 * 扩展会对 tsserver 返回的诊断做类似后处理；这里对 Monaco 内置 worker 做同样的修正。
 */
function fixTrailingJsDiagnostics(model: EditorType.ITextModel | null): boolean {
  if (!model || isFixingJsDiagnostics)
    return false

  const languageId = model.getLanguageId()
  if (languageId !== 'javascript' && languageId !== 'typescript')
    return false

  // 同一内容版本已修正过则跳过，避免与 TS worker 在同一版本上反复改写 marker 位置
  const modelUri = model.uri.toString()
  const modelVersion = model.getVersionId()
  if (
    lastFixedMarkerVersion?.uri === modelUri
    && lastFixedMarkerVersion.versionId === modelVersion
  ) {
    return false
  }

  const markers = monaco.editor.getModelMarkers({ resource: model.uri })
  const lineCount = model.getLineCount()

  // 按 owner 分组处理，避免误删或重复其他 owner 的 marker
  const markersByOwner: Record<string, typeof markers> = {}
  let hasChange = false

  for (const marker of markers) {
    const owner = marker.owner
    if (!markersByOwner[owner]) {
      markersByOwner[owner] = []
    }

    // 只处理 TS worker 产生的、落在文件末尾的 zero-width 错误 marker
    if (
      (owner === 'typescript' || owner === 'javascript')
      && marker.startLineNumber === marker.endLineNumber
      && marker.startColumn === marker.endColumn
      && marker.startLineNumber > 1
      && marker.startLineNumber >= lineCount
      && (String(marker.code) === '1005' || marker.message.includes('\')\' expected'))
    ) {
      const targetLine = marker.startLineNumber - 1
      const targetLineMaxColumn = model.getLineMaxColumn(targetLine)
      markersByOwner[owner].push({
        ...marker,
        startLineNumber: targetLine,
        startColumn: targetLineMaxColumn,
        endLineNumber: targetLine,
        endColumn: targetLineMaxColumn,
      })
      hasChange = true
    }
    else {
      markersByOwner[owner].push(marker)
    }
  }

  if (hasChange) {
    isFixingJsDiagnostics = true
    try {
      for (const [owner, ownerMarkers] of Object.entries(markersByOwner)) {
        monaco.editor.setModelMarkers(model, owner, ownerMarkers)
      }
      lastFixedMarkerVersion = { uri: modelUri, versionId: modelVersion }
    }
    finally {
      isFixingJsDiagnostics = false
    }
  }
  return hasChange
}

/**
 * 预加载 Python Pyright LSP。
 *
 * initPythonLsp 是一次性的：会用传入的 Python 文件快照建立 Pyright workspace，
 * 并预先打开所有依赖文件以支持跨文件 import 解析。但子组件 onMounted 早于父组件
 * store.initFiles 执行，若此时 init 会拿到空 store、用空 workspace 建立 provider，
 * 之后不再重试，导致 Python 跨文件补全/跳转永久失效。
 *
 * 因此 Python LSP 不阻塞编辑器显示：监听 store，一旦出现 Python 文件即后台 init，
 * 失败仅上报 worker-error。项目无 Python 文件时不触发，留待打开文件时按需 init。
 */
let pythonPreloadStarted = false
const stopPythonPreloadWatch = watch(
  () => store.state.files.some(
    f => !f.isDirectory && normalizeLanguageId(f.language) === 'python',
  ),
  (hasPython) => {
    if (!hasPython || pythonPreloadStarted)
      return
    pythonPreloadStarted = true
    ensurePythonLsp()
      .then(() => performance.mark('web-code-editor:python-lsp-ready'))
      .catch((err) => {
        if (!isComponentMounted)
          return
        console.error('[WebMonacoEditor] Python LSP preload failed', err)
        emit('worker-error', { type: 'python', error: err })
      })
  },
  { immediate: true },
)

function emitReady() {
  if (!isComponentMounted || readyEmitted)
    return
  readyEmitted = true
  performance.mark('web-code-editor:ready')
  const measure = performance.measure(
    'web-code-editor:init',
    'web-code-editor:mount-start',
    'web-code-editor:ready',
  )
  emit('ready', { elapsedMs: Math.round(measure.duration) })
}

/**
 * loading 消失后检测 Pyright 诊断是否已到达活动 Python model。
 * 未到达则显示"Python LSP 分析中"提示，收到诊断（或超时）后隐藏；
 * 已到达（如热启动）则不显示，避免闪烁与误提示。
 */
function maybeShowPythonLspAnalyzing() {
  const model = editor?.getModel()
  const langId = normalizeLanguageId(activeFile.value?.language ?? '')
  if (!model || langId !== 'python' || !pythonLspModule)
    return
  const uri = model.uri.toString()
  if (pythonLspModule.hasReceivedDiagnostics(uri))
    return
  pythonLspAnalyzing.value = true
  pythonLspModule.waitForDiagnostics(uri)
    .finally(() => {
      pythonLspAnalyzing.value = false
    })
}

onMounted(async () => {
  if (!editorContainer.value)
    return

  isComponentMounted = true
  performance.mark('web-code-editor:mount-start')

  try {
    await ensureMonacoEnvironment()
    performance.mark('web-code-editor:environment-ready')

    initializeWebCodeEditorThemes()

    editor = monaco.editor.create(editorContainer.value, {
      value: '',
      language: 'javascript',
      theme: props.theme,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      wordBasedSuggestions: 'currentDocument',
      // 建议配置：提升 IntelliSense 体验
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
    })
    performance.mark('web-code-editor:editor-created')

    // 注册跨文件 opener：当 goToDefinition / peek 等需要切换到其他 model 时，
    // Monaco 默认不会主动切换，需要自定义处理。
    editorOpenerDisposable = monaco.editor.registerEditorOpener({
      openCodeEditor: (_source, resource, selectionOrPosition) => {
        const targetModel = resource ? monaco.editor.getModel(resource) : null
        if (!targetModel || !editor)
          return false

        const targetPath = targetModel.uri.path
        const currentModel = editor.getModel()
        const currentPath = currentModel?.uri.path

        // 跨文件跳转：通知上层切换页签/activePath，由 store 切换后 watch 触发 updateEditorModel
        // 统一切换 model（不在此时同步 setModel，避免与 watch 的异步 setModel 产生时序冲突）。
        // definition 的 uri 已由 mapLspUriToMonacoUri 映射为 model 原始 uri，getModel 可直接命中。
        if (targetPath && targetPath !== currentPath && store.findNodeByPath(targetPath)) {
          pendingNavigation = selectionOrPosition ? { path: targetPath, target: selectionOrPosition } : null
          emit('open-file', targetPath)
          return true
        }

        // 同文件内跳转：直接切 model 并定位
        editor.setModel(targetModel)
        if (selectionOrPosition) {
          const range = 'startLineNumber' in selectionOrPosition
            ? (selectionOrPosition as IRange)
            : null
          const position = 'lineNumber' in selectionOrPosition
            ? (selectionOrPosition as IPosition)
            : null
          if (range) {
            editor.setSelection(range)
            editor.revealLineInCenter(range.startLineNumber)
          }
          else if (position) {
            editor.setPosition(position)
            editor.revealLineInCenter(position.lineNumber)
          }
        }
        return true
      },
    })

    editor.onDidChangeModelContent((e) => {
      if (!activeFile.value || !editor)
        return

      // 增量同步：用 e.changes 计算新内容，避免每次 getValue() 全量取文本
      currentEditorContent = applyModelContentChanges(currentEditorContent, e.changes)
      updateContent(activeFile.value.path, currentEditorContent)
      // 直接在内容变化源头 emit（等长替换如 x->y 同样触发；web-code-editor 侧按 path 去重）
      emit('change', {
        path: activeFile.value.path,
        content: currentEditorContent,
        name: activeFile.value.name,
        isDirty: currentEditorContent !== activeFile.value.originalContent,
      })
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      emit('save')
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
      emit('save-all')
    })

    // 监听 JS/TS diagnostics 变化，修正 TS worker 落在文件末尾的 zero-width marker
    markerChangeDisposable = monaco.editor.onDidChangeMarkers(() => {
      fixTrailingJsDiagnostics(editor?.getModel() ?? null)
    })

    await updateEditorModel()
    isInitializing.value = false
    emitReady()
    // loading 消失后，若 Pyright 诊断尚未到达活动 Python model，显示轻量"分析中"提示
    maybeShowPythonLspAnalyzing()
  }
  catch (err) {
    console.error('[WebMonacoEditor] initialization failed', err)
    isInitializing.value = false
  }
})

onUnmounted(() => {
  isComponentMounted = false
  modelSwitchGeneration++
  pendingNavigation = null

  stopPythonPreloadWatch?.()

  // 释放 Python LSP 引用（引用计数，归零才真正 terminate worker）
  if (pythonLspModule) {
    pythonLspModule.destroyPythonLsp()
    pythonLspModule = null
  }

  markerChangeDisposable?.dispose()
  markerChangeDisposable = null

  editorOpenerDisposable?.dispose()
  editorOpenerDisposable = null

  if (editor) {
    clearPythonMarkers(editor.getModel())
    editor.dispose()
  }
  editor = null
})

watch(
  () => props.theme,
  (newTheme) => {
    monaco.editor.setTheme(newTheme)
  },
)

watch(
  () => activeFile.value?.path,
  () => {
    updateEditorModel()
  },
)

// 当外部（如 props.files 重置）修改了当前活动文件内容时，同步回 model
watch(
  () => activeFile.value?.content,
  (newContent) => {
    const model = editor?.getModel()
    if (!model || newContent === undefined)
      return
    // 若内容变化来自编辑器自身，则跳过，避免光标跳动和撤销栈污染
    if (newContent === currentEditorContent)
      return
    currentEditorContent = newContent
    if (model.getValue() !== newContent) {
      model.setValue(newContent)
    }
  },
)

// 必须在 active-file path watcher 之后启动，保证重命名/删除时 editor 先切走再 dispose 旧 model
startWatching()

async function resolveModelForFile(file: FileNode): Promise<EditorType.ITextModel> {
  const langId = normalizeLanguageId(file.language)

  // 按需加载语言高亮
  await ensureLanguageLoaded(langId)

  // 对于需要独立 worker 的语言（json/css/html），先确保 worker URL 已解析，
  // 避免 Monaco 调用 getWorker 时 URL 还没准备好。
  const workerLabel = getWorkerLabelForLanguage(langId)
  if (workerLabel) {
    await ensureMonacoEnvironment({ labels: [workerLabel] })
  }

  if (isJsTsLanguage(file.language)) {
    // JS/TS：使用预创建/同步的 model，让 TS worker 能跨文件解析
    const model = ensureModel(file)
    // 确保 TS worker URL 已解析（通常 setup 时已完成）
    await ensureMonacoEnvironment({ labels: ['typescript'] })
    return model
  }

  // Python / JSON / 其他语言：保持原有按需创建逻辑
  const uri = monaco.Uri.file(file.path) as Uri
  let model = monaco.editor.getModel(uri)
  if (!model) {
    model = monaco.editor.createModel(
      file.content,
      file.language,
      uri,
    )
  }
  return model
}

function syncModelContent(model: EditorType.ITextModel, content: string) {
  if (model.getValue() !== content) {
    model.setValue(content)
  }
}

async function attachLanguageSupport(file: FileNode, model: EditorType.ITextModel) {
  const langId = normalizeLanguageId(file.language)

  if (langId === 'python') {
    if (!editor)
      return
    try {
      const lsp = await ensurePythonLsp()
      lsp.attachPythonLsp(editor)
    }
    catch (err) {
      console.error('[WebMonacoEditor] attach Python LSP failed', err)
    }
  }
  else if (isJsTsLanguage(file.language)) {
    // 异步预热 TS worker，不阻塞编辑器显示
    warmTsWorker(model).then(() => {
      performance.mark('web-code-editor:ts-worker-ready')
      performance.measure(
        'web-code-editor:time-to-ts-intellisense',
        'web-code-editor:mount-start',
        'web-code-editor:ts-worker-ready',
      )
    })
  }
  else if (langId === 'yaml') {
    // fire-and-forget：monaco-yaml 为可选 peer（需引入子入口 vue-monaco-ide/yaml），
    // 未引入/失败时返回 false，yaml 仍保留 Monaco 内置基础高亮
    void tryActivateYaml()
  }
}

async function updateEditorModel() {
  const generation = ++modelSwitchGeneration
  if (!editor)
    return

  const file = activeFile.value
  if (pendingNavigation && pendingNavigation.path !== file?.path)
    pendingNavigation = null
  if (!file) {
    editor.setModel(null)
    return
  }

  // 非文本文件（图片/PDF/二进制）不进 Monaco，置空 model，由外层渲染分支展示预览/占位
  if (file.fileKind && file.fileKind !== 'text') {
    editor.setModel(null)
    return
  }

  // 切换文件时重置增量同步的镜像内容
  currentEditorContent = file.content

  const model = await resolveModelForFile(file)
  if (!editor || generation !== modelSwitchGeneration || activeFile.value !== file)
    return

  // 切到新 model 时，确保内容等于 store 中的最新值
  syncModelContent(model, file.content)
  currentEditorContent = file.content

  editor.setModel(model)
  if (pendingNavigation?.path === file.path) {
    const { target } = pendingNavigation
    pendingNavigation = null
    if ('startLineNumber' in target) {
      editor.setSelection(target)
      editor.revealRangeInCenter(target)
    }
    else {
      editor.setPosition(target)
      editor.revealPositionInCenter(target)
    }
  }

  // 按需初始化语言服务、补全与语义高亮
  await attachLanguageSupport(file, model)
  if (!editor || generation !== modelSwitchGeneration)
    return

  // 修正 JS/TS 文件末尾的 zero-width 错误 marker
  setTimeout(() => {
    if (!editor)
      return
    fixTrailingJsDiagnostics(editor.getModel())
  }, 0)

  editor.focus()
}
</script>

<template>
  <div class="vme-monaco">
    <div ref="editorContainer" class="vme-monaco__container" />
    <EditorLoading v-if="showLoading" />
    <div v-if="pythonLspAnalyzing" class="vme-monaco__lsp-hint">
      <span class="vme-monaco__lsp-spinner" />
      <span>{{ t('pythonLspAnalyzing') }}</span>
    </div>
  </div>
</template>

<style scoped>
.vme-monaco {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.vme-monaco__container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.vme-monaco__lsp-hint {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--vme-border, #e4e7ed);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  color: #666;
  font-size: 12px;
  pointer-events: none;
  user-select: none;
}

.vme-monaco__lsp-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #dcdfe6;
  border-top-color: var(--vme-primary, #409eff);
  border-radius: 50%;
  animation: vme-rotate 0.8s linear infinite;
}
</style>
