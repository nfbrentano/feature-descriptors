import React, { useState } from 'react'
import {
  FileText,
  Play,
  Share2,
  FolderOpen,
  Plus,
  Flame,
  User,
  Database,
  CheckCircle2,
  Sun,
  Moon,
  RotateCcw,
  RotateCw,
  HelpCircle,
  X
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
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
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
  isSyncing,
  theme,
  onToggleTheme,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo
}) => {
  const hasSupabase = isSupabaseConfigured()
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  return (
    <header className="app-header" role="banner">
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
          aria-label="Alternar imagens e descritivos"
        >
          <FolderOpen size={15} className="text-secondary" />
          <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentDescriptor ? currentDescriptor.title : 'Selecionar Imagem'}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--primary)', background: 'var(--primary-light)', padding: '1px 6px', borderRadius: '4px' }}>
            {descriptorsCount}/{MAX_DESCRIPTORS_LIMIT}
          </span>
        </button>

        <button
          className="btn btn-secondary btn-icon-only"
          onClick={onNewDescriptor}
          title={`Criar novo descritivo de imagem (Máx ${MAX_DESCRIPTORS_LIMIT})`}
          aria-label="Criar novo descritivo"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="header-actions">
        {/* Undo / Redo Quick Header Controls */}
        <div className="header-undo-group">
          {onUndo && (
            <button
              className="btn btn-secondary btn-icon-only"
              onClick={onUndo}
              disabled={!canUndo}
              title="Desfazer (Ctrl+Z)"
              aria-label="Desfazer ação"
            >
              <RotateCcw size={15} />
            </button>
          )}
          {onRedo && (
            <button
              className="btn btn-secondary btn-icon-only"
              onClick={onRedo}
              disabled={!canRedo}
              title="Refazer (Ctrl+Y)"
              aria-label="Refazer ação"
            >
              <RotateCw size={15} />
            </button>
          )}
        </div>

        <div className="tool-divider" />

        {/* Heatmap Quick Toggle */}
        <button
          className={`btn ${activeTool === 'heatmap' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onSelectTool(activeTool === 'heatmap' ? 'select' : 'heatmap')}
          title="Alternar visão de Heatmap / Mapa de Calor (Atalho: H)"
          aria-label="Alternar visão de mapa de calor"
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
          aria-label="Iniciar modo apresentação"
        >
          <Play size={15} />
          <span>Apresentação</span>
        </button>

        {/* Export Markdown */}
        <button
          className="btn btn-primary"
          onClick={onOpenExport}
          title="Exportar anotações em Markdown, JSON ou CSV"
          disabled={!currentDescriptor}
          aria-label="Exportar anotações"
        >
          <Share2 size={15} />
          <span>Exportar</span>
        </button>

        <div className="tool-divider" />

        {/* Shortcuts Help Modal Button */}
        <button
          className="btn btn-secondary btn-icon-only"
          onClick={() => setShowShortcutsModal(true)}
          title="Atalhos de Teclado & Ajuda"
          aria-label="Ver atalhos de teclado"
        >
          <HelpCircle size={15} />
        </button>

        {/* Theme Toggle Button (Dark/Light) */}
        <button
          className="btn btn-secondary btn-icon-only"
          onClick={onToggleTheme}
          title={`Alternar para Tema ${theme === 'dark' ? 'Claro' : 'Escuro'}`}
          aria-label={`Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
        >
          {theme === 'dark' ? <Sun size={15} style={{ color: '#f59e0b' }} /> : <Moon size={15} />}
        </button>

        {/* User / Supabase Account Button */}
        <button
          className="btn btn-secondary"
          onClick={onOpenAuth}
          title="Gerenciar conexão Supabase e conta"
          aria-label="Gerenciar conta de usuário"
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

      {/* Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="modal-overlay" onClick={() => setShowShortcutsModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={18} className="text-primary" />
                <h3 className="modal-title">Atalhos de Teclado</h3>
              </div>
              <button className="btn btn-secondary btn-icon-only" onClick={() => setShowShortcutsModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="shortcuts-grid">
                <div className="shortcut-row"><kbd>S</kbd> / <kbd>V</kbd> <span>Ferramenta de Seleção</span></div>
                <div className="shortcut-row"><kbd>B</kbd> <span>Ferramenta de Retângulo (Bounding Box)</span></div>
                <div className="shortcut-row"><kbd>P</kbd> <span>Ferramenta de Ponto</span></div>
                <div className="shortcut-row"><kbd>L</kbd> <span>Ferramenta de Polígono</span></div>
                <div className="shortcut-row"><kbd>M</kbd> <span>Régua de Medição (Pixels)</span></div>
                <div className="shortcut-row"><kbd>G</kbd> <span>Alternar Grade de Alinhamento</span></div>
                <div className="shortcut-row"><kbd>H</kbd> <span>Alternar Modo Heatmap</span></div>
                <div className="shortcut-row"><kbd>Ctrl + Z</kbd> <span>Desfazer (Undo)</span></div>
                <div className="shortcut-row"><kbd>Ctrl + Y</kbd> <span>Refazer (Redo)</span></div>
                <div className="shortcut-row"><kbd>+</kbd> / <kbd>-</kbd> <span>Aumentar / Diminuir Zoom</span></div>
                <div className="shortcut-row"><kbd>0</kbd> <span>Ajustar Zoom à Tela</span></div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowShortcutsModal(false)}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
