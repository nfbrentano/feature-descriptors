import React, { useState } from 'react'
import { X, Copy, Check, Download, FileText, Code2 } from 'lucide-react'
import { Descriptor, UserProfile } from '../types'
import { exportDescriptorToMarkdown } from '../lib/markdownExporter'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  descriptor: Descriptor | null
  currentUser: UserProfile
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  descriptor,
  currentUser
}) => {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'markdown' | 'json'>('markdown')

  if (!isOpen || !descriptor) return null

  const markdownContent = exportDescriptorToMarkdown(descriptor, currentUser.name)
  const jsonContent = JSON.stringify(descriptor, null, 2)
  const content = activeTab === 'markdown' ? markdownContent : jsonContent

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const filename = `${descriptor.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_descritivo.${activeTab === 'markdown' ? 'md' : 'json'}`
    const blob = new Blob([content], {
      type: activeTab === 'markdown' ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} className="text-primary" />
            <h3 className="modal-title">Exportar Descritivo Técnico</h3>
          </div>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              className={`btn ${activeTab === 'markdown' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('markdown')}
            >
              <FileText size={14} />
              <span>Markdown (.md)</span>
            </button>
            <button
              className={`btn ${activeTab === 'json' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('json')}
            >
              <Code2 size={14} />
              <span>JSON Estruturado</span>
            </button>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {activeTab === 'markdown'
              ? 'Formato padronizado pronto para alimentar IAs, documentações técnicas, GitHub Issues ou Pull Requests.'
              : 'Estrutura de dados completa para integrações com APIs, Jira e Trello.'}
          </p>

          <div className="code-preview">{content}</div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleCopy}>
            {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
            <span>{copied ? 'Copiado para Área de Transferência!' : 'Copiar Conteúdo'}</span>
          </button>
          <button className="btn btn-primary" onClick={handleDownload}>
            <Download size={14} />
            <span>Baixar Arquivo</span>
          </button>
        </div>
      </div>
    </div>
  )
}
