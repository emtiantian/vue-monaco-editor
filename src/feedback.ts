/**
 * 轻量反馈服务：toast 提示 + confirm 确认弹窗。
 *
 * 零依赖实现（直接操作 DOM），用于替代原 element-plus 的 ElMessage / ElMessageBox。
 * 宿主应用可通过 setFeedbackProvider 接管，接入自己的 UI 框架（如 element-plus）。
 */

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  /** 危险操作（如删除）时确认按钮显示警示色 */
  danger?: boolean
}

export interface FeedbackProvider {
  /** 短暂浮层提示 */
  toast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void
  /** 模态确认框，resolve true 表示确认 */
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const STYLE_ID = 'vue-monaco-editor-feedback-style'
const STYLE_CSS = `
.vme-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: #fff;
  background: #323232;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: opacity 0.25s, transform 0.25s;
  opacity: 0;
  pointer-events: none;
}
.vme-toast.vme-toast-visible {
  opacity: 1;
  transform: translateX(-50%) translateY(4px);
}
.vme-toast-warning { background: #e6a23c; }
.vme-toast-error { background: #f56c6c; }
.vme-toast-success { background: #67c23a; }

.vme-confirm-mask {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}
.vme-confirm {
  min-width: 320px;
  max-width: 460px;
  padding: 20px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  font-size: 14px;
  color: #333;
}
.vme-confirm-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}
.vme-confirm-message {
  margin: 0 0 20px;
  color: #555;
  word-break: break-all;
}
.vme-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.vme-confirm-actions button {
  padding: 6px 16px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #333;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.vme-confirm-actions button:hover { border-color: var(--vme-primary, #1677ff); color: var(--vme-primary, #1677ff); }
.vme-confirm-actions .vme-confirm-ok {
  border-color: var(--vme-primary, #1677ff);
  background: var(--vme-primary, #1677ff);
  color: #fff;
}
.vme-confirm-actions .vme-confirm-ok:hover { opacity: 0.85; color: #fff; }
.vme-confirm-actions .vme-confirm-ok.vme-confirm-danger {
  border-color: #f56c6c;
  background: #f56c6c;
}
.vme-confirm-actions .vme-confirm-ok.vme-confirm-danger:hover { opacity: 0.85; color: #fff; }
`

function ensureStyle() {
  if (document.getElementById(STYLE_ID))
    return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = STYLE_CSS
  document.head.appendChild(style)
}

function domToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  ensureStyle()
  const el = document.createElement('div')
  el.className = `vme-toast${type === 'info' ? '' : ` vme-toast-${type}`}`
  el.textContent = message
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('vme-toast-visible'))
  setTimeout(() => {
    el.classList.remove('vme-toast-visible')
    setTimeout(() => el.remove(), 300)
  }, 2400)
}

function domConfirm(options: ConfirmOptions): Promise<boolean> {
  ensureStyle()
  return new Promise((resolve) => {
    const mask = document.createElement('div')
    mask.className = 'vme-confirm-mask'

    const dialog = document.createElement('div')
    dialog.className = 'vme-confirm'

    const title = document.createElement('h3')
    title.className = 'vme-confirm-title'
    title.textContent = options.title ?? '提示'

    const message = document.createElement('p')
    message.className = 'vme-confirm-message'
    message.textContent = options.message

    const actions = document.createElement('div')
    actions.className = 'vme-confirm-actions'

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.textContent = options.cancelText ?? '取消'

    const okBtn = document.createElement('button')
    okBtn.type = 'button'
    okBtn.className = `vme-confirm-ok${options.danger ? ' vme-confirm-danger' : ''}`
    okBtn.textContent = options.confirmText ?? '确定'

    function close(result: boolean) {
      mask.remove()
      resolve(result)
    }

    cancelBtn.addEventListener('click', () => close(false))
    okBtn.addEventListener('click', () => close(true))
    mask.addEventListener('click', (e) => {
      if (e.target === mask)
        close(false)
    })

    actions.append(cancelBtn, okBtn)
    dialog.append(title, message, actions)
    mask.appendChild(dialog)
    document.body.appendChild(mask)
    okBtn.focus()
  })
}

let feedbackProvider: FeedbackProvider = {
  toast: domToast,
  confirm: domConfirm,
}

/**
 * 替换默认反馈实现（如接入宿主应用的 element-plus / naive-ui 等）。
 * 传入 null 恢复内置 DOM 实现。
 */
export function setFeedbackProvider(provider: FeedbackProvider | null) {
  feedbackProvider = provider ?? { toast: domToast, confirm: domConfirm }
}

/** 短暂浮层提示 */
export function toast(message: string, type?: 'info' | 'success' | 'warning' | 'error') {
  feedbackProvider.toast(message, type)
}

/** 模态确认框，resolve true 表示确认 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return feedbackProvider.confirm(options)
}
