# 需要你补充/确认的内容（发布前清单）

代码、构建、CI/CD、文档均已就绪，以下事项需要你手动补充。其中标 ⛔ 的会阻塞正式发布。

## ⛔ 1. GitHub 仓库

- [ ] 在 GitHub 创建仓库 `vue-monaco-editor`（或其他名字）
- [ ] 全局替换 `TODO-OWNER` 为你的 GitHub 用户名/组织名，涉及文件：
  - `package.json`（repository / bugs / homepage）
  - `README.md`（徽章、clone 地址、目录链接）
  - `CHANGELOG.md`（版本对比链接）
  - `CONTRIBUTING.md`、`LICENSE`（版权署名）、`docs/pr-example.md`
- [ ] 推送：`git remote add origin git@github.com:<owner>/vue-monaco-editor.git && git push -u origin main`

## ⛔ 2. 开源合规确认

本仓库代码源自公司项目 `ziguang/ai-agent-service/ui-aigc-apps-next`。公开前请确认：

- [ ] 已获得公司/团队的对外开源许可
- [ ] 代码中无内部接口地址、内网 IP、内部业务逻辑残留（当前代码已通读，未见硬编码地址，但建议再自查一遍）
- [ ] `LICENSE` 署名（当前为占位 `TODO-OWNER`）写个人还是公司，以及选择 MIT 还是 Apache-2.0

## ⛔ 3. npm 发布配置

- [ ] 拥有 npm 账号，且 `vue-monaco-editor` 包名可用（`npm view vue-monaco-editor` 检查；被占用则需改名，如 `@<scope>/vue-monaco-editor`，同时改 package.json 的 name 与 exports）
- [ ] 创建 **Automation** 类型的 Access Token（npmjs.com -> Access Tokens）
- [ ] 仓库 Settings -> Secrets and variables -> Actions 添加 secret：`NPM_TOKEN`
- [ ] 仓库 Settings -> Actions -> General -> Workflow permissions 设为 Read and write（release.yml 创建 GitHub Release 用）
- [ ] （可选）npm 账号开启 2FA 并允许 CI provenance（release.yml 已带 `--provenance`）
- [ ] （可选）如需 `release` environment 保护，在仓库 Settings -> Environments 建 `release` 环境

## 4. 版本与发布节奏（建议）

- [ ] 首个版本建议从 `0.1.0` 起（当前 package.json 已是 0.1.0），API 稳定后再发 `1.0.0`
- [ ] 每次发布：更新 version + CHANGELOG.md -> 合并 main -> `git tag vX.Y.Z && git push origin vX.Y.Z`

## 5. 可选补充（不阻塞）

- [ ] README 截图 / GIF 演示（文件树、Python 补全、跳转）
- [ ] Logo 与 favicon
- [ ] 是否需要 i18n：当前 UI 文案为中文硬编码（"已保存/未保存/搜索文件"等），若有海外用户需求需抽 locale
- [ ] CI 的 Node/pnpm 版本锁定偏好（当前：Node 22 + pnpm 10）
- [ ] 是否补单测/Vitest + Playwright e2e（当前 CI 为 lint/type-check/build，无测试）
- [ ] 文档站（vitepress）是否需要
