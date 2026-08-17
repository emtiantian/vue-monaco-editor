<script setup lang="ts">
import type { FileInput } from '../src/types'
import { ref } from 'vue'
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

print(greet("vue-monaco-editor"))
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
  {
    path: '/README.md',
    name: 'README.md',
    language: 'markdown',
    content: `# Playground

编辑左侧文件树中的文件试试：

- **Python**：内置 Pyright LSP，支持补全 / 悬停文档 / 跳转定义 / 重命名 / 类型检查
- **TypeScript / JavaScript**：内置 TS worker，支持跨文件解析
- **Markdown**：预览渲染由 \`#preview\` 插槽注入（本 playground 未提供，仅编辑模式）
- **JSON**：内置 JSON worker，支持格式化与 schema 校验
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
</script>

<template>
  <div class="page">
    <div class="page__toolbar">
      <span>vue-monaco-editor playground（worker 默认走 CDN，首次打开 Python 文件会加载 Pyright ~25MB）</span>
      <span class="page__event">{{ lastEvent }}</span>
    </div>
    <div class="page__editor">
      <VueMonacoEditor
        :files="files"
        default-open-path="/src/main.py"
        :default-expanded-paths="['/src']"
        theme="web-code-editor-light"
        @ready="log(`ready: ${$event.elapsedMs ?? '?'}ms`)"
        @save="log(`save: ${$event.path}`)"
        @save-all="log(`save-all: ${$event.length} files`)"
        @change="log(`change: ${$event.path}`)"
        @worker-error="log(`worker-error: ${$event.type}`)"
      >
        <template #preview="{ content }">
          <pre class="page__md-fallback">{{ content }}</pre>
        </template>
      </VueMonacoEditor>
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

.page__md-fallback {
  padding: 16px 20px;
  margin: 0;
  white-space: pre-wrap;
  font-size: 13px;
}
</style>
