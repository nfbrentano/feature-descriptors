import React, { useState } from 'react'
import { X, Copy, Check, Download, FileText, Code2, Table, Cpu, Upload } from 'lucide-react'
import { Descriptor, UserProfile, Annotation } from '../types'
import { exportDescriptorToMarkdown } from '../lib/markdownExporter'
import { exportToCSV, exportToCOCO, importAnnotationsFromJSON } from '../lib/exportUtils'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  descriptor: Descriptor | null
  currentUser: UserProfile
  onImportAnnotations?: (annotations: Annotation[]) => void
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
}

type ExportTab = 'markdown' | 'json' | 'csv' | 'coco' | 'import'

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  descriptor,
  currentUser,
  onImportAnnotations,
  onShowToast
}) => {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<ExportTab>('markdown')
  const [importJsonText, setImportJsonText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  if (!isOpen || !descriptor) return null

  const markdownContent = exportDescriptorToMarkdown(descriptor, currentUser.name)
  const jsonContent = JSON.stringify(descriptor, null, 2)
  const csvContent = exportToCSV(descriptor)
  const cocoContent = exportToCOCO(descriptor)

  let content = ''
  let fileExt = 'md'
  let mimeType = 'text/markdown;charset=utf-8'

  switch (activeTab) {
    case 'markdown':
      content = markdownContent
      fileExt = 'md'
      mimeType = 'text/markdown;charset=utf-8'
      break
    case 'json':
      content = jsonContent
      fileExt = 'json'
      mimeType = 'application/json;charset=utf-8'
      break
    case 'csv':
      content = csvContent
      fileExt = 'csv'
      mimeType = 'text/csv;charset=utf-8'
      break
    case 'coco':
      content = cocoContent
      fileExt = 'coco.json'
      mimeType = 'application/json;charset=utf-8'
      break
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    if (onShowToast) onShowToast('success', 'Conteúdo copiado!', 'Texto copiado para a área de transferência.')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const filename = `${descriptor.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_descritivo.${fileExt}`
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    if (onShowToast) onShowToast('success', 'Download iniciado', `Arquivo ${filename} baixado com sucesso.`)
  }

  const handleProcessImport = () => {
    setImportError(null)
    if (!importJsonText.trim()) {
      setImportError('Por favor insira o conteúdo JSON para importar.')
      return
    }

    const res = importAnnotationsFromJSON(importJsonText, descriptor.id)
    if (res.success && res.annotations) {
      if (onImportAnnotations) {
        onImportAnnotations(res.annotations)
      }
      if (onShowToast) onShowToast('success', 'Anotações Importadas!', `${res.annotations.length} anotações importadas com sucesso.`)
      setImportJsonText('')
      onClose()
    } else {
      setImportError(res.error || 'Falha ao importar anotações.')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      if (text) setImportJsonText(text)
    }
    reader.readAsText(file)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} className="text-primary" />
            <h3 className="modal-title">Exportar & Importar Anotações</h3>
          </div>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose} aria-label="Fechar modal">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
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
            <button
              className={`btn ${activeTab === 'csv' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('csv')}
            >
              <Table size={14} />
              <span>CSV (Planilha)</span>
            </button>
            <button
              className={`btn ${activeTab === 'coco' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('coco')}
            >
              <Cpu size={14} />
              <span>COCO (Visão Computacional)</span>
            </button>
            <button
              className={`btn ${activeTab === 'import' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('import')}
              style={{ marginLeft: 'auto' }}
            >
              <Upload size={14} />
              <span>Importar Anotações</span>
            </button>
          </div>

          {activeTab !== 'import' ? (
            <>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {activeTab === 'markdown' && 'Formato pronto para IAs, documentações técnicas, GitHub Issues ou Pull Requests.'}
                {activeTab === 'json' && 'Estrutura completa de dados para APIs, backup e integrações.'}
                {activeTab === 'csv' && 'Ideal para abrir no Excel, Google Sheets ou importar em ferramentas de gestão.'}
                {activeTab === 'coco' && 'Formato padrão MS-COCO para treinar modelos de Inteligência Artificial e visão de máquina.'}
              </p>
              <div className="code-preview">{content}</div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Cole o conteúdo JSON de um backup prévio ou selecione um arquivo `.json` para mesclar as anotações ao descritivo atual.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  id="import-json-file"
                  style={{ display: 'none' }}
                />
                <label htmlFor="import-json-file" className="btn btn-secondary">
                  <Upload size={14} />
                  <span>Carregar Arquivo JSON</span>
                </label>
              </div>
              <textarea
                className="reply-textarea"
                rows={10}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                placeholder="Cole o código JSON de anotações aqui..."
                value={importJsonText}
                onChange={e => setImportJsonText(e.target.value)}
              />
              {importError && (
                <div style={{ color: '#fb7185', fontSize: '0.84rem', background: 'rgba(244,63,94,0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                  {importError}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {activeTab !== 'import' ? (
            <>
              <button className="btn btn-secondary" onClick={handleCopy}>
                {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                <span>{copied ? 'Copiado!' : 'Copiar Conteúdo'}</span>
              </button>
              <button className="btn btn-primary" onClick={handleDownload}>
                <Download size={14} />
                <span>Baixar Arquivo</span>
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={handleProcessImport}>
              <Upload size={14} />
              <span>Confirmar Importação</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
