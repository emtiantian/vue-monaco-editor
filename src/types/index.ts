import type { ComputedRef } from 'vue'

/**
 * web-code-editor 公共类型定义
 *
 * 集中管理组件间共享的数据结构、Props、Emits 和 UI 类型，
 * 避免 FileNode/FileInput/FileStore 等类型散在各个文件中。
 * 包含：基础数据结构、组件 Props/Emits、文件 Store 接口。
 */

/**
 * 文件按 tab 内展示方式的分类：
 * - text   文本，进 Monaco 编辑
 * - image  浏览器原生可预览的图片，tab 内 <img> 展示
 * - pdf    浏览器原生可预览的 PDF，tab 内 <iframe> 展示
 * - binary 其余二进制（zip/xlsx/mp3...），tab 内展示"下载"占位提示
 */
export type FileKind = 'text' | 'image' | 'pdf' | 'binary'

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
  /** 文件类别（运行时已解析），决定 tab 内编辑/预览/占位下载 */
  fileKind: FileKind
  /** 二进制文件的地址（data:/http URL）：图片/PDF 预览 src 指向它；文本文件无此字段 */
  remoteUrl?: string
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
 * 从父组件传入的初始文件描述（不含运行时字段）。
 * content/language 可省略：目录条目与二进制文件无需传空串占位。
 */
export interface FileInput {
  path: string
  name: string
  /** 文本内容；目录条目可省略 */
  content?: string
  /** Monaco 语言 id；省略时按扩展名推断 */
  language?: string
  /** 显式指定文件类别，覆盖组件内按扩展名的自动判定（后端已返回类型标记时使用） */
  fileKind?: FileKind
  /** 二进制文件的地址（data:/http URL）：图片/PDF 预览 src 与下载均指向它 */
  remoteUrl?: string
  /** 显式目录条目（如后端返回的空目录）；缺省按文件处理 */
  isDirectory?: boolean
  /**
   * 已保存到服务端的内容基线。
   * 提供时以此内容作为 originalContent，content 与它的差异即为脏状态；
   * 用于整体刷新文件树时保留脏标记。
   */
  savedContent?: string
}

/**
 * 文件图标配置（文字徽章方案，作为 SVG 图标未命中扩展名时的兜底）
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
  /**
   * 服务端文件操作钩子（可选）。
   * 提供时：新建/重命名/删除/移动先等待对应钩子返回 true（接口成功）后再本地生效；
   * 返回 false 或抛错时本地不生效（钩子内部负责错误提示）；未提供时组件保持纯本地模式。
   */
  serverHooks?: WebCodeEditorServerHooks
  /**
   * 图片/PDF 在线预览开关（默认 true）。
   * 开启且文件带 remoteUrl 时 tab 内直接 <img>/<iframe> 预览；
   * 关闭后 image/pdf 统一降级为 binary 走下载占位。
   */
  mediaPreview?: boolean
  /** 无 #preview 插槽时是否启用内置轻量 Markdown 渲染器（默认 false） */
  builtinMarkdownPreview?: boolean
  /** 提前加载的非默认语言（可传语言名或文件后缀，如 ['rust', '.go']） */
  preloadLanguages?: string[]
}

/**
 * 服务端文件操作钩子
 *
 * 返回 true 表示服务端操作成功、组件可以执行本地变更；
 * 返回 false 或抛错表示失败，组件放弃本地变更。
 */
export interface WebCodeEditorServerHooks {
  /** 新建文件（parentPath 为目标父目录路径） */
  createFile?: (payload: { parentPath: string, name: string }) => Promise<boolean>
  /** 新建目录 */
  createDirectory?: (payload: { parentPath: string, name: string }) => Promise<boolean>
  /** 重命名（文件与目录；目录会同步影响子孙路径） */
  rename?: (payload: { path: string, newName: string, isDirectory: boolean }) => Promise<boolean>
  /** 删除（文件与目录；目录删除会级联子孙） */
  remove?: (payload: { path: string, isDirectory: boolean }) => Promise<boolean>
  /** 移动到目标目录（拖拽落入库内/跨目录排序） */
  move?: (payload: { sourcePath: string, targetFolderPath: string, isDirectory: boolean }) => Promise<boolean>
}

/**
 * web-code-editor.vue 通过 defineExpose 暴露给父组件的实例方法
 */
export interface WebCodeEditorInstance {
  /** 请求保存当前活动文件；调用方保存成功后调用 markFileSaved */
  save: () => void
  /** 请求保存全部文件；调用方保存成功后调用 markFileSaved */
  saveAll: () => void
  /** 打开指定路径文件 */
  openFile: (path: string) => void
  /** 关闭指定路径文件 */
  closeFile: (path: string) => void
  /** 获取当前活动文件 */
  getActiveFile: () => FileNode | null
  /** 获取当前所有文件（含未保存内容；二进制文件带 fileKind/remoteUrl 原样返回） */
  getFiles: () => FileInput[]
  /** 外部写入文件内容并标记为已保存（如 revision 冲突时采用远端内容） */
  setFileContent: (path: string, content: string) => void
  /** 确认调用方已成功持久化文件内容，并清除 dirty 状态 */
  markFileSaved: (path: string, content: string) => void
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
  /** 点击不可预览文件的"下载文件"按钮时触发，由页面层决定下载方式 */
  (e: 'download', payload: { path: string, name: string, remoteUrl?: string }): void
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
  fileKind: FileKind
  remoteUrl?: string
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
 *
 * 注：createNode/renameFile/deleteFile/moveNode/reorderNode 为异步方法——
 * 提供 serverHooks 时需等待服务端钩子返回后才执行本地变更。
 */
export interface FileStore {
  state: FileStoreState
  activeFile: ComputedRef<FileNode | null>
  openTabs: ComputedRef<OpenTab[]>
  fileTree: ComputedRef<FileNode[]>
  filteredTree: ComputedRef<FileNode[]>
  initFiles: (files: FileInput[], options?: InitFilesOptions) => void
  openFile: (path: string) => void
  closeFile: (path: string) => void
  setActive: (path: string) => void
  updateContent: (path: string, content: string) => void
  /** 仅更新已持久化基线，不覆盖保存请求发出后产生的新编辑 */
  markFileSaved: (path: string, content: string) => void
  saveFile: (path: string) => void
  saveAll: () => void
  toggleExpanded: (path: string) => void
  isExpanded: (path: string) => boolean
  setSearchQuery: (query: string) => void
  createFile: (parentPath: string, name: string) => boolean
  createDirectory: (parentPath: string, name: string) => boolean
  /** 新建文件/目录（含服务端钩子确认），返回是否本地生效；失败保留创建输入框供改名重试 */
  createNode: (name: string) => Promise<boolean>
  startCreate: (parentPath: string, isDirectory: boolean) => void
  cancelCreate: () => void
  /** 重命名（含服务端钩子确认），返回是否本地生效 */
  renameFile: (path: string, newName: string) => Promise<boolean>
  deleteFile: (path: string) => Promise<void>
  moveNode: (sourcePath: string, targetFolderPath: string) => Promise<void>
  reorderNode: (sourcePath: string, targetPath: string, position: 'before' | 'after') => Promise<void>
  setDragSource: (path: string | null) => void
  findNodeByPath: (path: string) => FileNode | null
  getSelectedFolderPath: () => string
  setSelectedFolderPath: (path: string | null) => void
}

/** initFiles 可选项 */
export interface InitFilesOptions {
  /** 图片/PDF 在线预览开关，false 时 image/pdf 降级为 binary（默认 true） */
  mediaPreview?: boolean
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
  preloadLanguages?: string[]
}

/**
 * web-monaco-editor.vue Emits
 */
export interface WebMonacoEditorEmits {
  (e: 'save'): void
  (e: 'save-all'): void
  (e: 'open-file', path: string): void
  /** 编辑器内活动文件内容变化（等长替换同样触发） */
  (e: 'change', payload: { path: string, content: string, name: string, isDirty: boolean }): void
  (e: 'ready', payload: { elapsedMs?: number }): void
  (e: 'worker-error', payload: { type: 'python' | 'typescript', error: unknown }): void
}

/**
 * binary-file-placeholder.vue Props
 */
export interface BinaryFilePlaceholderProps {
  /** 文件名（展示用） */
  name: string
  /** 占位说明文案（缺省为「不支持在线预览与编辑」） */
  description?: string
}
