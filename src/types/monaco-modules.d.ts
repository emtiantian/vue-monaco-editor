// Monaco Editor ESM 内部模块类型声明
// 这些模块没有官方类型定义，统一声明为 any

declare module 'monaco-editor/esm/vs/editor/editor.api' {
  export * from 'monaco-editor'
}

declare module 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js' {
  const content: unknown
  export default content
}

declare module 'monaco-editor/esm/vs/language/json/monaco.contribution.js' {
  const content: unknown
  export default content
}
