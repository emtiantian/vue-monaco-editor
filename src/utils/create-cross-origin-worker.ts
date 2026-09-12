export interface CreateCrossOriginWorkerOptions extends WorkerOptions {
  /**
   * 在 worker 全局作用域中、加载目标脚本之前执行的 JS 代码。
   * 用于注入 Monaco 等库依赖的全局变量（如 `globalThis._VSCODE_FILE_ROOT`）。
   */
  workerGlobalSetup?: string
}

const blobUrlCache = new Map<string, string>()

/**
 * 创建 Web Worker，透明处理跨域脚本。
 *
 * 在微前端（如 qiankun）或静态资源独立域名部署的场景下，页面 Origin
 * （如 http://host-a:8080）与资源服务器 Origin（http://host-b:9000）不同，浏览器会拒绝
 * `new Worker(crossOriginUrl)`。本工具先用同源的 blob URL 启动 Worker，
 * 再由该 Worker 通过静态 `import`（ES Module Worker）或 `importScripts()`
 *（Classic Worker）加载真实脚本，从而绕过同源限制。
 *
 * 依赖资源服务器开启 CORS；同 Origin 时仍走原生路径，
 * 避免不必要的 blob 开销。
 */
export function createCrossOriginWorker(
  url: string,
  options?: CreateCrossOriginWorkerOptions,
): Worker {
  const resolved = new URL(url, globalThis.location.href)
  const { workerGlobalSetup: setupScriptRaw, ...workerOptions } = options || {}
  const setupScript = setupScriptRaw?.trim()

  // 同源且无需要注入的全局脚本：直接走原生路径，保留 source-map 与命名行为
  if (resolved.origin === globalThis.location.origin && !setupScript) {
    return new Worker(resolved.href, workerOptions)
  }

  const targetUrl = resolved.href
  const cacheKey = `${targetUrl}#${workerOptions.type || 'classic'}#${setupScript || ''}`

  let blobUrl = blobUrlCache.get(cacheKey)
  if (!blobUrl) {
    // 静态依赖加载期间排队初始消息，避免动态 import 等待时丢失 Monaco 握手。
    // setup 必须作为第一个依赖执行，写在 import 前的模块正文仍会晚于依赖执行。
    let loader: string
    if (workerOptions.type === 'module') {
      const setupImport = setupScript
        ? `import ${JSON.stringify(URL.createObjectURL(new Blob([setupScript], { type: 'application/javascript' })))};\n`
        : ''
      loader = `${setupImport}import ${JSON.stringify(targetUrl)};`
    }
    else {
      loader = `${setupScript || ''}\nimportScripts(${JSON.stringify(targetUrl)});`
    }

    const blob = new Blob([loader], { type: 'application/javascript' })
    blobUrl = URL.createObjectURL(blob)
    blobUrlCache.set(cacheKey, blobUrl)
  }

  return new Worker(blobUrl, workerOptions)
}
