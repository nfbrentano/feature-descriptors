import React, { useState } from 'react'
import {
  X,
  Send,
  Sparkles,
  CheckCircle2,
  Trash2,
  ThumbsUp,
  Code,
  Tag as TagIcon
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { Annotation, UserProfile } from '../types'
import { analyzeAnnotationContent } from '../lib/aiHelper'

interface ThreadPanelProps {
  annotation: Annotation | null
  currentUser: UserProfile
  onClose: () => void
  onUpdateAnnotation: (updated: Annotation) => void
  onDeleteAnnotation: (id: string) => void
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({
  annotation,
  currentUser,
  onClose,
  onUpdateAnnotation,
  onDeleteAnnotation
}) => {
  const [replyText, setReplyText] = useState('')
  const [newTagInput, setNewTagInput] = useState('')
  const [showTechDetails, setShowTechDetails] = useState(false)

  if (!annotation) {
    return null
  }

  // Handle adding comment
  const handleSendMessage = () => {
    if (!replyText.trim()) return

    const newMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      annotation_id: annotation.id,
      author_id: currentUser.id,
      author_name: currentUser.name,
      content: replyText.trim(),
      created_at: new Date().toISOString(),
      reactions: {}
    }

    const updated = {
      ...annotation,
      messages: [...annotation.messages, newMessage],
      updated_at: new Date().toISOString()
    }
    onUpdateAnnotation(updated)
    setReplyText('')
  }

  // Handle reaction
  const handleToggleReaction = (msgId: string, emoji: string) => {
    const updatedMessages = annotation.messages.map(m => {
      if (m.id !== msgId) return m
      const reactions = { ...(m.reactions || {}) }
      const currentUsers = reactions[emoji] || []
      const userIndex = currentUsers.indexOf(currentUser.id)

      if (userIndex >= 0) {
        // Remove reaction
        reactions[emoji] = currentUsers.filter(u => u !== currentUser.id)
        if (reactions[emoji].length === 0) delete reactions[emoji]
      } else {
        // Add reaction
        reactions[emoji] = [...currentUsers, currentUser.id]
      }
      return { ...m, reactions }
    })

    onUpdateAnnotation({
      ...annotation,
      messages: updatedMessages,
      updated_at: new Date().toISOString()
    })
  }

  // AI Suggestions
  const handleRunAiAnalysis = () => {
    const messagesText = annotation.messages.map(m => m.content)
    const result = analyzeAnnotationContent(
      annotation.title,
      annotation.description || '',
      messagesText
    )

    const mergedTags = Array.from(new Set([...annotation.tags, ...result.suggestedTags]))

    onUpdateAnnotation({
      ...annotation,
      tags: mergedTags,
      estimate_points: result.suggestedEstimate,
      estimate_source: 'ai_suggestion',
      updated_at: new Date().toISOString()
    })
  }

  // Toggle status with confetti
  const handleToggleResolved = () => {
    const nextStatus = annotation.status === 'resolved' ? 'open' : 'resolved'
    if (nextStatus === 'resolved') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      })
    }
    onUpdateAnnotation({
      ...annotation,
      status: nextStatus,
      updated_at: new Date().toISOString()
    })
  }

  // Add custom tag
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault()
      const clean = newTagInput.trim().toLowerCase().replace('#', '')
      if (!annotation.tags.includes(clean)) {
        onUpdateAnnotation({
          ...annotation,
          tags: [...annotation.tags, clean]
        })
      }
      setNewTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateAnnotation({
      ...annotation,
      tags: annotation.tags.filter(t => t !== tagToRemove)
    })
  }

  return (
    <aside className="sidebar-thread">
      {/* Header */}
      <div className="thread-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="annotation-badge-num">{annotation.type.toUpperCase()}</span>
            <button
              className={`btn ${annotation.status === 'resolved' ? 'btn-success' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '3px 8px' }}
              onClick={handleToggleResolved}
            >
              <CheckCircle2 size={13} />
              {annotation.status === 'resolved' ? 'Resolvido' : 'Marcar Resolvido'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              className="btn btn-secondary btn-icon-only"
              onClick={handleRunAiAnalysis}
              title="Sugerir tags e estimativa de esforço com IA"
            >
              <Sparkles size={15} style={{ color: '#a855f7' }} />
            </button>
            <button
              className="btn btn-danger btn-icon-only"
              onClick={() => onDeleteAnnotation(annotation.id)}
              title="Excluir esta anotação"
            >
              <Trash2 size={15} />
            </button>
            <button className="btn btn-secondary btn-icon-only" onClick={onClose} title="Fechar painel">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Editable Title */}
        <input
          type="text"
          className="thread-title-input"
          value={annotation.title}
          placeholder="Título do requisito / anotação..."
          onChange={e =>
            onUpdateAnnotation({ ...annotation, title: e.target.value, updated_at: new Date().toISOString() })
          }
        />
      </div>

      {/* Body / Content */}
      <div className="thread-content">
        {/* Meta / Requirement Card */}
        <div className="thread-meta-card">
          <div className="meta-field">
            <label className="meta-label">Descrição do Requisito</label>
            <textarea
              className="meta-input"
              rows={2}
              placeholder="Descreva o comportamento esperado, regra de negócio ou critérios de aceite..."
              value={annotation.description || ''}
              onChange={e =>
                onUpdateAnnotation({ ...annotation, description: e.target.value, updated_at: new Date().toISOString() })
              }
            />
          </div>

          {/* Tags */}
          <div className="meta-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="meta-label">
                <TagIcon size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Tags
              </label>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pressione Enter para adicionar</span>
            </div>
            <div className="tag-list" style={{ marginTop: '4px' }}>
              {annotation.tags.map(tag => (
                <span key={tag} className={`tag-badge tag-${tag}`}>
                  #{tag}
                  <button
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '4px' }}
                    onClick={() => handleRemoveTag(tag)}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="+ tag"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  width: '60px'
                }}
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={handleAddTag}
              />
            </div>
          </div>

          {/* Estimation & Assignee row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="meta-field">
              <label className="meta-label">Estimativa (Pontos)</label>
              <input
                type="number"
                min={0}
                max={20}
                className="meta-input"
                value={annotation.estimate_points ?? ''}
                placeholder="Ex: 3"
                onChange={e =>
                  onUpdateAnnotation({
                    ...annotation,
                    estimate_points: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    estimate_source: 'manual',
                    updated_at: new Date().toISOString()
                  })
                }
              />
            </div>

            <div className="meta-field">
              <label className="meta-label">Responsável</label>
              <input
                type="text"
                className="meta-input"
                value={annotation.suggested_assignee || ''}
                placeholder="@dev"
                onChange={e =>
                  onUpdateAnnotation({
                    ...annotation,
                    suggested_assignee: e.target.value,
                    updated_at: new Date().toISOString()
                  })
                }
              />
            </div>
          </div>

          {/* Tech Metadata Accordion (CSS Selector & XPath) */}
          <div>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.74rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 0'
              }}
              onClick={() => setShowTechDetails(!showTechDetails)}
            >
              <Code size={13} />
              {showTechDetails ? 'Ocultar Metadados Técnicos' : 'Exibir Metadados Técnicos (CSS / XPath)'}
            </button>

            {showTechDetails && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="meta-field">
                  <label className="meta-label">CSS Selector</label>
                  <input
                    type="text"
                    className="meta-input"
                    placeholder="#signup-form button.submit"
                    value={annotation.css_selector || ''}
                    onChange={e =>
                      onUpdateAnnotation({
                        ...annotation,
                        css_selector: e.target.value,
                        updated_at: new Date().toISOString()
                      })
                    }
                  />
                </div>
                <div className="meta-field">
                  <label className="meta-label">XPath</label>
                  <input
                    type="text"
                    className="meta-input"
                    placeholder="/html/body/div[1]/form/button"
                    value={annotation.xpath || ''}
                    onChange={e =>
                      onUpdateAnnotation({
                        ...annotation,
                        xpath: e.target.value,
                        updated_at: new Date().toISOString()
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Discussion / Thread messages */}
        <div className="messages-container">
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Discussão da Equipe ({annotation.messages.length})
          </div>

          {annotation.messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Nenhum comentário na thread ainda. Deixe a primeira mensagem abaixo.
            </div>
          ) : (
            annotation.messages.map(msg => {
              const reactions = msg.reactions || {}
              return (
                <div key={msg.id} className="message-bubble">
                  <div className="message-header">
                    <span className="message-author">{msg.author_name}</span>
                    <span className="message-time">
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="message-text">{msg.content}</div>

                  {/* Reactions list & quick reaction buttons */}
                  <div className="message-reactions">
                    {Object.entries(reactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        className={`reaction-chip ${users.includes(currentUser.id) ? 'active' : ''}`}
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                      >
                        <span>{emoji}</span>
                        <span>{users.length}</span>
                      </button>
                    ))}

                    <button
                      className="reaction-chip"
                      onClick={() => handleToggleReaction(msg.id, '👍')}
                      title="Curtir"
                    >
                      <ThumbsUp size={11} />
                    </button>
                    <button
                      className="reaction-chip"
                      onClick={() => handleToggleReaction(msg.id, '🚀')}
                      title="Foguete"
                    >
                      🚀
                    </button>
                    <button
                      className="reaction-chip"
                      onClick={() => handleToggleReaction(msg.id, '❤️')}
                      title="Coração"
                    >
                      ❤️
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Reply input */}
      <div className="thread-reply-box">
        <textarea
          className="reply-textarea"
          placeholder={`Responder como ${currentUser.name}... (Enter para enviar)`}
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage()
            }
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSendMessage} disabled={!replyText.trim()}>
            <Send size={14} />
            <span>Enviar</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
