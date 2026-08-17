import type { editor as EditorType, Uri } from 'monaco-editor'
import type { FileNode, FileStore } from '../types'
import { onUnmounted, watch } from 'vue'
import { isJsTsLanguage, isPythonLanguage, monaco, normalizeLanguageId } from '../utils/monaco'

/**
 * 判断是否需要预创建 Monaco model 的语言。
 * JS/TS 需要 model 才能被 Monaco TS worker 跨文件解析；
 * Python 需要 model 才能同步给 Pyright LSP worker。
 */
function shouldPreCreateModel(language: string): boolean {
  return isJsTsLanguage(language) || isPythonLanguage(language)
}

/**
 * 统一维护 JS/TS/Python 文件的 Monaco model 生命周期。
 *
 * - 初始化时预创建所有相关 model；
 * - 监听 store.files 变化，自动创建/更新/释放 model；
 * - 活动文件的内容由编辑器自身通过 onDidChangeModelContent 同步到 store，
 *   本 composable 跳过 activePath，避免 setValue 循环/光标重置。
 */
export function useMonacoModels(store: FileStore) {
  /** path -> model，仅追踪由本 composable 负责生命周期的 model */
  const models = new Map<string, EditorType.ITextModel>()

  /**
   * 获取 Monaco model 应使用的语言 id。
   * JS/TS 统一映射为 typescript，让 TS worker 管理所有文件，
   * 否则 JS worker 只同步 javascript model，无法解析跨文件的 TS 定义。
   */
  function getModelLanguage(file: FileNode): string {
    if (isJsTsLanguage(file.language))
      return 'typescript'
    return normalizeLanguageId(file.language)
  }

  /**
   * 获取或创建指定文件的 Monaco model。
   * 若全局已存在同 URI 的 model，则复用并纳入本地管理。
   */
  function ensureModel(file: FileNode): EditorType.ITextModel {
    const uri = monaco.Uri.file(file.path) as Uri

    const globalModel = monaco.editor.getModel(uri)
    if (globalModel) {
      if (!models.has(file.path)) {
        models.set(file.path, globalModel)
      }
      return globalModel
    }

    const managed = models.get(file.path)
    if (managed && !managed.isDisposed()) {
      return managed
    }

    const model = monaco.editor.createModel(
      file.content,
      getModelLanguage(file),
      uri,
    )
    models.set(file.path, model)
    return model
  }

  /**
   * 同步 model 语言与内容。
   * 仅在非活动文件或内容/语言确实变化时才 setValue/setModelLanguage，
   * 避免覆盖编辑器光标和撤销栈。
   */
  function syncModelContent(model: EditorType.ITextModel, file: FileNode) {
    const targetLanguage = getModelLanguage(file)
    if (model.getLanguageId() !== targetLanguage) {
      monaco.editor.setModelLanguage(model, targetLanguage)
    }

    if (file.path !== store.state.activePath && model.getValue() !== file.content) {
      model.setValue(file.content)
    }
  }

  /**
   * 释放指定路径的 model。
   * 若 model 仍被任意编辑器实例显示（包括本编辑器），则延迟释放。
   */
  function disposeModel(path: string) {
    const model = models.get(path)
    if (!model || model.isDisposed()) {
      models.delete(path)
      return
    }

    const stillAttached = monaco.editor.getEditors().some(e => e.getModel() === model)
    if (stillAttached) {
      return
    }

    model.dispose()
    models.delete(path)
  }

  const MODEL_SYNC_CHUNK_SIZE = 20
  let currentSyncGeneration = 0

  /**
   * 让出主线程。
   * Safari 不支持 requestIdleCallback，用 setTimeout(0) 兜底。
   */
  function yieldToMain(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0))
  }

  /**
   * 全量同步：根据当前 store.files 创建/更新/释放 JS/TS/Python model。
   * 活动/已打开文件优先立即创建，其余文件分块后台创建，避免阻塞 UI。
   */
  async function syncModels(files: FileNode[]) {
    const generation = ++currentSyncGeneration

    const priorityPaths = new Set(
      [store.state.activePath, ...store.state.openPaths].filter(Boolean) as string[],
    )

    const desiredPaths = new Set<string>()
    const priorityFiles: FileNode[] = []
    const restFiles: FileNode[] = []

    for (const file of files) {
      if (file.isDirectory || !shouldPreCreateModel(file.language))
        continue

      desiredPaths.add(file.path)

      if (priorityPaths.has(file.path))
        priorityFiles.push(file)
      else
        restFiles.push(file)
    }

    // 优先创建活动/已打开文件的 model
    for (const file of priorityFiles) {
      if (generation !== currentSyncGeneration)
        return

      const model = ensureModel(file)
      syncModelContent(model, file)
    }

    // 其余文件分块创建，每块之间让出主线程
    for (let i = 0; i < restFiles.length; i += MODEL_SYNC_CHUNK_SIZE) {
      if (generation !== currentSyncGeneration)
        return

      if (i > 0)
        await yieldToMain()

      const chunk = restFiles.slice(i, i + MODEL_SYNC_CHUNK_SIZE)
      for (const file of chunk) {
        const model = ensureModel(file)
        syncModelContent(model, file)
      }
    }

    // 释放不需要的 model
    if (generation !== currentSyncGeneration)
      return

    for (const path of Array.from(models.keys())) {
      if (!desiredPaths.has(path)) {
        disposeModel(path)
      }
    }
  }

  function disposeAll() {
    for (const path of Array.from(models.keys())) {
      disposeModel(path)
    }
  }

  /**
   * 开始监听 store.files 变化。
   * 调用方应在本编辑器 active-file 的 watcher 之后再调用 startWatching()，
   * 确保文件重命名/删除时先切走 editor model 再 dispose 旧 model。
   */
  function startWatching() {
    watch(
      () => store.state.files.map(f => ({
        path: f.path,
        language: f.language,
        isDirectory: f.isDirectory,
      })),
      () => syncModels(store.state.files),
      { immediate: true },
    )
  }

  onUnmounted(() => {
    disposeAll()
  })

  return {
    models,
    ensureModel,
    syncModels,
    disposeAll,
    startWatching,
  }
}
