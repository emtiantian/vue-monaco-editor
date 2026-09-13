/** 触发浏览器下载：用 Blob + 临时 <a> 点击 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  // Let the browser begin reading the object URL before releasing it.
  window.setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(url)
  }, 0)
}

/** 下载已有地址（适用于图片、PDF 等由后端提供的文件） */
export async function downloadUrl(name: string, remoteUrl: string) {
  // Fetch first so cross-origin URLs still download with the requested name
  // when the server permits CORS; fall back to normal navigation otherwise.
  try {
    const response = await fetch(remoteUrl)
    if (!response.ok)
      throw new Error(`Download failed: ${response.status}`)
    triggerDownload(await response.blob(), name)
  }
  catch {
    const a = document.createElement('a')
    a.href = remoteUrl
    a.download = name
    a.target = '_blank'
    a.rel = 'noopener'
    a.click()
  }
}

/** 下载单个文本文件 */
export function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  triggerDownload(blob, name)
}

/** 下载 base64 编码的文件（如后端以 base64 返回的二进制文件） */
export function downloadBase64File(name: string, base64: string, mimeType?: string) {
  const byteString = atob(base64)
  const bytes = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; i++)
    bytes[i] = byteString.charCodeAt(i)
  const blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' })
  triggerDownload(blob, name)
}
