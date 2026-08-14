import React, { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Play, CheckCircle2, Sparkles, MessageSquare } from 'lucide-react'
import { Descriptor, BBoxCoords, PointCoords } from '../types'

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
  const [currentIndex, setCurrentIndex] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const annotations = descriptor?.annotations || []
  const currentAnn = annotations[currentIndex] || null

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        setCurrentIndex(i => (i + 1 < annotations.length ? i + 1 : i))
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex(i => (i > 0 ? i - 1 : 0))
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, annotations.length, onClose])

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

    // Calculate scale to fit
    const scale = Math.min(
      canvas.width / img.naturalWidth,
      canvas.height / img.naturalHeight,
      1
    )
    const offsetX = (canvas.width - img.naturalWidth * scale) / 2
    const offsetY = (canvas.height - img.naturalHeight * scale) / 2

    // Draw base image
    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0)

    // Dim background overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.fillRect(0, 0, img.naturalWidth, img.naturalHeight)

    // Highlight current annotation area (clear dimming)
    if (currentAnn.type === 'bbox') {
      const b = currentAnn.coords as BBoxCoords
      const bx = b.x * img.naturalWidth
      const by = b.y * img.naturalHeight
      const bw = b.w * img.naturalWidth
      const bh = b.h * img.naturalHeight

      // Clear the overlay to reveal the highlighted area
      ctx.save()
      ctx.beginPath()
      ctx.rect(bx, by, bw, bh)
      ctx.clip()
      ctx.drawImage(img, 0, 0)
      ctx.restore()

      // Draw border & glowing spotlight
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 3 / scale
      ctx.strokeRect(bx, by, bw, bh)

      // Label
      ctx.fillStyle = '#6366f1'
      ctx.fillRect(bx, by - 30 / scale, 45 / scale, 24 / scale)
      ctx.font = `bold ${14 / scale}px sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.fillText(`A${currentIndex + 1}`, bx + 22 / scale, by - 12 / scale)
    } else if (currentAnn.type === 'point') {
      const pt = currentAnn.coords as PointCoords
      const px = pt.x * img.naturalWidth
      const py = pt.y * img.naturalHeight
      const pr = 30 / scale

      ctx.save()
      ctx.beginPath()
      ctx.arc(px, py, pr, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(img, 0, 0)
      ctx.restore()

      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 3 / scale
      ctx.beginPath()
      ctx.arc(px, py, pr, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.restore()
  }

  useEffect(() => {
    if (isOpen) {
      drawPresentation()
    }
  }, [isOpen, currentIndex, currentAnn])

  if (!isOpen || !descriptor) return null

  return (
    <div className="modal-overlay" style={{ background: '#05070a', zIndex: 120 }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
        {/* Presentation Header */}
        <header
          style={{
            height: '60px',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(18, 22, 31, 0.95)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Play size={20} className="text-primary" />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Modo Apresentação: {descriptor.title}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              (Item {currentIndex + 1} de {annotations.length})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setCurrentIndex(i => Math.min(i + 1, annotations.length - 1))}
              disabled={currentIndex === annotations.length - 1}
            >
              Próximo <ChevronRight size={16} />
            </button>
            <button className="btn btn-secondary btn-icon-only" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Presentation Main split */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Spotlight Canvas */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
          </div>

          {/* Details Sidebar */}
          {currentAnn && (
            <div
              style={{
                width: '420px',
                background: 'var(--bg-panel)',
                borderLeft: '1px solid var(--border-subtle)',
                padding: '24px',
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
