<script setup lang="ts">
import type { FileInput, WebCodeEditorServerHooks } from '../src'
import { ref, useTemplateRef } from 'vue'
import { VueMonacoEditor } from '../src'

const files: FileInput[] = [
  {
    path: '/src/utils.py',
    name: 'utils.py',
    language: 'python',
    content: `def add(a: int, b: int) -> int:
    """两数相加"""
    return a + b


def greet(name: str) -> str:
    return f"hello, {name}"
`,
  },
  {
    path: '/src/main.py',
    name: 'main.py',
    language: 'python',
    content: `from utils import add, greet

# Pyright 提供完整的类型推断、跨文件补全与跳转（Cmd+点击 add 可跳到 utils.py）
result = add(1, 2)

# 取消下一行注释可以看到 Pyright 类型检查报错
# result = add("1", "2")

print(greet("vue-monaco-ide"))
print(result)
`,
  },
  {
    path: '/src/math.ts',
    name: 'math.ts',
    language: 'typescript',
    content: `export interface Vec2 {
  x: number
  y: number
}

export function len(v: Vec2): number {
  return Math.hypot(v.x, v.y)
}
`,
  },
  {
    path: '/src/index.ts',
    name: 'index.ts',
    language: 'typescript',
    content: `import { len, type Vec2 } from './math'

const v: Vec2 = { x: 3, y: 4 }
// TS worker 提供跨文件 goToDefinition / 全量引用查找
console.log(len(v))
`,
  },
  {
    path: '/src/hello.js',
    name: 'hello.js',
    language: 'javascript',
    content: `export function now() {
  return Date.now()
}
`,
  },
  // —— 非文本文件体系 ——
  {
    path: '/assets/logo.png',
    name: 'logo.png',
    remoteUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g"><stop stop-color="#6654d9"/><stop offset="1" stop-color="#1677ff"/></linearGradient></defs><rect width="640" height="360" rx="32" fill="url(#g)"/><text x="320" y="175" text-anchor="middle" fill="white" font-family="system-ui" font-size="44" font-weight="700">Vue Monaco IDE</text><text x="320" y="225" text-anchor="middle" fill="#e8ecff" font-family="system-ui" font-size="22">Image preview</text></svg>')}`,
  },
  {
    path: '/assets/spec.pdf',
    name: 'spec.pdf',
    fileKind: 'pdf',
    remoteUrl: `data:application/pdf,${encodeURIComponent('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF')}`,
  },
  {
    path: '/assets/lib.zip',
    name: 'lib.zip',
  },
  // —— savedContent 基线：本地内容 ≠ 云端内容，打开即显示「未保存」 ——
  {
    path: '/docs/draft.md',
    name: 'draft.md',
    language: 'markdown',
    content: `# 本地草稿

这一行与云端基线不同，状态栏应显示**未保存**。

- 内置 Markdown 渲染器演示（builtin-markdown-preview）
- 表格：

| 特性 | 状态 |
| --- | --- |
| 白名单重建 | ✅ |
| 零依赖 | ✅ |

> 引用块也可以渲染

\`\`\`ts
const x: number = 1
\`\`\`

[链接](https://example.com) 与 <img src=x onerror="alert(1)"> 应退化为纯文本
`,
    savedContent: '# 云端基线',
  },
  // —— yaml 语言服务（已引 subsets/yaml 子入口）——
  {
    path: '/config/app.yml',
    name: 'app.yml',
    language: 'yaml',
    content: `# 基础高亮开箱即用；引入 vue-monaco-ide/yaml 后有 schema 校验与补全
server:
  host: localhost
  port: 5180
features:
  - python-lsp
  - yaml-lsp
`,
  },
  {
    path: '/README.md',
    name: 'README.md',
    language: 'markdown',
    content: `# Playground

编辑左侧文件树中的文件试试：

- **Python**：内置 Pyright LSP，支持补全 / 悬停文档 / 跳转定义 / 重命名 / 类型检查
- **TypeScript / JavaScript**：内置 TS worker，支持跨文件解析
- **Markdown**：内置轻量预览（右上角切换按钮），也可换 \`#preview\` 插槽接入自己的渲染器
- **JSON**：内置 JSON worker，支持格式化与 schema 校验
- **YAML**：本 playground 引入了 yaml 子入口，有校验与补全
- **图片 / PDF / 二进制**：assets/ 目录下各有一个示例
- **serverHooks**：新建/重命名/删除/移动会先走 mock 服务端钩子（300ms 延迟）；名称含 \`fail\` 的操作会被服务端拒绝
`,
  },
  {
    path: '/package.json',
    name: 'package.json',
    language: 'json',
    content: `{
  "name": "playground",
  "version": "0.0.0",
  "private": true
}
`,
  },
]

const lastEvent = ref('')
const showIntro = ref(true)
const downloadNotice = ref('')
let downloadNoticeTimer: ReturnType<typeof setTimeout> | undefined
const editorRef = useTemplateRef('editor')

function log(event: string) {
  lastEvent.value = `${new Date().toLocaleTimeString()} ${event}`
}

function handleDownload(payload: { path: string, name: string }) {
  log(`download requested: ${payload.path}`)
  downloadNotice.value = `已触发下载事件：${payload.name}（${payload.path}）。实际下载由调用方实现。`
  if (downloadNoticeTimer)
    clearTimeout(downloadNoticeTimer)
  downloadNoticeTimer = setTimeout(() => { downloadNotice.value = '' }, 4500)
}

async function handleSave(payload: { path: string, content: string, name: string }) {
  await sleep(300)
  editorRef.value?.markFileSaved(payload.path, payload.content)
  log(`saved by host: ${payload.path}`)
}

async function handleSaveAll(payload: Array<{ path: string, content: string, name: string }>) {
  await sleep(300)
  payload.forEach(file => editorRef.value?.markFileSaved(file.path, file.content))
  log(`saved by host: ${payload.length} files`)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// mock serverHooks：300ms 模拟网络延迟；名称含 fail 的操作返回 false 模拟服务端拒绝。
// 钩子返回 false 时本地树不变（乐观更新 + 回滚）。
const serverHooks: WebCodeEditorServerHooks = {
  async createFile({ parentPath, name }) {
    await sleep(300)
    log(`hook createFile: ${parentPath}/${name}`)
    return !name.includes('fail')
  },
  async createDirectory({ parentPath, name }) {
    await sleep(300)
    log(`hook createDirectory: ${parentPath}/${name}`)
    return !name.includes('fail')
  },
  async rename({ path, newName }) {
    await sleep(300)
    log(`hook rename: ${path} -> ${newName}`)
    return !newName.includes('fail')
  },
  async remove({ path }) {
    await sleep(300)
    log(`hook remove: ${path}`)
    return !(path.split('/').pop() ?? '').includes('fail')
  },
  async move({ sourcePath, targetFolderPath }) {
    await sleep(300)
    log(`hook move: ${sourcePath} -> ${targetFolderPath}`)
    return !(sourcePath.split('/').pop() ?? '').includes('fail')
  },
}
</script>

<template>
  <div class="page">
    <div class="page__toolbar">
      <span>vue-monaco-ide playground</span>
      <span class="page__event">{{ lastEvent }}</span>
    </div>
    <div v-if="downloadNotice" class="download-notice" role="status">{{ downloadNotice }}</div>
    <div class="page__editor">
      <VueMonacoEditor
        ref="editor"
        :files="files"
        :server-hooks="serverHooks"
        default-open-path="/src/main.py"
        :default-expanded-paths="['/src']"
        theme="web-code-editor-light"
        builtin-markdown-preview
        @ready="log(`ready: ${$event.elapsedMs ?? '?'}ms`)"
        @save="handleSave"
        @save-all="handleSaveAll"
        @change="log(`change: ${$event.path}`)"
        @download="handleDownload"
        @worker-error="log(`worker-error: ${$event.type}`)"
      />
    </div>
  </div>
  <div v-if="showIntro" class="intro-backdrop">
    <section class="intro-modal" role="dialog" aria-modal="true">
      <h2>开始使用前说明</h2>
      <p>这是功能演示页面：</p>
      <ul>
        <li><strong>Worker：</strong>默认从 CDN 加载；首次打开 Python 文件会加载约 25MB 的 Pyright。正式项目可用 <code>configureWorkers</code> 配置本地 Worker。</li>
        <li><strong>serverHooks：</strong>操作会模拟 300ms 服务端请求。名称或路径最后一段包含 <code>fail</code> 时会故意返回失败，文件树不会执行操作；这不是组件限制。</li>
        <li><strong>下载：</strong>组件只发出下载事件，实际下载由调用方实现。</li>
      </ul>
      <button type="button" class="intro-modal__close" @click="showIntro = false">知道了，开始体验</button>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.page__toolbar {
  display: flex;
  justify-content: space-between;
  padding: 6px 12px;
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  border-bottom: 1px solid #e8e8e8;
}

.page__event {
  color: #1677ff;
}
.download-notice { position: fixed; top: 42px; right: 16px; z-index: 10; max-width: min(420px, calc(100vw - 32px)); padding: 10px 14px; border: 1px solid #91caff; border-radius: 6px; color: #0958d9; background: #e6f4ff; box-shadow: 0 4px 14px #0002; font-size: 13px; }

.page__editor {
  flex: 1;
  min-height: 0;
}
.intro-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 20px; background: #1118; }
.intro-modal { width: min(620px, 100%); box-sizing: border-box; padding: 24px; border-radius: 12px; background: #fff; color: #333; box-shadow: 0 20px 60px #0003; }
.intro-modal h2 { margin: 0 0 12px; font-size: 20px; }
.intro-modal li { margin: 9px 0; line-height: 1.55; }
.intro-modal code { padding: 1px 4px; border-radius: 3px; background: #f1f3f5; }
.intro-modal__close { margin-top: 10px; padding: 8px 16px; border: 0; border-radius: 6px; color: #fff; background: #1677ff; cursor: pointer; }
</style>
