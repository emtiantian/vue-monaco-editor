import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import SearchInput from '../src/search-input.vue'
import CreateNodeInput from '../src/create-node-input.vue'
import { setLocale, setMessages } from '../src/i18n'
import { createFileStore, provideFileStore } from '../src/composables/use-file-store'
import { renderMarkdownToHtml } from '../src/utils/markdown'
import { resolveFileKind } from '../src/utils/file-kind'
import TabBar from '../src/tab-bar.vue'

const wrappers: Array<{ unmount: () => void }> = []
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  setLocale('zh-CN')
  setMessages({})
})

describe('component contracts', () => {
  it('updates mounted UI when locale and message overrides change', async () => {
    const wrapper = mount(SearchInput)
    wrappers.push(wrapper)
    expect(wrapper.get('input').attributes('placeholder')).toBe('搜索文件')
    setLocale('en')
    await nextTick()
    expect(wrapper.get('input').attributes('placeholder')).toBe('Search files')
    setMessages({ searchPlaceholder: 'Find a file' })
    await nextTick()
    expect(wrapper.get('input').attributes('placeholder')).toBe('Find a file')
  })
  it('accepts external model updates and emits user changes', async () => {
    const wrapper = mount(SearchInput, { props: { modelValue: 'first' } })
    wrappers.push(wrapper)
    await wrapper.setProps({ modelValue: 'second' })
    expect(wrapper.get('input').element.value).toBe('second')
    await wrapper.get('input').setValue('third')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['third'])
  })
  it('keeps dirty state until the host confirms persistence', () => {
    const store = createFileStore()
    store.initFiles([{ path: '/a.ts', name: 'a.ts', content: 'draft', savedContent: 'saved' }])
    store.openFile('/a.ts')
    expect(store.openTabs.value[0]?.isDirty).toBe(true)
    store.updateContent('/a.ts', 'saved')
    store.saveFile('/a.ts')
    expect(store.openTabs.value[0]?.isDirty).toBe(false)
  })
  it('keeps newer edits dirty when an older save snapshot is confirmed', () => {
    const store = createFileStore()
    store.initFiles([{ path: '/a.ts', name: 'a.ts', content: 'initial' }])
    store.openFile('/a.ts')
    store.updateContent('/a.ts', 'request snapshot')
    store.updateContent('/a.ts', 'newer edit')
    store.markFileSaved('/a.ts', 'request snapshot')
    expect(store.state.files[0]?.content).toBe('newer edit')
    expect(store.openTabs.value[0]?.isDirty).toBe(true)
    store.markFileSaved('/a.ts', 'newer edit')
    expect(store.openTabs.value[0]?.isDirty).toBe(false)
  })
  it('shows save status for the active file instead of another dirty tab', async () => {
    const store = createFileStore()
    store.initFiles([
      { path: '/clean.ts', name: 'clean.ts', content: 'clean' },
      { path: '/dirty.ts', name: 'dirty.ts', content: 'draft', savedContent: 'saved' },
    ])
    store.openFile('/clean.ts')
    const onSave = vi.fn()
    const Host = defineComponent({
      setup() {
        provideFileStore(store)
        return () => h(TabBar, { saveTime: '12:00', onSave })
      },
    })
    const wrapper = mount(Host)
    wrappers.push(wrapper)
    expect(wrapper.get('.vme-draft').text()).toContain('已保存')
    expect(wrapper.get<HTMLButtonElement>('.vme-save-btn').element.disabled).toBe(true)
    store.updateContent('/clean.ts', 'changed')
    await nextTick()
    expect(wrapper.get('.vme-draft').text()).toContain('未保存')
    await wrapper.get('.vme-save-btn').trigger('click')
    expect(onSave).toHaveBeenCalledOnce()
  })
  it('trims names and cancels empty input or Escape', async () => {
    const wrapper = mount(CreateNodeInput, { props: { isDirectory: false } })
    wrappers.push(wrapper)
    await wrapper.get('input').setValue('  main.ts  ')
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('confirm')).toEqual([['main.ts']])
    await wrapper.get('input').setValue(' ')
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    await wrapper.get('input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('cancel')).toHaveLength(2)
  })
})

describe('file store', () => {
  it('uses the saved baseline for dirty state and saving', () => {
    const store = createFileStore()
    store.initFiles([{ path: '/a.ts', name: 'a.ts', content: 'draft', savedContent: 'saved' }])
    store.openFile('/a.ts')
    expect(store.openTabs.value[0]?.isDirty).toBe(true)
    store.saveFile('/a.ts')
    expect(store.openTabs.value[0]?.isDirty).toBe(false)
  })
  it('waits for approval and suppresses duplicate in-flight creates', async () => {
    let approve!: (value: boolean) => void
    const hook = vi.fn(() => new Promise<boolean>(resolve => { approve = resolve }))
    const store = createFileStore({ createFile: hook })
    store.startCreate('/', false)
    const pending = store.createNode('a.ts')
    expect(store.state.files).toHaveLength(0)
    expect(await store.createNode('a.ts')).toBe(false)
    approve(true)
    expect(await pending).toBe(true)
    expect(hook).toHaveBeenCalledTimes(1)
    expect(store.state.files.map(file => file.path)).toEqual(['/a.ts'])
  })
  it('leaves files unchanged when a server hook rejects', async () => {
    const store = createFileStore({ rename: async () => false })
    store.initFiles([{ path: '/a.ts', name: 'a.ts', content: '' }])
    expect(await store.renameFile('/a.ts', 'b.ts')).toBe(false)
    expect(store.state.files[0]?.path).toBe('/a.ts')
  })
})

it('escapes HTML and blocks executable Markdown URLs', () => {
  const html = renderMarkdownToHtml('<script>alert(1)</script>\n\n[x](javascript:alert)\n\n![x](javascript:alert)')
  expect(html).not.toMatch(/<script|(?:href|src)="javascript:/i)
  expect(renderMarkdownToHtml('[safe](https://example.com)')).toContain('href="https://example.com"')
})

it('respects explicit file kinds and disabled media previews', () => {
  expect(resolveFileKind('a.png', 'text', '', true)).toBe('text')
  expect(resolveFileKind('a.png', undefined, '', true)).toBe('image')
  expect(resolveFileKind('a.png', undefined, '', false)).toBe('binary')
})
