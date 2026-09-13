# Changelog

本项目的所有显著变更都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### npm release preparation

- Add a manual Save button and make save requests caller-confirmed: `save`/`save-all` no longer clear dirty state before persistence; call `markFileSaved` after successful persistence (`setFileContent` remains compatible).

- Prepare `@emtt/vue-monaco-ide@0.2.0` as an unpublished candidate; previous dated sections describe development milestones, not verified npm releases.
- Add English/Chinese documentation, manual release configuration and regression tests.
- Fix reactive locale/message updates and preserve the YAML registration entry during tree shaking.
- Compatibility change: require Vue ^3.5.0 (generated declarations use Vue 3.5 APIs) and Monaco ~0.52.2; older combinations are unverified.
- Remove tag-triggered npm publishing; CI only checks, tests, builds and packs.


### 修复

- 修正跨域 Module Worker 的初始化顺序：全局配置作为第一个静态依赖执行，保留加载期间的初始消息，避免 TS/JS 语言服务初始化异常。
- 跨文件定义跳转在切换页签后保留目标行列，并忽略已过期的异步文件切换，避免定义定位丢失。

## [0.2.0] - 2026-08-25

对齐内部源项目 `web-code-editor` 的能力全集，并补充视觉与语言扩展。

### 新增

- **serverHooks 服务端钩子**：`createFile` / `createDirectory` / `rename` / `remove` / `move` 五个可选钩子，文件树写操作先经宿主确认再落本地（乐观更新 + 失败回滚）；同一操作在途时重复触发静默忽略
- **非文本文件体系**：新增 `FileKind` 四分类（text/image/pdf/binary），判定优先级为显式标记 > 扩展名 > 内容嗅探；image/pdf 带 `remoteUrl` 时在线预览（`mediaPreview` prop 可关），binary 走下载占位卡片并触发 `download` 事件
- **`savedContent` 基线**：脏状态以 `savedContent ?? content` 为准，支持「云端内容 ≠ 本地草稿」场景
- **彩色文件类型图标**：内置 50+ 高频扩展名的 vscode-icons 风格 SVG 图标（零依赖内联双色 glyph），目录折叠/展开双态，冷门扩展名回退原文字徽章
- **yaml 语言服务**：可选子入口 `@emtt/vue-monaco-ide/yaml` + 可选 peer `monaco-yaml@^5`；基础高亮开箱即用，引入子入口后获得 schema 校验/补全/悬停；worker 默认走 jsDelivr `/+esm` 端点，支持 `workerUrls.yaml` 指定或 `false` 禁用
- **内置 Markdown 预览**：`builtinMarkdownPreview` prop 启用零依赖轻量渲染器（标题/代码块/列表/引用/表格/行内标记）；安全模型为白名单重建（全转义 + 标签/属性/URL 协议三方白名单）；`#preview` 插槽仍优先
- **目录深度上限**：路径层级最多 10 层（`MAX_PATH_DEPTH`），新建与跨目录拖拽均校验子孙深度
- **实例方法 `setFileContent(path, content)`**：外部写入内容并标记已保存（revision 冲突回写）
- **鲁棒性**：`defaultExpandedPaths` / `defaultOpenPath` 支持异步到达；`files` 重置导致活动文件丢失且默认打开路径存在时自动重开；删除确认期间树变化的二次校验
- **工具函数公开导出**：`resolveFileKind` 系列、path 系列、download 系列、`MONACO_LANGUAGE_MAP` / `getLanguageByFilename`、`renderMarkdownToHtml`
- `FileInput` 的 `content` / `language` 放宽为可选（目录与二进制条目无需传空串）

### 变更（破坏性）

- `createFileStore()` 返回的 `createNode` / `renameFile` 变更为 `Promise<boolean>`，`moveNode` / `reorderNode` 变更为 `Promise<void>`——仅影响直接使用 `createFileStore` 高级 API 的宿主；组件 props/emits/expose 完全向后兼容


## [0.1.0] - 2026-08-17

首个开发里程碑（未核实 npm 发布记录）。由内部项目的 `web-code-editor` 组件重构为独立 Vue 3 插件。

### 新增

- 基于 Monaco Editor 的多文件代码编辑工作台组件 `VueMonacoEditor`：文件树 + 多页签 + 编辑器
- 内置 Pyright LSP（依赖 monaco-pyright-lsp）：Python 补全、悬停文档、签名帮助、跨文件跳转定义、重命名、实时类型检查
- TS/JS 跨文件智能提示（预配置 compilerOptions、eagerModelSync、worker 预热）
- JSON 语言服务、Markdown 高亮
- 80+ 语言按需懒加载高亮
- 文件树：新建/重命名/删除（确认弹窗）/复制路径/下载/右键菜单/搜索过滤/拖拽移动与排序
- 多页签：脏状态、自动滚动、滚轮横向滚动
- 草稿状态栏与可配置发布按钮
- `#preview` 作用域插槽：由使用方注入 Markdown 渲染器
- Worker 加载三档策略：CDN 默认 / 指定 URL / 完全接管 `getWorker`
- 零 UI 框架依赖：内置 SVG 图标、scoped CSS、CSS 变量主题、可接管的 toast/confirm
- GitHub Actions：CI（lint/type-check/test/build/pack）与 GitHub Pages 演示站部署；npm 保持手动发布

### 与内部版本（web-code-editor）的差异

- 移除 element-plus / @element-plus/icons-vue / md-editor-v3 / UnoCSS 依赖
- Vite 专有的 `?url` worker 导入改为运行时 URL 解析（CDN 默认 + 可配置）
- 内联原项目的 `@/utils/monaco-environment`、`@/utils/create-cross-origin-worker`
- 移除 monaco-yaml worker
- Markdown 预览由内置 md-editor-v3 改为 `#preview` 插槽
