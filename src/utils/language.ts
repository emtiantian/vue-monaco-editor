import type { FileIconInfo } from '../types'
import { getExtension } from './path'

/**
 * 扩展名 / 语言别名 → Monaco 语言 id 的统一映射
 */
export const MONACO_LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  json: 'json',
  md: 'markdown',
  mdown: 'markdown',
  markdown: 'markdown',
  go: 'go',
  java: 'java',
  rs: 'rust',
  html: 'html',
  css: 'css',
  yml: 'yaml',
  yaml: 'yaml',
  excel: 'plaintext',
  gitignore: 'plaintext',
}

export function getLanguageByFilename(filename: string): string {
  return MONACO_LANGUAGE_MAP[getExtension(filename)] || 'plaintext'
}

const FILE_ICON_MAP: Record<string, FileIconInfo> = {
  js: { label: 'JS', color: '#f7df1e', bg: '#332b00' },
  jsx: { label: 'JS', color: '#f7df1e', bg: '#332b00' },
  ts: { label: 'TS', color: '#3178c6', bg: '#0f1f33' },
  tsx: { label: 'TS', color: '#3178c6', bg: '#0f1f33' },
  py: { label: 'PY', color: '#3776ab', bg: '#0f1f33' },
  go: { label: 'GO', color: '#00add8', bg: '#001f2b' },
  java: { label: 'JV', color: '#b07219', bg: '#331a00' },
  rs: { label: 'RS', color: '#dea584', bg: '#331f14' },
  html: { label: 'H', color: '#e34c26', bg: '#331200' },
  css: { label: 'C', color: '#264de4', bg: '#0a1433' },
  json: { label: '{}', color: '#555555', bg: '#f0f0f0' },
  md: { label: 'M', color: '#083fa1', bg: '#e8f0fe' },
  yml: { label: 'Y', color: '#cb171e', bg: '#330508' },
  yaml: { label: 'Y', color: '#cb171e', bg: '#330508' },
  excel: { label: 'X', color: '#217346', bg: '#e6f4ea' },
  gitignore: { label: 'GIT', color: '#f05032', bg: '#33120c' },
}

export function getFileIconInfo(filename: string): FileIconInfo {
  const ext = getExtension(filename)
  return FILE_ICON_MAP[ext] || { label: ext.toUpperCase() || 'F', color: '#666666', bg: '#f0f0f0' }
}
