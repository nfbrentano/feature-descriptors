import React from 'react'
import { X, Keyboard } from 'lucide-react'

interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={20} className="text-primary" />
            <h3 className="modal-title">Atalhos de Teclado</h3>
          </div>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose} aria-label="Fechar modal">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span>Ferramenta Seleção</span>
            <kbd style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>V</kbd>
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
            <span>Mapa de Calor (Heatmap)</span>
            <kbd style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>H</kbd>
          </div>
        </div>
      </div>
    </div>
  )
}
