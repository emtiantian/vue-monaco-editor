<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { VueMonacoEditor as Editor } from '../src'
import type { FileInput } from '../src'

const lastEvent = ref('Ready')
const showIntro = ref(true)
const editorRef = useTemplateRef('editor')
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
  {
    path: '/assets/preview.png',
    name: 'preview.png',
    fileKind: 'image',
    remoteUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" rx="24" fill="#6654d9"/><text x="320" y="190" text-anchor="middle" fill="white" font-family="system-ui" font-size="42">Image preview</text></svg>')}`,
  },
  {
    path: '/assets/sample.pdf',
    name: 'sample.pdf',
    fileKind: 'pdf',
    remoteUrl: `data:application/pdf,${encodeURIComponent('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF')}`,
  },
]

async function handleSave(payload: { path: string, content: string, name: string }) {
  editorRef.value?.markFileSaved(payload.path, payload.content)
  lastEvent.value = `Saved ${payload.path}`
}
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
        ref="editor"
        :files="files"
        default-open-path="/src/main.ts"
        :default-expanded-paths="['/src']"
        theme="web-code-editor-light"
        builtin-markdown-preview
        @ready="lastEvent = 'Editor ready'"
        @save="handleSave"
        @change="lastEvent = `Changed ${$event.path}`"
      />
    </section>
    <div v-if="showIntro" class="intro-backdrop">
      <section class="intro-modal" role="dialog" aria-modal="true">
        <h2>Before you start</h2>
        <p>This is a feature demonstration:</p>
        <ul>
          <li><strong>Workers:</strong> loaded from CDN by default. Opening Python for the first time loads about 25 MB of Pyright. Production apps can use <code>configureWorkers</code> to bundle local workers.</li>
          <li><strong>serverHooks:</strong> the playground simulates a 300 ms server request. Names or paths ending with <code>fail</code> intentionally fail; this is demo behavior, not a component restriction.</li>
          <li><strong>Downloads:</strong> the component emits a download event; the caller implements the actual download.</li>
        </ul>
        <button type="button" class="intro-modal__close" @click="showIntro = false">Got it, start exploring</button>
      </section>
    </div>
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
.intro-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 20px; background: #1118; }
.intro-modal { width: min(620px, 100%); box-sizing: border-box; padding: 24px; border-radius: 12px; background: #fff; color: #333; box-shadow: 0 20px 60px #0003; }
.intro-modal h2 { margin: 0 0 12px; font-size: 20px; }
.intro-modal li { margin: 9px 0; line-height: 1.55; }
.intro-modal code { padding: 1px 4px; border-radius: 3px; background: #f1f3f5; }
.intro-modal__close { margin-top: 10px; padding: 8px 16px; border: 0; border-radius: 6px; color: #fff; background: #6654d9; cursor: pointer; }
</style>
