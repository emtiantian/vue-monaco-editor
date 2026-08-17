<script setup lang="ts">
import { computed } from 'vue'
import { useContextMenu } from './composables/use-context-menu'
import { useFileStore } from './composables/use-file-store'
import ContextMenu from './context-menu.vue'
import CreateNodeInput from './create-node-input.vue'
import { IconFolderAdd, IconPlus, IconRefresh } from './icons'
import SearchInput from './search-input.vue'
import TreeNode from './tree-node.vue'
import { getParentPath } from './utils/path'

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const {
  filteredTree,
  state,
  startCreate,
  cancelCreate,
  createNode,
  findNodeByPath,
  moveNode,
  setDragSource,
  getSelectedFolderPath,
} = useFileStore()

const isCreatingAtRootLevel = computed(() => {
  if (!state.creatingInPath)
    return false
  return !findNodeByPath(state.creatingInPath)
})

const { visible: contextMenuVisible, x: contextMenuX, y: contextMenuY, open: openContextMenu, close: closeContextMenu }
  = useContextMenu()

function handleNewFile() {
  startCreate(getSelectedFolderPath(), false)
}

function handleNewFolder() {
  startCreate(getSelectedFolderPath(), true)
}

function handleNewFileFromContext() {
  handleNewFile()
  closeContextMenu()
}

function handleNewFolderFromContext() {
  handleNewFolder()
  closeContextMenu()
}

function handleCreateConfirm(name: string) {
  createNode(name)
}

function onDragOverRoot(e: DragEvent) {
  if (!state.dragSourcePath)
    return
  // 源已在根目录，无需移动
  if (getParentPath(state.dragSourcePath) === '/')
    return
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

function onDropRoot(e: DragEvent) {
  e.preventDefault()
  const source = state.dragSourcePath
  if (!source)
    return
  moveNode(source, '/')
  setDragSource(null)
}

const contextMenuItems = [
  { label: '新建文件', action: handleNewFileFromContext },
  { label: '新建文件夹', action: handleNewFolderFromContext },
]
</script>

<template>
  <div class="vme-file-tree">
    <div class="vme-file-tree__header">
      <span class="vme-file-tree__title">文件</span>
      <div class="vme-file-tree__actions">
        <button class="vme-icon-btn" title="新建文件" @click="handleNewFile">
          <IconPlus :size="16" />
        </button>
        <button class="vme-icon-btn" title="新建文件夹" @click="handleNewFolder">
          <IconFolderAdd :size="16" />
        </button>
        <button class="vme-icon-btn" title="刷新" @click="emit('refresh')">
          <IconRefresh :size="16" />
        </button>
      </div>
    </div>
    <div class="vme-file-tree__search">
      <SearchInput v-model="state.searchQuery" />
    </div>
    <div class="vme-file-tree__body" @contextmenu="openContextMenu" @dragover="onDragOverRoot" @drop="onDropRoot">
      <CreateNodeInput
        v-if="isCreatingAtRootLevel"
        :is-directory="state.creatingIsDirectory"
        :depth="0"
        @confirm="handleCreateConfirm"
        @cancel="cancelCreate"
      />
      <ul v-if="filteredTree.length > 0" class="vme-file-tree__list">
        <TreeNode v-for="node in filteredTree" :key="node.path" :node="node" :depth="0" />
      </ul>
      <div v-else-if="!isCreatingAtRootLevel" class="vme-file-tree__empty">
        无匹配文件
      </div>
    </div>

    <ContextMenu
      v-if="contextMenuVisible"
      :items="contextMenuItems"
      :x="contextMenuX"
      :y="contextMenuY"
      @close="closeContextMenu"
    />
  </div>
</template>

<style scoped>
.vme-file-tree {
  display: flex;
  flex-direction: column;
  width: 260px;
  height: 100%;
  background: var(--vme-bg, #fff);
  color: var(--vme-text, #333);
  border-right: 1px solid var(--vme-border, #e8e8e8);
  flex-shrink: 0;
}

.vme-file-tree__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid var(--vme-border-light, #f0f0f0);
  flex-shrink: 0;
}

.vme-file-tree__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vme-text-strong, #1f1f1f);
}

.vme-file-tree__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.vme-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--vme-text-strong, #1f1f1f);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
}

.vme-icon-btn:hover {
  color: var(--vme-accent, #5b3ff0);
  background: var(--vme-accent-bg, #f5f2ff);
}

.vme-file-tree__search {
  padding: 16px 20px;
  flex-shrink: 0;
}

.vme-file-tree__body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.vme-file-tree__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.vme-file-tree__empty {
  padding: 12px 16px;
  font-size: 12px;
  color: #999;
}
</style>
