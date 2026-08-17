# Changelog

本项目的所有显著变更都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.1.0] - 2026-08-17

首个公开版本。从内部项目 `ui-aigc-apps-next` 的 `web-code-editor` 组件重构为独立 Vue 3 插件。

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
- GitHub Actions：CI（lint/type-check/build/pack）与 push tag 自动发布（含 provenance、版本一致性校验、自动 GitHub Release）

### 与内部版本（web-code-editor）的差异

- 移除 element-plus / @element-plus/icons-vue / md-editor-v3 / UnoCSS 依赖
- Vite 专有的 `?url` worker 导入改为运行时 URL 解析（CDN 默认 + 可配置）
- 内联原项目的 `@/utils/monaco-environment`、`@/utils/create-cross-origin-worker`
- 移除 monaco-yaml worker
- Markdown 预览由内置 md-editor-v3 改为 `#preview` 插槽

[Unreleased]: https://github.com/TODO-OWNER/vue-monaco-editor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/TODO-OWNER/vue-monaco-editor/releases/tag/v0.1.0
