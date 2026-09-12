import type { FileKind } from '../types'
import { getExtension } from './path'

/**
 * 非文本文件分类工具
 *
 * 按 tab 内展示方式将文件分为四类：
 * - text   文本，进 Monaco 编辑
 * - image  浏览器原生可预览的图片，tab 内 <img> 展示
 * - pdf    浏览器原生可预览的 PDF，tab 内 <iframe> 展示
 * - binary 其余二进制（zip/xlsx/mp3...），tab 内展示"下载"占位提示
 */

/** 浏览器可直接预览的图片扩展名 */
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'])

/** 浏览器原生 PDF 查看器可预览的扩展名 */
const PDF_EXTENSIONS = new Set(['pdf'])

/** 其余已知二进制扩展名（无扩展名时靠内容嗅探兜底） */
const BINARY_EXTENSIONS = new Set([
  'zip',
  'gz',
  'tar',
  'rar',
  '7z',
  'xlsx',
  'xls',
  'docx',
  'doc',
  'pptx',
  'ppt',
  'mp3',
  'wav',
  'ogg',
  'flac',
  'mp4',
  'avi',
  'mov',
  'mkv',
  'webm',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'exe',
  'dll',
  'so',
  'dylib',
  'bin',
  'dat',
  'class',
  'jar',
  'pyc',
])

/** 内容嗅探采样长度：二进制特征（控制字符）通常出现在文件头部 */
const SNIFF_LIMIT = 8 * 1024

/**
 * 按媒体预览开关归一化文件类别：关闭预览时 image/pdf 降级为 binary（下载占位查看）
 */
export function normalizeFileKind(kind: FileKind, mediaPreview: boolean): FileKind {
  return !mediaPreview && (kind === 'image' || kind === 'pdf') ? 'binary' : kind
}

/**
 * 按 扩展名 判定文件类别（不含内容嗅探）
 */
export function getFileKindByFilename(filename: string, mediaPreview = true): FileKind {
  const ext = getExtension(filename)
  if (IMAGE_EXTENSIONS.has(ext))
    return normalizeFileKind('image', mediaPreview)
  if (PDF_EXTENSIONS.has(ext))
    return normalizeFileKind('pdf', mediaPreview)
  if (BINARY_EXTENSIONS.has(ext))
    return 'binary'
  return 'text'
}

/**
 * 内容嗅探：采样头部是否含二进制特征字符（NUL 等控制字符）。
 * 仅用于无扩展名/未知扩展名的兜底，避免把二进制乱码塞进 Monaco。
 *
 * 用 charCode 判断而不用正则：\u0000 类转义写进源码文件易被工具链误转成真实控制字符。
 */
export function looksLikeBinaryContent(content: string): boolean {
  if (!content)
    return false
  const sample = content.slice(0, SNIFF_LIMIT)
  // 控制字符 0-8、14-31 视为二进制特征；9-13 为 \t \n \v \f \r 等文本合法字符，排除
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i)
    if (code <= 8 || (code >= 14 && code <= 31))
      return true
  }
  return false
}

/**
 * 综合判定文件类别：显式标记优先，其次扩展名，最后对疑似文本的内容嗅探兜底。
 * @param mediaPreview false 时 image/pdf 归一化为 binary（对应 mediaPreview prop 关闭）
 */
export function resolveFileKind(
  filename: string,
  override?: FileKind,
  content = '',
  mediaPreview = true,
): FileKind {
  if (override)
    return normalizeFileKind(override, mediaPreview)
  const byExt = getFileKindByFilename(filename, mediaPreview)
  if (byExt !== 'text')
    return byExt
  // 扩展名判为文本但内容含二进制特征（如无扩展名的二进制文件），按二进制处理
  if (!getExtension(filename) && looksLikeBinaryContent(content))
    return 'binary'
  return 'text'
}
