import React, { useState, useMemo } from 'react'
import {
  Search,
  CheckCircle,
  Clock,
  Plus,
  MessageSquare,
  Sparkles,
  Layers
} from 'lucide-react'
import { Descriptor } from '../types'

interface AnnotationSidebarProps {
  descriptor: Descriptor | null
  selectedAnnotationId: string | null
  onSelectAnnotation: (id: string) => void
  onAddAnnotationPrompt: () => void
}

export const AnnotationSidebar: React.FC<AnnotationSidebarProps> = ({
  descriptor,
  selectedAnnotationId,
  onSelectAnnotation,
  onAddAnnotationPrompt
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')

  // Extract all unique tags
  const allTags = useMemo(() => {
    if (!descriptor?.annotations) return []
    const tags = new Set<string>()
    descriptor.annotations.forEach(a => a.tags?.forEach(t => tags.add(t)))
    return Array.from(tags)
  }, [descriptor?.annotations])

  // Filtered annotations
  const filteredAnnotations = useMemo(() => {
    if (!descriptor?.annotations) return []
    return descriptor.annotations.filter(ann => {
      // Search
      if (
        searchTerm &&
        !ann.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !ann.description?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !ann.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
      ) {
        return false
      }
      // Status
      if (statusFilter !== 'all' && ann.status !== statusFilter) {
        return false
      }
      // Tag
      if (tagFilter !== 'all' && !ann.tags?.includes(tagFilter)) {
        return false
      }
      return true
    })
  }, [descriptor?.annotations, searchTerm, statusFilter, tagFilter])

  const openCount = descriptor?.annotations?.filter(a => a.status === 'open').length || 0
  const resolvedCount = descriptor?.annotations?.filter(a => a.status === 'resolved').length || 0

  return (
    <aside className="sidebar-annotations">
      <div className="sidebar-header">
        <span className="sidebar-title">
          <Layers size={16} />
          Anotações ({descriptor?.annotations?.length || 0})
        </span>
        <button
          className="btn btn-secondary btn-icon-only"
          onClick={onAddAnnotationPrompt}
          title="Adicionar anotação (selecione ferramenta acima)"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar requisitos, tags..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ padding: '6px 14px', display: 'flex', gap: '6px', overflowX: 'auto', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          className={`tag-badge ${statusFilter === 'all' ? 'tag-enhancement' : ''}`}
          onClick={() => setStatusFilter('all')}
          style={{ cursor: 'pointer' }}
        >
          Todas
        </button>
        <button
          className={`tag-badge ${statusFilter === 'open' ? 'tag-bug' : ''}`}
          onClick={() => setStatusFilter('open')}
          style={{ cursor: 'pointer' }}
        >
          <Clock size={11} /> Abertas ({openCount})
        </button>
        <button
          className={`tag-badge ${statusFilter === 'resolved' ? 'tag-enhancement' : ''}`}
          onClick={() => setStatusFilter('resolved')}
          style={{ cursor: 'pointer' }}
        >
          <CheckCircle size={11} /> Resolvidas ({resolvedCount})
        </button>
        {allTags.map(tag => (
          <button
            key={tag}
            className={`tag-badge ${tagFilter === tag ? 'tag-api' : ''}`}
            onClick={() => setTagFilter(tagFilter === tag ? 'all' : tag)}
            style={{ cursor: 'pointer' }}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="annotations-list">
        {filteredAnnotations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {descriptor?.annotations?.length === 0
              ? 'Nenhuma anotação criada ainda. Use as ferramentas na barra superior para marcar a imagem.'
              : 'Nenhuma anotação encontrada com os filtros selecionados.'}
          </div>
        ) : (
          filteredAnnotations.map((ann, idx) => {
            const isSelected = ann.id === selectedAnnotationId
            const isResolved = ann.status === 'resolved'
            const originalIndex = descriptor?.annotations.findIndex(a => a.id === ann.id) ?? idx

            return (
              <div
                key={ann.id}
                className={`annotation-item ${isSelected ? 'active' : ''} ${isResolved ? 'resolved' : ''}`}
                onClick={() => onSelectAnnotation(ann.id)}
              >
                <div className="annotation-item-header">
                  <span className="annotation-badge-num">A{originalIndex + 1}</span>
                  {ann.estimate_points !== undefined && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'var(--accent-amber)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <Sparkles size={11} />
                      {ann.estimate_points} pts
                    </span>
                  )}
                </div>

                <div className="annotation-item-title">{ann.title || 'Sem título'}</div>

                {ann.tags && ann.tags.length > 0 && (
                  <div className="tag-list" style={{ marginBottom: '6px' }}>
                    {ann.tags.slice(0, 3).map(tag => (
                      <span key={tag} className={`tag-badge tag-${tag}`}>
                        #{tag}
                      </span>
                    ))}
                    {ann.tags.length > 3 && (
                      <span className="tag-badge">+{ann.tags.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="annotation-item-meta">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <MessageSquare size={12} /> {ann.messages?.length || 0}
                  </span>
                  {ann.suggested_assignee && (
                    <span>• {ann.suggested_assignee}</span>
                  )}
                  {isResolved && (
                    <span style={{ color: 'var(--accent-emerald)', marginLeft: 'auto' }}>
                      ✓ Resolvido
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
