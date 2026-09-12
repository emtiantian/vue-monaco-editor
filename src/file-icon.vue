<script setup lang="ts">
import type { FileSvgPart } from './utils/file-icon-svg'
import { computed } from 'vue'
import { FOLDER_OPEN_SVG_ICON, FOLDER_SVG_ICON, getSvgIconByFilename } from './utils/file-icon-svg'
import { getFileIconInfo } from './utils/language'

const props = defineProps<{
  filename?: string
  isDirectory?: boolean
  isOpen?: boolean
}>()

// 目录固定使用彩色文件夹图标（收起/展开两态）；文件命中扩展名映射时用彩色图标
const svgParts = computed<FileSvgPart[] | null>(() => {
  if (props.isDirectory)
    return props.isOpen ? FOLDER_OPEN_SVG_ICON.parts : FOLDER_SVG_ICON.parts
  return getSvgIconByFilename(props.filename || '')?.parts ?? null
})

// 未命中彩色图标的扩展名回退到文字徽章（保留原有配色逻辑）
const info = computed(() => getFileIconInfo(props.filename || ''))
</script>

<template>
  <!-- 彩色 SVG 图标：多段 path，各段独立 fill/stroke -->
  <svg
    v-if="svgParts"
    class="vme-file-icon-svg"
    viewBox="0 0 16 16"
    role="img"
    :aria-label="filename || 'folder'"
  >
    <path
      v-for="(part, i) in svgParts"
      :key="i"
      :d="part.d"
      :fill="part.fill ?? 'none'"
      :stroke="part.stroke"
      :stroke-width="part.strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
  <!-- 文字徽章 fallback -->
  <span v-else class="vme-file-icon" :style="{ backgroundColor: info.bg, color: info.color }" :title="info.label">
    {{ info.label }}
  </span>
</template>

<style scoped>
.vme-file-icon-svg {
  display: inline-block;
  width: 18px;
  height: 18px;
  margin-right: 6px;
  flex-shrink: 0;
}

.vme-file-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-right: 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  flex-shrink: 0;
}
</style>
