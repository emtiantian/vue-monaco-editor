import type { editor } from 'monaco-editor'

export interface TokenColorMap {
  property: string
  method: string
  function: string
  class: string
  parameter: string
  namespace: string
  variable: string
}

const TOKEN_TYPES: (keyof TokenColorMap)[] = [
  'property',
  'method',
  'function',
  'class',
  'parameter',
  'namespace',
  'variable',
]

export function createThemeData(
  base: 'vs' | 'vs-dark' | 'hc-black',
  colors: TokenColorMap,
): editor.IStandaloneThemeData {
  // rules 的 token 名与 python-semantic-tokens.ts 的 semantic token 类型一一对应。
  // monaco standalone 在 getTokenStyleMetadata 里用 _match([type, ...modifiers].join('.'))
  // 匹配 rules——即把 semantic token type 直接当作 scope，因此这些 rules 命中语义 token。
  // 注意：monaco standalone 主题不支持 semanticTokenColors 字段，只能走 rules。
  return {
    base,
    inherit: true,
    rules: TOKEN_TYPES.map(type => ({ token: type, foreground: colors[type] })),
    colors: {},
  }
}
