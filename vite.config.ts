/**
 * vue-monaco-ide 库构建配置。
 *
 * - 库模式单入口：src/index.ts，产物 ESM（dist/vue-monaco-ide.js + dist/style.css）
 * - vue / monaco-editor / monaco-pyright-lsp 全部 external（peerDependencies），
 *   由宿主应用安装并提供，避免 monaco 被重复打包
 * - monaco-yaml 为默认入口的按需运行依赖，实际打开 YAML 文件时动态加载
 * - worker 不打包：默认走 CDN，或由宿主通过 configureWorkers 提供本地 worker URL
 * - 类型产物由 vue-tsc --emitDeclarationOnly 生成到 dist/types（见 package.json build 脚本）
 */
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: {
        'vue-monaco-ide': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        'utils/file-kind': fileURLToPath(new URL('./src/utils/file-kind.ts', import.meta.url)),
        'utils/path': fileURLToPath(new URL('./src/utils/path.ts', import.meta.url)),
        'utils/language': fileURLToPath(new URL('./src/utils/language.ts', import.meta.url)),
        'utils/markdown': fileURLToPath(new URL('./src/utils/markdown.ts', import.meta.url)),
        style: fileURLToPath(new URL('./src/style-entry.ts', import.meta.url)),
      },
      formats: ['es'],
    },
    outDir: 'dist',
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      external: [
        /^vue(\/|$)/,
        'monaco-editor',
        'monaco-pyright-lsp',
        'monaco-yaml',
        // monaco-editor 子路径导入（esm/vs/...）
        /^monaco-editor\//,
        /^monaco-pyright-lsp\//,
        /^monaco-yaml(\/|$)/,
        // vscode-languageserver 为运行时依赖，但 worker 相关子模块仅在浏览器 worker 上下文使用，
        // 主线程产物中以子路径导入，同样 external，由 dependencies 提供
        /^vscode-languageserver(\/|$)/,
      ],
      output: {
        // 稳定文件名：发布包内入口/子模块引用不带 hash
        // 入口名即文件名：vue-monaco-ide.js
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some(n => n.endsWith('.css'))) {
            return 'style.css'
          }
          return 'assets/[name][extname]'
        },
      },
    },
  },
})
