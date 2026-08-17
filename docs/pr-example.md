# PR 示例（填写示范）

> 本文件仅作为 `.github/PULL_REQUEST_TEMPLATE.md` 的填写示范，不参与构建。
> 以下是一个真实场景的 PR 描述示例：为文件树新增「拖拽到空白处移动到根目录」功能。

---

## 变更说明

文件树此前只支持拖拽到其他节点上（before / after / inside），无法把深层文件直接移回根目录。本 PR 在文件树空白区域（列表容器）上新增 drop 处理：拖拽到空白处松手即移动到根目录 `/`，并在 dragover 时给出 `move` 光标反馈。

实现方式：

- `file-tree.vue` 的树容器上新增 `@dragover="onDragOverRoot"` 与 `@drop="onDropRoot"`
- `onDragOverRoot` 中校验：无拖拽源、或源已在根目录时不拦截默认行为
- `onDropRoot` 调用已有 `store.moveNode(source, '/')` 复用路径批量改写逻辑，并清理 `dragSourcePath`

## 变更类型

- [x] 新功能（feat）

## 自测清单

- [x] `pnpm lint` 通过
- [x] `pnpm type-check` 通过
- [x] `pnpm build` 通过
- [x] playground 手动验证：
  - 拖拽 `/src/utils.py` 到文件树空白处 → 文件移动到 `/utils.py`，已打开的 tab 路径同步更新
  - 根目录文件拖到空白处 → 无反应（已在目标位置）
  - 拖拽目录 `/src` 到空白处 → 目录及子孙整体迁移，展开状态保持
  - 拖到普通节点上的 before/after/inside 行为与之前一致（无回归）

## 截图 / 录屏

![drag-to-root](https://user-images.githubusercontent.com/xxx/drag-to-root.gif)
