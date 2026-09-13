<script setup lang="ts">
import type { FileNode } from './types'
import { computed, nextTick, ref, watch } from 'vue'
import { t } from './i18n'
import { useContextMenu } from './composables/use-context-menu'
import { useFileStore } from './composables/use-file-store'
import ContextMenu from './context-menu.vue'
import CreateNodeInput from './create-node-input.vue'
import FileIcon from './file-icon.vue'
import { downloadFile, downloadUrl } from './utils/download'
import { getParentPath } from './utils/path'

const props = defineProps<{
  node: FileNode
  depth?: number
}>()

const {
  openFile,
  toggleExpanded,
  isExpanded,
  state,
  renameFile,
  deleteFile,
  createNode,
  startCreate,
  cancelCreate,
  setSelectedFolderPath,
  moveNode,
  reorderNode,
  setDragSource,
} = useFileStore()

const expanded = computed(() => isExpanded(props.node.path))
const isRenaming = ref(false)
const renameValue = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)
const isDropTarget = ref(false)
const dropPosition = ref<'before' | 'after' | 'inside' | null>(null)

const isActive = computed(() => state.activePath === props.node.path && !props.node.isDirectory)
const isSelectedFolder = computed(() => props.node.isDirectory && state.selectedFolderPath === props.node.path)
const isDragging = computed(() => state.dragSourcePath === props.node.path)

const { visible: contextMenuVisible, x: contextMenuX, y: contextMenuY, open: openContextMenu, close: closeContextMenu }
  = useContextMenu()

watch(isRenaming, async (value) => {
  if (value) {
    await nextTick()
    renameInputRef.value?.focus()
    renameInputRef.value?.select()
  }
})

const indentStyle = computed(() => ({
  paddingLeft: `${(props.depth || 0) * 14 + 12}px`,
}))

function handleClick() {
  if (props.node.isDirectory) {
    toggleExpanded(props.node.path)
    setSelectedFolderPath(props.node.path)
  }
  else {
    openFile(props.node.path)
    setSelectedFolderPath(getParentPath(props.node.path))
  }
}

function startRename(e?: Event) {
  e?.stopPropagation()
  isRenaming.value = true
  renameValue.value = props.node.name
}

async function confirmRename(e: Event) {
  e.stopPropagation()
  const value = renameValue.value.trim()
  if (value && value !== props.node.name) {
    const applied = await renameFile(props.node.path, value)
    // 失败（重名/服务端钩子拒绝）时保留输入框供改名重试
    if (!applied)
      return
  }
  isRenaming.value = false
}

function cancelRename(e: Event) {
  e.stopPropagation()
  isRenaming.value = false
}

function handleDelete(e?: Event) {
  e?.stopPropagation()
  deleteFile(props.node.path)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    confirmRename(e)
  }
  else if (e.key === 'Escape') {
    cancelRename(e)
  }
}

function handleContextMenu(e: MouseEvent) {
  e.stopPropagation()
  openContextMenu(e)
}

/** 解析当前节点作为 drop 目标时应落入的文件夹路径 */
function resolveDropTargetFolder(): string {
  return props.node.isDirectory ? props.node.path : getParentPath(props.node.path)
}

/** 判断源节点是否允许落到目标文件夹 */
function isDropAllowed(targetFolderPath: string): boolean {
  const source = state.dragSourcePath
  if (!source)
    return false
  // 源已在目标目录下（原地，不会移动）
  if (getParentPath(source) === targetFolderPath)
    return false
  // 文件夹不能拖入自身或其子目录
  const sourceNode = state.files.find(f => f.path === source)
  if (
    sourceNode?.isDirectory
    && (targetFolderPath === source || targetFolderPath.startsWith(`${source}/`))
  ) {
    return false
  }
  return true
}

function onDragStart(e: DragEvent) {
  setDragSource(props.node.path)
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', props.node.path)
  }
  e.stopPropagation()
}

/**
 * 基于鼠标位置计算落区位置并校验合法性
 *
 * dragover 与 drop 共用同一套判定：dragleave 在子元素间移动时会误触发并清空
 * dropPosition，若 onDrop 直接读取缓存值会得到 null 而放弃排序（典型表现：
 * 向下拖到 after 位置松手无反应，向上 before 却正常）。drop 时重新计算可规避。
 */
function computeDropPosition(e: DragEvent): 'before' | 'after' | 'inside' | null {
  const source = state.dragSourcePath
  if (!source)
    return null
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const ratio = (e.clientY - rect.top) / rect.height

  // 落区划分：目录三段(上1/3 before / 中 inside / 下1/3 after)，文件两段(上 before / 下 after)
  let pos: 'before' | 'after' | 'inside'
  if (props.node.isDirectory) {
    if (ratio < 0.33)
      pos = 'before'
    else if (ratio > 0.67)
      pos = 'after'
    else
      pos = 'inside'
  }
  else {
    pos = ratio < 0.5 ? 'before' : 'after'
  }

  // 校验落区合法性
  if (pos === 'inside') {
    if (!isDropAllowed(props.node.path))
      return null
  }
  else {
    // before/after：源不能是目标自身；文件夹不能排到自身子目录的同级
    if (source === props.node.path)
      return null
    const targetParent = getParentPath(props.node.path)
    const sourceNode = state.files.find(f => f.path === source)
    if (
      sourceNode?.isDirectory
      && (targetParent === source || targetParent.startsWith(`${source}/`))
    ) {
      return null
    }
  }
  return pos
}

function onDragOver(e: DragEvent) {
  const pos = computeDropPosition(e)
  if (!pos) {
    if (dropPosition.value !== null) {
      dropPosition.value = null
      isDropTarget.value = false
    }
    e.stopPropagation()
    return
  }
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dropPosition.value = pos
  isDropTarget.value = pos === 'inside'
  e.stopPropagation()
}

function onDragLeave(e: DragEvent) {
  // 子元素间移动会冒泡触发 dragleave，需确认指针真的离开了当前节点再清空
  const el = e.currentTarget as HTMLElement
  const related = e.relatedTarget as Node | null
  if (related && el.contains(related))
    return
  isDropTarget.value = false
  dropPosition.value = null
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  const source = state.dragSourcePath
  // 重新基于鼠标位置计算落区，不依赖 dragover 缓存的 dropPosition
  const pos = computeDropPosition(e)
  isDropTarget.value = false
  dropPosition.value = null
  if (!source)
    return
  if (pos === 'inside') {
    moveNode(source, resolveDropTargetFolder())
  }
  else if (pos === 'before' || pos === 'after') {
    reorderNode(source, props.node.path, pos)
  }
  // 移动成功后源节点 DOM 可能被卸载，dragend 不一定触发，这里主动清理
  setDragSource(null)
}

function onDragEnd() {
  setDragSource(null)
  isDropTarget.value = false
  dropPosition.value = null
}

function handleNewFile() {
  startCreate(props.node.isDirectory ? props.node.path : getParentPath(props.node.path), false)
}

function handleNewFolder() {
  startCreate(props.node.isDirectory ? props.node.path : getParentPath(props.node.path), true)
}

function handleCreateConfirm(name: string) {
  createNode(name)
}

function handleCopyPath() {
  navigator.clipboard.writeText(props.node.path)
}

async function handleDownload() {
  if (props.node.isDirectory) {
    // TODO: 文件夹下载由后端接口提供（含非文本文件），前端 store 仅持有文本文件无法完整打包
    return
  }
  if (props.node.remoteUrl)
    await downloadUrl(props.node.name, props.node.remoteUrl)
  else
    downloadFile(props.node.name, props.node.content)
}

const contextMenuItems = computed(() => [
  { label: t('newFile'), action: handleNewFile },
  { label: t('newFolder'), action: handleNewFolder },
  { label: t('rename'), action: () => startRename() },
  { label: t('copyPath'), action: handleCopyPath },
  { label: t('download'), action: handleDownload },
  { label: '', action: () => {}, divider: true },
  { label: t('delete'), action: handleDelete, danger: true },
])
</script>

<template>
  <li class="vme-tree-node">
    <!-- hover 与其余状态互斥，避免与 :hover 优先级冲突 -->
    <div
      class="vme-tree-node__row"
      :class="{
        'is-active': !isDropTarget && !isSelectedFolder && isActive,
        'is-selected-folder': !isDropTarget && isSelectedFolder,
        'is-dragging': isDragging,
        'is-drop-target': isDropTarget,
        'is-drop-before': dropPosition === 'before',
        'is-drop-after': dropPosition === 'after',
      }"
      :style="indentStyle"
      :draggable="!isRenaming"
      @click="handleClick"
      @contextmenu="handleContextMenu"
      @dragstart="onDragStart"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @dragend="onDragEnd"
    >
      <span v-if="node.isDirectory" class="vme-tree-node__arrow">{{ expanded ? '▼' : '▶' }}</span>
      <span v-else class="vme-tree-node__arrow-spacer" />

      <FileIcon :filename="node.name" :is-directory="node.isDirectory" :is-open="expanded" />

      <input
        v-if="isRenaming"
        ref="renameInputRef"
        v-model="renameValue"
        class="vme-tree-node__rename"
        @click.stop
        @keydown="handleKeydown"
        @blur="cancelRename"
      >
      <span v-else class="vme-tree-node__name">{{ node.name }}</span>
    </div>

    <ul v-if="node.isDirectory && expanded" class="vme-tree-node__children">
      <CreateNodeInput
        v-if="state.creatingInPath === node.path"
        :is-directory="state.creatingIsDirectory"
        :depth="(depth || 0) + 1"
        @confirm="handleCreateConfirm"
        @cancel="cancelCreate"
      />
      <tree-node
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="(depth || 0) + 1"
      />
    </ul>

    <ContextMenu
      v-if="contextMenuVisible"
      :items="contextMenuItems"
      :x="contextMenuX"
      :y="contextMenuY"
      @close="closeContextMenu"
    />
  </li>
</template>

<style scoped>
.vme-tree-node {
  list-style: none;
}

.vme-tree-node__row {
  display: flex;
  align-items: center;
  height: 28px;
  padding-right: 8px;
  cursor: pointer;
  transition: background-color 0.1s;
  user-select: none;
}

.vme-tree-node__row:hover {
  background: var(--vme-hover-strong, #e8e8e8);
}

.vme-tree-node__row.is-active {
  background: #e3f2fd;
}

.vme-tree-node__row.is-selected-folder {
  background: #dcdcdc;
}

.vme-tree-node__row.is-active:hover,
.vme-tree-node__row.is-selected-folder:hover {
  /* hover 与其余状态互斥，避免覆盖激活/选中态 */
  background: inherit;
}

.vme-tree-node__row.is-dragging {
  opacity: 0.4;
}

.vme-tree-node__row.is-drop-target {
  background: #d6e8ff;
  outline: 1px dashed var(--vme-primary, #1677ff);
  outline-offset: -2px;
}

.vme-tree-node__row.is-drop-before {
  box-shadow: inset 0 2px 0 0 var(--vme-primary, #1677ff);
}

.vme-tree-node__row.is-drop-after {
  box-shadow: inset 0 -2px 0 0 var(--vme-primary, #1677ff);
}

.vme-tree-node__arrow {
  width: 14px;
  text-align: center;
  font-size: 9px;
  color: #888;
  margin-right: 2px;
}

.vme-tree-node__arrow-spacer {
  width: 14px;
  margin-right: 2px;
}

.vme-tree-node__rename {
  flex: 1;
  height: 20px;
  padding: 0 4px;
  font-size: 13px;
  color: var(--vme-text, #333);
  background: var(--vme-bg, #fff);
  border: 1px solid var(--vme-primary, #1677ff);
  border-radius: 2px;
  outline: none;
}

.vme-tree-node__name {
  flex: 1;
  font-size: 13px;
  color: var(--vme-text, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vme-tree-node__children {
  margin: 0;
  padding: 0;
}
</style>
