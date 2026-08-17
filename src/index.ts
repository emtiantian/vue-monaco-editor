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
import { configureWorkers } from './utils/monaco-environment'
import './styles/index.css'

export * from './types'
export { setFeedbackProvider } from './feedback'
export type { FeedbackProvider, ConfirmOptions } from './feedback'
export { configureWorkers } from './utils/monaco-environment'
export type { ConfigureWorkersOptions, WorkerLabel } from './utils/monaco-environment'

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
}

const VueMonacoEditorPlugin: Plugin<[VueMonacoEditorPluginOptions?]> = {
  install(app: App, options: VueMonacoEditorPluginOptions = {}) {
    if (options.workers) {
      configureWorkers(options.workers)
    }
    app.component(options.componentName ?? 'VueMonacoEditor', VueMonacoEditor)
  },
}

export default VueMonacoEditorPlugin
