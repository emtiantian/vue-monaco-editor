// 基于 monaco-pyright-lsp/src/index.ts 改造，支持多文档 LSP。
// 使用本地的 pyright-lsp-client.ts 中的 LspClient，允许跨文件 definition/rename/diagnostics。

import type { CancellationToken, editor, IRange, languages, MarkerSeverity, Position } from 'monaco-editor'
import type _monaco from 'monaco-editor'
import type { UserFolder } from 'monaco-pyright-lsp/dist/message'
import type {
  CompletionItem,
  CompletionList,
  Definition,
  Location,
  LocationLink,
  MarkupContent,
  ParameterInformation,
  Range,
  TextDocumentEdit,
} from 'vscode-languageserver'
import type { CancellationToken as LspCancellationToken } from 'vscode-languageserver'
import {
  DiagnosticSeverity,
  InsertReplaceEdit,
  CompletionItemKind as LspCompletionItemKind,
} from 'vscode-languageserver'
import { LspClient } from './pyright-lsp-client'

type MonacoModule = typeof _monaco

export interface MonacoPyrightProviderFeatures {
  hover: boolean
  completion: boolean
  signatureHelp: boolean
  rename: boolean
  findDefinition: boolean
}

export interface MonacoPyrightOptions {
  features: Partial<MonacoPyrightProviderFeatures>

  /** Project Python files to inject into Pyright file system */
  userFiles?: UserFolder

  /** Pyright workspace root；传 Python 文件公共目录可改善同目录模块解析 */
  projectPath?: string

  /** Pyright extraPaths，指向 worker 中用户文件目录（/typings 前缀），使 import 解析能找到项目模块 */
  extraPaths?: string[]
}

const defaultOptions: MonacoPyrightOptions = {
  features: {
    hover: true,
    completion: true,
    signatureHelp: true,
    rename: true,
    findDefinition: true,
  },
}

/**
 * Pyright worker 内部用户文件挂载前缀（原库 createUserFiles("/typings", ...) 写死）。
 * definition/rename 返回的 uri 会带此前缀，需剥离以映射回 Monaco model 的原始 uri。
 * ⚠️ 与原库内部实现耦合：若原库升级改前缀，此处需同步修改。
 */
const TYPINGS_URI_PREFIX = '/typings'

function mapLspUriToMonacoUri(monacoMod: MonacoModule, lspUri: string): _monaco.Uri {
  // definition/rename 返回的 uri 可能是 file:///typings/<path>，与 Monaco model 的原始 uri
  // （file:///<path>）不匹配：Cmd+悬停下划线手势的 createModelReference 找不到目标 model，
  // 因而不显示可跳转标记；openCodeEditor 也需回退才能命中。去掉 /typings 前缀统一映射到 model uri。
  const parsed = monacoMod.Uri.parse(lspUri)
  if (parsed.path.startsWith(TYPINGS_URI_PREFIX)) {
    const stripped = parsed.path.slice(TYPINGS_URI_PREFIX.length) || '/'
    return monacoMod.Uri.file(stripped)
  }
  return parsed
}

function isLocationLink(item: Location | LocationLink): item is LocationLink {
  return typeof (item as LocationLink).targetUri === 'string'
}

export class MonacoPyrightProvider {
  lspClient: LspClient
  options: MonacoPyrightOptions
  monacoMod?: MonacoModule
  /** 已收到 Pyright 诊断的 Monaco uri（经 mapLspUriToMonacoUri 转换后），用于判断诊断是否已到达 */
  private diagnosticsReceivedUris = new Set<string>()
  /** 等待指定 uri 首次诊断到达的回调队列 */
  private diagnosticsWaiters = new Map<string, Array<() => void>>()

  public constructor(options?: Partial<MonacoPyrightOptions>) {
    this.lspClient = new LspClient()

    const finalOptions: MonacoPyrightOptions = {
      ...defaultOptions,
      ...options,
      features: {
        ...defaultOptions.features,
        ...options?.features,
      },
    }

    this.options = finalOptions
  }

  async init(monacoModule: MonacoModule) {
    this.monacoMod = monacoModule

    const options = this.options

    // 项目 Python 文件注入 Pyright 文件系统
    const userFolder: UserFolder = {
      ...options.userFiles,
    }

    const projectPath = options.projectPath ?? '/'
    await this.lspClient.initialize(projectPath, userFolder)
    await this.lspClient.updateSettings(this.options.extraPaths)

    if (options.features.hover) {
      monacoModule.languages.registerHoverProvider('python', {
        provideHover: this.onHover.bind(this),
      })
    }

    if (options.features.completion) {
      monacoModule.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: this.onCompletionRequest.bind(this),
        resolveCompletionItem: this.onResolveCompletion.bind(this),
        triggerCharacters: ['.', '[', '"', '\''],
      })
    }

    if (options.features.signatureHelp) {
      monacoModule.languages.registerSignatureHelpProvider('python', {
        provideSignatureHelp: this.onSignatureHelp.bind(this),
        signatureHelpTriggerCharacters: ['(', ','],
      })
    }

    if (options.features.findDefinition) {
      monacoModule.languages.registerDefinitionProvider('python', {
        provideDefinition: this.provideDefinition.bind(this),
      })
    }

    if (options.features.rename) {
      monacoModule.languages.registerRenameProvider('python', {
        provideRenameEdits: this.provideRenameEdits.bind(this),
      })
    }

    this.setupDiagnosticsCallback()
  }

  private setupDiagnosticsCallback() {
    this.lspClient.setupDiagnosticsCallback((uri, diagnostics) => {
      const monacoUri = mapLspUriToMonacoUri(this.monacoMod!, uri)
      const monacoUriStr = monacoUri.toString()
      const model = this.monacoMod?.editor.getModel(monacoUri)
      if (!model) {
        this.markDiagnosticsReceived(monacoUriStr)
        return
      }

      const markers = diagnostics.map(diag => ({
        ...this.convertRange(diag.range),
        severity: this.convertSeverity(diag.severity || DiagnosticSeverity.Hint),
        message: diag.message,
      }))

      this.monacoMod?.editor?.setModelMarkers(model, 'Pyright', markers)
      this.markDiagnosticsReceived(monacoUriStr)
    })
  }

  /** 标记某 Monaco uri 已收到诊断，并唤醒所有等待该 uri 的 promise */
  private markDiagnosticsReceived(monacoUriStr: string) {
    if (this.diagnosticsReceivedUris.has(monacoUriStr))
      return
    this.diagnosticsReceivedUris.add(monacoUriStr)
    const waiters = this.diagnosticsWaiters.get(monacoUriStr)
    if (waiters) {
      this.diagnosticsWaiters.delete(monacoUriStr)
      waiters.forEach(fn => fn())
    }
  }

  /** 指定 Monaco uri 是否已收到过 Pyright 诊断 */
  hasDiagnosticsFor(monacoUriStr: string): boolean {
    return this.diagnosticsReceivedUris.has(monacoUriStr)
  }

  /**
   * 等待指定 Monaco uri 的首次 Pyright 诊断。
   * 已收到则立即 resolve(true)；否则等到收到（resolve(true)）或超时（resolve(false)）。
   * 用于驱动编辑器"LSP 分析中"提示：loading 消失后若未收到则显示，收到后隐藏。
   */
  waitForDiagnostics(monacoUriStr: string, timeoutMs = 15000): Promise<boolean> {
    if (this.diagnosticsReceivedUris.has(monacoUriStr))
      return Promise.resolve(true)
    return new Promise<boolean>((resolve) => {
      const onReady = () => {
        clearTimeout(timer)
        resolve(true)
      }
      const timer = setTimeout(() => {
        const waiters = this.diagnosticsWaiters.get(monacoUriStr)
        if (waiters) {
          const idx = waiters.indexOf(onReady)
          if (idx >= 0)
            waiters.splice(idx, 1)
          if (waiters.length === 0)
            this.diagnosticsWaiters.delete(monacoUriStr)
        }
        resolve(false)
      }, timeoutMs)
      const waiters = this.diagnosticsWaiters.get(monacoUriStr) ?? []
      waiters.push(onReady)
      this.diagnosticsWaiters.set(monacoUriStr, waiters)
    })
  }

  convertSeverity(severity: DiagnosticSeverity): MarkerSeverity {
    const markerSeverity = this.monacoMod!.MarkerSeverity
    switch (severity) {
      case DiagnosticSeverity.Error:
        return markerSeverity.Error

      case DiagnosticSeverity.Warning:
        return markerSeverity.Warning

      case DiagnosticSeverity.Information:
        return markerSeverity.Info

      case DiagnosticSeverity.Hint:
        return markerSeverity.Hint

      default:
        return markerSeverity.Error
    }
  }

  async provideRenameEdits(
    model: editor.ITextModel,
    position: Position,
    newName: string,
    token: CancellationToken,
  ): Promise<(languages.WorkspaceEdit & languages.Rejection) | null> {
    const uri = model.uri.toString()
    const results = await this.lspClient.rename(uri, model.getValue(), this.convertLspPosition(position), newName, token as unknown as LspCancellationToken)

    if (!results)
      return null

    if (results.documentChanges) {
      const edits: languages.IWorkspaceTextEdit[] = []

      for (const docChange of results.documentChanges) {
        if (!('textDocument' in docChange))
          continue
        const textDocEdit = docChange as TextDocumentEdit
        const targetUri = mapLspUriToMonacoUri(this.monacoMod!, textDocEdit.textDocument.uri)

        for (const edit of textDocEdit.edits) {
          edits.push({
            resource: targetUri,
            textEdit: {
              range: this.convertRange(edit.range),
              text: edit.newText,
            },
            versionId: undefined,
          })
        }
      }

      return { edits }
    }

    if (results.changes) {
      const edits: languages.IWorkspaceTextEdit[] = []

      for (const [lspUri, textEdits] of Object.entries(results.changes)) {
        const targetUri = mapLspUriToMonacoUri(this.monacoMod!, lspUri)
        for (const edit of textEdits) {
          edits.push({
            resource: targetUri,
            textEdit: {
              range: this.convertRange(edit.range),
              text: edit.newText,
            },
            versionId: undefined,
          })
        }
      }

      return { edits }
    }

    return null
  }

  async provideDefinition(
    model: editor.ITextModel,
    position: Position,
    token: CancellationToken,
  ): Promise<languages.Definition | languages.LocationLink[] | null> {
    const uri = model.uri.toString()
    const results = await this.lspClient.getDefinition(uri, model.getValue(), {
      line: position.lineNumber - 1,
      character: position.column - 1,
    }, token as unknown as LspCancellationToken) as Definition

    if (!results)
      return null

    const items = Array.isArray(results) ? results : [results]
    if (items.length === 0)
      return null

    return items.map((item) => {
      // LSP LocationLink
      if (isLocationLink(item)) {
        return {
          uri: mapLspUriToMonacoUri(this.monacoMod!, item.targetUri),
          range: this.convertRange(item.targetRange),
          targetSelectionRange: item.targetSelectionRange
            ? this.convertRange(item.targetSelectionRange)
            : undefined,
          originSelectionRange: item.originSelectionRange
            ? this.convertRange(item.originSelectionRange)
            : undefined,
        }
      }

      // LSP Location
      return {
        uri: mapLspUriToMonacoUri(this.monacoMod!, item.uri),
        range: this.convertRange(item.range),
      }
    })
  }

  async onSignatureHelp(
    model: editor.ITextModel,
    position: Position,
    token: CancellationToken,
    _context: languages.SignatureHelpContext,
  ): Promise<languages.SignatureHelpResult | null> {
    const uri = model.uri.toString()
    const sigInfo = await this.lspClient.getSignatureHelp(uri, model.getValue(), {
      line: position.lineNumber - 1,
      character: position.column - 1,
    }, token as unknown as LspCancellationToken)

    if (!sigInfo)
      return null

    return {
      value: {
        signatures: sigInfo.signatures.map((sig) => {
          return {
            label: sig.label,
            documentation: sig.documentation,
            parameters: sig.parameters as ParameterInformation[],
            activeParameter: sig.activeParameter as number,
          }
        }),
        activeSignature: sigInfo.activeSignature as number,
        activeParameter: sigInfo.activeParameter as number,
      },
      dispose: () => { },
    }
  }

  async onHover(
    model: editor.ITextModel,
    position: Position,
    token: CancellationToken,
  ): Promise<languages.Hover | null> {
    const uri = model.uri.toString()
    const hoverInfo = await this.lspClient.getHoverInfo(uri, model.getValue(), {
      line: position.lineNumber - 1,
      character: position.column - 1,
    }, token as unknown as LspCancellationToken)

    if (!hoverInfo)
      return null

    return {
      contents: [
        {
          value: (hoverInfo.contents as MarkupContent).value,
        },
      ],
      range: this.convertRange(hoverInfo.range as Range),
    }
  }

  async onCompletionRequest(
    model: editor.ITextModel,
    position: Position,
    _context: languages.CompletionContext,
    token: CancellationToken,
  ): Promise<languages.CompletionList> {
    const uri = model.uri.toString()
    const completionInfo = await this.lspClient.getCompletion(uri, model.getValue(), {
      line: position.lineNumber - 1,
      character: position.column - 1,
    }, token as unknown as LspCancellationToken) as CompletionList

    return {
      suggestions: completionInfo.items.map((item) => {
        return this.convertCompletionItem(item, model)
      }),
      incomplete: completionInfo.isIncomplete,
      dispose: () => { },
    }
  }

  async onResolveCompletion(
    item: languages.CompletionItem,
    token: CancellationToken,
  ): Promise<languages.CompletionItem> {
    const model = (item as ExtendedCompletionItem).__model
    const original = (item as ExtendedCompletionItem).__original

    if (!model || !original)
      return null as unknown as languages.CompletionItem

    const result = await this.lspClient.resolveCompletion(original, token as unknown as LspCancellationToken)
    return this.convertCompletionItem(result as CompletionItem)
  }

  convertLspPosition(position: Position) {
    return {
      line: position.lineNumber - 1,
      character: position.column - 1,
    }
  }

  convertCompletionItem(
    item: CompletionItem,
    model?: editor.ITextModel,
  ): languages.CompletionItem {
    const converted: languages.CompletionItem = {
      label: item.label,
      kind: this.convertCompletionItemKind(item.kind ?? LspCompletionItemKind.Text),
      tags: item.tags,
      detail: item.detail,
      documentation: item.documentation,
      sortText: item.sortText,
      filterText: item.filterText,
      preselect: item.preselect,
      insertText: item.label,
      // Monaco 的 range 字段与 LSP range 结构不兼容，交由 textEdit 分支填入
      range: undefined as unknown as languages.CompletionItem['range'],
    }

    if (item.textEdit) {
      converted.insertText = item.textEdit.newText
      if (InsertReplaceEdit.is(item.textEdit)) {
        converted.range = {
          insert: this.convertRange(item.textEdit.insert),
          replace: this.convertRange(item.textEdit.replace),
        }
      }
      else {
        converted.range = this.convertRange(item.textEdit.range)
      }
    }

    if (item.additionalTextEdits) {
      converted.additionalTextEdits = item.additionalTextEdits.map((edit) => {
        return {
          range: this.convertRange(edit.range),
          text: edit.newText,
        }
      })
    }

    (converted as ExtendedCompletionItem).__original = item
    if (model)
      (converted as ExtendedCompletionItem).__model = model

    return converted
  }

  convertRange(range: Range): IRange {
    return {
      startLineNumber: range.start.line + 1,
      startColumn: range.start.character + 1,
      endLineNumber: range.end.line + 1,
      endColumn: range.end.character + 1,
    }
  }

  convertCompletionItemKind(
    itemKind: LspCompletionItemKind,
  ): languages.CompletionItemKind {
    const monacoKind = this.monacoMod!.languages.CompletionItemKind
    switch (itemKind) {
      case LspCompletionItemKind.Text:
        return monacoKind.Text
      case LspCompletionItemKind.Method:
        return monacoKind.Method
      case LspCompletionItemKind.Function:
        return monacoKind.Function
      case LspCompletionItemKind.Constructor:
        return monacoKind.Constructor
      case LspCompletionItemKind.Field:
        return monacoKind.Field
      case LspCompletionItemKind.Variable:
        return monacoKind.Variable
      case LspCompletionItemKind.Class:
        return monacoKind.Class
      case LspCompletionItemKind.Interface:
        return monacoKind.Interface
      case LspCompletionItemKind.Module:
        return monacoKind.Module
      case LspCompletionItemKind.Property:
        return monacoKind.Property
      case LspCompletionItemKind.Unit:
        return monacoKind.Unit
      case LspCompletionItemKind.Value:
        return monacoKind.Value
      case LspCompletionItemKind.Enum:
        return monacoKind.Enum
      case LspCompletionItemKind.Keyword:
        return monacoKind.Keyword
      case LspCompletionItemKind.Snippet:
        return monacoKind.Snippet
      case LspCompletionItemKind.Color:
        return monacoKind.Color
      case LspCompletionItemKind.File:
        return monacoKind.File
      case LspCompletionItemKind.Reference:
        return monacoKind.Reference
      case LspCompletionItemKind.Folder:
        return monacoKind.Folder
      case LspCompletionItemKind.EnumMember:
        return monacoKind.EnumMember
      case LspCompletionItemKind.Constant:
        return monacoKind.Constant
      case LspCompletionItemKind.Struct:
        return monacoKind.Struct
      case LspCompletionItemKind.Event:
        return monacoKind.Event
      case LspCompletionItemKind.Operator:
        return monacoKind.Operator
      case LspCompletionItemKind.TypeParameter:
        return monacoKind.TypeParameter
      default:
        return monacoKind.Reference
    }
  }
}

interface ExtendedCompletionItem extends CompletionItem {
  __original?: CompletionItem
  __model?: editor.ITextModel
}
