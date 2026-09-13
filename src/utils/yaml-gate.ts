/**
 * yaml 语言服务激活门。
 *
 * 主入口注册激活器，编辑器首次打开 YAML 文件时经 tryActivateYaml 动态加载
 * monaco-yaml。独立门函数让初始化保持幂等，并为 worker 失败提供基础高亮回退。
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
