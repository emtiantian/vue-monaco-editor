import { ref, shallowRef } from 'vue'

/**
 * 组件内置文案的轻量国际化。
 *
 * 内置 zh-CN / en-US 两套文案，通过 setLocale 切换（插件 install options 的
 * locale 字段，或直接调用 setLocale）。所有 UI 字符串（toast/confirm/右键菜单/
 * placeholder/title）均经 t() 取词，宿主可用 setMessages 整体覆盖或增量补充。
 */

export type Locale = 'zh-CN' | 'en-US'

export interface Messages {
  /** 文件树标题 */
  fileTreeTitle: string
  /** 文件树/右键菜单：新建文件 */
  newFile: string
  /** 右键菜单：新建文件夹 */
  newFolder: string
  /** 右键菜单：重命名 */
  rename: string
  /** 右键菜单：复制绝对路径 */
  copyPath: string
  /** 右键菜单：下载 */
  download: string
  /** 右键菜单：删除 */
  delete: string
  /** 搜索框 placeholder */
  searchPlaceholder: string
  /** 创建输入框 placeholder（文件） */
  createFilePlaceholder: string
  /** 创建输入框 placeholder（文件夹） */
  createFolderPlaceholder: string
  /** 文件树过滤无结果 */
  noMatchingFiles: string
  /** 工具栏按钮 title：刷新 */
  refresh: string
  /** 页签脏标记 title */
  unsavedTitle: string
  /** 草稿状态：已保存 */
  saved: string
  /** 草稿状态：未保存 */
  unsaved: string
  /** 页签栏发布按钮默认文字 */
  publish: string
  /** 手动保存按钮 */
  save: string
  /** Markdown 预览切换按钮 title */
  preview: string
  /** Markdown 编辑切换按钮 title */
  edit: string
  /** 空态文案 */
  selectFileToEdit: string
  /** 编辑器初始化 loading */
  editorInitializing: string
  /** Python LSP 分析中提示 */
  pythonLspAnalyzing: string
  /** 二进制文件占位说明 */
  binaryFileHint: string
  /** 二进制文件占位下载按钮 */
  downloadFile: string
  /** toast：目录层级超限（{n} 为层数占位） */
  depthLimit: (n: number) => string
  /** toast：文件已存在 */
  fileExists: string
  /** toast：文件夹已存在 */
  folderExists: string
  /** toast：目标名称已存在 */
  targetNameExists: string
  /** toast：目标位置已存在同名文件/文件夹 */
  targetExists: string
  /** toast：文件夹不能移入自身或其子目录 */
  moveIntoSelf: string
  /** 删除确认框：标题 */
  confirmTitle: string
  /** 删除确认框：正文（{name} 为文件名占位） */
  confirmDeleteMessage: (name: string) => string
  /** 删除确认框：确认按钮 */
  confirmOk: string
  /** 删除确认框：取消按钮 */
  confirmCancel: string
}

const zhCN: Messages = {
  fileTreeTitle: '文件',
  newFile: '新建文件',
  newFolder: '新建文件夹',
  rename: '重命名',
  copyPath: '复制绝对路径',
  download: '下载',
  delete: '删除',
  searchPlaceholder: '搜索文件',
  createFilePlaceholder: '新建文件...',
  createFolderPlaceholder: '新建文件夹...',
  noMatchingFiles: '无匹配文件',
  refresh: '刷新',
  unsavedTitle: '未保存',
  saved: '已保存',
  unsaved: '未保存',
  publish: '发布',
  save: '保存',
  preview: '预览',
  edit: '编辑',
  selectFileToEdit: '选择文件进行编辑',
  editorInitializing: '编辑器初始化中...',
  pythonLspAnalyzing: 'Python LSP 分析中...',
  binaryFileHint: '为二进制文件，不支持在线预览与编辑',
  downloadFile: '下载文件',
  depthLimit: n => `目录层级最多 ${n} 层`,
  fileExists: '文件已存在',
  folderExists: '文件夹已存在',
  targetNameExists: '目标名称已存在',
  targetExists: '目标位置已存在同名文件/文件夹',
  moveIntoSelf: '不能将文件夹移动到自身或其子目录',
  confirmTitle: '提示',
  confirmDeleteMessage: name => `确定要删除 ${name} 吗？`,
  confirmOk: '确定',
  confirmCancel: '取消',
}

const enUS: Messages = {
  fileTreeTitle: 'Files',
  newFile: 'New File',
  newFolder: 'New Folder',
  rename: 'Rename',
  copyPath: 'Copy Path',
  download: 'Download',
  delete: 'Delete',
  searchPlaceholder: 'Search files',
  createFilePlaceholder: 'New file...',
  createFolderPlaceholder: 'New folder...',
  noMatchingFiles: 'No matching files',
  refresh: 'Refresh',
  unsavedTitle: 'Unsaved',
  saved: 'Saved',
  unsaved: 'Unsaved',
  publish: 'Publish',
  save: 'Save',
  preview: 'Preview',
  edit: 'Edit',
  selectFileToEdit: 'Select a file to edit',
  editorInitializing: 'Initializing editor...',
  pythonLspAnalyzing: 'Python LSP analyzing...',
  binaryFileHint: 'is a binary file and cannot be previewed or edited online',
  downloadFile: 'Download file',
  depthLimit: n => `Directory depth limited to ${n} levels`,
  fileExists: 'File already exists',
  folderExists: 'Folder already exists',
  targetNameExists: 'Target name already exists',
  targetExists: 'A file/folder with the same name already exists at the target location',
  moveIntoSelf: 'Cannot move a folder into itself or its subdirectories',
  confirmTitle: 'Confirm',
  confirmDeleteMessage: name => `Are you sure you want to delete ${name}?`,
  confirmOk: 'OK',
  confirmCancel: 'Cancel',
}

const builtinMessages: Record<Locale, Messages> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

const currentLocale = ref<Locale>('zh-CN')
/** 宿主覆盖层：与内置文案浅合并，缺省键回落内置文案 */
const overrideMessages = shallowRef<Partial<Messages>>({})

/** 切换语言（支持 'en' / 'zh' 简写，归一化为 zh-CN / en-US） */
export function setLocale(locale: Locale | 'en' | 'zh'): void {
  const normalized = locale === 'en' || locale === 'en-US'
    ? 'en-US'
    : 'zh-CN'
  currentLocale.value = normalized
}

/** 当前语言 */
export function getLocale(): Locale {
  return currentLocale.value
}

/** 覆盖或补充文案（与当前语言的内置文案浅合并；传 keys 空对象可整体清除覆盖） */
export function setMessages(messages: Partial<Messages>): void {
  overrideMessages.value = messages
}

/** 取当前文案表（每次调用合并，宿主运行时切换即时生效） */
export function getMessages(): Messages {
  return { ...builtinMessages[currentLocale.value], ...overrideMessages.value }
}

/** 取一条文案 */
export function t<K extends keyof Messages>(key: K): Messages[K] {
  return getMessages()[key]
}
