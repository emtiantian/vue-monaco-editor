<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { t } from './i18n'
import { useFileStore } from './composables/use-file-store'
import FileIcon from './file-icon.vue'

const props = withDefaults(defineProps<{
  /** 上次保存时间，如 "16:32"；作为草稿已保存时间的展示值 */
  saveTime?: string | null
  /** 发布按钮文字（缺省取当前语言的「发布」） */
  publishText?: string
}>(), {
  saveTime: null,
  publishText: undefined,
})

const emit = defineEmits<{
  /** 点击手动保存按钮时触发 */
  (e: 'save'): void
  /** 点击发布按钮时触发 */
  (e: 'publish'): void
}>()

const { openTabs, state, closeFile, setActive } = useFileStore()
const tabBarRef = ref<HTMLDivElement | null>(null)

// 草稿状态：有改动=未保存，无改动且有保存时间=已保存，否则不显示
const isDirty = computed(() => state.files.some(f => f.content !== f.originalContent))
const draftStatus = computed<'saved' | 'dirty' | null>(() =>
  isDirty.value ? 'dirty' : (props.saveTime ? 'saved' : null),
)
const saveStatusText = computed(() => {
  if (draftStatus.value === 'saved')
    return t('saved')
  if (draftStatus.value === 'dirty')
    return t('unsaved')
  return ''
})

const publishTextResolved = computed(() => props.publishText ?? t('publish'))

function handleTabClick(path: string) {
  setActive(path)
}

function handleClose(e: Event, path: string) {
  e.stopPropagation()
  closeFile(path)
}

function scrollToActiveTab() {
  nextTick(() => {
    if (!tabBarRef.value)
      return
    const activeTab = tabBarRef.value.querySelector('.vme-tab--active') as HTMLElement | null
    if (!activeTab)
      return
    const container = tabBarRef.value
    const containerRect = container.getBoundingClientRect()
    const tabRect = activeTab.getBoundingClientRect()

    if (tabRect.left < containerRect.left) {
      container.scrollBy({ left: tabRect.left - containerRect.left - 8, behavior: 'smooth' })
    }
    else if (tabRect.right > containerRect.right) {
      container.scrollBy({ left: tabRect.right - containerRect.right + 8, behavior: 'smooth' })
    }
  })
}

function handleWheel(e: WheelEvent) {
  // 纵向滚轮映射为横向滚动
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.preventDefault()
    tabBarRef.value?.scrollBy({ left: e.deltaY, behavior: 'auto' })
  }
}

// 当活动标签变化时，自动滚动到可视区域
watch(() => state.activePath, scrollToActiveTab, { immediate: true })
</script>

<template>
  <div class="vme-tab-bar">
    <div ref="tabBarRef" class="vme-tab-bar__scroll" @wheel="handleWheel">
      <div
        v-for="tab in openTabs"
        :key="tab.path"
        class="vme-tab"
        :class="{
          'vme-tab--active': state.activePath === tab.path,
          'vme-tab--dirty': tab.isDirty,
        }"
        @click="handleTabClick(tab.path)"
      >
        <FileIcon :filename="tab.name" />
        <span class="vme-tab__name">{{ tab.name }}</span>
        <span v-if="tab.isDirty" class="vme-tab__dirty-dot" :title="t('unsavedTitle')">●</span>
        <button class="vme-tab__close" @click="handleClose($event, tab.path)">
          ×
        </button>
      </div>
    </div>
    <!-- 右侧：草稿状态 + 保存 + 发布 -->
    <div class="vme-tab-bar__side">
      <span v-if="draftStatus" class="vme-draft" :class="`vme-draft--${draftStatus}`">
        <span class="vme-draft__dot" />
        <span>{{ saveStatusText }}</span>
        <span v-if="draftStatus === 'saved' && saveTime" class="vme-draft__time">{{ saveTime }}</span>
      </span>
      <button type="button" class="vme-save-btn" :disabled="!isDirty" @click="emit('save')">
        {{ t('save') }}
      </button>
      <button type="button" class="vme-publish-btn" @click="emit('publish')">
        {{ publishTextResolved }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.vme-tab-bar {
  display: flex;
  align-items: center;
  flex: 1;
  height: 100%;
  overflow: hidden;
  background: var(--vme-bg-deep, #fafafa);
}

.vme-tab-bar__scroll {
  display: flex;
  align-items: center;
  height: 100%;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.vme-tab-bar__scroll::-webkit-scrollbar {
  display: none;
}

.vme-tab {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  height: 100%;
  min-width: 100px;
  max-width: 220px;
  border-right: 1px solid var(--vme-border-light, #f0f0f0);
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.15s, color 0.15s;
  color: #666;
  background: var(--vme-bg-deep, #fafafa);
}

.vme-tab:hover {
  background: var(--vme-hover, #f0f0f0);
}

.vme-tab--active {
  background: var(--vme-bg, #fff);
  color: var(--vme-primary, #1677ff);
  font-weight: 500;
  box-shadow: inset 0 -2px 0 0 var(--vme-primary, #1677ff);
}

.vme-tab__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 6px;
}

.vme-tab__dirty-dot {
  color: var(--vme-primary, #1677ff);
  font-size: 8px;
  margin-right: 6px;
}

.vme-tab__close {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  border-radius: 3px;
}

.vme-tab__close:hover {
  background: #d9d9d9;
  color: var(--vme-text, #333);
}

.vme-tab-bar__side {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  height: 100%;
  padding-left: 12px;
  padding-right: 10px;
  border-left: 1px solid var(--vme-border, #e8e8e8);
}

.vme-draft {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.vme-draft__dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 4px;
  border-radius: 50%;
  background: currentColor;
}

.vme-draft--saved {
  color: var(--vme-success, #52c41a);
}

.vme-draft--dirty {
  color: var(--vme-warning, #fa8c16);
}

.vme-draft__time {
  margin-left: 10px;
  color: #595959;
}

.vme-publish-btn {
  padding: 5px 14px;
  border: none;
  border-radius: 4px;
  background: var(--vme-primary, #1677ff);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.vme-save-btn {
  padding: 5px 12px;
  border: 1px solid var(--vme-border, #d9d9d9);
  border-radius: 4px;
  background: var(--vme-bg, #fff);
  color: var(--vme-text, #333);
  font-size: 13px;
  cursor: pointer;
}

.vme-save-btn:disabled {
  cursor: default;
  opacity: 0.45;
}

.vme-publish-btn:hover {
  opacity: 0.85;
}
</style>
