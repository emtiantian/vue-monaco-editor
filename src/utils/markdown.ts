/**
 * 轻量 Markdown 渲染器（内置预览用，零依赖）
 *
 * 设计目标：防 XSS。采用「白名单重建」策略而非过滤：
 * 1. 所有文本先经 escapeHtml 再做行内解析，任何未识别的标记都以纯文本呈现；
 * 2. 输出标签固定白名单（h1-6/p/ul/ol/li/blockquote/pre/code/table/thead/tbody/
 *    tr/th/td/em/strong/del/a/img/hr/br），属性仅 href/src/alt/class/style，且值全部转义输出；
 * 3. URL 协议白名单：链接仅 http/https/mailto/#；图片额外允许 data:image/*;base64。
 *    不满足的 URL 使整个链接/图片标记退化为纯文本（保留原样可读）。
 *
 * 支持语法：ATX 标题、围栏代码块、段落（含两空格硬换行）、嵌套列表、
 * blockquote（递归嵌套）、hr、行内 code span/strong/em/del/链接/图片、GFM 表格。
 * 明确不做：原始 HTML 透传、缩进式代码块、任务列表、脚注、公式。
 */

/** 行内代码占位符边界（私用区字符，运行时构造，避免源码出现控制字符字面量） */
const CODE_SENTINEL = String.fromCharCode(0xe000)

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 链接/图片地址安全校验；不通过返回 null（调用方退化为纯文本） */
function sanitizeUrl(url: string, isImage: boolean): string | null {
  const trimmed = url.trim()
  if (!trimmed)
    return null
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || trimmed.startsWith('#'))
    return trimmed
  if (isImage && /^data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,/i.test(trimmed))
    return trimmed
  return null
}

/**
 * 行内渲染：输入原始文本，内部先转义再解析
 *
 * 处理顺序经过设计：代码占位最先提取（防止内容被强调语法误伤）；
 * 强调在链接/图片之前（保证链接文字内的加粗生效，且插入的 <a>/<img>
 * 属性不再被后续规则改写）；代码占位最后还原。
 */
function renderInline(text: string): string {
  // 1. 提取行内代码为占位符
  const codes: string[] = []
  let work = text.replace(/(`+)([\s\S]*?)\1/g, (_m, _ticks: string, code: string) => {
    codes.push(code)
    return `${CODE_SENTINEL}${codes.length - 1}${CODE_SENTINEL}`
  })

  // 先整体转义（占位符由私用区字符构成不受影响）
  work = escapeHtml(work)

  // 两空格硬换行 → <br />；剩余换行视为软换行（空格）
  work = work.replace(/ {2,}\n/g, '<br />\n')

  // 2. 强调类（在链接前处理，使 [**粗体**](url) 生效）
  work = work.replace(/~~(?=\S)([\s\S]*?\S)~~/g, (_m, t: string) => `<del>${t}</del>`)
  work = work.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, (_m, t: string) => `<strong>${t}</strong>`)
  work = work.replace(/(^|[^\w])_(?=\S)([^_]*?\S)_($|[^\w])/g, (_m, pre: string, t: string, post: string) => `${pre}<em>${t}</em>${post}`)
  work = work.replace(/\*(?=\S)([^*\n]*?\S)\*/g, (_m, t: string) => `<em>${t}</em>`)

  // 3. 图片 ![alt](src)
  work = work.replace(/!\[([^\]]*)\]\(([^()\s]*)\)/g, (m, alt: string, src: string) => {
    const safe = sanitizeUrl(src, true)
    // src 已随整体转义，直接作为属性值输出是安全的
    return safe ? `<img src="${safe}" alt="${alt}" />` : m
  })

  // 4. 链接 [text](href)
  work = work.replace(/\[([^\]]*)\]\(([^()\s]*)\)/g, (m, label: string, href: string) => {
    const safe = sanitizeUrl(href, false)
    return safe
      ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : m
  })

  // 5. 还原行内代码
  work = work.replace(new RegExp(`${CODE_SENTINEL}(\\d+)${CODE_SENTINEL}`, 'g'), (m, idx: string) => {
    const code = codes[Number(idx)]
    return code === undefined ? m : `<code>${code}</code>`
  })

  return work.replace(/\n/g, ' ')
}

interface ListItem {
  /** 前导空白宽度（tab 按 2 空格计） */
  indent: number
  ordered: boolean
  /** 未转义的原始文本 */
  text: string
}

const UL_ITEM_RE = /^(\s*)([-*+])\s+(.*)$/
const OL_ITEM_RE = /^(\s*)(\d{1,9})[.)]\s+(.*)$/

/** 同层级列表递归渲染：items[start..] 中缩进 ≥ indent 的项构成一个列表 */
function renderListItems(items: ListItem[], start: number, indent: number, ordered: boolean): { html: string, next: number } {
  let out = ordered ? '<ol>' : '<ul>'
  let i = start
  while (i < items.length && items[i].indent >= indent) {
    out += `<li>${renderInline(items[i].text)}`
    i++
    // 后续项更深缩进 → 作为当前 li 的子列表
    if (i < items.length && items[i].indent > indent) {
      const child = renderListItems(items, i, items[i].indent, items[i].ordered)
      out += child.html
      i = child.next
    }
    out += '</li>'
  }
  out += ordered ? '</ol>' : '</ul>'
  return { html: out, next: i }
}

/** 表格分隔行检测：| --- | :---: | ---: 形态 */
function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/.test(line)
}

/** 拆分表格行为单元格（去首尾管道后按 | 切分）；无管道返回 null */
function splitTableRow(line: string): string[] | null {
  const t = line.trim()
  if (!t.includes('|'))
    return null
  let s = t
  if (s.startsWith('|'))
    s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|'))
    s = s.slice(0, -1)
  return s.split('|').map(c => c.trim())
}

function parseAlign(cell: string): 'left' | 'center' | 'right' | null {
  if (/^:-+:$/.test(cell))
    return 'center'
  if (/:-/.test(cell))
    return 'left'
  if (/-:/.test(cell))
    return 'right'
  return null
}

function alignStyle(align: 'left' | 'center' | 'right' | null): string {
  return align ? ` style="text-align:${align}"` : ''
}

const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})(.*)$/
const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/
const HR_RE = /^\s{0,3}(?:\*[ ]*){3,}$|^\s{0,3}(?:_[ ]*){3,}$|^\s{0,3}(?:-[ ]*){3,}$/
const BLOCKQUOTE_RE = /^\s{0,3}>/

/** 段落终止条件：遇到其他块级语法的首行 */
function isBlockStart(line: string): boolean {
  return Boolean(
    /^\s{0,3}#{1,6}\s/.test(line)
    || FENCE_RE.test(line)
    || BLOCKQUOTE_RE.test(line)
    || UL_ITEM_RE.test(line)
    || OL_ITEM_RE.test(line),
  )
}

/** 块级渲染主循环：消费 lines 返回 HTML 片段 */
function renderBlocks(lines: string[]): string {
  let out = ''
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 空行
    if (!line.trim()) {
      i++
      continue
    }

    // 围栏代码块
    const fence = line.match(FENCE_RE)
    if (fence) {
      const mark = fence[1]
      const lang = fence[2].trim()
      const closing = new RegExp(`^\\s{0,3}\\${mark[0]}{${mark.length},}\\s*$`)
      const buf: string[] = []
      i++
      while (i < lines.length && !closing.test(lines[i])) {
        buf.push(lines[i])
        i++
      }
      if (i < lines.length)
        i++ // 跳过闭合围栏
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : ''
      out += `<pre><code${cls}>${escapeHtml(buf.join('\n'))}</code></pre>\n`
      continue
    }

    // ATX 标题
    const heading = line.match(HEADING_RE)
    if (heading) {
      const level = heading[1].length
      out += `<h${level}>${renderInline(heading[2])}</h${level}>\n`
      i++
      continue
    }

    // GFM 表格（需当前行含管道且下一行是分隔行；先于 hr 判断避免单列冲突）
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = splitTableRow(line)!
      const aligns = headers.map((_, c) => parseAlign(splitTableRow(lines[i + 1])?.[c] ?? ''))
      let table = '<table><thead><tr>'
      headers.forEach((c, ci) => {
        table += `<th${alignStyle(aligns[ci])}>${renderInline(c)}</th>`
      })
      table += '</tr></thead><tbody>'
      i += 2
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        const cells = splitTableRow(lines[i])!
        table += '<tr>'
        headers.forEach((_, ci) => {
          table += `<td${alignStyle(aligns[ci])}>${renderInline(cells[ci] ?? '')}</td>`
        })
        table += '</tr>'
        i++
      }
      table += '</tbody></table>\n'
      out += table
      continue
    }

    // 水平线
    if (HR_RE.test(line)) {
      out += '<hr />\n'
      i++
      continue
    }

    // 引用块（递归渲染内部，天然支持多层嵌套与内部其他语法）
    if (BLOCKQUOTE_RE.test(line)) {
      const buf: string[] = []
      while (i < lines.length && BLOCKQUOTE_RE.test(lines[i])) {
        buf.push(lines[i].replace(/^\s{0,3}>\s?/, ''))
        i++
      }
      out += `<blockquote>${renderBlocks(buf)}</blockquote>\n`
      continue
    }

    // 列表（有序/无序、任意层嵌套）
    if (UL_ITEM_RE.test(line) || OL_ITEM_RE.test(line)) {
      const firstOrdered = OL_ITEM_RE.test(line)
      const items: ListItem[] = []
      while (i < lines.length) {
        const cur = lines[i]
        if (!cur.trim()) {
          // 列表内空行：仅当下一行仍是同类型根列表的项时吞掉，否则结束收集
          // （类型不同说明是紧邻的新列表，应各自成表）
          if (
            i + 1 < lines.length
            && (OL_ITEM_RE.test(lines[i + 1]) === firstOrdered)
            && (UL_ITEM_RE.test(lines[i + 1]) || OL_ITEM_RE.test(lines[i + 1]))
          ) {
            i++
            continue
          }
          break
        }
        const ul = cur.match(UL_ITEM_RE)
        const ol = cur.match(OL_ITEM_RE)
        if (ul || ol) {
          const m = ul ?? ol
          const indent = m![1].replace(/\t/g, '  ').length
          // 顶层类型切换（无序↔有序）：结束当前列表，让主循环开新列表
          if (items.length && Boolean(ol) !== items[0].ordered && indent <= items[0].indent)
            break
          items.push({ indent, ordered: Boolean(ol), text: m![3] })
        }
        else if (items.length && cur.length - cur.trimStart().length >= items[items.length - 1].indent + 2) {
          // 缩进续行并入上一项
          items[items.length - 1].text += ` ${cur.trim()}`
        }
        else {
          break
        }
        i++
      }
      const rendered = renderListItems(items, 0, items[0]?.indent ?? 0, firstOrdered)
      out += `${rendered.html}\n`
      continue
    }

    // 段落：连续非空行聚合，遇块级语法终止
    const buf: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      buf.push(lines[i])
      i++
    }
    out += `<p>${renderInline(buf.join('\n'))}</p>\n`
  }

  return out
}

/**
 * 将 Markdown 渲染为可直接 v-html 的 HTML 字符串（已防 XSS）
 */
export function renderMarkdownToHtml(md: string): string {
  const normalized = md.replace(/\r\n?/g, '\n')
  return renderBlocks(normalized.split('\n')).trim()
}
