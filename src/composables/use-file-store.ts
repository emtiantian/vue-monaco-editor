import type { InjectionKey } from 'vue'
import type {
  FileInput,
  FileNode,
  FileStore,
  FileStoreState,
  FileStructure,
  InitFilesOptions,
  OpenTab,
  WebCodeEditorServerHooks,
} from '../types'
import { computed, inject, provide, reactive } from 'vue'
import { confirm as feedbackConfirm, toast } from '../feedback'
import { t } from '../i18n'
import { resolveFileKind } from '../utils/file-kind'
import { getLanguageByFilename } from '../utils/language'
import { buildPath, getParentPath, getPathDepth, MAX_PATH_DEPTH } from '../utils/path'

export const FileStoreKey: InjectionKey<FileStore> = Symbol('file-store')

/**
 * 执行服务端钩子：未提供视为放行；返回 false 或抛错视为失败。
 * 钩子内部负责错误提示，这里只决定本地变更是否生效。
 */
async function runServerHook<T>(
  hook: ((payload: T) => Promise<boolean>) | undefined,
  payload: T,
): Promise<boolean> {
  if (!hook)
    return true
  try {
    return await hook(payload)
  }
  catch {
    return false
  }
}

/** 操作互斥锁：同一 key 在途时静默忽略第二次触发（防双击/连拖产生噪音）。
 *  按实例隔离（在 createFileStore 闭包内创建），避免同页面多编辑器实例互相误拦。 */
function createOpLock() {
  const pendingOps = new Set<string>()
  return async function withOpLock<T>(key: string, fn: () => Promise<T>): Promise<T | false> {
    if (pendingOps.has(key))
      return false
    pendingOps.add(key)
    try {
      return await fn()
    }
    finally {
      pendingOps.delete(key)
    }
  }
}

export function createFileStore(serverHooks?: WebCodeEditorServerHooks): FileStore {
  const withOpLock = createOpLock()

  const state = reactive<FileStoreState>({
    files: [],
    openPaths: [],
    activePath: null,
    selectedFolderPath: null,
    expandedPaths: [],
    searchQuery: '',
    creatingInPath: null,
    creatingIsDirectory: false,
    dragSourcePath: null,
  })

  /** 图片/PDF 在线预览开关，由 initFiles 的 options 写入，本地新建/重命名沿用同一开关 */
  let mediaPreviewEnabled = true

  const activeFile = computed(
    () => state.files.find(f => f.path === state.activePath && !f.isDirectory) || null,
  )

  const openTabs = computed(
    () =>
      state.openPaths
        .map((path) => {
          const file = state.files.find(f => f.path === path)
          return file
            ? { path, name: file.name, isDirty: file.content !== file.originalContent }
            : null
        })
        .filter(Boolean) as OpenTab[],
  )

  const fileStructure = computed<FileStructure[]>(() =>
    state.files.map(f => ({
      path: f.path,
      name: f.name,
      language: f.language,
      isDirectory: f.isDirectory,
      order: f.order,
      fileKind: f.fileKind,
      remoteUrl: f.remoteUrl,
    })),
  )

  const fileTree = computed(() => buildFileTree(fileStructure.value))

  const filteredTree = computed(() => filterTree(fileTree.value, state.searchQuery.toLowerCase()))

  function initFiles(files: FileInput[], options?: InitFilesOptions) {
    mediaPreviewEnabled = options?.mediaPreview ?? true
    state.files = files.map(f => ({
      path: f.path,
      name: f.name,
      // savedContent 为服务端已保存基线；未提供时以 content 为基线（全量视为已保存）
      originalContent: f.savedContent ?? f.content ?? '',
      content: f.content ?? '',
      language: f.language ?? getLanguageByFilename(f.name),
      isDirectory: f.isDirectory ?? false,
      order: 0,
      fileKind: resolveFileKind(f.name, f.fileKind, f.content ?? '', mediaPreviewEnabled),
      remoteUrl: f.remoteUrl,
    }))
    state.selectedFolderPath = inferRootFolderPath(state.files)
  }

  function openFile(path: string) {
    const file = state.files.find(f => f.path === path)
    if (!file || file.isDirectory)
      return
    if (!state.openPaths.includes(path)) {
      state.openPaths.push(path)
    }
    state.activePath = path
  }

  function closeFile(path: string) {
    const index = state.openPaths.indexOf(path)
    if (index === -1)
      return
    state.openPaths.splice(index, 1)
    if (state.activePath === path) {
      state.activePath = state.openPaths[Math.min(index, state.openPaths.length - 1)] || null
    }
  }

  function setActive(path: string) {
    if (state.openPaths.includes(path)) {
      state.activePath = path
    }
  }

  function updateContent(path: string, content: string) {
    const file = state.files.find(f => f.path === path)
    if (file) {
      file.content = content
    }
  }

  function markFileSaved(path: string, content: string) {
    const file = state.files.find(f => f.path === path)
    if (file) {
      file.originalContent = content
    }
  }

  function saveFile(path: string) {
    const file = state.files.find(f => f.path === path)
    if (file) {
      file.originalContent = file.content
    }
  }

  function saveAll() {
    state.files.forEach((file) => {
      if (file.content !== file.originalContent) {
        file.originalContent = file.content
      }
    })
  }

  function toggleExpanded(path: string) {
    const index = state.expandedPaths.indexOf(path)
    if (index === -1) {
      state.expandedPaths.push(path)
    }
    else {
      state.expandedPaths.splice(index, 1)
    }
  }

  function isExpanded(path: string): boolean {
    return state.expandedPaths.includes(path)
  }

  function setSearchQuery(query: string) {
    state.searchQuery = query
  }

  /**
   * 校验新路径是否超出目录层级上限。
   * 迁移目录时（传入 sourcePath）需按子孙相对深度一起计算，
   * 避免浅层子目录整体拖入深层后超限。
   */
  function isWithinDepthLimit(newPath: string, sourcePath?: string): boolean {
    if (getPathDepth(newPath) > MAX_PATH_DEPTH)
      return false
    if (sourcePath) {
      const offset = getPathDepth(newPath) - getPathDepth(sourcePath)
      return state.files
        .filter(f => f.path === sourcePath || f.path.startsWith(`${sourcePath}/`))
        .every(f => getPathDepth(f.path) + offset <= MAX_PATH_DEPTH)
    }
    return true
  }

  function createFile(parentPath: string, name: string): boolean {
    const newPath = buildPath(parentPath, name)
    if (!isWithinDepthLimit(newPath)) {
      toast(t('depthLimit')(MAX_PATH_DEPTH), 'warning')
      return false
    }
    if (state.files.some(f => f.path === newPath)) {
      toast(t('fileExists'), 'warning')
      return false
    }
    const newFile: FileNode = {
      path: newPath,
      name,
      content: '',
      originalContent: '',
      language: getLanguageByFilename(name),
      isDirectory: false,
      order: nextOrder(parentPath),
      fileKind: resolveFileKind(name, undefined, '', mediaPreviewEnabled),
    }
    state.files.push(newFile)
    ensureExpanded(parentPath)
    openFile(newPath)
    return true
  }

  function createDirectory(parentPath: string, name: string): boolean {
    const newPath = buildPath(parentPath, name)
    if (!isWithinDepthLimit(newPath)) {
      toast(t('depthLimit')(MAX_PATH_DEPTH), 'warning')
      return false
    }
    if (state.files.some(f => f.path === newPath)) {
      toast(t('folderExists'), 'warning')
      return false
    }
    const newDir: FileNode = {
      path: newPath,
      name,
      content: '',
      originalContent: '',
      language: 'plaintext',
      isDirectory: true,
      order: nextOrder(parentPath),
      fileKind: 'text',
    }
    state.files.push(newDir)
    ensureExpanded(parentPath)
    ensureExpanded(newPath)
    return true
  }

  async function createNode(name: string): Promise<boolean> {
    // 快照创建态：钩子在途时输入框可能因 blur 触发 cancelCreate 而关闭，
    // 本流程仍按快照走完（与本地模式 blur-cancel 行为一致）
    const parentPath = state.creatingInPath
    const isDirectory = state.creatingIsDirectory
    if (!parentPath)
      return false
    return withOpLock(`create:${parentPath}`, async () => {
      // 先本地校验层级，超限时保留输入框提示用户，不发接口
      if (!isWithinDepthLimit(buildPath(parentPath, name))) {
        toast(t('depthLimit')(MAX_PATH_DEPTH), 'warning')
        return false
      }
      // 服务端模式下先等接口成功；失败保留输入框供用户修正后重试
      const allowed = await runServerHook(
        isDirectory ? serverHooks?.createDirectory : serverHooks?.createFile,
        { parentPath, name },
      )
      if (!allowed)
        return false
      const success = isDirectory
        ? createDirectory(parentPath, name)
        : createFile(parentPath, name)
      // 创建成功后退出创建态，输入框消失；失败（如重名）则保留输入框供改名
      if (success) {
        cancelCreate()
      }
      return success
    })
  }

  function startCreate(parentPath: string, isDirectory: boolean) {
    // 在所有入口（工具栏/右键菜单）统一拦截：父目录已到层级上限时不再弹出创建输入框
    if (getPathDepth(parentPath) + 1 > MAX_PATH_DEPTH) {
      toast(t('depthLimit')(MAX_PATH_DEPTH), 'warning')
      return
    }
    state.creatingInPath = parentPath
    state.creatingIsDirectory = isDirectory
    ensureExpanded(parentPath)
  }

  function cancelCreate() {
    state.creatingInPath = null
    state.creatingIsDirectory = false
  }

  /**
   * 将 oldPath（含子孙）整体迁移到 newPath，同步 openPaths/activePath/expandedPaths。
   * 仅改写 path，不更新 name/language（由调用方按需处理）。
   */
  function relocatePathInStore(oldPath: string, newPath: string, isDir: boolean) {
    if (isDir) {
      state.files.forEach((f) => {
        if (f.path === oldPath || f.path.startsWith(`${oldPath}/`)) {
          f.path = newPath + f.path.slice(oldPath.length)
        }
      })
      state.openPaths = state.openPaths.map(p =>
        p === oldPath || p.startsWith(`${oldPath}/`) ? newPath + p.slice(oldPath.length) : p,
      )
      if (
        state.activePath
        && (state.activePath === oldPath || state.activePath.startsWith(`${oldPath}/`))
      ) {
        state.activePath = newPath + state.activePath.slice(oldPath.length)
      }
      state.expandedPaths = state.expandedPaths.map(p =>
        p === oldPath || p.startsWith(`${oldPath}/`) ? newPath + p.slice(oldPath.length) : p,
      )
    }
    else {
      const file = state.files.find(f => f.path === oldPath)
      if (file) {
        file.path = newPath
      }
      state.openPaths = state.openPaths.map(p => (p === oldPath ? newPath : p))
      if (state.activePath === oldPath) {
        state.activePath = newPath
      }
    }
  }

  async function renameFile(path: string, newName: string): Promise<boolean> {
    return withOpLock(`rename:${path}`, async () => {
      const file = state.files.find(f => f.path === path)
      if (!file)
        return false
      const parentPath = getParentPath(path)
      const newPath = buildPath(parentPath, newName)
      if (newPath === path)
        return false
      if (state.files.some(f => f.path === newPath)) {
        toast(t('targetNameExists'), 'warning')
        return false
      }

      const oldPath = file.path
      const isDir = file.isDirectory

      // 服务端模式下先等重命名接口成功，失败则本地不变
      const allowed = await runServerHook(serverHooks?.rename, { path, newName, isDirectory: isDir })
      if (!allowed)
        return false

      relocatePathInStore(oldPath, newPath, isDir)
      if (isDir) {
        // 重命名目录：更新顶层目录自身 name（子孙 name 不变）
        file.name = newName
      }
      else {
        file.name = newName
        file.language = getLanguageByFilename(newName)
        // 重命名可能改变扩展名，文件类别跟随重算（如 xx.txt -> xx.png）
        file.fileKind = resolveFileKind(newName, undefined, file.content, mediaPreviewEnabled)
      }
      return true
    })
  }

  async function deleteFile(path: string): Promise<void> {
    await withOpLock(`remove:${path}`, async () => {
      const target = state.files.find(f => f.path === path)
      if (!target)
        return

      const confirmed = await feedbackConfirm({
        title: t('confirmTitle'),
        message: t('confirmDeleteMessage')(target.name),
        confirmText: t('confirmOk'),
        cancelText: t('confirmCancel'),
        danger: true,
      })
      if (!confirmed)
        return

      // confirm 弹窗等待期间树可能变化（外部刷新/其他操作），重新校验目标仍在
      const file = state.files.find(f => f.path === path && f.isDirectory === target.isDirectory)
      if (!file)
        return

      // 服务端模式下先等删除接口成功
      const allowed = await runServerHook(serverHooks?.remove, { path, isDirectory: file.isDirectory })
      if (!allowed)
        return

      const pathsToDelete = file.isDirectory
        ? state.files
            .filter(f => f.path === path || f.path.startsWith(`${path}/`))
            .map(f => f.path)
        : [path]

      state.files = state.files.filter(f => !pathsToDelete.includes(f.path))
      pathsToDelete.forEach(p => closeFile(p))

      state.expandedPaths = state.expandedPaths.filter(
        p => !pathsToDelete.includes(p) && !pathsToDelete.some(d => p.startsWith(`${d}/`)),
      )
    })
  }

  /**
   * 移动文件/文件夹到目标目录
   *
   * 复用 renameFile 的前缀更新模式：目录移动时批量改写自身+子孙 path，
   * 并同步 openPaths/activePath/expandedPaths，保证已打开 tab 与展开状态跟随迁移。
   */
  async function moveNode(sourcePath: string, targetFolderPath: string): Promise<void> {
    await withOpLock(`move:${sourcePath}`, async () => {
      const source = state.files.find(f => f.path === sourcePath)
      if (!source)
        return

      const sourceParent = getParentPath(sourcePath)
      // 已在目标目录下，无需移动
      if (sourceParent === targetFolderPath)
        return

      const newPath = buildPath(targetFolderPath, source.name)
      if (newPath === sourcePath)
        return

      // 目标位置已存在同名
      if (state.files.some(f => f.path === newPath)) {
        toast(t('targetExists'), 'warning')
        return
      }

      // 超出目录层级上限（目录需含子孙整体计算）
      if (!isWithinDepthLimit(newPath, source.isDirectory ? sourcePath : undefined)) {
        toast(t('depthLimit')(MAX_PATH_DEPTH), 'warning')
        return
      }

      // 文件夹不能移动到自身或其子目录
      if (
        source.isDirectory
        && (targetFolderPath === sourcePath || targetFolderPath.startsWith(`${sourcePath}/`))
      ) {
        toast(t('moveIntoSelf'), 'warning')
        return
      }

      // 服务端模式下先等移动接口成功
      const allowed = await runServerHook(serverHooks?.move, { sourcePath, targetFolderPath, isDirectory: source.isDirectory })
      if (!allowed)
        return

      relocatePathInStore(sourcePath, newPath, source.isDirectory)

      // 移入后排到目标目录同级末尾
      source.order = nextOrder(targetFolderPath)
      ensureExpanded(targetFolderPath)
    })
  }

  /** 取 parentPath 下当前最大 order + 1，用于新增/移入节点追加到同级末尾 */
  function nextOrder(parentPath: string): number {
    const siblings = state.files.filter(f => getParentPath(f.path) === parentPath)
    return siblings.length ? Math.max(...siblings.map(f => f.order)) + 1 : 0
  }

  /**
   * 将 source 移动到 target 的同级并按 before/after 调整顺序
   *
   * 跨目录时先改写 source 及子孙 path 到 target 父目录，再在 target 同级
   * 数组里把 source 插到 target 前/后，并按新顺序重排 order。
   * 同目录时仅做同级重排，path 不变（无服务端交互，无需加锁）。
   */
  async function reorderNode(sourcePath: string, targetPath: string, position: 'before' | 'after'): Promise<void> {
    if (sourcePath === targetPath)
      return
    const source = state.files.find(f => f.path === sourcePath)
    const target = state.files.find(f => f.path === targetPath)
    if (!source || !target)
      return

    const targetParent = getParentPath(targetPath)

    // 文件夹不能移到自身或其子目录的同级
    if (
      source.isDirectory
      && (targetParent === sourcePath || targetParent.startsWith(`${sourcePath}/`))
    ) {
      toast(t('moveIntoSelf'), 'warning')
      return
    }

    // 跨目录移动：改写 source 及子孙 path 到 target 父目录（涉及服务端 move 钩子，与 moveNode 共用互斥锁）
    const sourceParent = getParentPath(sourcePath)
    if (sourceParent !== targetParent) {
      await withOpLock(`move:${sourcePath}`, async () => {
        const newPath = buildPath(targetParent, source.name)
        if (newPath === sourcePath)
          return
        if (state.files.some(f => f.path === newPath)) {
          toast(t('targetExists'), 'warning')
          return
        }
        // 超出目录层级上限（目录需含子孙整体计算）
        if (!isWithinDepthLimit(newPath, source.isDirectory ? sourcePath : undefined)) {
          toast(t('depthLimit')(MAX_PATH_DEPTH), 'warning')
          return
        }
        // 服务端模式下先等移动接口成功
        const allowed = await runServerHook(serverHooks?.move, { sourcePath, targetFolderPath: targetParent, isDirectory: source.isDirectory })
        if (!allowed)
          return
        relocatePathInStore(sourcePath, newPath, source.isDirectory)
      })
    }

    // 在 target 同级数组里按 before/after 插入 source，并重排 order
    const sourceNewPath = source.path
    const siblings = state.files
      .filter(f => getParentPath(f.path) === targetParent)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    const arr = siblings.filter(f => f.path !== sourceNewPath)
    const targetIndex = arr.findIndex(f => f.path === targetPath)
    if (targetIndex === -1)
      return
    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
    arr.splice(insertIndex, 0, source)
    arr.forEach((f, i) => {
      f.order = i
    })

    ensureExpanded(targetParent)
  }

  function setDragSource(path: string | null) {
    state.dragSourcePath = path
  }

  function ensureExpanded(path: string) {
    if (path !== '/' && !state.expandedPaths.includes(path)) {
      state.expandedPaths.push(path)
    }
  }

  function findNodeInTree(nodes: FileNode[], path: string): FileNode | null {
    for (const node of nodes) {
      if (node.path === path)
        return node
      if (node.children) {
        const found = findNodeInTree(node.children, path)
        if (found)
          return found
      }
    }
    return null
  }

  function findNodeByPath(path: string): FileNode | null {
    return findNodeInTree(fileTree.value, path)
  }

  function getSelectedFolderPath(): string {
    if (state.selectedFolderPath)
      return state.selectedFolderPath
    return inferRootFolderPath(state.files)
  }

  function setSelectedFolderPath(path: string | null) {
    state.selectedFolderPath = path
  }

  return {
    state,
    activeFile,
    openTabs,
    fileTree,
    filteredTree,
    initFiles,
    openFile,
    closeFile,
    setActive,
    updateContent,
    markFileSaved,
    saveFile,
    saveAll,
    toggleExpanded,
    isExpanded,
    setSearchQuery,
    createFile,
    createDirectory,
    createNode,
    startCreate,
    cancelCreate,
    renameFile,
    deleteFile,
    moveNode,
    reorderNode,
    setDragSource,
    findNodeByPath,
    getSelectedFolderPath,
    setSelectedFolderPath,
  }
}

function inferRootFolderPath(files: FileNode[]): string {
  const rootDirs = new Set<string>()
  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean)
    if (parts.length > 0)
      rootDirs.add(`/${parts[0]}`)
  }
  if (rootDirs.size === 1)
    return Array.from(rootDirs)[0]
  return '/'
}

export function provideFileStore(store: FileStore) {
  provide(FileStoreKey, store)
}

export function useFileStore(): FileStore {
  const store = inject(FileStoreKey)
  if (!store) {
    throw new Error('useFileStore must be used inside a CodeEditor component')
  }
  return store
}

function buildFileTree(files: FileStructure[]): FileNode[] {
  const root: FileNode[] = []
  const map = new Map<string, FileNode>()

  files
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path))
    .forEach((file) => {
      const parts = file.path.split('/').filter(Boolean)
      let currentPath = ''
      let currentLevel = root

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1
        currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`

        let node = map.get(currentPath)
        if (!node) {
          node = isLast
            ? {
                path: file.path,
                name: file.name,
                content: '',
                originalContent: '',
                language: file.language,
                isDirectory: file.isDirectory,
                order: file.order,
                fileKind: file.fileKind,
                remoteUrl: file.remoteUrl,
              }
            : {
                path: currentPath,
                name: part,
                content: '',
                originalContent: '',
                language: 'plaintext',
                isDirectory: true,
                order: 0,
                fileKind: 'text',
                children: [],
              }
          map.set(currentPath, node)
          currentLevel.push(node)
        }
        if (!isLast) {
          if (!node.children) {
            node.children = []
          }
          currentLevel = node.children
        }
      })
    })

  return sortTree(root)
}

function sortTree(nodes: FileNode[]): FileNode[] {
  return nodes
    .sort((a, b) => {
      // 目录优先
      if (a.isDirectory !== b.isDirectory)
        return a.isDirectory ? -1 : 1
      // 同类按 order 升序，order 相同按 name 兜底
      if (a.order !== b.order)
        return a.order - b.order
      return a.name.localeCompare(b.name)
    })
    .map((node) => {
      if (node.children) {
        node.children = sortTree(node.children)
      }
      return node
    })
}

function filterTree(nodes: FileNode[], query: string): FileNode[] {
  if (!query)
    return nodes
  return nodes
    .map(node => ({ ...node }))
    .filter((node) => {
      if (node.isDirectory) {
        node.children = node.children ? filterTree(node.children, query) : []
        return node.children.length > 0 || node.name.toLowerCase().includes(query)
      }
      return node.name.toLowerCase().includes(query)
    })
}
