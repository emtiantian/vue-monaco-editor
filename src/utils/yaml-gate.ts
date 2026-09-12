/**
 * yaml 语言服务激活门。
 *
 * monaco-yaml 是可选 peer 依赖：主入口不引用它（否则未安装的宿主编译失败），
 * 由子入口 `vue-monaco-ide/yaml` 在被 import 时通过 setYamlActivator 注册激活器；
 * 编辑器侧打开 yaml 文件时经 tryActivateYaml 触发。全程零 monaco-yaml 静态依赖。
 */

export type YamlActivator = () => Promise<boolean>

let activator: YamlActivator | null = null

/** 注册 yaml 激活器（由子入口调用，幂等覆盖） */
export function setYamlActivator(fn: YamlActivator): void {
  activator = fn
}

/**
 * 尝试激活 yaml 语言服务（补全/校验）。
 * 未引入子入口、激活器缺失或初始化失败时返回 false——
 * 此时 yaml 仍保留 Monaco 内置的基础高亮（worker 失败自动回退 editor worker）。
 */
export function tryActivateYaml(): Promise<boolean> {
  if (!activator)
    return Promise.resolve(false)
  return activator().catch((err) => {
    console.warn('[vue-monaco-ide] yaml 语言服务激活失败，保留基础高亮', err)
    return false
  })
}
