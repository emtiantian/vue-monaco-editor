import { monaco } from '../utils/monaco'
import dark from './dark'
import light from './light'

let initialized = false

export function initializeWebCodeEditorThemes(): void {
  if (initialized) {
    return
  }

  try {
    monaco.editor.defineTheme('web-code-editor-light', light)
    monaco.editor.defineTheme('web-code-editor-dark', dark)
    initialized = true
  }
  catch (error) {
    console.warn('[WebCodeEditor] 主题已定义:', error)
  }
}
