<script setup lang="ts">
import type { MenuItem } from './types'
import { onMounted, onUnmounted, ref } from 'vue'

defineProps<{
  items: MenuItem[]
  x: number
  y: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const menuRef = ref<HTMLDivElement | null>(null)

function handleClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

function handleItemClick(item: MenuItem) {
  if (item.divider)
    return
  item.action()
  emit('close')
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="menuRef" class="vme-context-menu" :style="{ left: `${x}px`, top: `${y}px` }">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="vme-context-menu__item"
      :class="{
        'vme-context-menu__item--divider': item.divider,
        'vme-context-menu__item--danger': item.danger,
      }"
      @click="handleItemClick(item)"
    >
      {{ item.label }}
    </div>
  </div>
</template>

<style scoped>
.vme-context-menu {
  position: fixed;
  min-width: 140px;
  background: var(--vme-bg, #fff);
  border: 1px solid var(--vme-border-light, #e0e0e0);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 4px 0;
}

.vme-context-menu__item {
  padding: 6px 12px;
  font-size: 13px;
  white-space: nowrap;
  color: var(--vme-text, #333);
  cursor: pointer;
  transition: background-color 0.1s;
}

.vme-context-menu__item:not(.vme-context-menu__item--divider):hover {
  background: var(--vme-hover, #f5f5f5);
}

.vme-context-menu__item--danger {
  color: #ff4d4f;
}

.vme-context-menu__item--danger:hover {
  background: #fff1f0;
}

.vme-context-menu__item--divider {
  height: 1px;
  margin: 4px 0;
  padding: 0;
  background: var(--vme-border-light, #e0e0e0);
  pointer-events: none;
}
</style>
