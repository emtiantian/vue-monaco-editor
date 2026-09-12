<script setup lang="ts">
import type { FileInput, WebCodeEditorServerHooks } from '../src/types'
import { ref } from 'vue'
// yaml 语言服务子入口：引入后 .yml 获得完整语言服务（未引入时仅基础高亮）
import '../src/subsets/yaml'
import VueMonacoEditor from '../src/web-code-editor.vue'

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
    remoteUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  },
  {
    path: '/assets/spec.pdf',
    name: 'spec.pdf',
    fileKind: 'pdf',
    remoteUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
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

function log(event: string) {
  lastEvent.value = `${new Date().toLocaleTimeString()} ${event}`
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
      <span>
        vue-monaco-ide playground（worker 默认走 CDN，首次打开 Python 文件会加载 Pyright ~25MB；
        文件名含 fail 触发 serverHooks 失败路径）
      </span>
      <span class="page__event">{{ lastEvent }}</span>
    </div>
    <div class="page__editor">
      <VueMonacoEditor
        :files="files"
        :server-hooks="serverHooks"
        default-open-path="/src/main.py"
        :default-expanded-paths="['/src']"
        theme="web-code-editor-light"
        builtin-markdown-preview
        @ready="log(`ready: ${$event.elapsedMs ?? '?'}ms`)"
        @save="log(`save: ${$event.path}`)"
        @save-all="log(`save-all: ${$event.length} files`)"
        @change="log(`change: ${$event.path}`)"
        @download="log(`download: ${$event.path}`)"
        @worker-error="log(`worker-error: ${$event.type}`)"
      />
    </div>
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

.page__editor {
  flex: 1;
  min-height: 0;
}
</style>
