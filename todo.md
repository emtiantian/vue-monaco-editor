# TODO

> 由 NEEDS_FROM_YOU.md 中的第 1、4 项拆出，均为不阻塞当前开发的后续事项。

## 1. GitHub 仓库与 npm 发布配置（稍后再做）

- [ ] 在 GitHub 创建仓库（名字见下方「包名决策」）
- [ ] 全局替换 `TODO-OWNER` 为 GitHub 用户名/组织名，涉及文件：
  - `package.json`（repository / bugs / homepage）
  - `README.md`（徽章、clone 地址、目录链接）
  - `CHANGELOG.md`（版本对比链接）
  - `CONTRIBUTING.md`、`LICENSE`（版权署名）、`docs/pr-example.md`
- [ ] 推送：`git remote add origin git@github.com:<owner>/<repo>.git && git push -u origin main`

### ✅ 包名决策（2026-08-17 已确定：`vue-monaco-ide`）

背景：npm 包名 `vue-monaco-editor` **已被占用**（v0.0.19，维护者 matt-oconnell），
`@vue-monaco/editor` 也已被占用（v0.0.6）。

**已决策使用 `vue-monaco-ide`**（查证可用），并已完成全局改名：

- `package.json` 的 `name` / `main` / `module` / `exports` / `repository` 等
- 构建产物文件名（`dist/vue-monaco-ide.js`，见 vite.config.ts）
- README 安装命令与徽章、CHANGELOG、CONTRIBUTING、playground、feedback 样式 ID 等

组件名 `VueMonacoEditor`、CSS 前缀 `vme-`、Monaco 主题名 `web-code-editor-light/dark` 保持不变（仅包名变更）。

发布前如需再复核：`npm view vue-monaco-ide`（以防被抢注）。

### npm 发布前置（仓库建好后）

- [ ] npm 账号 + Automation 类型 Access Token
- [ ] 仓库 Settings -> Secrets -> 添加 `NPM_TOKEN`
- [ ] Settings -> Actions -> General -> Workflow permissions 设为 Read and write
- [ ] （可选）Settings -> Environments 创建 `release` 环境
- [ ] 确认开源许可（LICENSE 署名：个人 or 公司；MIT or Apache-2.0）

## 4. 文档与体验增强（稍后再做，不阻塞发布）

- [ ] README 截图 / GIF 演示（文件树、Python Pyright 补全、Cmd+点击跳转、Markdown 预览插槽）
- [ ] Logo 与 favicon
- [ ] i18n：当前 UI 文案为中文硬编码（"已保存/未保存/搜索文件"等），有海外用户需求时抽 locale
- [ ] CI 版本锁定偏好确认（当前 Node 22 + pnpm 10）
- [ ] 单元测试（Vitest）+ e2e（Playwright），当前 CI 仅 lint/type-check/build
- [ ] 文档站（vitepress，可选）
