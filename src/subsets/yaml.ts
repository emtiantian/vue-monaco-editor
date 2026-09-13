/**
 * YAML 语言服务注册模块。
 * 主入口注册激活器；实际语言服务仅在首次打开 YAML 文件时动态加载，
 * 避免没有 YAML 文件的项目承担初始化开销。
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
