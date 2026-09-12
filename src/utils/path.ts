/**
 * 路径处理工具函数
 *
 * 统一处理 web-code-editor 中文件路径的拼接、取父目录、取文件名等操作。
 */

/** 文件树路径层级上限（/a/b/c 为 3 层） */
export const MAX_PATH_DEPTH = 10

/**
 * 获取路径层级数：/a/b/c 为 3 层，/ 为 0 层
 */
export function getPathDepth(path: string): number {
  return path.split('/').filter(Boolean).length
}

/**
 * 获取父目录路径
 * @param path 文件或目录路径，例如 /src/test.py
 * @param defaultPath 当 path 位于根目录时返回的默认值
 */
export function getParentPath(path: string, defaultPath: string = '/'): string {
  const lastSlash = path.lastIndexOf('/')
  return lastSlash <= 0 ? defaultPath : path.substring(0, lastSlash)
}

/**
 * 拼接父路径与名称
 * @param parentPath 父目录路径
 * @param name 文件/目录名
 */
export function buildPath(parentPath: string, name: string): string {
  return parentPath === '/' ? `/${name}` : `${parentPath}/${name}`
}

/**
 * 获取文件扩展名（小写）
 */
export function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}
