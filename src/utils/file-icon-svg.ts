import { getExtension } from './path'

/**
 * 彩色文件类型图标（零依赖内联 SVG）
 *
 * 精选高频扩展名，按 vscode-icons（MIT）风格手工简化为 16x16 单 path/双色 glyph；
 * 品牌色取自 vscode-icons 调色板。未命中的扩展名由 file-icon.vue 回退到文字徽章。
 *
 * 数据模型：parts 按序渲染，每段可独立 fill / stroke（stroke 统一圆角端点），
 * 以极小体积覆盖「字母方块」「logo 简化」「几何符号」三类形态。
 */

/** 单个绘制片段：d 必填，fill 与 stroke 至少其一 */
export interface FileSvgPart {
  d: string
  fill?: string
  stroke?: string
  strokeWidth?: number
}

/** 一个完整图标：viewBox 缺省为 0 0 16 16 */
export interface FileSvgIcon {
  viewBox?: string
  parts: FileSvgPart[]
}

/** 圆角方形底板（字母方块类图标的公共背景） */
const SQ = 'M3 1.5h10A1.5 1.5 0 0 1 14.5 3v10a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5z'

/* ---------- 字母笔画（白色描边，置于彩色方块上；复用 S/T 等） ---------- */
const L_T = 'M5.2 5h5.6M8 5v6'
const L_S = 'M10.6 5.7c-.5-1-1.7-1.5-2.8-1.2-1.2.3-1.9 1.5-1.2 2.4.6.8 1.8.8 2.7 1.2 1 .4 1.5 1.5.9 2.4-.6.9-2 1.1-3 .6-.4-.2-.8-.6-1-1'
const L_J = 'M10 5v4.4c0 1.3-1 2.1-2.3 2.1-.9 0-1.6-.4-2-1'
const L_G = 'M11.2 5.4a3.6 3.6 0 1 0 .3 4.6M11.6 8.2H9.2'
const L_R = 'M5.6 12.5V4.6h2.5a2.1 2.1 0 0 1 0 4.2H5.6m2.9 0 2.4 3.7'
const L_C = 'M11.4 5.6a3.5 3.5 0 1 0 0 4.8'
const L_H = 'M5.5 4.5v7M10.5 4.5v7M5.5 8h5'

/** 字母方块类图标的便捷构造 */
function letterSquare(bg: string, letters: string, fg = '#fff'): FileSvgIcon {
  return {
    parts: [
      { d: SQ, fill: bg },
      { d: letters, stroke: fg, strokeWidth: 1.6 },
    ],
  }
}

/* ---------- 目录（vscode-icons 同款 #dcb67a） ---------- */

/** 收起目录 */
export const FOLDER_SVG_ICON: FileSvgIcon = {
  parts: [
    { d: 'M1.5 4c0-.83.67-1.5 1.5-1.5h3.1c.45 0 .87.2 1.16.54L8.4 4.3H13c.83 0 1.5.67 1.5 1.5v.7H1.5z', fill: '#c99b62' },
    { d: 'M1.5 6.5h13l-1.06 6.03c-.12.68-.71 1.17-1.4 1.17H4c-.69 0-1.28-.49-1.4-1.17z', fill: '#dcb67a' },
  ],
}

/** 展开目录（前挡板下翻） */
export const FOLDER_OPEN_SVG_ICON: FileSvgIcon = {
  parts: [
    { d: 'M1.5 4c0-.83.67-1.5 1.5-1.5h3.1c.45 0 .87.2 1.16.54L8.4 4.3H13c.83 0 1.5.67 1.5 1.5V7H1.5z', fill: '#c99b62' },
    { d: 'M3.6 7h11.2c.66 0 1.14.62.98 1.26l-1.06 4.24A1.5 1.5 0 0 1 13.27 13.5H3.4A1.5 1.5 0 0 1 1.9 12l.24-3.76C2.18 7.52 2.77 7 3.6 7z', fill: '#e8c08f' },
  ],
}

/* ---------- 语言 logo 简化 ---------- */

/** Python 双蛇（简化） */
const PY_ICON: FileSvgIcon = {
  parts: [
    {
      d: 'M8 2c-2 0-2.9.85-2.9 2v1.6h5.4v.9H4.4C3 6.5 2 7.4 2 9s1 2.5 2.4 2.5h1.2V9.6c0-1.3 1.05-2.3 2.35-2.3h3.25C12.4 7.3 13 6.6 13 5.4v-1.4C13 2.85 11.6 2 10.4 2H8zm-1.4 1.4a.72.72 0 1 1 0 1.44.72.72 0 0 1 0-1.44z',
      fill: '#3572a5',
    },
    {
      d: 'M8 14c2 0 2.9-.85 2.9-2v-1.6H5.5v-.9h6.1C13 9.5 14 8.6 14 7s-1-2.5-2.4-2.5h-1.2v1.9c0 1.3-1.05 2.3-2.35 2.3H4.8C3.6 8.7 3 9.4 3 10.6v1.4C3 13.15 4.4 14 5.6 14H8zm1.4-1.4a.72.72 0 1 1 0-1.44.72.72 0 0 1 0 1.44z',
      fill: '#ffd43b',
    },
  ],
}

/** Vue 三层 V */
const VUE_ICON: FileSvgIcon = {
  parts: [
    { d: 'M1.8 2h3.4L8 7l2.8-5h3.4L8 14z', fill: '#41b883' },
    { d: 'M5.2 2h1.9L8 4.4 8.9 2h1.9L8 8.4z', fill: '#35495e' },
  ],
}

/** Java 咖啡杯 */
const JAVA_ICON: FileSvgIcon = {
  parts: [
    { d: 'M4 8.6h7v2.7a2.4 2.4 0 0 1-2.4 2.4H6.4A2.4 2.4 0 0 1 4 11.3z', fill: '#e76f00' },
    { d: 'M11 9.1h.7a1.65 1.65 0 0 1 0 3.3h-1.2', stroke: '#e76f00', strokeWidth: 1.2 },
    { d: 'M6.4 2.6c-.55.75.55 1.15 0 1.9M9.1 2.6c-.55.75.55 1.15 0 1.9', stroke: '#954000', strokeWidth: 1.1 },
    { d: 'M4.6 7.4c1 .6 2.2.9 3.4.9s2.4-.3 3.4-.9', stroke: '#954000', strokeWidth: 1.1 },
  ],
}

/** Docker 容器鲸鱼（简化为货箱+船体） */
const DOCKER_ICON: FileSvgIcon = {
  parts: [
    {
      d: 'M3.4 7.4h1.7v1.7H3.4zM5.5 7.4h1.7v1.7H5.5zM7.6 7.4h1.7v1.7H7.6zM5.5 5.3h1.7V7H5.5zM7.6 5.3h1.7V7H7.6zM9.7 7.4h1.7v1.7H9.7z',
      fill: '#2496ed',
    },
    {
      d: 'M1.6 9.9h12.9c-.35 2.4-2.1 3.7-5.4 3.7-3.1 0-5.6-1.2-7.5-3.7zM12.6 8.9c.5-.35 1.3-.5 2-.4-.15.5-.6 1.1-1.4 1.3z',
      fill: '#2496ed',
    },
  ],
}

/* ---------- 文档/数据类几何符号 ---------- */

/** 文档页 + 折角（txt/log 底形，color 参数化） */
function pageIcon(color: string, foldColor: string, withLines = false): FileSvgIcon {
  const parts: FileSvgPart[] = [
    { d: 'M4 1.5h5.5L13 5v8.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z', fill: color },
    { d: 'M9.5 1.5 13 5H9.5z', fill: foldColor },
  ]
  if (withLines)
    parts.push({ d: 'M6 8h4M6 10.2h4', stroke: '#fff', strokeWidth: 1.1 })
  return { parts }
}

/** Markdown 官方标记：圆角框 + M + 下箭头 */
const MARKDOWN_ICON: FileSvgIcon = {
  parts: [
    {
      d: 'M3 3.7h10a1.3 1.3 0 0 1 1.3 1.3v6a1.3 1.3 0 0 1-1.3 1.3H3A1.3 1.3 0 0 1 1.7 11V5A1.3 1.3 0 0 1 3 3.7z',
      stroke: '#4c89f0',
      strokeWidth: 1.3,
    },
    { d: 'M4.3 9.8V6.2l1.85 2.1L8 6.2v3.6', stroke: '#4c89f0', strokeWidth: 1.3 },
    { d: 'M11.1 6.4v3.2m0 0-1.35-1.35m1.35 1.35 1.35-1.35', stroke: '#4c89f0', strokeWidth: 1.3 },
  ],
}

/** JSON 花括号 */
const JSON_ICON: FileSvgIcon = {
  parts: [
    {
      d: 'M6.3 2.5c-1.5 0-2.1.75-2.1 1.9v1.8c0 .9-.45 1.45-1.6 1.65v.3c1.15.2 1.6.75 1.6 1.65v1.8c0 1.15.6 1.9 2.1 1.9',
      stroke: '#cbcb41',
      strokeWidth: 1.4,
    },
    {
      d: 'M9.7 2.5c1.5 0 2.1.75 2.1 1.9v1.8c0 .9.45 1.45 1.6 1.65v.3c-1.15.2-1.6.75-1.6 1.65v1.8c0 1.15-.6 1.9-2.1 1.9',
      stroke: '#cbcb41',
      strokeWidth: 1.4,
    },
  ],
}

/** HTML/JSX 尖括号（</>），color 参数化，斜杠可选 */
function codeBracketsIcon(color: string, slashColor?: string): FileSvgIcon {
  const parts: FileSvgPart[] = [
    { d: 'M5.4 4.6 2 8l3.4 3.4M10.6 4.6 14 8l-3.4 3.4', stroke: color, strokeWidth: 1.4 },
  ]
  if (slashColor)
    parts.push({ d: 'M9.2 3.4 6.8 12.6', stroke: slashColor, strokeWidth: 1.4 })
  return { parts }
}

/** CSS/预处理器 # 号，color 参数化 */
function hashIcon(color: string): FileSvgIcon {
  return {
    parts: [{ d: 'M6 3 4.8 13M11.2 3 10 13M3.5 6.3h9.6M2.9 9.7h9.6', stroke: color, strokeWidth: 1.4 }],
  }
}

/** 配置滑杆（yaml/toml/ini/env），color 参数化 */
function slidersIcon(color: string): FileSvgIcon {
  return {
    parts: [
      { d: 'M2.5 4.5h11M2.5 8h11M2.5 11.5h11', stroke: color, strokeWidth: 1.4 },
      { d: 'M10.4 3.1a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8zM5.4 6.6a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8zM9 10.1a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z', fill: color },
    ],
  }
}

/** 图片：相框 + 太阳 + 山丘 */
const IMAGE_ICON: FileSvgIcon = {
  parts: [
    { d: 'M2.7 3.2h10.6a1.2 1.2 0 0 1 1.2 1.2v7.2a1.2 1.2 0 0 1-1.2 1.2H2.7A1.2 1.2 0 0 1 1.5 11.6V4.4a1.2 1.2 0 0 1 1.2-1.2z', stroke: '#90a4ae', strokeWidth: 1.2 },
    { d: 'M10.7 5.6a1.05 1.05 0 1 1-2.1 0 1.05 1.05 0 0 1 2.1 0z', fill: '#ffb300' },
    { d: 'M3 11.3l3-3.2 2.4 2.4 1.5-1.5 3.1 2.9v.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z', fill: '#66bb6a' },
  ],
}

/** PDF：页 + 折角 + 红色标签带 */
const PDF_ICON: FileSvgIcon = {
  parts: [
    { d: 'M4 1.5h5.5L13 5v8.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z', fill: '#fafafa', stroke: '#c9ced4', strokeWidth: 0.9 },
    { d: 'M9.5 1.5 13 5H9.5z', fill: '#dde1e6' },
    { d: 'M4 6.6h8a1 1 0 0 1 1 1v1.6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7.6a1 1 0 0 1 1-1z', fill: '#e53935' },
  ],
}

/** 压缩包：袋身 + 拉链 */
const ARCHIVE_ICON: FileSvgIcon = {
  parts: [
    { d: 'M3 5h10v8a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 13z', fill: '#c99451' },
    { d: 'M3.6 2.5h8.8L13 5H3z', fill: '#a87940' },
    { d: 'M8 5v3.2l-1 1 1 1-.9.9', stroke: '#fff', strokeWidth: 1.2 },
  ],
}

/** 音频音符 */
const AUDIO_ICON: FileSvgIcon = {
  parts: [
    { d: 'M6.4 12.1V3.9l5-1v7.3', stroke: '#9b59b6', strokeWidth: 1.4 },
    { d: 'M6.4 12.1a1.45 1.35 0 1 1-2.9 0 1.45 1.35 0 0 1 2.9 0zM11.4 10.2a1.45 1.35 0 1 1-2.9 0 1.45 1.35 0 0 1 2.9 0z', fill: '#9b59b6' },
  ],
}

/** 视频：播放按钮 */
const VIDEO_ICON: FileSvgIcon = {
  parts: [
    { d: 'M2.9 3.4h10.2a1.4 1.4 0 0 1 1.4 1.4v6.4a1.4 1.4 0 0 1-1.4 1.4H2.9a1.4 1.4 0 0 1-1.4-1.4V4.8a1.4 1.4 0 0 1 1.4-1.4z', fill: '#e53935' },
    { d: 'M6.6 5.9v4.2L10.4 8z', fill: '#fff' },
  ],
}

/** 字体 A */
const FONT_ICON: FileSvgIcon = {
  parts: [{ d: 'M4.3 12.5 8 3.5l3.7 9M5.6 9.4h4.8', stroke: '#a074c4', strokeWidth: 1.5 }],
}

/** 二进制六边形 */
const BINARY_ICON: FileSvgIcon = {
  parts: [
    { d: 'M8 1.8 13.6 5v6L8 14.2 2.4 11V5z', fill: '#6e7781' },
    { d: 'M8 6.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z', fill: '#fff' },
  ],
}

/** SQL 数据库圆柱 */
const SQL_ICON: FileSvgIcon = {
  parts: [
    { d: 'M3 4.2c0-1.2 2.2-2.2 5-2.2s5 1 5 2.2v7.6c0 1.2-2.2 2.2-5 2.2s-5-1-5-2.2z', fill: '#e9902a' },
    { d: 'M3 4.2c0 1.1 2.2 2 5 2s5-.9 5-2-2.2-2-5-2-5 .9-5 2z', fill: '#f6bd7b' },
  ],
}

/** Shell 终端 */
const SHELL_ICON: FileSvgIcon = {
  parts: [
    { d: 'M2.5 3h11A1.5 1.5 0 0 1 15 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 11.5v-7A1.5 1.5 0 0 1 2.5 3z', fill: '#3d4c52' },
    { d: 'M4.2 5.6 6.6 8l-2.4 2.4M8.2 10.4h3.6', stroke: '#fff', strokeWidth: 1.3 },
  ],
}

/** Git 分支（.gitignore 等） */
const GIT_ICON: FileSvgIcon = {
  parts: [
    { d: 'M4 5.7v4.6M12 5.7c0 3-2.4 3.9-5.2 3.9', stroke: '#f14e32', strokeWidth: 1.3 },
    { d: 'M4 2.4a1.65 1.65 0 1 1 0 3.3 1.65 1.65 0 0 1 0-3.3zM4 10.3a1.65 1.65 0 1 1 0 3.3 1.65 1.65 0 0 1 0-3.3zM12 2.4a1.65 1.65 0 1 1 0 3.3 1.65 1.65 0 0 1 0-3.3z', fill: '#f14e32' },
  ],
}

/** 电子表格（xls/xlsx）：绿底白格 */
const XLS_ICON: FileSvgIcon = {
  parts: [
    { d: 'M2.9 2.5h10.2a1.4 1.4 0 0 1 1.4 1.4v8.2a1.4 1.4 0 0 1-1.4 1.4H2.9a1.4 1.4 0 0 1-1.4-1.4V3.9a1.4 1.4 0 0 1 1.4-1.4z', fill: '#217346' },
    { d: 'M6.2 3v10M9.8 3v10M2 8h12', stroke: '#fff', strokeWidth: 1.1 },
  ],
}

/** Word 文档（doc/docx）：蓝页白行 */
function docIcon(): FileSvgIcon {
  return {
    parts: [
      { d: 'M4 1.5h5.5L13 5v8.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z', fill: '#2b579a' },
      { d: 'M9.5 1.5 13 5H9.5z', fill: '#4a6fa5' },
      { d: 'M6 8h4M6 10.2h4M6 5.8h2.4', stroke: '#fff', strokeWidth: 1.1 },
    ],
  }
}

/** PPT（ppt/pptx）：橙底白播放屏 */
const PPT_ICON: FileSvgIcon = {
  parts: [
    { d: 'M2.9 3h10.2a1.4 1.4 0 0 1 1.4 1.4v6.2a1.4 1.4 0 0 1-1.4 1.4H2.9a1.4 1.4 0 0 1-1.4-1.4V4.4A1.4 1.4 0 0 1 2.9 3z', fill: '#d24726' },
    { d: 'M6.4 5.6v4.8L11 8z', fill: '#fff' },
  ],
}

/* ---------- 字形族常量（同族扩展名复用同一实例） ---------- */

const JS_ICON = letterSquare('#f5de19', L_J, '#323330')
const TS_ICON = letterSquare('#3178c6', `${L_T} ${L_S}`)
const C_ICON = letterSquare('#a8b9cc', L_C, '#1e3a52')
const CPP_ICON = letterSquare('#00599c', L_C)
const H_ICON = letterSquare('#8e44ad', L_H)
const GO_ICON = letterSquare('#00add8', L_G)
const RS_ICON = letterSquare('#ce422b', L_R)
const JSX_ICON = codeBracketsIcon('#61dafb')
const HTML_ICON = codeBracketsIcon('#e44d26', '#f16529')
const XML_ICON = codeBracketsIcon('#0060ac')
const CSS_ICON = hashIcon('#264de4')
const SCSS_ICON = hashIcon('#cf649a')
const MD_ICON = MARKDOWN_ICON
const YAML_ICON = slidersIcon('#cb3837')
const TOML_ICON = slidersIcon('#c94f7c')
const INI_ICON = slidersIcon('#87909e')
const TXT_ICON = pageIcon('#8a99a8', '#aebac4')
const LOG_ICON = pageIcon('#98a4ae', '#b6c1ca', true)
const IMG_ICON = IMAGE_ICON
const ZIP_ICON = ARCHIVE_ICON
const AUDIO_FAMILY_ICON = AUDIO_ICON
const VIDEO_FAMILY_ICON = VIDEO_ICON
const FONT_FAMILY_ICON = FONT_ICON
const BIN_FAMILY_ICON = BINARY_ICON
const XLS_FAMILY_ICON = XLS_ICON
const DOC_FAMILY_ICON = docIcon()

/* ---------- 扩展名映射 ---------- */

/** 扩展名（小写、无点）→ 图标 */
export const EXT_SVG_ICON_MAP: Record<string, FileSvgIcon> = {
  // 语言
  py: PY_ICON,
  pyi: PY_ICON,
  js: JS_ICON,
  mjs: JS_ICON,
  cjs: JS_ICON,
  ts: TS_ICON,
  mts: TS_ICON,
  tsx: TS_ICON,
  jsx: JSX_ICON,
  vue: VUE_ICON,
  go: GO_ICON,
  rs: RS_ICON,
  java: JAVA_ICON,
  c: C_ICON,
  cpp: CPP_ICON,
  cc: CPP_ICON,
  h: H_ICON,
  hpp: H_ICON,
  // 标记与样式
  html: HTML_ICON,
  htm: HTML_ICON,
  css: CSS_ICON,
  scss: SCSS_ICON,
  sass: SCSS_ICON,
  less: CSS_ICON,
  json: JSON_ICON,
  jsonc: JSON_ICON,
  json5: JSON_ICON,
  md: MD_ICON,
  markdown: MD_ICON,
  mdown: MD_ICON,
  xml: XML_ICON,
  yml: YAML_ICON,
  yaml: YAML_ICON,
  toml: TOML_ICON,
  ini: INI_ICON,
  cfg: INI_ICON,
  conf: INI_ICON,
  env: INI_ICON,
  properties: INI_ICON,
  editorconfig: INI_ICON,
  txt: TXT_ICON,
  log: LOG_ICON,
  sql: SQL_ICON,
  sh: SHELL_ICON,
  bash: SHELL_ICON,
  zsh: SHELL_ICON,
  gitignore: GIT_ICON,
  gitattributes: GIT_ICON,
  gitmodules: GIT_ICON,
  // 媒体与二进制
  png: IMG_ICON,
  jpg: IMG_ICON,
  jpeg: IMG_ICON,
  gif: IMG_ICON,
  webp: IMG_ICON,
  svg: IMG_ICON,
  bmp: IMG_ICON,
  ico: IMG_ICON,
  pdf: PDF_ICON,
  zip: ZIP_ICON,
  gz: ZIP_ICON,
  tar: ZIP_ICON,
  rar: ZIP_ICON,
  '7z': ZIP_ICON,
  jar: ZIP_ICON,
  mp3: AUDIO_FAMILY_ICON,
  wav: AUDIO_FAMILY_ICON,
  ogg: AUDIO_FAMILY_ICON,
  flac: AUDIO_FAMILY_ICON,
  mp4: VIDEO_FAMILY_ICON,
  avi: VIDEO_FAMILY_ICON,
  mov: VIDEO_FAMILY_ICON,
  mkv: VIDEO_FAMILY_ICON,
  webm: VIDEO_FAMILY_ICON,
  woff: FONT_FAMILY_ICON,
  woff2: FONT_FAMILY_ICON,
  ttf: FONT_FAMILY_ICON,
  otf: FONT_FAMILY_ICON,
  eot: FONT_FAMILY_ICON,
  exe: BIN_FAMILY_ICON,
  dll: BIN_FAMILY_ICON,
  so: BIN_FAMILY_ICON,
  dylib: BIN_FAMILY_ICON,
  bin: BIN_FAMILY_ICON,
  dat: BIN_FAMILY_ICON,
  // Office
  xls: XLS_FAMILY_ICON,
  xlsx: XLS_FAMILY_ICON,
  csv: XLS_FAMILY_ICON,
  doc: DOC_FAMILY_ICON,
  docx: DOC_FAMILY_ICON,
  ppt: PPT_ICON,
  pptx: PPT_ICON,
}

/* ---------- 文件名特判（无扩展名的知名文件） ---------- */

const BASENAME_SVG_ICON_MAP: Record<string, FileSvgIcon> = {
  dockerfile: DOCKER_ICON,
}

/**
 * 按文件名取彩色 SVG 图标；未命中返回 null（调用方回退文字徽章）
 */
export function getSvgIconByFilename(filename: string): FileSvgIcon | null {
  const lower = filename.toLowerCase()
  const byName = BASENAME_SVG_ICON_MAP[lower]
  if (byName)
    return byName
  return EXT_SVG_ICON_MAP[getExtension(lower)] ?? null
}
