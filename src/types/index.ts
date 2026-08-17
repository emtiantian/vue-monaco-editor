import type { ComputedRef } from 'vue'

/**
 * web-code-editor 公共类型定义
 *
 * 集中管理组件间共享的数据结构、Props、Emits 和 UI 类型，
 * 避免 FileNode/FileInput/FileStore 等类型散在各个文件中。
 * 包含：基础数据结构、组件 Props/Emits、文件 Store 接口。
 */

/**
 * 文件树节点（也是 store 中文件的运行时形态）
 */
export interface FileNode {
  path: string
  name: string
  content: string
  originalContent: string
  language: string
  isDirectory: boolean
  /** 同级排序权重，越小越靠前；同 order 时按 name 兜底 */
  order: number
  children?: FileNode[]
}

/**
 * 已打开 tab 的摘要信息
 */
export interface OpenTab {
  path: string
  name: string
  isDirty: boolean
}

/**
 * 从父组件传入的初始文件描述（不含运行时字段）
 */
export interface FileInput {
  path: string
  name: string
  content: string
  language: string
}

/**
 * 文件图标配置
 */
export interface FileIconInfo {
  label: string
  color: string
  bg: string
}

/**
 * 编辑器主题标识
 */
export type WebCodeEditorTheme = 'web-code-editor-light' | 'web-code-editor-dark' | 'vs' | 'vs-dark' | 'hc-black'

/**
 * web-code-editor.vue Props
 */
export interface WebCodeEditorProps {
  /** 初始文件列表 */
  files?: FileInput[]
  /** 默认展开的路径列表 */
  defaultExpandedPaths?: string[]
  /** 默认打开的文件路径 */
  defaultOpenPath?: string | null
  /** 编辑器主题 */
  theme?: WebCodeEditorTheme
  /** 是否强制显示加载状态（内部初始化完成后自动隐藏） */
  loading?: boolean
  /** 初始/上次保存时间，如 "16:32"；作为草稿已保存时间的初始值，每次真实保存后更新为当前时间，下传 TabBar 展示 */
  saveTime?: string | null
  /** 发布按钮文字（展示于 TabBar 右侧） */
  publishText?: string
}

/**
 * web-code-editor.vue Emits
 */
export interface WebCodeEditorEmits {
  /** 保存单个文件时触发 */
  (e: 'save', payload: { path: string, content: string, name: string }): void
  /** 保存全部文件时触发 */
  (e: 'save-all', payload: { path: string, content: string, name: string }[]): void
  /** 点击 TabBar 发布按钮时触发 */
  (e: 'publish'): void
  /** 点击文件树顶部刷新按钮时触发 */
  (e: 'refresh'): void
  /** 文件内容变化时触发 */
  (e: 'change', payload: { path: string, content: string, name: string, isDirty: boolean }): void
  /** 打开文件时触发 */
  (e: 'open-file', path: string): void
  /** 关闭文件时触发 */
  (e: 'close-file', path: string): void
  /** 编辑器初始化完成、可交互（Python LSP 可能仍在后台预加载） */
  (e: 'ready', payload: { elapsedMs?: number }): void
  /** worker 预加载失败（非致命） */
  (e: 'worker-error', payload: { type: 'python' | 'typescript', error: unknown }): void
}

/**
 * 文件输入/输出的结构字段快照（不含 content，避免响应式链过度触发）
 */
export interface FileStructure {
  path: string
  name: string
  language: string
  isDirectory: boolean
  order: number
}

/**
 * 文件 store 运行时状态
 */
export interface FileStoreState {
  files: FileNode[]
  openPaths: string[]
  activePath: string | null
  selectedFolderPath: string | null
  expandedPaths: string[]
  searchQuery: string
  creatingInPath: string | null
  creatingIsDirectory: boolean
  /** 当前拖拽中的源节点路径，null 表示无拖拽 */
  dragSourcePath: string | null
}

/**
 * 文件 store 对外暴露的响应式状态与方法
 */
export interface FileStore {
  state: FileStoreState
  activeFile: ComputedRef<FileNode | null>
  openTabs: ComputedRef<OpenTab[]>
  fileTree: ComputedRef<FileNode[]>
  filteredTree: ComputedRef<FileNode[]>
  initFiles: (files: FileInput[]) => void
  openFile: (path: string) => void
  closeFile: (path: string) => void
  setActive: (path: string) => void
  updateContent: (path: string, content: string) => void
  saveFile: (path: string) => void
  saveAll: () => void
  toggleExpanded: (path: string) => void
  isExpanded: (path: string) => boolean
  setSearchQuery: (query: string) => void
  createFile: (parentPath: string, name: string) => boolean
  createDirectory: (parentPath: string, name: string) => boolean
  createNode: (name: string) => void
  startCreate: (parentPath: string, isDirectory: boolean) => void
  cancelCreate: () => void
  renameFile: (path: string, newName: string) => void
  deleteFile: (path: string) => Promise<void>
  moveNode: (sourcePath: string, targetFolderPath: string) => void
  reorderNode: (sourcePath: string, targetPath: string, position: 'before' | 'after') => void
  setDragSource: (path: string | null) => void
  findNodeByPath: (path: string) => FileNode | null
  getSelectedFolderPath: () => string
  setSelectedFolderPath: (path: string | null) => void
}

/**
 * 右键菜单项
 */
export interface MenuItem {
  label: string
  action: () => void
  danger?: boolean
  divider?: boolean
}

/**
 * web-monaco-editor.vue Props
 */
export interface WebMonacoEditorProps {
  theme?: WebCodeEditorTheme
  loading?: boolean
}

/**
 * web-monaco-editor.vue Emits
 */
export interface WebMonacoEditorEmits {
  (e: 'save'): void
  (e: 'save-all'): void
  (e: 'open-file', path: string): void
  (e: 'ready', payload: { elapsedMs?: number }): void
  (e: 'worker-error', payload: { type: 'python' | 'typescript', error: unknown }): void
}
