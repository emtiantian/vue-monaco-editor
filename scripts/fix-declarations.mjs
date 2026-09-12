/**
 * 构建后处理：修正 dist/types 中的声明产物。
 *
 * vue-tsc 会把 src/index.ts 的 `import './styles/index.css'` 副作用导入
 * 原样写进 dist/types/index.d.ts，但包内并不存在 dist/styles/（CSS 被
 * Vite 抽取为根级 dist/style.css，通过 `vue-monaco-ide/style.css` 引入）。
 * 严格 TS 宿主（skipLibCheck: false）会因该路径解析失败报 TS2307，
 * 这里直接剔除 .d.ts 中的 CSS 导入行——CSS 副作用导入在类型层面无意义。
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const TYPES_DIR = new URL('../dist/types', import.meta.url).pathname

let fixed = 0

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full)
    }
    else if (full.endsWith('.d.ts')) {
      const src = readFileSync(full, 'utf8')
      const out = src.replace(/^[^\n]*?import\s+'[^']*?\.css';\n/gm, '')
      if (out !== src) {
        writeFileSync(full, out)
        fixed++
        console.log(`[fix-declarations] removed css import: ${full.replace(TYPES_DIR, 'dist/types')}`)
      }
    }
  }
}

walk(TYPES_DIR)
console.log(`[fix-declarations] done, ${fixed} file(s) fixed`)
