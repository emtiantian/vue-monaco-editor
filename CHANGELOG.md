# 更新日志

本项目的所有显著变更都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [0.2.1] - 2026-09-14

### npm 发布准备

- 默认入口提供 YAML 校验、补全和悬停提示；`monaco-yaml` 改为运行依赖，YAML 服务从主入口加载。
- 将不可见图片和外部受限的 PDF 演示资源替换为可见、可嵌入的示例。
- 验证打包 npm 产物包含类型声明和公共类型，并可在严格 TypeScript 配置下使用。
- 增加手动保存按钮，保存请求改为由调用方确认：持久化完成前 `save`/`save-all` 不清除脏状态，成功后调用 `markFileSaved`（`setFileContent` 仍兼容）。
- 工具栏保存状态跟随当前活动文件，其他未保存文件仍通过页签圆点标记；`markFileSaved` 只更新保存基线，避免旧保存响应覆盖较新的编辑内容。

- 发布 `@emtt/vue-monaco-ide@0.2.0` 并完成 Pages 演示站。
- 增加中英文文档、手动发布配置和回归测试。
- 修复 locale/文案覆盖的响应式更新，并确保 YAML 注册入口不会被 tree shaking 移除。
- 兼容性变更：要求 Vue ^3.5.0（生成的声明使用 Vue 3.5 API）和 Monaco ~0.52.2；更旧版本组合尚未验证。
- 移除基于 tag 的自动 npm 发布；CI 只执行检查、测试、构建和打包。


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
- **yaml 语言服务**：主入口默认提供 YAML 服务，首次打开 YAML 时按需加载；`monaco-yaml` 为运行依赖，支持 `workerUrls.yaml` 指定或 `false` 禁用
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
