<script setup lang="ts">
import type { WebCodeEditorEmits, WebCodeEditorProps } from './types'
import { computed, onMounted, onUnmounted, ref, useSlots, watch } from 'vue'
import { createFileStore, provideFileStore } from './composables'
import FileTree from './file-tree.vue'
import { IconDocument, IconEditPen, IconView } from './icons'
import TabBar from './tab-bar.vue'
import WebMonacoEditor from './web-monaco-editor.vue'

const props = withDefaults(defineProps<WebCodeEditorProps>(), {
  files: () => [],
  defaultExpandedPaths: () => [],
  defaultOpenPath: null,
  theme: 'vs',
  loading: false,
  saveTime: null,
  publishText: '发布',
})

const emit = defineEmits<WebCodeEditorEmits>()

const store = createFileStore()
provideFileStore(store)

const { state, activeFile, saveFile, saveAll, openFile, closeFile, toggleExpanded } = store

const slots = useSlots()

// Markdown 文件预览/编辑模式状态，按文件路径记忆。
// 仅当使用方提供了 #preview 插槽时才展示预览/编辑切换。
const previewPaths = ref(new Set<string>())

const isMarkdownActive = computed(() => activeFile.value?.language === 'markdown')
const hasPreviewSlot = computed(() => Boolean(slots.preview))

const isPreviewMode = computed(() => {
  const path = activeFile.value?.path
  return path ? previewPaths.value.has(path) : false
})

// 上次保存时间：由 saveTime prop 提供初始值，每次保存时更新为当前时间，下传给 TabBar 展示草稿状态
const lastSaveTime = ref<string | null>(props.saveTime)
watch(() => props.saveTime, v => lastSaveTime.value = v)

function formatHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function setPreviewMode(preview: boolean) {
  const path = activeFile.value?.path
  if (!path)
    return
  if (preview) {
    previewPaths.value.add(path)
  }
  else {
    previewPaths.value.delete(path)
  }
}

function handleSave() {
  if (activeFile.value) {
    saveFile(activeFile.value.path)
    lastSaveTime.value = formatHHMM(new Date())
    emit('save', {
      path: activeFile.value.path,
      content: activeFile.value.content,
      name: activeFile.value.name,
    })
  }
}

function handleSaveAll() {
  const changedFiles = state.files
    .filter(f => f.content !== f.originalContent)
    .map(f => ({ path: f.path, content: f.content, name: f.name }))
  saveAll()
  if (changedFiles.length)
    lastSaveTime.value = formatHHMM(new Date())
  emit('save-all', changedFiles)
}

// 监听内容变化并向外 emit
watch(
  () =>
    state.files
      .map(f => `${f.path}:${f.content.length}:${f.content === f.originalContent}`)
      .join('|'),
  () => {
    const file = activeFile.value
    if (!file)
      return
    emit('change', {
      path: file.path,
      content: file.content,
      name: file.name,
      isDirty: file.content !== file.originalContent,
    })
  },
)

onMounted(() => {
  store.initFiles(props.files)
  props.defaultExpandedPaths.forEach(toggleExpanded)
  if (props.defaultOpenPath) {
    openFile(props.defaultOpenPath)
  }
})

onUnmounted(() => {
  // 清理工作由子组件各自负责
})

// 当外部 files prop 变化时重新初始化
watch(
  () => props.files,
  (newFiles) => {
    store.initFiles(newFiles)
  },
)

// 暴露给父组件的方法
defineExpose({
  /** 保存当前活动文件 */
  save: handleSave,
  /** 保存全部文件 */
  saveAll: handleSaveAll,
  /** 打开指定路径文件 */
  openFile,
  /** 关闭指定路径文件 */
  closeFile,
  /** 获取当前活动文件 */
  getActiveFile: () => activeFile.value,
  /** 获取当前所有文件（含未保存内容） */
  getFiles: () =>
    state.files.map(f => ({
      path: f.path,
      name: f.name,
      content: f.content,
      language: f.language,
    })),
})
</script>

<template>
  <div class="vme-workbench">
    <FileTree @refresh="emit('refresh')" />
    <div class="vme-workbench__main">
      <div class="vme-workbench__toolbar">
        <div class="vme-workbench__tabs">
          <TabBar :save-time="lastSaveTime" :publish-text="publishText" @publish="emit('publish')" />
        </div>
      </div>
      <div v-if="activeFile" class="vme-workbench__status">
        <div class="vme-workbench__filename">
          <span class="vme-workbench__filename-text">{{ activeFile.name }}</span>
          <span class="vme-workbench__separator">·</span>
          <span
            class="vme-workbench__save-state"
            :class="activeFile.content === activeFile.originalContent ? 'is-saved' : 'is-dirty'"
          >
            <span class="vme-workbench__save-dot" />
            {{ activeFile.content === activeFile.originalContent ? '已保存' : '未保存' }}
          </span>
        </div>
        <div v-if="isMarkdownActive && hasPreviewSlot" class="vme-mode-toggle">
          <button
            type="button"
            class="vme-mode-toggle__btn"
            :class="{ 'is-active': isPreviewMode }"
            title="预览"
            @click="setPreviewMode(true)"
          >
            <IconView :size="14" />
          </button>
          <button
            type="button"
            class="vme-mode-toggle__btn"
            :class="{ 'is-active': !isPreviewMode }"
            title="编辑"
            @click="setPreviewMode(false)"
          >
            <IconEditPen :size="14" />
          </button>
        </div>
      </div>
      <div class="vme-workbench__content">
        <div v-if="!activeFile" class="vme-workbench__empty">
          <IconDocument :size="48" class="vme-workbench__empty-icon" />
          <span class="vme-workbench__empty-text">选择文件进行编辑</span>
        </div>
        <WebMonacoEditor
          v-show="activeFile && !isPreviewMode"
          :theme="theme"
          :loading="loading"
          @save="handleSave"
          @save-all="handleSaveAll"
          @open-file="openFile"
          @ready="emit('ready', $event)"
          @worker-error="emit('worker-error', $event)"
        />
        <!-- Markdown 预览：由使用方通过 #preview 插槽注入渲染器（如 md-editor-v3 / markdown-it） -->
        <div v-show="activeFile && isPreviewMode" class="vme-workbench__preview">
          <slot
            name="preview"
            :file="activeFile"
            :content="activeFile?.content ?? ''"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vme-workbench {
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--vme-bg, #fff);
  color: var(--vme-text, #333);
  overflow: hidden;
}

.vme-workbench__main {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: var(--vme-bg, #fff);
}

.vme-workbench__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  background: var(--vme-bg-deep, #fafafa);
  border-bottom: 1px solid var(--vme-border, #e8e8e8);
  flex-shrink: 0;
}

.vme-workbench__tabs {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.vme-workbench__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 16px;
  background: var(--vme-bg, #fff);
  border-bottom: 1px solid var(--vme-border-light, #f0f0f0);
  flex-shrink: 0;
}

.vme-workbench__filename {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--vme-text, #333);
}

.vme-workbench__filename-text {
  font-weight: 600;
}

.vme-workbench__separator {
  color: #bfbfbf;
}

.vme-workbench__save-state {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.vme-workbench__save-state.is-saved {
  color: var(--vme-success, #52c41a);
}

.vme-workbench__save-state.is-dirty {
  color: var(--vme-warning, #fa8c16);
}

.vme-workbench__save-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.vme-mode-toggle {
  display: flex;
  align-items: center;
  padding: 2px;
  background: var(--vme-bg-deep, #f5f5f5);
  border: 1px solid var(--vme-border, #d9d9d9);
  border-radius: 4px;
}

.vme-mode-toggle__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  background: transparent;
  transition: all 0.15s;
}

.vme-mode-toggle__btn:hover {
  color: var(--vme-primary, #1677ff);
}

.vme-mode-toggle__btn.is-active {
  color: var(--vme-primary, #1677ff);
  background: var(--vme-bg, #fff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.vme-workbench__content {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: var(--vme-bg, #fff);
}

.vme-workbench__empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #bfbfbf;
  user-select: none;
}

.vme-workbench__empty-icon {
  font-size: 48px;
}

.vme-workbench__empty-text {
  font-size: 14px;
}

.vme-workbench__preview {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: var(--vme-bg, #fff);
}
</style>
