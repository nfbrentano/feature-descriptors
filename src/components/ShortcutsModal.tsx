import React from 'react'
import { X, Keyboard } from 'lucide-react'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose })
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={20} className="text-primary" />
            <h3 id="shortcuts-modal-title" className="modal-title">Atalhos de Teclado</h3>
          </div>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose} aria-label="Fechar modal de atalhos">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span>Ferramenta Seleção</span>
            <kbd style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>V ou S</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span>Ferramenta Bounding Box</span>
            <kbd style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>B</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span>Ferramenta Ponto</span>
            <kbd style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>P</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span>Ferramenta Polígono</span>
            <kbd style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>L</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span>Ferramenta Desenho Livre</span>
            <kbd style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>F</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span>Ferramenta Medição</span>
            <kbd style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>M</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span>Grade de Alinhamento</span>
            <kbd style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>G</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span>Mapa de Calor (Heatmap)</span>
            <kbd style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>H</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span>Desfazer / Refazer</span>
            <kbd style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>Ctrl+Z / Ctrl+Y</kbd>
          </div>
        </div>
      </div>
    </div>
  )
}
