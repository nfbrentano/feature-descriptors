import React, { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Play, CheckCircle2, Sparkles, MessageSquare } from 'lucide-react'
import { Descriptor, BBoxCoords, PointCoords } from '../types'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface PresentationModalProps {
  isOpen: boolean
  onClose: () => void
  descriptor: Descriptor | null
}

export const PresentationModal: React.FC<PresentationModalProps> = ({
  isOpen,
  onClose,
  descriptor
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose })
  const [currentIndex, setCurrentIndex] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const annotations = descriptor?.annotations || []
  const currentAnn = annotations[currentIndex] || null

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentIndex(i => (i + 1 < annotations.length ? i + 1 : i))
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex(i => (i > 0 ? i - 1 : 0))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, annotations.length])

  // Load image
  useEffect(() => {
    if (!descriptor?.image?.url) return
    const img = new Image()
    img.src = descriptor.image.url
    img.onload = () => {
      imageRef.current = img
      drawPresentation()
    }
  }, [descriptor?.image?.url])

  const drawPresentation = () => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !currentAnn) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.parentElement?.clientWidth || 800
    canvas.height = canvas.parentElement?.clientHeight || 600

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight, 1)
    const offsetX = (canvas.width - img.naturalWidth * scale) / 2
    const offsetY = (canvas.height - img.naturalHeight * scale) / 2

    // Draw background image dimmed
    ctx.globalAlpha = 0.4
    ctx.drawImage(img, offsetX, offsetY, img.naturalWidth * scale, img.naturalHeight * scale)
    ctx.globalAlpha = 1.0

    // Highlight active annotation region
    if (currentAnn.type === 'bbox') {
      const b = currentAnn.coords as BBoxCoords
      const x = offsetX + b.x * img.naturalWidth * scale
      const y = offsetY + b.y * img.naturalHeight * scale
      const w = b.w * img.naturalWidth * scale
      const h = b.h * img.naturalHeight * scale

      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, w, h)
      ctx.clip()

      // Redraw original sharp image inside clip
      ctx.drawImage(img, offsetX, offsetY, img.naturalWidth * scale, img.naturalHeight * scale)
      ctx.restore()

      // Draw glowing boundary
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, w, h)

      // Draw Badge
      ctx.fillStyle = '#6366f1'
      ctx.fillRect(x, Math.max(0, y - 24), 32, 22)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText(`A${currentIndex + 1}`, x + 6, Math.max(16, y - 8))
    } else if (currentAnn.type === 'point') {
      const pt = currentAnn.coords as PointCoords
      const x = offsetX + pt.x * img.naturalWidth * scale
      const y = offsetY + pt.y * img.naturalHeight * scale

      // Draw pulsing center
      ctx.beginPath()
      ctx.arc(x, y, 16, 0, Math.PI * 2)
      ctx.fillStyle = '#6366f1'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`A${currentIndex + 1}`, x, y)
    }
  }

  useEffect(() => {
    drawPresentation()
  }, [currentIndex, currentAnn])

  if (!isOpen || !descriptor) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="presentation-modal-title"
        onClick={e => e.stopPropagation()}
        style={{
          width: '95vw',
          maxWidth: '1400px',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Play size={20} className="text-primary" />
            <h3 id="presentation-modal-title" className="modal-title">Modo Apresentação: {descriptor.title}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {annotations.length > 0 ? `${currentIndex + 1} de ${annotations.length}` : 'Sem anotações'}
            </span>
            <button className="btn btn-secondary btn-icon-only" onClick={onClose} aria-label="Fechar apresentação">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ flex: 1, display: 'flex', gap: '20px', padding: '16px', overflow: 'hidden' }}>
          {/* Canvas Presentation View */}
          <div
            style={{
              flex: 1.5,
              background: 'var(--bg-canvas)',
              borderRadius: '8px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <canvas ref={canvasRef} role="img" aria-label="Slide de apresentação com destaque da anotação" style={{ width: '100%', height: '100%' }} />

            {/* Nav Arrows */}
            <button
              className="btn btn-secondary"
              aria-label="Anotação anterior"
              style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', borderRadius: '50%', width: 44, height: 44, padding: 0 }}
              onClick={() => setCurrentIndex(i => (i > 0 ? i - 1 : 0))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              className="btn btn-secondary"
              aria-label="Próxima anotação"
              style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', borderRadius: '50%', width: 44, height: 44, padding: 0 }}
              onClick={() => setCurrentIndex(i => (i + 1 < annotations.length ? i + 1 : i))}
              disabled={currentIndex >= annotations.length - 1}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Details Sidebar */}
          {currentAnn && (
            <div
              style={{
                flex: 1,
                background: 'var(--bg-panel)',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="annotation-badge-num" style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
                  A{currentIndex + 1}
                </span>
                {currentAnn.status === 'resolved' && (
                  <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={16} /> Resolvido
                  </span>
                )}
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{currentAnn.title}</h2>

              {currentAnn.description && (
                <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>REQUISITO</div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{currentAnn.description}</p>
                </div>
              )}

              {/* Tags and Points */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {currentAnn.tags?.map(t => (
                  <span key={t} className={`tag-badge tag-${t}`}>#{t}</span>
                ))}
                {currentAnn.estimate_points !== undefined && (
                  <span style={{ color: 'var(--accent-amber)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={14} /> {currentAnn.estimate_points} Pontos
                  </span>
                )}
              </div>

              {/* Messages / Discussion */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={14} /> HISTÓRICO DE DISCUSSÃO ({currentAnn.messages?.length || 0})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentAnn.messages?.map(msg => (
                    <div key={msg.id} className="message-bubble">
                      <div className="message-header">
                        <span className="message-author">{msg.author_name}</span>
                        <span className="message-time">{msg.created_at?.substring(11, 16)}</span>
                      </div>
                      <div className="message-text">{msg.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
