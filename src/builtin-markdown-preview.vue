<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdownToHtml } from './utils/markdown'

const props = defineProps<{
  content: string
}>()

const html = computed(() => renderMarkdownToHtml(props.content))
</script>

<template>
  <!-- 渲染器输出已按白名单重建并转义，v-html 安全 -->
  <div class="vme-md-preview" v-html="html" />
</template>

<style scoped>
/*
 * 注入的 DOM 不携带 data-v 属性，内容样式必须用 :deep()；
 * 颜色走双层变量：--vme-md-*（预览专属）→ --vme-*（组件主题）→ 字面量兜底，
 * 便于宿主在浅/深主题下分别微调。
 */
.vme-md-preview {
  max-width: 860px;
  padding: 20px 28px;
  margin: 0 auto;
  color: var(--vme-md-text, var(--vme-text, #333));
  font-size: 14px;
  line-height: 1.75;
  word-wrap: break-word;
}

.vme-md-preview :deep(h1),
.vme-md-preview :deep(h2),
.vme-md-preview :deep(h3),
.vme-md-preview :deep(h4),
.vme-md-preview :deep(h5),
.vme-md-preview :deep(h6) {
  margin: 24px 0 12px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--vme-md-heading, var(--vme-text, #333));
}

.vme-md-preview :deep(h1) {
  font-size: 26px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--vme-md-border, var(--vme-border-light, #f0f0f0));
}

.vme-md-preview :deep(h2) {
  font-size: 21px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--vme-md-border, var(--vme-border-light, #f0f0f0));
}

.vme-md-preview :deep(h3) {
  font-size: 17px;
}

.vme-md-preview :deep(h4) {
  font-size: 15px;
}

.vme-md-preview :deep(h5),
.vme-md-preview :deep(h6) {
  font-size: 14px;
}

.vme-md-preview :deep(p) {
  margin: 10px 0;
}

.vme-md-preview :deep(ul),
.vme-md-preview :deep(ol) {
  margin: 10px 0;
  padding-left: 24px;
}

.vme-md-preview :deep(li) {
  margin: 4px 0;
}

.vme-md-preview :deep(li > ul),
.vme-md-preview :deep(li > ol) {
  margin: 4px 0;
}

.vme-md-preview :deep(blockquote) {
  margin: 12px 0;
  padding: 8px 16px;
  border-left: 4px solid var(--vme-md-quote-border, var(--vme-border, #e8e8e8));
  background: var(--vme-md-quote-bg, var(--vme-bg-deep, #fafafa));
  color: var(--vme-md-muted, var(--vme-text-secondary, #666));
}

.vme-md-preview :deep(blockquote p) {
  margin: 4px 0;
}

.vme-md-preview :deep(pre) {
  margin: 12px 0;
  padding: 12px 16px;
  overflow-x: auto;
  background: var(--vme-md-code-bg, var(--vme-bg-deep, #f6f8fa));
  border: 1px solid var(--vme-md-border, var(--vme-border-light, #f0f0f0));
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
}

.vme-md-preview :deep(code) {
  padding: 2px 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  background: var(--vme-md-code-bg, var(--vme-bg-deep, #f6f8fa));
  border-radius: 3px;
  color: var(--vme-md-code-text, var(--vme-text, #333));
}

.vme-md-preview :deep(pre code) {
  padding: 0;
  background: none;
  border-radius: 0;
}

.vme-md-preview :deep(table) {
  margin: 12px 0;
  border-collapse: collapse;
  display: block;
  max-width: 100%;
  overflow-x: auto;
}

.vme-md-preview :deep(th),
.vme-md-preview :deep(td) {
  padding: 6px 14px;
  border: 1px solid var(--vme-md-border, var(--vme-border, #e8e8e8));
}

.vme-md-preview :deep(th) {
  font-weight: 600;
  background: var(--vme-md-table-head-bg, var(--vme-bg-deep, #fafafa));
}

.vme-md-preview :deep(tr:nth-child(2n) td) {
  background: var(--vme-md-table-stripe, transparent);
}

.vme-md-preview :deep(a) {
  color: var(--vme-md-link, var(--vme-primary, #1677ff));
  text-decoration: none;
}

.vme-md-preview :deep(a:hover) {
  text-decoration: underline;
}

.vme-md-preview :deep(img) {
  max-width: 100%;
}

.vme-md-preview :deep(hr) {
  margin: 18px 0;
  border: none;
  border-top: 1px solid var(--vme-md-border, var(--vme-border, #e8e8e8));
}
</style>
