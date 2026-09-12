# npm 发布准备状态

目标：`@emtt/vue-monaco-ide@0.2.0`，公开发布到 `https://registry.npmjs.org/`。

## 发布前待完成

- 提供并核实实际 GitHub 仓库地址。目前没有 Git remote；旧的 `TODO-OWNER` 元数据已移除。必须补齐 `package.json` 的 `repository`、`homepage`、`bugs.url`，并在双语 README 添加真实仓库链接。
- 重新登录 npm：本次 `npm whoami --registry=https://registry.npmjs.org/` 返回 401。使用 `npm login --registry=https://registry.npmjs.org/` 完成登录，然后核实账号具有 `@emtt` scope 发布权限。
- 2026-09-12 官方 registry 查询包名返回 404，表示未找到公开包，不保证 scope 权限或未来仍可用。正式发布前再次查询名称和精确版本。
- 浏览器人工验收：Python 补全/跨文件跳转、TS/JS 跳转与实际部署环境的 Worker 加载。当前没有已部署演示站及截图。

## 本次变更

- 保留已有 0.2.0 版本和工作区功能，包名加 `@emtt` scope，作者和 MIT 署名为 hao503106@163.com。
- 英文/中文 README、CSS 与声明入口、发布文件白名单、public registry 配置。
- YAML 子入口声明为副作用，避免生产构建移除语言服务注册。
- locale/message 改为 Vue 响应式状态，运行时切换可更新已挂载组件。
- Vue peer 收紧为 ^3.5.0（类型声明使用 3.5 API），Monaco 收紧为 ~0.52.2。此兼容范围变化已写入 CHANGELOG。
- 删除推送 tag 自动发布工作流；CI 仅检查、测试、构建及打包。

## 手动发布步骤

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm pack --pack-destination artifacts
```

修改元数据或代码后必须重新打包并验证新的 tarball，不能直接发布旧候选包。发布前再次核对包名、版本、registry、检查结果及 npm 身份。

只有明确决定正式发布时，才对经过消费验证的同一个 tarball 执行：

```sh
pnpm publish artifacts/emtt-vue-monaco-ide-0.2.0.tgz --access public --registry=https://registry.npmjs.org/
```

本轮仅准备，未发布 npm、未创建远端仓库、未推送提交或标签。
