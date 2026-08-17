// 基于 monaco-pyright-lsp/src/client.ts 改造，支持多文档 LSP 同步。
// 保留与原包相同的 worker 初始化协议，但将单文档 URI 替换为按 URI 管理文档。

import type { CancellationToken } from 'vscode-languageserver'
import type { InitializeMsg, MsgInitServer, MsgOfType, MsgServerLoaded, UserFolder } from 'monaco-pyright-lsp/dist/message'
import type {
  CompletionItem,
  CompletionList,
  CompletionParams,
  ConfigurationParams,
  DefinitionParams,
  Diagnostic,
  DidChangeConfigurationParams,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
  Hover,
  HoverParams,
  InitializeParams,
  MessageConnection,
  Position,
  PrepareRenameParams,
  PrepareRenameResult,
  PublishDiagnosticsParams,
  RenameParams,
  SignatureHelp,
  SignatureHelpParams,
  TextDocumentContentChangeEvent,
  TextDocumentIdentifier,
  WorkspaceEdit,
} from 'vscode-languageserver/browser'
import {
  BrowserMessageReader,
  BrowserMessageWriter,
  CompletionRequest,
  CompletionResolveRequest,
  createMessageConnection,
  DefinitionRequest,
  DidChangeConfigurationNotification,
  HoverRequest,
  InitializeRequest,
  NotificationType,
  PrepareRenameRequest,
  RenameRequest,
  RequestType,
  SignatureHelpRequest,
} from 'vscode-languageserver/browser'
import { createCrossOriginWorker } from '../utils/create-cross-origin-worker'
import { getPyrightWorkerUrl } from '../utils/monaco-environment'

interface ManagedDocument {
  version: number
  text: string
}

export class LspClient {
  connection: MessageConnection = null as unknown as MessageConnection
  worker: Worker
  workerLoadedPromise: Promise<MsgServerLoaded>

  private _documentDiags = new Map<string, PublishDiagnosticsParams>()
  private docs = new Map<string, ManagedDocument>()
  private nextVersion = 1
  private diagnosticsCallback?: (uri: string, diagnostics: Diagnostic[]) => void
  private diagnosticsHandlerRegistered = false

  constructor() {
    const url = new URL(getPyrightWorkerUrl(), import.meta.url).href
    this.worker = createCrossOriginWorker(url)

    this.worker.onerror = (err) => {
      console.error('[PyrightLspClient] worker error', err.message, err.filename, err.lineno)
    }
    this.worker.onmessageerror = (err) => {
      console.error('[PyrightLspClient] worker message error', err)
    }

    this.workerLoadedPromise = this.waitServerInitializeMsg('serverLoaded')
  }

  public async initialize(
    projectPath: string,
    userFiles: UserFolder = {},
    typeshedFallback: ArrayBuffer | false | undefined = undefined,
  ) {
    await this.workerLoadedPromise

    this.worker.postMessage(<MsgInitServer>{
      type: 'initServer',
      userFiles,
      typeshedFallback,
    })

    await this.waitServerInitializeMsg('serverInitialized')

    const reader = new BrowserMessageReader(this.worker)
    const writer = new BrowserMessageWriter(this.worker)

    this.connection = createMessageConnection(reader, writer, console, {
      // cancellationStrategy: {
      //     sender: new SharedArraySenderStrategy(),
      //     receiver: new SharedArrayReceiverStrategy()
      // }
    })

    this.connection.listen()

    const init: InitializeParams = {
      rootUri: `file://${projectPath}`,
      rootPath: projectPath,
      processId: 1,
      capabilities: {
        textDocument: {
          publishDiagnostics: {
            tagSupport: {
              valueSet: [1, 2], // DiagnosticTag.Unnecessary, DiagnosticTag.Deprecated
            },
            versionSupport: true,
          },
          hover: {
            contentFormat: ['markdown', 'plaintext'],
          },
          signatureHelp: {},
        },
      },
    }

    await this.connection.sendRequest(InitializeRequest.type, init)

    await this.connection.sendNotification(
      new NotificationType<DidChangeConfigurationParams>('workspace/didChangeConfiguration'),
      {
        settings: {},
      },
    )

    this.connection.onRequest(
      // LSP 配置项的返回结构由 server 端解释，客户端无法收窄类型
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new RequestType<ConfigurationParams, any, any>('workspace/configuration'),
      () => {
        // 暂返回空数组（Pyright 将使用 worker 内置默认配置）。
        // 之前尝试在此返回 diagnosticMode:'workspace' + autoSearchPaths:true 会导致
        // Pyright 在 worker 内全量分析/搜索内置 typeshed 而卡死，已回退。
        return []
      },
    )
  }

  /**
   * 等待 worker 发出的初始化握手消息（serverLoaded / serverInitialized）。
   *
   * 用 addEventListener 而非覆盖 worker.onmessage，避免与 BrowserMessageReader
   * 抢占 onmessage（原实现整体覆盖 onmessage，时序敏感且会与 JSON-RPC reader 冲突）。
   *
   * 注意：不在 worker 'error' 事件上 reject。worker 加载/执行大体积 worker.js（Vite dev
   * 会注入内联 sourcemap，25MB -> 62MB）期间可能产生非致命 error 事件，且可能先于
   * serverLoaded 到达；立即 reject 会误判初始化失败（此前线上能正常工作就是因为旧实现
   * 的 worker.onerror 只 log 不 reject）。改为靠超时兜底，避免 worker 真正失败时永久 pending。
   */
  private waitServerInitializeMsg<T extends InitializeMsg['type']>(
    msgType: T,
    timeoutMs = 60000,
  ): Promise<MsgOfType<T>> {
    return new Promise((resolve, reject) => {
      let settled = false

      const cleanup = () => {
        clearTimeout(timer)
        this.worker.removeEventListener('message', handler)
      }

      const handler = (msgEv: MessageEvent) => {
        const msg = msgEv.data as InitializeMsg
        if (msg?.type === msgType) {
          settled = true
          cleanup()
          resolve(msg as MsgOfType<T>)
        }
      }

      const timer = setTimeout(() => {
        if (settled)
          return
        settled = true
        cleanup()
        reject(new Error(`[PyrightLspClient] timeout waiting for ${msgType} after ${timeoutMs}ms`))
      }, timeoutMs)

      this.worker.addEventListener('message', handler)
    })
  }

  async setupDiagnosticsCallback(callback: (uri: string, diagnostics: Diagnostic[]) => void) {
    this.diagnosticsCallback = callback

    if (this.diagnosticsHandlerRegistered)
      return
    this.diagnosticsHandlerRegistered = true

    this.connection.onNotification(
      new NotificationType<PublishDiagnosticsParams>('textDocument/publishDiagnostics'),
      (diagInfo) => {
        const diagVersion = diagInfo.version ?? -1
        const uri = diagInfo.uri

        const cached = this._documentDiags.get(uri)
        // 丢弃过期版本诊断：若已存在更新版本，忽略本次 stale 结果，避免快速编辑时闪烁显示旧诊断。
        // version 缺失（undefined）时无法判断新旧，按新结果更新。
        if (cached !== undefined && cached.version !== undefined && cached.version > diagVersion) {
          return
        }
        this._documentDiags.set(uri, diagInfo)

        this.diagnosticsCallback?.(uri, diagInfo.diagnostics)
      },
    )
  }

  /**
   * 打开一个新文档到 Pyright worker。
   */
  async openDocument(uri: string, text: string): Promise<void> {
    if (this.docs.has(uri)) {
      return this.changeDocument(uri, text)
    }

    const version = this.nextVersion++
    this.docs.set(uri, { version, text })

    await this.connection.sendNotification(
      new NotificationType<DidOpenTextDocumentParams>('textDocument/didOpen'),
      {
        textDocument: {
          uri,
          languageId: 'python',
          version,
          text,
        },
      },
    )
  }

  /**
   * 同步文档内容变更到 Pyright worker。
   */
  async changeDocument(uri: string, text: string): Promise<void> {
    const doc = this.docs.get(uri)
    if (doc && doc.text === text)
      return

    const version = this.nextVersion++
    this.docs.set(uri, { version, text })

    await this.connection.sendNotification(
      new NotificationType<DidChangeTextDocumentParams>('textDocument/didChange'),
      {
        textDocument: {
          uri,
          version,
        },
        contentChanges: [
          {
            text,
          },
        ],
      },
    )
  }

  /**
   * 以 range-based 增量方式同步文档变更到 Pyright worker。
   *
   * 用于 model.onDidChangeContent：发送 e.changes 对应的增量 contentChanges（带 range），
   * 避免大文件高频编辑时全量传输。doc.text 仍用 fullText 更新以保持短路比较准确；
   * 若增量 range 有误，后续请求前的全量 changeDocument 会纠正 worker 内文档内容。
   */
  async changeDocumentWithChanges(
    uri: string,
    fullText: string,
    changes: TextDocumentContentChangeEvent[],
  ): Promise<void> {
    const doc = this.docs.get(uri)
    if (!doc)
      return this.openDocument(uri, fullText)
    if (doc.text === fullText)
      return

    const version = this.nextVersion++
    this.docs.set(uri, { version, text: fullText })

    await this.connection.sendNotification(
      new NotificationType<DidChangeTextDocumentParams>('textDocument/didChange'),
      {
        textDocument: {
          uri,
          version,
        },
        contentChanges: changes,
      },
    )
  }

  /**
   * 关闭文档。
   */
  async closeDocument(uri: string): Promise<void> {
    if (!this.docs.has(uri))
      return

    this.docs.delete(uri)
    this._documentDiags.delete(uri)

    await this.connection.sendNotification(
      new NotificationType<DidCloseTextDocumentParams>('textDocument/didClose'),
      {
        textDocument: {
          uri,
        },
      },
    )
  }

  private getDocIdentifier(uri: string): TextDocumentIdentifier {
    return { uri }
  }

  async rename(uri: string, doc: string, position: Position, newName: string, token?: CancellationToken): Promise<WorkspaceEdit | null> {
    await this.changeDocument(uri, doc)

    const params: RenameParams = {
      textDocument: this.getDocIdentifier(uri),
      newName,
      position,
    }

    return await this.connection.sendRequest(RenameRequest.type, params, token)
  }

  async prepareRename(uri: string, doc: string, position: Position, token?: CancellationToken): Promise<PrepareRenameResult | null> {
    await this.changeDocument(uri, doc)

    const params: PrepareRenameParams = {
      textDocument: this.getDocIdentifier(uri),
      position,
    }

    return await this.connection.sendRequest(PrepareRenameRequest.type, params, token)
  }

  async getDefinition(uri: string, doc: string, position: Position, token?: CancellationToken) {
    await this.changeDocument(uri, doc)

    const params: DefinitionParams = {
      position,
      textDocument: this.getDocIdentifier(uri),
    }
    return await this.connection.sendRequest(DefinitionRequest.type, params, token)
  }

  async getCompletion(uri: string, code: string, position: Position, token?: CancellationToken): Promise<CompletionList | CompletionItem[] | null> {
    await this.changeDocument(uri, code)

    const params: CompletionParams = {
      textDocument: this.getDocIdentifier(uri),
      position,
    }

    return await this.connection
      .sendRequest(CompletionRequest.type, params, token)
      .catch((err) => {
        console.error('[PyrightLsp] completion error', err)
        return null
      })
  }

  async resolveCompletion(completionItem: CompletionItem, token?: CancellationToken): Promise<CompletionItem | null> {
    const result = await this.connection
      .sendRequest(CompletionResolveRequest.type, completionItem, token)
      .catch((err) => {
        console.error('[PyrightLsp] resolveCompletion error', err)
        return null
      })

    return result
  }

  async getHoverInfo(uri: string, code: string, position: Position, token?: CancellationToken): Promise<Hover | null> {
    await this.changeDocument(uri, code)

    const params: HoverParams = {
      textDocument: this.getDocIdentifier(uri),
      position,
    }

    return await this.connection
      .sendRequest(HoverRequest.type, params, token)
      .catch((err) => {
        console.error('[PyrightLsp] hover error', err)
        return null
      })
  }

  async getSignatureHelp(uri: string, code: string, position: Position, token?: CancellationToken): Promise<SignatureHelp | null> {
    await this.changeDocument(uri, code)

    const params: SignatureHelpParams = {
      textDocument: this.getDocIdentifier(uri),
      position,
    }

    return await this.connection
      .sendRequest(SignatureHelpRequest.type, params, token)
      .catch((err) => {
        console.error('[PyrightLsp] signatureHelp error', err)
        return null
      })
  }

  async updateSettings(extraPaths?: string[]): Promise<void> {
    await this.connection
      .sendNotification(DidChangeConfigurationNotification.type, {
        settings: {
          python: {
            analysis: {
              // typeshed fallback 由 worker 内置提供（/typeshed-fallback），主线程不指定路径。
              typeshedPaths: [],
              // extraPaths 指向 worker 中用户文件目录（/typings/<dir>），使 Pyright 解析
              // from utils import 等导入时能找到注入的项目模块，进而支持跨文件类型检查。
              extraPaths: extraPaths ?? [],
              // 不设置 diagnosticMode / autoSearchPaths：
              // diagnosticMode:'workspace' 会触发全量扫描 workspace（含 typeshed），卡死；
              // autoSearchPaths 在浏览器 worker 内会搜索文件系统，同样有卡死风险。
            },
            pythonVersion: '3.13',
            pythonPlatform: 'All',
          },
        },
      })
  }

  /**
   * 销毁 LSP 客户端：关闭 JSON-RPC 连接并 terminate worker，释放内存。
   * 调用后实例不可再用。由 python-lsp.ts 的 destroyPythonLsp 在引用计数归零时调用。
   */
  dispose(): void {
    if (this.connection) {
      try {
        this.connection.dispose()
      }
      catch (err) {
        console.warn('[PyrightLspClient] connection dispose error', err)
      }
    }
    this.worker.terminate()
    this.docs.clear()
    this._documentDiags.clear()
    this.diagnosticsHandlerRegistered = false
  }
}
