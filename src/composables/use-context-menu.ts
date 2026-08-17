import type { Ref } from 'vue'
import { ref } from 'vue'

export interface UseContextMenuReturn {
  visible: Ref<boolean>
  x: Ref<number>
  y: Ref<number>
  open: (e: MouseEvent) => void
  close: () => void
}

/**
 * 管理右键菜单的位置与显示状态
 */
export function useContextMenu(): UseContextMenuReturn {
  const visible = ref(false)
  const x = ref(0)
  const y = ref(0)

  function open(e: MouseEvent) {
    e.preventDefault()
    x.value = e.clientX
    y.value = e.clientY
    visible.value = true
  }

  function close() {
    visible.value = false
  }

  return {
    visible,
    x,
    y,
    open,
    close,
  }
}
