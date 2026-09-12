<script setup lang="ts">
import type { BinaryFilePlaceholderProps } from './types'
import { t } from './i18n'

defineProps<BinaryFilePlaceholderProps>()

const emit = defineEmits<{ (e: 'download'): void }>()
</script>

<template>
  <div class="vme-binary-placeholder">
    <div class="vme-binary-placeholder__badge">BIN</div>
    <p class="vme-binary-placeholder__text">
      {{ name }} {{ description ?? t('binaryFileHint') }}
    </p>
    <button type="button" class="vme-binary-placeholder__btn" @click="emit('download')">
      {{ t('downloadFile') }}
    </button>
  </div>
</template>

<style scoped>
.vme-binary-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;
  height: 100%;
  padding: 24px;
  background: var(--vme-bg, #fff);
  user-select: none;
}

.vme-binary-placeholder__badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--vme-text-secondary, #888);
  background: var(--vme-bg-deep, #f5f5f5);
  border: 1px solid var(--vme-border-light, #eee);
}

.vme-binary-placeholder__text {
  margin: 0;
  font-size: 13px;
  color: var(--vme-text-secondary, #888);
}

.vme-binary-placeholder__btn {
  padding: 5px 14px;
  font-size: 13px;
  color: var(--vme-primary, #1677ff);
  background: transparent;
  border: 1px solid var(--vme-primary, #1677ff);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.vme-binary-placeholder__btn:hover {
  color: #fff;
  background: var(--vme-primary, #1677ff);
}
</style>
