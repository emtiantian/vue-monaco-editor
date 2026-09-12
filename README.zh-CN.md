# @emtt/vue-monaco-ide

[English](README.md) | 简体中文

代码仓库：[github.com/emtiantian/vue-monaco-editor](https://github.com/emtiantian/vue-monaco-editor) · 演示：[GitHub Pages](https://emtiantian.github.io/vue-monaco-editor/)

一个基于 [Monaco Editor](https://github.com/microsoft/monaco-editor) 与 [monaco-pyright-lsp](https://www.npmjs.com/package/monaco-pyright-lsp) 的 **Vue 3 代码编辑器工作台组件**：文件树 + 多页签 + 编辑器一体，集成 **Pyright Python LSP**，开箱即用。

**运行时只依赖 `monaco-editor` 与 `monaco-pyright-lsp`（及 `vscode-languageserver` 协议库）——不依赖任何 UI 组件库、CSS 框架。**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 目录

- [特性一览](#特性一览)
- [本地体验](#本地体验)
- [安装](#安装)
- [快速开始](#快速开始)
- [功能章节](#功能章节)
  - [Markdown 预览](#markdown-预览)
  - [非文本文件（图片 / PDF / 二进制）](#非文本文件图片--pdf--二进制)
  - [serverHooks 服务端钩子](#serverhooks-服务端钩子)
  - [yaml 语言服务](#yaml-语言服务)
- [Worker 加载策略](#worker-加载策略)
- [组件 API](#组件-api)
- [插件 API](#插件-api)
- [定制与扩展](#定制与扩展)
- [依赖说明](#依赖说明)
- [局限性与注意事项](#局限性与注意事项)
- [开发](#开发)
- [发布](#发布)
- [License](#license)

## 特性一览

### 编辑器内核（Monaco）

- ✅ **TypeScript / JavaScript**：内置 TS 语言服务（IntelliSense、跨文件 goToDefinition、findAllReferences、重命名），预配置了利于跨文件解析的 compilerOptions（`checkJs`、全量 model 同步等）
- ✅ **Python**：内置 **Pyright LSP**（Web Worker 版），提供
  - 补全（含 resolve 后的详细文档）、悬停文档、签名帮助
  - 跳转定义（支持跨文件，Cmd/Ctrl+点击）
  - 重命名（跨文件 WorkspaceEdit）
  - 实时类型检查与诊断（红色波浪线），带 typeshed 内置类型
- ✅ **JSON**：内置 JSON 语言服务（格式化、schema 校验）
- ✅ **YAML**：基础高亮开箱即用；引入可选子入口 [`@emtt/vue-monaco-ide/yaml`](#yaml-语言服务)后升级为完整语言服务（schema 校验、补全、悬停）
- ✅ **Markdown**：语法高亮 + 双通道预览——`#preview` 插槽接入任意渲染器，或开启内置零依赖轻量渲染器（见 [Markdown 预览](#markdown-预览)）
- ✅ 支持 Monaco 的多种语言高亮；生产构建可能因静态依赖包含部分语言注册代码
- ✅ F12 / Cmd+点击 跳转定义、Cmd+S 保存、Cmd+Shift+S 全部保存
- ✅ 内置 `web-code-editor-light` / `web-code-editor-dark` 主题（对 Python 语义 token 做了配色），也支持 `vs` / `vs-dark` / `hc-black`

### 工作台（自带 UI，零 UI 框架依赖）

- ✅ **文件树**：新建文件/文件夹（行内输入）、重命名、删除（确认弹窗）、复制路径、下载文件、右键菜单、文件名过滤搜索
- ✅ **彩色文件图标**：内置 50+ 高频扩展名的 vscode-icons 风格 SVG 图标（零依赖内联），冷门类型回退文字徽章；目录折叠/展开双态
- ✅ **非文本文件体系**：图片/PDF 在线预览（`remoteUrl` 驱动，可关）、二进制文件下载占位、文件类型自动判定（显式标记 > 扩展名 > 内容嗅探）
- ✅ **serverHooks 服务端钩子**：新建/重命名/删除/移动操作先经宿主确认再落本地树（确认后提交本地变更），天然对接后端文件系统 API
- ✅ **拖拽整理**：拖拽移动（目录内/跨目录）、同级排序（上沿 before / 下沿 after）、拖入目录（inside），目录不可拖入自身或其子目录，路径深度上限 10 层
- ✅ **多页签**：脏状态标记、自动滚动到活动页签、纵向滚轮横向滚动、一键关闭
- ✅ **草稿状态栏**：「已保存 HH:MM / 未保存」实时状态、发布按钮（文字可配）
- ✅ 受控文件列表（`files` prop），支持外部重置与异步到达的默认展开/打开路径

### 工程质量

- ✅ 增量内容同步（编辑器 -> store 用 range 增量，避免每次全量 `getValue()`）
- ✅ JS/TS/Python model 预创建与生命周期管理，支撑跨文件解析
- ✅ Pyright worker 引用计数：多个编辑器实例共享一个 worker，全部卸载才 terminate
- ✅ Python LSP 按需初始化：项目无 Python 文件时完全不加载
- ✅ TS worker 预热：打开 TS/JS 文件后台强制初始化，缩短首屏 IntelliSense 等待
- ✅ 采用 Monaco 官方 ESM 构建；最终分包和体积取决于宿主构建配置

## 本地体验

```bash
cd vue-monaco-editor
pnpm install
pnpm dev          # 打开 playground（默认 http://localhost:5180）
```

## 安装

```bash
pnpm add @emtt/vue-monaco-ide monaco-editor monaco-pyright-lsp
# 或
npm install @emtt/vue-monaco-ide monaco-editor monaco-pyright-lsp
```

要求：Vue `^3.5`，monaco-editor `~0.52.2`，monaco-pyright-lsp `0.1.x`。

可选：需要 YAML 完整语言服务时再安装 `monaco-yaml@^5`（可选 peer，不装不影响其余功能，见 [yaml 语言服务](#yaml-语言服务)）。

## 快速开始

### 1. 注册插件（推荐）

```ts
// main.ts
import { createApp } from 'vue'
import VueMonacoEditor from '@emtt/vue-monaco-ide'
// 全局样式（CSS 变量 + 反馈弹窗样式，必须引入）
import '@emtt/vue-monaco-ide/style.css'
import App from './App.vue'

createApp(App)
  .use(VueMonacoEditor) // worker 默认走 CDN，开箱即用
  .mount('#app')
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import type { FileInput } from '@emtt/vue-monaco-ide'

const files: FileInput[] = [
  { path: '/src/utils.py', name: 'utils.py', language: 'python', content: 'def add(a: int, b: int) -> int:\n    return a + b\n' },
  { path: '/src/main.py', name: 'main.py', language: 'python', content: 'from utils import add\nprint(add(1, 2))\n' },
  { path: '/src/index.ts', name: 'index.ts', language: 'typescript', content: 'const x: number = 1\n' },
]
</script>

<template>
  <VueMonacoEditor
    :files="files"
    default-open-path="/src/main.py"
    :default-expanded-paths="['/src']"
    theme="web-code-editor-light"
    style="height: 600px"
    @save="({ path, content }) => console.log('save', path)"
    @change="({ path, isDirty }) => console.log('change', path, isDirty)"
  />
</template>
```

### 2. 或直接使用组件

```vue
<script setup lang="ts">
import { VueMonacoEditor } from '@emtt/vue-monaco-ide'
import '@emtt/vue-monaco-ide/style.css'
</script>
```

## 功能章节

### Markdown 预览

Markdown 文件支持「预览 / 编辑」双模式切换，两条通道按优先级生效：

**通道一：`#preview` 插槽（优先，适合已有渲染器的项目）**

```vue
<VueMonacoEditor :files="files">
  <template #preview="{ content }">
    <!-- 使用你自己的渲染器，例如 md-editor-v3 / markdown-it / marked -->
    <MdPreview :model-value="content" />
  </template>
</VueMonacoEditor>
```

插槽参数：`file`（当前文件节点）、`content`（当前内容字符串）。

**通道二：内置轻量渲染器（零依赖，开箱即用）**

```vue
<VueMonacoEditor :files="files" builtin-markdown-preview />
```

内置渲染器支持 ATX 标题、围栏代码块、段落、嵌套列表、引用块（可嵌套）、水平线、行内 code span/**粗体**/*斜体*/~~删除~~/链接/图片、GFM 表格。安全模型为**白名单重建**而非过滤：全部文本先转义再解析，标签/属性/URL 协议三方白名单（链接仅 `http(s)`/`mailto`/`#`，图片额外允许 `data:image/*;base64`），不满足的标记一律退化为纯文本。不支持原始 HTML 透传、缩进式代码块、任务列表与脚注。

### 非文本文件（图片 / PDF / 二进制）

文件类型由 `resolveFileKind` 判定（显式 `fileKind` 标记 > 扩展名 > 内容嗅探），编辑区按类别分流：

- **image** 且带 `remoteUrl` → `<img>` 在线预览；**pdf** 且带 `remoteUrl` → `<iframe>` 内嵌预览（`mediaPreview: false` 可整体关闭，退化为下载占位）
- **binary** 或缺 `remoteUrl` → 下载占位卡片，点击触发 `download` 事件，由页面层决定下载方式（后端接口 / `remoteUrl` / base64 解码）

```ts
const files: FileInput[] = [
  { path: '/assets/logo.png', name: 'logo.png', remoteUrl: 'https://.../logo.png' },
  { path: '/docs/spec.pdf', name: 'spec.pdf', fileKind: 'pdf', remoteUrl: 'https://.../spec.pdf' },
  { path: '/pkg/lib.zip', name: 'lib.zip' }, // 二进制：无需 content
]
```

`savedContent` 用于「云端内容 ≠ 本地草稿」场景：脏状态以 `savedContent ?? content` 为基线。

### serverHooks 服务端钩子

文件树的全部写操作（新建/重命名/删除/移动）支持先经服务端确认再落本地——钩子通过才应用本地变更，返回 `false` 或抛错则放弃（确认后提交本地变更）：

```vue
<script setup lang="ts">
import type { WebCodeEditorServerHooks } from '@emtt/vue-monaco-ide'

// 对接任意后端文件系统 API；payload 定义见 WebCodeEditorServerHooks 类型
const serverHooks: WebCodeEditorServerHooks = {
  async createFile({ parentPath, name }) {
    return await api.createFile(parentPath, name)
  },
  async createDirectory({ parentPath, name }) {
    return await api.createDir(parentPath, name)
  },
  async rename({ path, newName, isDirectory }) {
    return await api.rename(path, newName)
  },
  async remove({ path, isDirectory }) {
    return await api.remove(path)
  },
  async move({ sourcePath, targetFolderPath, isDirectory }) {
    return await api.move(sourcePath, targetFolderPath)
  },
}
</script>

<template>
  <VueMonacoEditor :files="files" :server-hooks="serverHooks" />
</template>
```

配套的防抖保护：同一操作在途时重复触发（快速双击新建、连续拖拽）会被静默忽略；目录层级上限 10 层（含拖拽整体迁移时的子孙深度校验）。未提供 `serverHooks` 时所有操作纯本地生效，行为与 0.1.x 一致。

### yaml 语言服务

YAML 基础高亮开箱即用（零配置）。需要 schema 校验、补全、悬停等完整语言服务时：

```bash
pnpm add monaco-yaml@^5   # 可选 peer
```

```ts
// main.ts —— 引入子入口（副作用导入），并在 configureWorkers 中按需配置 schema
import '@emtt/vue-monaco-ide/yaml'
import { configureWorkers } from '@emtt/vue-monaco-ide'

configureWorkers({
  yamlSchemas: [
    {
      fileMatch: ['*.yml', '*.yaml'],
      uri: 'https://json.schemastore.org/prettierrc.json',
      // 内网环境可将 uri 指向本地 schema 文件；enableSchemaRequest 固定关闭，
      // schema 内容需内联传入 schema 字段
      schema: {},
    },
  ],
})
```

worker 加载同样遵循下方三档策略：默认从 jsDelivr 的 `/+esm` 端点加载 `monaco-yaml@5.4.0` 的 worker；可用 `workerUrls.yaml` 指定本地产物；`workerUrls.yaml: false` 禁用专属 worker（回退 editor worker，仅失去语言服务，高亮不受影响）。未引入子入口时以上配置均不生效，yaml 保持基础高亮。

## Worker 加载策略

Monaco 与 Pyright 的语言服务都运行在 Web Worker 中，worker 脚本的加载方式由 `configureWorkers` 控制，分三档：

### 1. 默认：CDN（零配置）

不做任何配置时，worker 从 jsDelivr CDN 加载，版本自动 pin 到你安装的 `monaco-editor` / `monaco-pyright-lsp` 版本（构建时从各自 package.json 读取并写入产物）。跨域 worker 已内部处理（blob URL 中转 + 模块 import）。

> 注意：默认方案需要用户能访问 `cdn.jsdelivr.net`（内网环境请用方案 2/3）。

### 2. 指定 worker URL

把从 npm 包复制的 worker 文件放到你的静态目录或私有 CDN：

```ts
import { configureWorkers } from '@emtt/vue-monaco-ide'

configureWorkers({
  workerUrls: {
    editor: '/workers/editor.worker.js',
    typescript: '/workers/ts.worker.js',
    json: '/workers/json.worker.js',
    // css: ..., html: ...
  },
  pyrightWorkerUrl: '/workers/pyright/worker.js', // 来自 monaco-pyright-lsp/dist/worker.js
})
```

### 3. 完全接管（推荐生产环境使用）

在 Vite 项目中用官方 `?worker` 导入获得最佳的本地打包体验：

```ts
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

app.use(VueMonacoEditor, {
  workers: {
    getWorker(label) {
      if (label === 'typescript' || label === 'javascript') return new tsWorker()
      if (label === 'json') return new jsonWorker()
      return new editorWorker()
    },
  },
})
```

Pyright worker（`monaco-pyright-lsp/dist/worker.js`）可通过 CDN 或独立静态资源加载，不建议打进主 bundle；通过 `pyrightWorkerUrl` 指定。

## 组件 API

### Props（`<VueMonacoEditor>`）

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `files` | `FileInput[]` | `[]` | 受控文件列表（扁平 path 数组，自动构建文件树） |
| `defaultExpandedPaths` | `string[]` | `[]` | 初始展开的目录路径（异步到达同样生效，只展开不收起） |
| `defaultOpenPath` | `string \| null` | `null` | 初始打开并激活的文件路径（异步到达同样生效） |
| `theme` | `string` | `'vs'` | `web-code-editor-light` / `web-code-editor-dark` / `vs` / `vs-dark` / `hc-black` |
| `loading` | `boolean` | `false` | 强制显示加载遮罩（内部初始化完成后自动隐藏） |
| `saveTime` | `string \| null` | `null` | 初始「已保存」时间展示（如 `'16:32'`） |
| `publishText` | `string` | `'发布'` | 页签栏右侧按钮文字 |
| `serverHooks` | `WebCodeEditorServerHooks` | - | 文件树写操作的服务端确认钩子（见 [serverHooks](#serverhooks-服务端钩子)） |
| `mediaPreview` | `boolean` | `true` | image/pdf 且带 `remoteUrl` 时在线预览；关闭后退化为下载占位 |
| `builtinMarkdownPreview` | `boolean` | `false` | 无 `#preview` 插槽时启用内置 Markdown 渲染器（见 [Markdown 预览](#markdown-预览)） |

`FileInput`：

```ts
interface FileInput {
  path: string
  name: string
  /** 文本内容；目录与二进制条目可省略 */
  content?: string
  /** 语言 id；省略时按扩展名推断 */
  language?: string
  isDirectory?: boolean
  /** 显式指定文件类别（默认按扩展名/内容自动判定） */
  fileKind?: 'text' | 'image' | 'pdf' | 'binary'
  /** 图片/PDF 在线预览地址（data:/http URL） */
  remoteUrl?: string
  /** 脏状态基线：云端内容 ≠ 本地草稿时传入（脏标记以它为准） */
  savedContent?: string
}
```

### Emits

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `save` | `{ path, content, name }` | Cmd/Ctrl+S 或程序化保存当前文件 |
| `save-all` | `{ path, content, name }[]` | Cmd/Ctrl+Shift+S，仅含未保存文件 |
| `change` | `{ path, content, name, isDirty }` | 活动文件内容变化 |
| `open-file` | `path: string` | 打开文件（含跳转定义跨文件切换） |
| `close-file` | `path: string` | 关闭页签 |
| `publish` | - | 点击发布按钮 |
| `refresh` | - | 点击文件树刷新按钮 |
| `ready` | `{ elapsedMs?: number }` | 编辑器初始化完成、可交互 |
| `worker-error` | `{ type: 'python' \| 'typescript', error }` | worker 预加载失败（非致命） |
| `download` | `{ path, name, remoteUrl? }` | 非文本文件点击下载按钮（由页面层决定下载方式） |

### Slots

| 插槽 | 作用域 | 说明 |
| --- | --- | --- |
| `preview` | `{ file: FileNode, content: string }` | Markdown 预览渲染器，优先于内置渲染器；两者任一可用时显示预览/编辑切换 |

### 暴露方法（`ref` 调用）

```ts
editorRef.value.save()               // 保存当前文件
editorRef.value.saveAll()            // 保存全部
editorRef.value.openFile(path)       // 打开文件
editorRef.value.closeFile(path)      // 关闭页签
editorRef.value.getActiveFile()      // 当前活动 FileNode
editorRef.value.getFiles()           // 全部文件（含未保存内容与 fileKind/remoteUrl/isDirectory）
editorRef.value.setFileContent(path, content)
// 外部写入内容并标记为已保存（如 revision 冲突时采用远端内容）
```

## 插件 API

### `app.use(VueMonacoEditor, options?)`

```ts
export interface VueMonacoEditorPluginOptions {
  /** Worker 配置，见「Worker 加载策略」 */
  workers?: ConfigureWorkersOptions
  /** 注册的组件名，默认 'VueMonacoEditor' */
  componentName?: string
}
```

### 独立导出

```ts
import {
  VueMonacoEditor,     // 主组件（别名 WebCodeEditor）
  configureWorkers,    // worker 配置
  setFeedbackProvider, // 接管 toast / confirm 弹窗
  // —— 工具函数（宿主可直接复用）——
  resolveFileKind, getFileKindByFilename, looksLikeBinaryContent, normalizeFileKind,
  buildPath, getParentPath, getExtension, getPathDepth, MAX_PATH_DEPTH,
  downloadFile, downloadBase64File,
  MONACO_LANGUAGE_MAP, getLanguageByFilename,
  renderMarkdownToHtml,   // 内置 Markdown 渲染器（白名单重建，防 XSS）
  tryActivateYaml, setYamlActivator,
} from '@emtt/vue-monaco-ide'
```

## 定制与扩展

### 国际化

默认简体中文；`app.use(VueMonacoEditor, { locale: 'en-US' })` 可使用英文。
也可运行时调用 `setLocale('en')` / `setLocale('zh')`，并使用 `setMessages({ publish: '部署' })` 自定义文案，`setMessages({})` 清除覆盖。配置在同一模块的组件实例之间共享。


### 主题变量

所有 UI 颜色通过 CSS 变量暴露，覆盖即可匹配品牌：

```css
:root {
  --vme-primary: #7c3aed;   /* 主色：激活页签、发布按钮 */
  --vme-accent: #7c3aed;    /* 文件树操作按钮 hover */
  --vme-border: #e5e7eb;
  --vme-success: #22c55e;
  --vme-warning: #f97316;
  /* 完整列表见 src/styles/index.css */
}
```

### 接管 toast / 确认弹窗

内置零依赖的 toast 与 confirm（删除确认）。宿主有 UI 框架时可接管：

```ts
import { setFeedbackProvider } from '@emtt/vue-monaco-ide'
import { ElMessage, ElMessageBox } from 'element-plus'

setFeedbackProvider({
  toast: (msg, type) => ElMessage({ message: msg, type }),
  confirm: async ({ title, message }) =>
    await ElMessageBox.confirm(message, title).then(() => true).catch(() => false),
})
```

## 依赖说明

| 依赖 | 类型 | 用途 |
| --- | --- | --- |
| `vue` | peer | 组件框架（`^3.5`） |
| `monaco-editor` | peer | 编辑器内核与 TS/JSON 语言服务（`~0.52.2`） |
| `monaco-pyright-lsp` | peer | Pyright Web Worker 打包与 worker 协议（`0.1.x`） |
| `monaco-yaml` | peer（可选） | YAML 完整语言服务（`^5`）；仅引入子入口 `@emtt/vue-monaco-ide/yaml` 时需要 |
| `vscode-languageserver` | dependency | LSP JSON-RPC 协议实现（monaco-pyright-lsp 同款协议库，主线程与 worker 通信） |
| `vite` / `vue-tsc` / `eslint` 等 | dev | 仅构建/校验期使用，**不进入运行时产物** |

本包**不含**也不需要：element-plus / @element-plus/icons-vue（图标为内置 SVG）、UnoCSS / Tailwind（样式为内置 scoped CSS + CSS 变量）、md-editor-v3 / markdown-it（预览走插槽或内置零依赖渲染器）。

## 局限性与注意事项

- 仅浏览器 ESM 使用；不承诺 SSR 或 CommonJS。Vue 声明使用 3.5 类型 API，因此不再声明支持 Vue 3.3/3.4。Monaco 支持范围收紧至实际开发使用的 0.52.2 系列。
- 当前没有已部署演示站或截图；Python/TS 的浏览器补全与 CDN Worker 联调仍需人工验收。

- **Pyright worker 加载与初始化有开销**：按需加载，仅项目含 Python 文件时才拉取；首次分析（加载 typeshed、解析 import）需要数秒，期间显示「Python LSP 分析中」轻提示
- **serverHooks 在途竞态**：钩子请求进行期间外部重置 `files` prop 不做防护，宿主应避免在钩子在途时整体替换文件列表
- **内置 Markdown 渲染器**定位为轻量预览：不支持原始 HTML 透传、缩进式代码块、任务列表、脚注与公式；复杂渲染需求请走 `#preview` 插槽
- **yaml 语言服务的 schema 请求固定关闭**：`enableSchemaRequest: false`，schema 需内联传入 `yamlSchemas[].schema`（默认 worker 走 CDN `/+esm` 端点，断网或 `workerUrls.yaml: false` 时仅保留基础高亮）
- **浏览器内存**：大型项目（数百文件全量 TS model 同步）会占用较多内存，model 创建已做分块让出主线程，但超大工程建议分批挂载
- **删除确认/提示**默认为内置 DOM 实现，可[接管](#接管-toast--确认弹窗)
- **文件夹下载**未实现（前端 store 仅持有文本文件），预留 TODO
- 单实例编辑器区域（一个组件一个 Monaco editor 实例；文件树/页签为组件内部状态）

## 开发

```bash
pnpm install
pnpm dev           # playground（http://localhost:5180）
pnpm test          # 行为测试
pnpm lint          # eslint
pnpm type-check    # vue-tsc
pnpm build         # 库构建（dist/）+ 类型声明（dist/types/）
pnpm pack-check    # 预览 npm 包内容
```

贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)，PR 模板填写示范见 [docs/pr-example.md](docs/pr-example.md)。

## 发布

仅手动发布；CI 执行检查、测试、构建与打包。见 [发布清单](NEEDS_FROM_YOU.md)。当前 0.2.0 为候选版本，尚未发布。

## License

[MIT](LICENSE)，作者 hao503106@163.com（[GitHub](https://github.com/emtiantian)）。
