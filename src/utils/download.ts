/** 触发浏览器下载：用 Blob + 临时 <a> 点击 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
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

