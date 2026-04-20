'use client'
import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'
type ToastItem = { id: number; msg: string; type: ToastType }
type ToastCtxType = { toast: (msg: string, type?: ToastType, dur?: number) => void }

const ToastCtx = createContext<ToastCtxType>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((msg: string, type: ToastType = 'success', dur = 4000) => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), dur)
  }, [])

  const icons = { success: CheckCircle, error: XCircle, info: Info }
  const colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb' }

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => {
          const Icon = icons[t.type]
          return (
            <div key={t.id} className={`toast ${t.type}`}>
              <Icon size={16} color={colors[t.type]} />
              {t.msg}
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
