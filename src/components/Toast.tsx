import React, { useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export interface ToastMessage {
  id: string
  type: 'success' | 'info' | 'error' | 'warning'
  title: string
  message?: string
}

interface ToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="toast-container" aria-live="polite" role="region" aria-label="Notificações do sistema">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={18} className="toast-icon text-emerald" />
      case 'error':
        return <AlertCircle size={18} className="toast-icon text-rose" />
      case 'warning':
        return <AlertCircle size={18} className="toast-icon text-amber" />
      default:
        return <Info size={18} className="toast-icon text-cyan" />
    }
  }

  return (
    <div className={`toast-item toast-${toast.type}`}>
      {getIcon()}
      <div className="toast-content">
        <span className="toast-title">{toast.title}</span>
        {toast.message && <span className="toast-message">{toast.message}</span>}
      </div>
      <button
        className="toast-close-btn"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar notificação"
      >
        <X size={14} />
      </button>
    </div>
  )
}
