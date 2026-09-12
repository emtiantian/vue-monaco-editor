/**
 * yaml 语言服务子入口（独立 chunk）。
 *
 * 为什么独立：本文件含 `import('monaco-yaml')` 字面量动态导入。若打进主入口，
 * 未安装 monaco-yaml（可选 peer）的宿主在构建时同样会解析该模块而报错；
 * 独立子入口后，只有显式 `import 'vue-monaco-ide/yaml'` 的宿主才需要安装它。
 *
 * 用法：
 *   import 'vue-monaco-ide/yaml'
 *   configureWorkers({ yamlSchemas: [{ fileMatch: '*.yml', schema: { ... } }] })
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
