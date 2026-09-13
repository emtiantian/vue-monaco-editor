/**
 * YAML 语言服务注册模块。
 * 主入口默认加载；`@emtt/vue-monaco-ide/yaml` 子入口为旧用法保留。
 * 实际语言服务在首次打开 YAML 文件时动态加载，避免阻塞初始编辑器渲染。
 */
import { monaco } from '../utils/monaco'
import { ensureMonacoEnvironment, getYamlSchemas } from '../utils/monaco-environment'
import { setYamlActivator } from '../utils/yaml-gate'

setYamlActivator(async () => {
  // 先确保 yaml worker URL 已注册到 MonacoEnvironment，再让 monaco-yaml 创建 worker
  await ensureMonacoEnvironment({ labels: ['yaml'] })

  const { configureMonacoYaml } = await import('monaco-yaml')
  const schemas = getYamlSchemas()
  configureMonacoYaml(monaco, {
    enableSchemaRequest: false,
    schemas: schemas as never,
  })
  return true
})
