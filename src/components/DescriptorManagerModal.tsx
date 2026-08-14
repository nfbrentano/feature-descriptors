import React, { useState } from 'react'
import { X, Plus, Trash2, Layers, Image as ImageIcon, Check, AlertCircle } from 'lucide-react'
import { Descriptor } from '../types'
import { MAX_DESCRIPTORS_LIMIT } from '../lib/storage'

interface DescriptorManagerModalProps {
  isOpen: boolean
  onClose: () => void
  descriptors: Descriptor[]
  activeDescriptorId: string | null
  onSelectDescriptor: (id: string) => void
  onCreateNewDescriptor: (title: string, file?: File) => void
  onDeleteDescriptor: (id: string) => void
}

export const DescriptorManagerModal: React.FC<DescriptorManagerModalProps> = ({
  isOpen,
  onClose,
  descriptors,
  activeDescriptorId,
  onSelectDescriptor,
  onCreateNewDescriptor,
  onDeleteDescriptor
}) => {
  const [newTitle, setNewTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  if (!isOpen) return null

  const isLimitReached = descriptors.length >= MAX_DESCRIPTORS_LIMIT

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    onCreateNewDescriptor(newTitle.trim(), selectedFile || undefined)
    setNewTitle('')
    setSelectedFile(null)
    setIsCreating(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} className="text-primary" />
            <h3 className="modal-title">
              Minhas Telas / Descritivos ({descriptors.length}/{MAX_DESCRIPTORS_LIMIT})
            </h3>
          </div>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {isLimitReached && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                fontSize: '0.84rem',
                color: 'var(--accent-amber)'
              }}
            >
              <AlertCircle size={18} />
              <span>
                Limite de 5 telas atingido. Cada tela possui suporte a anotações e comentários ilimitados. Para adicionar uma nova tela, exclua uma existente.
              </span>
            </div>
          )}

          {/* Form to create new if not limit reached and isCreating */}
          {isCreating ? (
            <form onSubmit={handleCreate} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Nova Tela / Descritivo</h4>
              <div className="meta-field" style={{ marginBottom: '12px' }}>
                <label className="meta-label">Título da Tela</label>
                <input
                  type="text"
                  className="meta-input"
                  placeholder="Ex: Tela de Checkout, Dashboard de Métricas..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="meta-field" style={{ marginBottom: '16px' }}>
                <label className="meta-label">Imagem da Tela (Opcional - pode colar depois)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files?.[0]) setSelectedFile(e.target.files[0])
                  }}
                  style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={!newTitle.trim()}>
                  Criar Descritivo
                </button>
              </div>
            </form>
          ) : (
            !isLimitReached && (
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginBottom: '16px', padding: '10px' }}
                onClick={() => setIsCreating(true)}
              >
                <Plus size={16} />
                <span>Adicionar Nova Tela / Descritivo</span>
              </button>
            )
          )}

          {/* List of existing descriptors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {descriptors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                Nenhum descritivo cadastrado. Clique no botão acima para criar o primeiro!
              </div>
            ) : (
              descriptors.map(d => {
                const isActive = d.id === activeDescriptorId
                return (
                  <div
                    key={d.id}
                    className="annotation-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderColor: isActive ? 'var(--primary)' : undefined,
                      background: isActive ? 'rgba(99, 102, 241, 0.12)' : undefined
                    }}
                    onClick={() => {
                      onSelectDescriptor(d.id)
                      onClose()
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '6px',
                          background: 'var(--bg-input)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        {d.image.url ? (
                          <img
                            src={d.image.url}
                            alt={d.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <ImageIcon size={18} className="text-muted" />
                        )}
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                          {d.title}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {d.annotations.length} anotações • Versão {d.image.version || 1}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      {isActive && (
                        <span
                          style={{
                            fontSize: '0.74rem',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginRight: '8px'
                          }}
                        >
                          <Check size={14} /> Ativo
                        </span>
                      )}
                      <button
                        className="btn btn-danger btn-icon-only"
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja excluir "${d.title}"?`)) {
                            onDeleteDescriptor(d.id)
                          }
                        }}
                        title="Excluir descritivo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
