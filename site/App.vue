<script setup lang="ts">
import { ref } from 'vue'
import Editor from '../src/web-code-editor.vue'
import type { FileInput } from '../src/types'

const lastEvent = ref('Ready')
const files: FileInput[] = [
  {
    path: '/src/main.ts',
    name: 'main.ts',
    language: 'typescript',
    content: `import { add } from './math'\n\nconst answer = add(20, 22)\nconsole.log(answer)`,
  },
  {
    path: '/src/math.ts',
    name: 'math.ts',
    language: 'typescript',
    content: `export function add(a: number, b: number): number {\n  return a + b\n}`,
  },
  {
    path: '/README.md',
    name: 'README.md',
    language: 'markdown',
    content: '# Vue Monaco IDE\n\nTry Cmd/Ctrl-click on `add` to jump across files.',
  },
]
</script>

<template>
  <main class="site">
    <header class="site__header">
      <div>
        <p class="eyebrow">@emtt/vue-monaco-ide</p>
        <h1>Vue 3 workbench for Monaco</h1>
        <p class="intro">A file tree, tabs and cross-file TypeScript editing in one component.</p>
      </div>
      <span class="status">{{ lastEvent }}</span>
    </header>
    <section class="site__editor">
      <Editor
        :files="files"
        default-open-path="/src/main.ts"
        :default-expanded-paths="['/src']"
        theme="web-code-editor-light"
        builtin-markdown-preview
        @ready="lastEvent = 'Editor ready'"
        @save="lastEvent = `Saved ${$event.path}`"
        @change="lastEvent = `Changed ${$event.path}`"
      />
    </section>
  </main>
</template>

<style>
html, body, #app { min-height: 100%; margin: 0; }
body { background: #f6f7fb; color: #20232d; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
.site { box-sizing: border-box; min-height: 100vh; padding: 32px clamp(16px, 5vw, 72px); }
.site__header { display: flex; align-items: end; justify-content: space-between; gap: 24px; max-width: 1280px; margin: 0 auto 20px; }
.eyebrow { margin: 0 0 8px; color: #6654d9; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(28px, 4vw, 48px); letter-spacing: -.04em; }
.intro { margin: 10px 0 0; color: #667085; }
.status { color: #667085; font-size: 13px; }
.site__editor { height: min(720px, calc(100vh - 190px)); min-height: 480px; max-width: 1280px; margin: 0 auto; overflow: hidden; border: 1px solid #dfe3ed; border-radius: 14px; background: white; box-shadow: 0 20px 50px #3440541a; }
</style>
