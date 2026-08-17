# 贡献指南

感谢关注 vue-monaco-ide！

## 环境准备

- Node.js >= 18（推荐 22）
- pnpm >= 10

```bash
pnpm install
pnpm dev   # playground，http://localhost:5180
```

## 提交 PR 前

1. 从 `main` 拉出特性分支：`feat/xxx`、`fix/xxx`
2. 确保本地通过：
   ```bash
   pnpm lint
   pnpm type-check
   pnpm build
   ```
3. 在 playground 中手动验证受影响功能（尤其：Python Pyright 补全/跳转、TS 跨文件解析、文件树增删改拖拽、页签、Markdown 预览插槽）
4. 按 `.github/PULL_REQUEST_TEMPLATE.md` 填写 PR 描述（填写示范见 [docs/pr-example.md](docs/pr-example.md)）

## 提交信息

使用 Conventional Commits 风格：

```
feat(file-tree): 支持拖拽到空白处移回根目录
fix(pyright): 修复 rename 跨文件 edit 的 uri 映射
docs(readme): 补充 worker 配置说明
```

## 架构速览

```
src/
├── web-code-editor.vue    # 对外主组件：组装文件树 + 页签栏 + 编辑器 + 预览插槽
├── web-monaco-editor.vue  # Monaco 实例生命周期、model 切换、语言服务按需挂载
├── composables/
│   ├── use-file-store.ts  # 文件/页签/树状态的唯一数据源（provide/inject）
│   └── use-monaco-models.ts # JS/TS/Python model 的预创建与生命周期
├── webworker/
│   ├── python-lsp.ts      # Pyright provider 引用计数、全局 model 同步
│   ├── pyright-lsp-client.ts    # LSP JSON-RPC 客户端（多文档同步）
│   └── pyright-lsp-provider.ts  # Monaco languages provider 注册（hover/completion/...）
├── utils/
│   ├── monaco.ts          # 按需语言加载、TS defaults、worker 预热
│   └── monaco-environment.ts # worker URL 解析与 MonacoEnvironment 配置
├── icons.ts               # 内联 SVG 图标
├── feedback.ts            # toast/confirm（可被宿主接管）
└── styles/index.css       # CSS 变量与全局动画
```

## 发布流程（维护者）

1. 更新 `package.json` 版本与 `CHANGELOG.md`
2. CI 通过后打 tag：`git tag vX.Y.Z && git push origin vX.Y.Z`
3. `release.yml` 自动发布 npm 并创建 GitHub Release（需 `NPM_TOKEN` secret）
