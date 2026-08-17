<script setup lang="ts">
import { computed } from 'vue'
import { getFileIconInfo } from './utils/language'

const props = defineProps<{
  filename?: string
  isDirectory?: boolean
  isOpen?: boolean
}>()

const info = computed(() => {
  if (props.isDirectory) {
    return {
      label: props.isOpen ? '📂' : '📁',
      color: '#ffa940',
      bg: '#fff7e6',
    }
  }
  return getFileIconInfo(props.filename || '')
})
</script>

<template>
  <span class="vme-file-icon" :style="{ backgroundColor: info.bg, color: info.color }" :title="info.label">
    {{ info.label }}
  </span>
</template>

<style scoped>
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
