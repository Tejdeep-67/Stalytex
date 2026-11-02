import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastKind = 'success' | 'info' | 'error'

export type Toast = {
  id: number
  kind: ToastKind
  text: string
  action?: { label: string; onClick: () => void }
}

type ToastInput = Omit<Toast, 'id'>

// tiny toast queue, no library needed
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((toast: ToastInput) => {
    const id = nextId.current++
    setToasts((list) => [...list.slice(-2), { ...toast, id }])
    return id
  }, [])

  return { toasts, push, dismiss }
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const ms = toast.kind === 'error' ? 7000 : toast.action ? 6000 : 3500
    const hide = window.setTimeout(() => setLeaving(true), ms)
    return () => window.clearTimeout(hide)
  }, [toast])

  useEffect(() => {
    if (!leaving) return
    const remove = window.setTimeout(() => onDismiss(toast.id), 220)
    return () => window.clearTimeout(remove)
  }, [leaving, onDismiss, toast.id])

  return (
    <div className={`toast ${toast.kind} ${leaving ? 'leaving' : ''}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
      <span className="toast-dot" aria-hidden="true" />
      <p>{toast.text}</p>
      {toast.action ? (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            toast.action?.onClick()
            setLeaving(true)
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => setLeaving(true)}>×</button>
    </div>
  )
}

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
