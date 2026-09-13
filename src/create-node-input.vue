<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { t } from './i18n'
import FileIcon from './file-icon.vue'

const props = defineProps<{
  isDirectory: boolean
  depth?: number
}>()

const emit = defineEmits<{
  (e: 'confirm', name: string): void
  (e: 'cancel'): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const value = ref('')

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
})

function handleKeydown(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229)
    return
  if (e.key === 'Enter') {
    e.preventDefault()
    confirm()
  }
  else if (e.key === 'Escape') {
    emit('cancel')
  }
}

function handleBlur() {
  emit('cancel')
}

function confirm() {
  const name = value.value.trim()
  if (name) {
    emit('confirm', name)
  }
  else {
    emit('cancel')
  }
}

const indentStyle = {
  paddingLeft: `${(props.depth || 0) * 14 + 28}px`,
}
</script>

<template>
  <li class="vme-create-node" :style="indentStyle">
    <FileIcon :is-directory="isDirectory" />
    <input
      ref="inputRef"
      v-model="value"
      class="vme-create-node__input"
      :placeholder="isDirectory ? t('createFolderPlaceholder') : t('createFilePlaceholder')"
      @keydown="handleKeydown"
      @blur="handleBlur"
    >
  </li>
</template>

<style scoped>
.vme-create-node {
  display: flex;
  align-items: center;
  height: 28px;
  list-style: none;
  padding-right: 8px;
}

.vme-create-node__input {
  flex: 1;
  height: 20px;
  padding: 0 4px;
  font-size: 13px;
  color: var(--vme-text, #333);
  background: var(--vme-bg, #fff);
  border: 1px solid var(--vme-primary, #1677ff);
  border-radius: 2px;
  outline: none;
}
</style>
