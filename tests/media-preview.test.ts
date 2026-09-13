import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/web-monaco-editor.vue', () => ({
  default: defineComponent({ template: '<div data-test="monaco" />' }),
}))

import WebCodeEditor from '../src/web-code-editor.vue'

describe('media preview', () => {
  it('renders an image remoteUrl instead of the binary placeholder', async () => {
    const remoteUrl = 'data:image/png;base64,preview'
    const wrapper = mount(WebCodeEditor, {
      props: {
        files: [{ path: '/preview.png', name: 'preview.png', remoteUrl }],
        defaultOpenPath: '/preview.png',
      },
    })
    await nextTick()
    expect(wrapper.get('img.vme-workbench__media-img').attributes('src')).toBe(remoteUrl)
    expect(wrapper.find('.vme-binary-placeholder').exists()).toBe(false)
  })

  it('renders a PDF remoteUrl in the browser viewer', async () => {
    const remoteUrl = 'data:application/pdf;base64,preview'
    const wrapper = mount(WebCodeEditor, {
      props: {
        files: [{ path: '/sample.pdf', name: 'sample.pdf', remoteUrl }],
        defaultOpenPath: '/sample.pdf',
      },
    })
    await nextTick()
    expect(wrapper.get('iframe.vme-workbench__media-pdf').attributes('src')).toBe(remoteUrl)
    expect(wrapper.find('.vme-binary-placeholder').exists()).toBe(false)
  })
})
