/**
 * vue-monaco-ide 插件入口
 *
 * 用法一（推荐，全局插件）：
 *   import VueMonacoEditor from 'vue-monaco-ide'
 *   import 'vue-monaco-ide/style.css'
 *   app.use(VueMonacoEditor, { workerUrls: { ... } })
 *
 * 用法二（直接使用组件）：
 *   import { VueMonacoEditor } from 'vue-monaco-ide'
 *   import 'vue-monaco-ide/style.css'
 */
import type { App, Plugin } from 'vue'
import type { ConfigureWorkersOptions } from './utils/monaco-environment'
import { markRaw } from 'vue'
import _WebCodeEditor from './web-code-editor.vue'
import { setLocale } from './i18n'
import { configureWorkers } from './utils/monaco-environment'
import './styles/index.css'

export * from './types'
export { setFeedbackProvider } from './feedback'
export type { FeedbackProvider, ConfirmOptions } from './feedback'
export { configureWorkers } from './utils/monaco-environment'
export type { ConfigureWorkersOptions, WorkerLabel, YamlSchemaOption } from './utils/monaco-environment'
export { setLocale, getLocale, setMessages, t } from './i18n'
export type { Locale, Messages } from './i18n'
// 工具函数公开：宿主可直接复用文件类型判定 / 路径处理 / 下载 / 语言映射
export { normalizeFileKind, getFileKindByFilename, looksLikeBinaryContent, resolveFileKind } from './utils/file-kind'
export { MAX_PATH_DEPTH, getPathDepth, getParentPath, buildPath, getExtension } from './utils/path'
export { downloadFile, downloadBase64File } from './utils/download'
export { MONACO_LANGUAGE_MAP, getLanguageByFilename } from './utils/language'
export { renderMarkdownToHtml } from './utils/markdown'
export { tryActivateYaml, setYamlActivator } from './utils/yaml-gate'

/** 对外主组件：完整的文件树 + 页签 + Monaco 编辑器工作台 */
export const VueMonacoEditor = markRaw(_WebCodeEditor)

/** 兼容旧命名 */
export const WebCodeEditor = VueMonacoEditor

export interface VueMonacoEditorPluginOptions {
  /**
   * Worker 配置。不传时默认通过 CDN（jsDelivr）按当前安装的
   * monaco-editor / monaco-pyright-lsp 版本加载 worker，开箱即用。
   */
  workers?: ConfigureWorkersOptions
  /** 注册到 app 上的组件名，默认 'VueMonacoEditor' */
  componentName?: string
  /** 内置 UI 文案语言，默认 'zh-CN'；支持 'zh-CN' / 'en-US'（或 'zh' / 'en' 简写） */
  locale?: 'zh-CN' | 'en-US' | 'zh' | 'en'
}

const VueMonacoEditorPlugin: Plugin<[VueMonacoEditorPluginOptions?]> = {
  install(app: App, options: VueMonacoEditorPluginOptions = {}) {
    if (options.workers) {
      configureWorkers(options.workers)
    }
    if (options.locale) {
      setLocale(options.locale)
    }
    app.component(options.componentName ?? 'VueMonacoEditor', VueMonacoEditor)
  },
}

export default VueMonacoEditorPlugin
