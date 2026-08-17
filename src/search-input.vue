<script setup lang="ts">
import { IconSearch } from './icons'

const modelValue = defineModel<string>({ default: '' })
</script>

<template>
  <div class="vme-search">
    <IconSearch class="vme-search__icon" :size="14" />
    <input
      v-model="modelValue"
      type="text"
      class="vme-search__input"
      placeholder="搜索文件"
    >
  </div>
</template>

<style scoped>
.vme-search {
  position: relative;
  display: flex;
  align-items: center;
}

.vme-search__icon {
  position: absolute;
  left: 10px;
  z-index: 1;
  color: #999;
  pointer-events: none;
}

.vme-search__input {
  width: 100%;
  height: 32px;
  padding: 0 12px 0 32px;
  font-size: 13px;
  color: var(--vme-text, #333);
  background: var(--vme-bg, #fff);
  border: 1px solid var(--vme-border, #d9d9d9);
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.vme-search__input::placeholder {
  color: #999;
}

.vme-search__input:focus {
  border-color: var(--vme-accent, #5b3ff0);
}
</style>
