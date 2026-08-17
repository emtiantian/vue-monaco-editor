/**
 * Monaco Editor 按需加载配置
 *
 * 常驻语言：javascript / typescript / python / json / markdown
 * 其他语言：打开对应文件时动态 import 注册
 */

import type * as monacoTypes from 'monaco-editor'
import * as monacoCore from 'monaco-editor'

// 跳转命令：F12 / goToDefinition / revealDefinition / peekDefinition
// 纯副作用导入：保留 contrib 模块在 bundle 中以执行命令注册（其导出符号未在类型声明中公开）
import 'monaco-editor/esm/vs/editor/contrib/gotoSymbol/browser/goToCommands.js'
// Cmd/Ctrl+点击 手势
import 'monaco-editor/esm/vs/editor/contrib/gotoSymbol/browser/link/goToDefinitionAtPosition.js'
import { MONACO_LANGUAGE_MAP } from './language'
// 常驻语言：注册语法高亮
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js'

import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js'

import 'monaco-editor/esm/vs/basic-languages/python/python.contribution.js'

import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js'

// TypeScript / JavaScript 语言服务（提供 IntelliSense）
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js'

// JSON 语言服务（同时注册 json 语言、提供格式化/schema 提示等）
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js'
// 注册 Suggest 相关命令，例如 editor.action.triggerSuggest
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js'
// peek 视图依赖
import 'monaco-editor/esm/vs/editor/contrib/peekView/browser/peekView.js'

// 对齐主流编辑器体验：链接检测与代码折叠
import 'monaco-editor/esm/vs/editor/contrib/links/browser/links.js'
import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js'

export const monaco = monacoCore as typeof monacoTypes

// 已注册的语言集合（避免重复注册）
const registeredLanguages = new Set<string>([
  'javascript',
  'typescript',
  'python',
  'json',
  'markdown',
])

/**
 * 将任意语言标识转换为 Monaco 标准语言 id
 */
export function normalizeLanguageId(language: string): string {
  return MONACO_LANGUAGE_MAP[language.toLowerCase()] || language.toLowerCase()
}

/**
 * 判断是否为 Monaco TypeScript worker 处理的语言（javascript / typescript）
 */
export function isJsTsLanguage(language: string): boolean {
  const id = normalizeLanguageId(language)
  return id === 'javascript' || id === 'typescript'
}

/**
 * 判断是否为 Python 语言
 */
export function isPythonLanguage(language: string): boolean {
  return normalizeLanguageId(language) === 'python'
}

let tsDefaultsConfigured = false

/**
 * 配置 Monaco TS/JS 语言服务默认 compiler options，使跨文件解析更完整。
 * 本函数应在 ensureMonacoEnvironment() 之后、创建 TS/JS model 之前调用，
 * 保证 worker 环境就绪。
 */
export function configureTsDefaults() {
  if (tsDefaultsConfigured)
    return

  const compilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowJs: true,
    // 启用 JS 文件语义检查：TS worker 按 model 扩展名（.js）将文件作为 JS 脚本处理，
    // 默认不对其做类型检查，需 checkJs 才会报告类型不匹配 / 属性不存在等语义错误。
    checkJs: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    allowNonTsExtensions: true,
  }

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions)
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions)

  // 启用全量 model 同步：让 TS/JS worker 知道所有已创建 model，
  // 否则跨文件 goToDefinition / findAllReferences 只能解析当前文件。
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)

  const diagnosticsOptions = {
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  }

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(diagnosticsOptions)
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(diagnosticsOptions)

  tsDefaultsConfigured = true
}

/**
 * 动态注册 Monaco 语言（仅 basic-languages 高亮）
 * 常驻语言已在上面静态导入，无需重复注册
 */
export async function ensureLanguageLoaded(language: string): Promise<void> {
  const langId = normalizeLanguageId(language)

  // 已在 Monaco 中注册则跳过
  const languages = monaco.languages.getLanguages() as Array<{ id: string }>
  if (languages.some(l => l.id === langId)) {
    return
  }

  // 已在按需加载中注册则跳过
  if (registeredLanguages.has(langId)) {
    return
  }

  // 按需加载对应语言的 register 文件
  const loader = getLanguageLoader(langId)
  if (!loader) {
    console.warn(`[Monaco] 未知语言，将使用 plaintext: ${langId}`)
    return
  }

  try {
    await loader()
    registeredLanguages.add(langId)
  }
  catch (err) {
    console.warn(`[Monaco] 加载语言失败: ${langId}`, err)
  }
}

function getLanguageLoader(langId: string): (() => Promise<unknown>) | null {
  const loaders: Record<string, () => Promise<unknown>> = {
    'abap': () => import('monaco-editor/esm/vs/basic-languages/abap/abap.contribution.js'),
    'apex': () => import('monaco-editor/esm/vs/basic-languages/apex/apex.contribution.js'),
    'azcli': () => import('monaco-editor/esm/vs/basic-languages/azcli/azcli.contribution.js'),
    'bat': () => import('monaco-editor/esm/vs/basic-languages/bat/bat.contribution.js'),
    'bicep': () => import('monaco-editor/esm/vs/basic-languages/bicep/bicep.contribution.js'),
    'cameligo': () =>
      import('monaco-editor/esm/vs/basic-languages/cameligo/cameligo.contribution.js'),
    'clojure': () => import('monaco-editor/esm/vs/basic-languages/clojure/clojure.contribution.js'),
    'coffee': () => import('monaco-editor/esm/vs/basic-languages/coffee/coffee.contribution.js'),
    'cpp': () => import('monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js'),
    'csharp': () => import('monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution.js'),
    'csp': () => import('monaco-editor/esm/vs/basic-languages/csp/csp.contribution.js'),
    'css': () => import('monaco-editor/esm/vs/basic-languages/css/css.contribution.js'),
    'cypher': () => import('monaco-editor/esm/vs/basic-languages/cypher/cypher.contribution.js'),
    'dart': () => import('monaco-editor/esm/vs/basic-languages/dart/dart.contribution.js'),
    'dockerfile': () =>
      import('monaco-editor/esm/vs/basic-languages/dockerfile/dockerfile.contribution.js'),
    'ecl': () => import('monaco-editor/esm/vs/basic-languages/ecl/ecl.contribution.js'),
    'elixir': () => import('monaco-editor/esm/vs/basic-languages/elixir/elixir.contribution.js'),
    'flow9': () => import('monaco-editor/esm/vs/basic-languages/flow9/flow9.contribution.js'),
    'fsharp': () => import('monaco-editor/esm/vs/basic-languages/fsharp/fsharp.contribution.js'),
    'freemarker2': () =>
      import('monaco-editor/esm/vs/basic-languages/freemarker2/freemarker2.contribution.js'),
    'go': () => import('monaco-editor/esm/vs/basic-languages/go/go.contribution.js'),
    'graphql': () => import('monaco-editor/esm/vs/basic-languages/graphql/graphql.contribution.js'),
    'handlebars': () =>
      import('monaco-editor/esm/vs/basic-languages/handlebars/handlebars.contribution.js'),
    'hcl': () => import('monaco-editor/esm/vs/basic-languages/hcl/hcl.contribution.js'),
    'html': () => import('monaco-editor/esm/vs/basic-languages/html/html.contribution.js'),
    'ini': () => import('monaco-editor/esm/vs/basic-languages/ini/ini.contribution.js'),
    'java': () => import('monaco-editor/esm/vs/basic-languages/java/java.contribution.js'),
    'julia': () => import('monaco-editor/esm/vs/basic-languages/julia/julia.contribution.js'),
    'kotlin': () => import('monaco-editor/esm/vs/basic-languages/kotlin/kotlin.contribution.js'),
    'less': () => import('monaco-editor/esm/vs/basic-languages/less/less.contribution.js'),
    'lexon': () => import('monaco-editor/esm/vs/basic-languages/lexon/lexon.contribution.js'),
    'lua': () => import('monaco-editor/esm/vs/basic-languages/lua/lua.contribution.js'),
    'm3': () => import('monaco-editor/esm/vs/basic-languages/m3/m3.contribution.js'),
    'mips': () => import('monaco-editor/esm/vs/basic-languages/mips/mips.contribution.js'),
    'msdax': () => import('monaco-editor/esm/vs/basic-languages/msdax/msdax.contribution.js'),
    'mysql': () => import('monaco-editor/esm/vs/basic-languages/mysql/mysql.contribution.js'),
    'objective-c': () =>
      import('monaco-editor/esm/vs/basic-languages/objective-c/objective-c.contribution.js'),
    'pascal': () => import('monaco-editor/esm/vs/basic-languages/pascal/pascal.contribution.js'),
    'pascaligo': () =>
      import('monaco-editor/esm/vs/basic-languages/pascaligo/pascaligo.contribution.js'),
    'perl': () => import('monaco-editor/esm/vs/basic-languages/perl/perl.contribution.js'),
    'pgsql': () => import('monaco-editor/esm/vs/basic-languages/pgsql/pgsql.contribution.js'),
    'php': () => import('monaco-editor/esm/vs/basic-languages/php/php.contribution.js'),
    'pla': () => import('monaco-editor/esm/vs/basic-languages/pla/pla.contribution.js'),
    'postiats': () =>
      import('monaco-editor/esm/vs/basic-languages/postiats/postiats.contribution.js'),
    'powerquery': () =>
      import('monaco-editor/esm/vs/basic-languages/powerquery/powerquery.contribution.js'),
    'powershell': () =>
      import('monaco-editor/esm/vs/basic-languages/powershell/powershell.contribution.js'),
    'protobuf': () =>
      import('monaco-editor/esm/vs/basic-languages/protobuf/protobuf.contribution.js'),
    'pug': () => import('monaco-editor/esm/vs/basic-languages/pug/pug.contribution.js'),
    'qsharp': () => import('monaco-editor/esm/vs/basic-languages/qsharp/qsharp.contribution.js'),
    'r': () => import('monaco-editor/esm/vs/basic-languages/r/r.contribution.js'),
    'razor': () => import('monaco-editor/esm/vs/basic-languages/razor/razor.contribution.js'),
    'redis': () => import('monaco-editor/esm/vs/basic-languages/redis/redis.contribution.js'),
    'redshift': () =>
      import('monaco-editor/esm/vs/basic-languages/redshift/redshift.contribution.js'),
    'restructuredtext': () =>
      import(
        'monaco-editor/esm/vs/basic-languages/restructuredtext/restructuredtext.contribution.js',
      ),
    'ruby': () => import('monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution.js'),
    'rust': () => import('monaco-editor/esm/vs/basic-languages/rust/rust.contribution.js'),
    'sb': () => import('monaco-editor/esm/vs/basic-languages/sb/sb.contribution.js'),
    'scala': () => import('monaco-editor/esm/vs/basic-languages/scala/scala.contribution.js'),
    'scheme': () => import('monaco-editor/esm/vs/basic-languages/scheme/scheme.contribution.js'),
    'scss': () => import('monaco-editor/esm/vs/basic-languages/scss/scss.contribution.js'),
    'shell': () => import('monaco-editor/esm/vs/basic-languages/shell/shell.contribution.js'),
    'solidity': () =>
      import('monaco-editor/esm/vs/basic-languages/solidity/solidity.contribution.js'),
    'sophia': () => import('monaco-editor/esm/vs/basic-languages/sophia/sophia.contribution.js'),
    'sparql': () => import('monaco-editor/esm/vs/basic-languages/sparql/sparql.contribution.js'),
    'sql': () => import('monaco-editor/esm/vs/basic-languages/sql/sql.contribution.js'),
    'st': () => import('monaco-editor/esm/vs/basic-languages/st/st.contribution.js'),
    'swift': () => import('monaco-editor/esm/vs/basic-languages/swift/swift.contribution.js'),
    'systemverilog': () =>
      import('monaco-editor/esm/vs/basic-languages/systemverilog/systemverilog.contribution.js'),
    'tcl': () => import('monaco-editor/esm/vs/basic-languages/tcl/tcl.contribution.js'),
    'twig': () => import('monaco-editor/esm/vs/basic-languages/twig/twig.contribution.js'),
    'vb': () => import('monaco-editor/esm/vs/basic-languages/vb/vb.contribution.js'),
    'xml': () => import('monaco-editor/esm/vs/basic-languages/xml/xml.contribution.js'),
    'yaml': () => import('monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js'),
  }

  return loaders[langId] || null
}

/**
 * 清空指定模型上的 Pyright diagnostic markers。
 * 放在此处是为了让 web-monaco-editor.vue 无需静态 import python-lsp.ts。
 */
export function clearPythonMarkers(model: monacoTypes.editor.ITextModel | null): void {
  if (!model)
    return
  monaco.editor.setModelMarkers(model, 'Pyright', [])
}

const tsWarmPromises = new Map<string, Promise<void>>()

/**
 * 预热 TS/JS worker，让 IntelliSense 在文件打开后尽快可用。
 *
 * 通过 getTypeScriptWorker / getJavaScriptWorker 获取 worker 代理，
 * 并调用一次廉价的 `getNavigationTree` 强制 worker 初始化该文件的 TS 程序。
 */
export async function warmTsWorker(model: monacoTypes.editor.ITextModel): Promise<void> {
  const languageId = model.getLanguageId()
  if (languageId !== 'javascript' && languageId !== 'typescript')
    return

  const uri = model.uri.toString()
  if (tsWarmPromises.has(uri))
    return tsWarmPromises.get(uri)!

  const promise = (async () => {
    const getWorker = languageId === 'typescript'
      ? monaco.languages.typescript.getTypeScriptWorker
      : monaco.languages.typescript.getJavaScriptWorker

    const getWorkerProxy = await getWorker()
    const worker = await getWorkerProxy(model.uri)
    // 强制 worker 解析该文件，触发 TS 程序初始化
    await worker.getNavigationTree(uri)
  })().catch((err) => {
    console.warn('[Monaco] Failed to warm TS/JS worker', err)
  })

  tsWarmPromises.set(uri, promise)
  return promise
}
