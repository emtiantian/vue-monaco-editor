import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadFile, downloadUrl } from '../src/utils/download'

describe('download helpers', () => {
  afterEach(() => vi.restoreAllMocks())

  it('keeps the object URL alive until the browser starts the download', () => {
    const revoke = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: revoke })
    const anchor = document.createElement('a')
    const click = vi.spyOn(anchor, 'click')
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    downloadFile('a.txt', 'content')
    expect(click).toHaveBeenCalledOnce()
    expect(revoke).not.toHaveBeenCalled()
  })

  it('downloads a remote file as a Blob and preserves its name', async () => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('pdf', { status: 200 })))
    const anchor = document.createElement('a')
    const click = vi.spyOn(anchor, 'click')
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    await downloadUrl('sample.pdf', 'https://example.test/sample.pdf')
    expect(click).toHaveBeenCalledOnce()
    expect(anchor.download).toBe('sample.pdf')
  })
})
