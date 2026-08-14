import React from 'react'
import {
  FileText,
  Play,
  Share2,
  FolderOpen,
  Plus,
  Flame,
  User,
  Database,
  CheckCircle2
} from 'lucide-react'
import { Descriptor, UserProfile, ViewTool } from '../types'
import { isSupabaseConfigured, MAX_DESCRIPTORS_LIMIT } from '../lib/storage'

interface HeaderProps {
  currentDescriptor: Descriptor | null
  descriptorsCount: number
  activeTool: ViewTool
  onSelectTool: (tool: ViewTool) => void
  onOpenExport: () => void
  onOpenPresentation: () => void
  onOpenAuth: () => void
  onOpenDescriptorsList: () => void
  onNewDescriptor: () => void
  currentUser: UserProfile
  isSyncing?: boolean
}

export const Header: React.FC<HeaderProps> = ({
  currentDescriptor,
  descriptorsCount,
  activeTool,
  onSelectTool,
  onOpenExport,
  onOpenPresentation,
  onOpenAuth,
  onOpenDescriptorsList,
  onNewDescriptor,
  currentUser,
  isSyncing
}) => {
  const hasSupabase = isSupabaseConfigured()

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <FileText size={20} />
        </div>
        <div>
          <span className="brand-title">Feature Descriptors</span>
        </div>

        {/* Descriptor Selector / Switcher */}
        <button
          className="descriptor-selector"
          onClick={onOpenDescriptorsList}
          title="Alternar entre imagens/descritivos"
        >
          <FolderOpen size={15} className="text-secondary" />
          <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentDescriptor ? currentDescriptor.title : 'Selecionar Imagem'}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#6366f1', background: 'rgba(99,102,241,0.15)', padding: '1px 6px', borderRadius: '4px' }}>
            {descriptorsCount}/{MAX_DESCRIPTORS_LIMIT}
          </span>
        </button>

        <button
          className="btn btn-secondary btn-icon-only"
          onClick={onNewDescriptor}
          title={`Criar novo descritivo de imagem (Máx ${MAX_DESCRIPTORS_LIMIT})`}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="header-actions">
        {/* Heatmap Quick Toggle */}
        <button
          className={`btn ${activeTool === 'heatmap' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onSelectTool(activeTool === 'heatmap' ? 'select' : 'heatmap')}
          title="Alternar visão de Heatmap / Mapa de Calor"
        >
          <Flame size={15} className={activeTool === 'heatmap' ? 'text-amber' : ''} />
          <span>Heatmap</span>
        </button>

        {/* Presentation Mode */}
        <button
          className="btn btn-secondary"
          onClick={onOpenPresentation}
          title="Iniciar Modo Apresentação"
          disabled={!currentDescriptor || currentDescriptor.annotations.length === 0}
        >
          <Play size={15} />
          <span>Apresentação</span>
        </button>

        {/* Export Markdown */}
        <button
          className="btn btn-primary"
          onClick={onOpenExport}
          title="Exportar anotações em formato Markdown estruturado"
          disabled={!currentDescriptor}
        >
          <Share2 size={15} />
          <span>Exportar Markdown</span>
        </button>

        <div className="tool-divider" />

        {/* User / Supabase Account Button */}
        <button
          className="btn btn-secondary"
          onClick={onOpenAuth}
          title="Gerenciar conexão Supabase e conta"
        >
          {hasSupabase ? (
            <Database size={15} style={{ color: '#10b981' }} />
          ) : (
            <User size={15} />
          )}
          <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser.name.split(' ')[0]}
          </span>
          {isSyncing ? (
            <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>...</span>
          ) : hasSupabase ? (
            <CheckCircle2 size={12} style={{ color: '#10b981' }} />
          ) : null}
        </button>
      </div>
    </header>
  )
}
