import type {
  ConfigureWorkersOptions,
  FileInput,
  FileKind,
  Messages,
  VueMonacoEditorPluginOptions,
  WebCodeEditorEmits,
  WebCodeEditorInstance,
  WebCodeEditorProps,
} from '../src'
import { describe, expectTypeOf, it } from 'vitest'
describe('public TypeScript API', () => {
  it('exports consumer-facing component, file, worker and locale types', () => {
    expectTypeOf<FileKind>().toEqualTypeOf<'text' | 'image' | 'pdf' | 'binary'>()
    expectTypeOf<FileInput>().toHaveProperty('path').toEqualTypeOf<string>()
    expectTypeOf<WebCodeEditorProps>().toHaveProperty('files')
    expectTypeOf<WebCodeEditorInstance>().toHaveProperty('markFileSaved')
    expectTypeOf<WebCodeEditorEmits>().toBeFunction()
    expectTypeOf<ConfigureWorkersOptions>().toBeObject()
    expectTypeOf<VueMonacoEditorPluginOptions>().toBeObject()
    expectTypeOf<Messages>().toHaveProperty('save')
  })
})
