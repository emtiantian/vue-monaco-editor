<script setup lang="ts">
import { t } from './i18n'
import { IconLoading } from './icons'
</script>

<template>
  <div class="vme-editor-loading">
    <div class="vme-editor-loading__inner">
      <IconLoading class="vme-icon-spin" :size="28" />
      <span class="vme-editor-loading__text">{{ t('editorInitializing') }}</span>
    </div>
  </div>
</template>

<style scoped>
.vme-editor-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  z-index: 100;
}

.vme-editor-loading__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--vme-primary, #1677ff);
}

.vme-editor-loading__text {
  font-size: 13px;
  color: #666;
}
</style>
