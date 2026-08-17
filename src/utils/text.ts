/**
 * 将 Monaco Editor 的模型内容变更应用到字符串。
 *
 * 按 rangeOffset 降序应用，避免多个 change 互相影响。
 * 适用于把编辑器增量修改同步到外部 store，避免每次都 getValue() 全量取文本。
 */
export function applyModelContentChanges(
  text: string,
  changes: Array<{
    rangeOffset: number
    rangeLength: number
    text: string
  }>,
): string {
  if (!changes.length)
    return text

  const sorted = [...changes].sort((a, b) => b.rangeOffset - a.rangeOffset)
  let result = text

  for (const change of sorted) {
    const { rangeOffset, rangeLength, text: replacement } = change
    result = result.slice(0, rangeOffset) + replacement + result.slice(rangeOffset + rangeLength)
  }

  return result
}
