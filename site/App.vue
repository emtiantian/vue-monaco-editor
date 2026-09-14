<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { VueMonacoEditor } from '../src'
import type { FileInput } from '../src'

const editor = useTemplateRef('editor')
const status = ref('就绪')
const files: FileInput[] = [
  { path: '/src/main.ts', name: 'main.ts', language: 'typescript', content: "import { add } from './math'\n\nconsole.log(add(20, 22))" },
  { path: '/src/math.ts', name: 'math.ts', language: 'typescript', content: 'export function add(a: number, b: number): number {\n  return a + b\n}' },
  { path: '/README.md', name: 'README.md', language: 'markdown', content: '# Vue Monaco IDE\n\nTry Cmd/Ctrl-click on `add` to jump across files.' },
]

function handleSave(payload: { path: string, content: string }) {
  editor.value?.markFileSaved(payload.path, payload.content)
  status.value = `已保存 ${payload.path}`
}
</script>

<template>
  <main class="site">
    <header><p class="eyebrow">@emtt/vue-monaco-ide</p><h1>Vue 3 Monaco 编辑器工作台</h1><p class="intro">最小消费者示例：文件树、多页签、TypeScript 跨文件导航和由调用方控制的保存流程。</p><span class="status">{{ status }}</span></header>
    <section class="site__editor"><VueMonacoEditor ref="editor" :files="files" default-open-path="/src/main.ts" :default-expanded-paths="['/src']" theme="web-code-editor-light" @ready="status = '编辑器已就绪'" @change="status = `已修改 ${$event.path}`" @save="handleSave" /></section>
  </main>
</template>

<style>
html, body, #app { min-height: 100%; margin: 0; }
body { background: #f6f7fb; color: #20232d; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
.site { box-sizing: border-box; min-height: 100vh; padding: 32px clamp(16px, 5vw, 72px); }
header, .site__editor { max-width: 1280px; margin: 0 auto; }
header { margin-bottom: 20px; } .eyebrow { color: #6654d9; font-weight: 700; letter-spacing: .08em; } h1 { margin: 0; font-size: clamp(28px, 4vw, 48px); } .intro, .status { color: #667085; } .site__editor { height: min(720px, calc(100vh - 190px)); min-height: 480px; overflow: hidden; border: 1px solid #dfe3ed; border-radius: 14px; background: white; box-shadow: 0 20px 50px #3440541a; }
</style>
