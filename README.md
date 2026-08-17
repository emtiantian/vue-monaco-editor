# vue-monaco-editor

一个基于 [Monaco Editor](https://github.com/microsoft/monaco-editor) 与 [monaco-pyright-lsp](https://www.npmjs.com/package/monaco-pyright-lsp) 的 **Vue 3 代码编辑器工作台组件**：文件树 + 多页签 + 编辑器一体，内置 **Pyright 全功能 Python LSP**，开箱即用。

**运行时只依赖 `monaco-editor` 与 `monaco-pyright-lsp`（及 `vscode-languageserver` 协议库）——不依赖任何 UI 组件库、CSS 框架。**

[![CI](https://github.com/TODO-OWNER/vue-monaco-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/TODO-OWNER/vue-monaco-editor/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/vue-monaco-editor)](https://www.npmjs.com/package/vue-monaco-editor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 目录

- [特性一览](#特性一览)
- [在线体验](#在线体验)
- [安装](#安装)
- [快速开始](#快速开始)
- [Worker 加载策略](#worker-加载策略)
- [组件 API](#组件-api)
- [插件 API](#插件-api)
- [定制与扩展](#定制与扩展)
- [依赖说明](#依赖说明)
- [与其他编辑器方案对比](#与其他编辑器方案对比)
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
- ✅ **Markdown**：语法高亮 + 可插拔预览（见 [#preview 插槽](#markdown-预览插槽)）
- ✅ 其他 80+ 语言按需懒加载高亮（打开文件时才注册）
- ✅ F12 / Cmd+点击 跳转定义、Cmd+S 保存、Cmd+Shift+S 全部保存
- ✅ 内置 `web-code-editor-light` / `web-code-editor-dark` 主题（对 Python 语义 token 做了配色），也支持 `vs` / `vs-dark` / `hc-black`

### 工作台（自带 UI，零 UI 框架依赖）

- ✅ **文件树**：新建文件/文件夹（行内输入）、重命名、删除（确认弹窗）、复制路径、下载文件、右键菜单、文件名过滤搜索
- ✅ **拖拽整理**：拖拽移动（目录内/跨目录）、同级排序（上沿 before / 下沿 after）、拖入目录（inside），目录不可拖入自身或其子目录
- ✅ **多页签**：脏状态标记、自动滚动到活动页签、纵向滚轮横向滚动、一键关闭
- ✅ **草稿状态栏**：「已保存 HH:MM / 未保存」实时状态、发布按钮（文字可配）
- ✅ 受控文件列表（`files` prop），支持外部重置与增量变更

### 工程质量

- ✅ 增量内容同步（编辑器 -> store 用 range 增量，避免每次全量 `getValue()`）
- ✅ JS/TS/Python model 预创建与生命周期管理，支撑跨文件解析
- ✅ Pyright worker 引用计数：多个编辑器实例共享一个 worker，全部卸载才 terminate
- ✅ Python LSP 按需初始化：项目无 Python 文件时完全不加载（约 25MB worker）
- ✅ TS worker 预热：打开 TS/JS 文件后台强制初始化，缩短首屏 IntelliSense 等待
- ✅ Monaco 官方 ESM 构建按需引入，未用的 contrib 不进 bundle

## 在线体验

```bash
git clone https://github.com/TODO-OWNER/vue-monaco-editor.git
cd vue-monaco-editor
pnpm install
pnpm dev          # 打开 playground（默认 http://localhost:5180）
```

## 安装

```bash
pnpm add vue-monaco-editor monaco-editor monaco-pyright-lsp
# 或
npm install vue-monaco-editor monaco-editor monaco-pyright-lsp
```

要求：Vue `^3.3`，monaco-editor `0.50 ~ 0.52`，monaco-pyright-lsp `0.1.x`。

## 快速开始

### 1. 注册插件（推荐）

```ts
// main.ts
import { createApp } from 'vue'
import VueMonacoEditor from 'vue-monaco-editor'
// 全局样式（CSS 变量 + 反馈弹窗样式，必须引入）
import 'vue-monaco-editor/style.css'
import App from './App.vue'

createApp(App)
  .use(VueMonacoEditor) // worker 默认走 CDN，开箱即用
  .mount('#app')
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import type { FileInput } from 'vue-monaco-editor'

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
import { VueMonacoEditor } from 'vue-monaco-editor'
import 'vue-monaco-editor/style.css'
</script>
```

### Markdown 预览插槽

包本身**不内置** Markdown 渲染器（保持零额外依赖）。提供 `#preview` 作用域插槽后，Markdown 文件会自动出现「预览 / 编辑」切换按钮：

```vue
<VueMonacoEditor :files="files">
  <template #preview="{ content }">
    <!-- 使用你自己的渲染器，例如 md-editor-v3 / markdown-it / marked -->
    <MdPreview :model-value="content" />
  </template>
</VueMonacoEditor>
```

插槽参数：`file`（当前文件节点）、`content`（当前内容字符串）。

## Worker 加载策略

Monaco 与 Pyright 的语言服务都运行在 Web Worker 中，worker 脚本的加载方式由 `configureWorkers` 控制，分三档：

### 1. 默认：CDN（零配置）

不做任何配置时，worker 从 jsDelivr CDN 加载，版本自动 pin 到你安装的 `monaco-editor` / `monaco-pyright-lsp` 版本（构建时从各自 package.json 读取并写入产物）。跨域 worker 已内部处理（blob URL 中转 + 模块 import）。

> 注意：默认方案需要用户能访问 `cdn.jsdelivr.net`（内网环境请用方案 2/3）。

### 2. 指定 worker URL

把从 npm 包复制的 worker 文件放到你的静态目录或私有 CDN：

```ts
import { configureWorkers } from 'vue-monaco-editor'

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

Pyright worker（`monaco-pyright-lsp/dist/worker.js`）体积约 25MB，始终建议走 CDN 或独立静态资源，不建议打进主 bundle；通过 `pyrightWorkerUrl` 指定。

## 组件 API

### Props（`<VueMonacoEditor>`）

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `files` | `FileInput[]` | `[]` | 受控文件列表（扁平 path 数组，自动构建文件树） |
| `defaultExpandedPaths` | `string[]` | `[]` | 初始展开的目录路径 |
| `defaultOpenPath` | `string \| null` | `null` | 初始打开并激活的文件路径 |
| `theme` | `string` | `'vs'` | `web-code-editor-light` / `web-code-editor-dark` / `vs` / `vs-dark` / `hc-black` |
| `loading` | `boolean` | `false` | 强制显示加载遮罩（内部初始化完成后自动隐藏） |
| `saveTime` | `string \| null` | `null` | 初始「已保存」时间展示（如 `'16:32'`） |
| `publishText` | `string` | `'发布'` | 页签栏右侧按钮文字 |

`FileInput`：`{ path: string, name: string, content: string, language: string }`

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

### Slots

| 插槽 | 作用域 | 说明 |
| --- | --- | --- |
| `preview` | `{ file: FileNode, content: string }` | Markdown 预览渲染器，提供后显示预览/编辑切换 |

### 暴露方法（`ref` 调用）

```ts
editorRef.value.save()               // 保存当前文件
editorRef.value.saveAll()            // 保存全部
editorRef.value.openFile(path)       // 打开文件
editorRef.value.closeFile(path)      // 关闭页签
editorRef.value.getActiveFile()      // 当前活动 FileNode
editorRef.value.getFiles()           // 全部文件（含未保存内容）
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
} from 'vue-monaco-editor'
```

## 定制与扩展

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
import { setFeedbackProvider } from 'vue-monaco-editor'
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
| `vue` | peer | 组件框架（`^3.3`） |
| `monaco-editor` | peer | 编辑器内核与 TS/JSON 语言服务（`0.50 ~ 0.52`） |
| `monaco-pyright-lsp` | peer | Pyright Web Worker 打包与 worker 协议（`0.1.x`） |
| `vscode-languageserver` | dependency | LSP JSON-RPC 协议实现（monaco-pyright-lsp 同款协议库，主线程与 worker 通信） |
| `vite` / `vue-tsc` / `eslint` 等 | dev | 仅构建/校验期使用，**不进入运行时产物**（构建时全部 external） |

本包**不含**也不需要：element-plus / @element-plus/icons-vue（图标为内置 SVG）、UnoCSS / Tailwind（样式为内置 scoped CSS + CSS 变量）、md-editor-v3（Markdown 预览走插槽）。

## 与其他编辑器方案对比

| 能力 | **vue-monaco-editor** | @guolao/vue-monaco-editor[^1] | monaco-vue / @logo-element/markdown-it 等封装[^2] | CodeSandbox / StackBlitz（在线 IDE 平台） | VS Code Web（monaco + services） |
| --- | --- | --- | --- | --- | --- |
| 定位 | Vue 组件库：**工作台级**（文件树+页签+编辑器） | Vue 组件库：**单编辑器** 包装 | 单编辑器包装 | 完整 SaaS 平台 | 完整 Web IDE |
| Python 智能提示 | ✅ **Pyright LSP 全功能**（补全/悬停/跳转/重命名/类型检查，内置 typeshed） | ❌ 仅基本高亮（Monaco 对 Python 无内置语言服务） | ❌ 同左 | ✅（平台自带 Pyright） | ✅ |
| TS/JS 深度 IntelliSense | ✅ 跨文件（预配置 eagerModelSync + checkJs + worker 预热） | ⚠️ 依赖使用者自行配置 worker 与 defaults | ⚠️ 同左 | ✅ | ✅ |
| 多文件工作台（文件树/页签/拖拽） | ✅ 内置 | ❌ 自行实现 | ❌ | ✅ | ✅ |
| 跨文件跳转打通页签切换 | ✅（goToDefinition 自动切换活动文件） | ❌ | ❌ | ✅ | ✅ |
| UI 框架依赖 | ✅ **零**（内置 CSS） | ✅ 零 | ⚠️ 部分绑定 element-plus 等 | 平台自带 | 平台自带 |
| 运行时依赖数量 | monaco-editor + monaco-pyright-lsp | monaco-editor | monaco-editor（+UI 库） | 平台 | monaco + @vscode/* 全家桶 |
| 接入成本（Vue 应用） | `app.use` + 传入 files 数组 | 低（单组件） | 低 | 高（嵌入 iframe/平台） | **高**（需自行组装数十个 VS Code service，如 filesystem/搜索/主题） |
| worker 加载 | CDN 默认 / URL 指定 / 完全接管 三档 | 自行配置 | 自行配置 | 平台托管 | 自行配置 |
| 自建文件系统/后端要求 | ❌ 不需要（文件为受控 prop） | - | - | ✅ 平台 API | ✅ 需实现 IFileSystemProvider 等 |
| 适合场景 | 低代码平台/AI Agent 工作台/在线作业编辑等需要**嵌入式多文件代码编辑**的 Vue 应用 | 表单里的单个代码输入框 | 同左 | 独立编程教育/预览站 | 需要完整 IDE 体验且愿意承担组装成本 |

[^1]: @guolao/vue-monaco-editor 是优秀的**单编辑器** Vue 包装，如果你只需要一个代码输入框，它更轻；需要多文件工作台与 Python 智能提示时选本库。
[^2]: 泛指各类 monaco 的 Vue 薄封装，普遍不包含工作台与 Python LSP。

**一句话总结**：常见 Vue + Monaco 封装停留在「把 Monaco 挂进 Vue」；本库目标是把 **「VS Code 级多文件智能编辑体验」以一个受控组件的形式嵌进任意 Vue 3 应用**，且不引入任何 UI 框架与后端要求。

## 局限性与注意事项

- **Pyright worker 体积大**（约 25MB，gzip 后显著缩小）：按需加载，仅项目含 Python 文件时才拉取；首次分析（加载 typeshed、解析 import）需要数秒，期间显示「Python LSP 分析中」轻提示
- **浏览器内存**：大型项目（数百文件全量 TS model 同步）会占用较多内存，model 创建已做分块让出主线程，但超大工程建议分批挂载
- **删除确认/提示**默认为内置 DOM 实现，可[接管](#接管-toast--确认弹窗)
- **文件夹下载**未实现（前端 store 仅持有文本文件），预留 TODO
- 单实例编辑器区域（一个组件一个 Monaco editor 实例；文件树/页签为组件内部状态）

## 开发

```bash
pnpm install
pnpm dev           # playground（http://localhost:5180）
pnpm lint          # eslint
pnpm type-check    # vue-tsc
pnpm build         # 库构建（dist/）+ 类型声明（dist/types/）
pnpm pack-check    # 预览 npm 包内容
```

贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)，PR 模板填写示范见 [docs/pr-example.md](docs/pr-example.md)。

## 发布

1. 更新 `package.json` 的 `version` 与 [CHANGELOG.md](CHANGELOG.md)
2. 合并到 `main`，CI 全绿
3. 打标签并推送：`git tag v0.1.0 && git push origin v0.1.0`
4. `release.yml` 自动校验版本一致性并发布到 npm（需仓库配置 `NPM_TOKEN` secret），随后创建 GitHub Release

## License

[MIT](LICENSE)
