import React, { useEffect, useState } from 'react'
import { X, Copy, Check, Download, FileText, Code2, Table, Cpu, Upload, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Descriptor, UserProfile, Annotation } from '../types'
import { exportDescriptorToMarkdown, MarkdownImageRef, ANNOTATED_IMAGE_FILE } from '../lib/markdownExporter'
import { renderAnnotatedImage, getOriginalImageBytes, extensionForMime, blobToDataUrl } from '../lib/annotatedImage'
import { createZip, ZipEntry } from '../lib/zip'
import { exportToCSV, exportToCOCO, importAnnotationsFromJSON } from '../lib/exportUtils'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  descriptor: Descriptor | null
  currentUser: UserProfile
  onImportAnnotations?: (annotations: Annotation[]) => void
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
}

type ExportTab = 'markdown' | 'json' | 'csv' | 'coco' | 'import'

type MarkdownImageMode = 'zip' | 'embedded' | 'none'

const IMAGE_MODE_OPTIONS: Array<{ value: MarkdownImageMode; label: string; hint: string }> = [
  { value: 'zip', label: 'Pacote .zip', hint: 'Markdown + imagem anotada + imagem original, com links relativos. Ideal para colocar no repositório e apontar a IA.' },
  { value: 'embedded', label: 'Imagem embutida', hint: 'Arquivo .md único com a imagem anotada em base64. Mais pesado, mas autocontido.' },
  { value: 'none', label: 'Somente texto', hint: 'Sem imagem anexada. Para colar no chat da IA, copie o texto e depois use "Copiar imagem anotada".' }
]

function originalFileName(descriptor: Descriptor): string {
  const url = descriptor.image.url || ''
  const mime = url.startsWith('data:') ? url.slice(5, url.indexOf(';')) : ''
  return `imagem-original.${extensionForMime(mime, descriptor.image.name || '')}`
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  descriptor,
  currentUser,
  onImportAnnotations,
  onShowToast
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose })
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<ExportTab>('markdown')
  const [importJsonText, setImportJsonText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [imageMode, setImageMode] = useState<MarkdownImageMode>('zip')
  const [annotatedBlob, setAnnotatedBlob] = useState<Blob | null>(null)
  const [annotatedPreviewUrl, setAnnotatedPreviewUrl] = useState<string | null>(null)
  const [annotatedError, setAnnotatedError] = useState<string | null>(null)
  const [isRenderingImage, setIsRenderingImage] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const imageUrl = descriptor?.image.url
  const annotations = descriptor?.annotations

  // Render the annotated screenshot whenever the markdown tab is visible
  useEffect(() => {
    if (!isOpen || activeTab !== 'markdown' || !imageUrl || !annotations) return
    let cancelled = false
    let objectUrl: string | null = null
    setIsRenderingImage(true)
    setAnnotatedError(null)
    renderAnnotatedImage(imageUrl, annotations)
      .then(blob => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setAnnotatedBlob(blob)
        setAnnotatedPreviewUrl(objectUrl)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setAnnotatedBlob(null)
        setAnnotatedPreviewUrl(null)
        setAnnotatedError(err.message || 'Não foi possível gerar a imagem anotada.')
      })
      .finally(() => {
        if (!cancelled) setIsRenderingImage(false)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [isOpen, activeTab, imageUrl, annotations])

  if (!isOpen || !descriptor) return null

  const baseFileName = `${descriptor.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_descritivo`

  const buildMarkdown = (imageRef: MarkdownImageRef) =>
    exportDescriptorToMarkdown(descriptor, currentUser.name, { imageRef })

  const previewImageRef: MarkdownImageRef =
    imageMode === 'zip'
      ? { mode: 'files', annotated: annotatedError ? null : ANNOTATED_IMAGE_FILE, original: originalFileName(descriptor) }
      : imageMode === 'embedded' && !annotatedError
      ? { mode: 'embedded', dataUrl: `data:image/png;base64,…(${annotatedBlob ? Math.round(annotatedBlob.size / 1024) : '?'} KB)` }
      : { mode: 'none' }

  const markdownContent = buildMarkdown(previewImageRef)
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

  const handleCopy = async () => {
    let text = content
    if (activeTab === 'markdown') {
      text = imageMode === 'embedded' && annotatedBlob
        ? buildMarkdown({ mode: 'embedded', dataUrl: await blobToDataUrl(annotatedBlob) })
        : buildMarkdown({ mode: 'none' })
    }
    navigator.clipboard.writeText(text)
    setCopied(true)
    if (onShowToast) onShowToast('success', 'Conteúdo copiado!', 'Texto copiado para a área de transferência.')
    setTimeout(() => setCopied(false), 2000)
  }

  const saveBlob = (blob: Blob, filename: string) => {
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

  const handleDownloadMarkdownZip = async () => {
    const entries: ZipEntry[] = []
    let original: string | null = null
    if (descriptor.image.url) {
      try {
        const { bytes, mime } = await getOriginalImageBytes(descriptor.image.url)
        original = `imagem-original.${extensionForMime(mime, descriptor.image.name || '')}`
        entries.push({ name: original, data: bytes })
      } catch {
        // Falls back to the public URL inside the markdown
      }
    }
    let annotated: string | null = null
    if (annotatedBlob) {
      annotated = ANNOTATED_IMAGE_FILE
      entries.push({ name: annotated, data: new Uint8Array(await annotatedBlob.arrayBuffer()) })
    } else if (onShowToast) {
      onShowToast('info', 'Imagem anotada indisponível', 'O pacote foi gerado só com o Markdown e as coordenadas. Verifique se a imagem permite acesso (CORS).')
    }
    entries.unshift({ name: `${baseFileName}.md`, data: buildMarkdown({ mode: 'files', annotated, original }) })
    saveBlob(createZip(entries), `${baseFileName}.zip`)
  }

  const handleDownload = async () => {
    if (activeTab !== 'markdown') {
      saveBlob(new Blob([content], { type: mimeType }), `${baseFileName}.${fileExt}`)
      return
    }
    setIsExporting(true)
    try {
      if (imageMode === 'zip') {
        await handleDownloadMarkdownZip()
        return
      }
      let imageRef: MarkdownImageRef = { mode: 'none' }
      if (imageMode === 'embedded') {
        if (annotatedBlob) {
          imageRef = { mode: 'embedded', dataUrl: await blobToDataUrl(annotatedBlob) }
        } else if (onShowToast) {
          onShowToast('info', 'Imagem anotada indisponível', 'O Markdown foi exportado sem a imagem embutida.')
        }
      }
      saveBlob(new Blob([buildMarkdown(imageRef)], { type: mimeType }), `${baseFileName}.md`)
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Falha na exportação', err instanceof Error ? err.message : String(err))
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyAnnotatedImage = async () => {
    if (!annotatedBlob) return
    try {
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
        throw new Error('Seu navegador não permite copiar imagens. Baixe o pacote .zip.')
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': annotatedBlob })])
      if (onShowToast) onShowToast('success', 'Imagem anotada copiada!', 'Cole no chat da IA junto com o Markdown.')
    } catch (err) {
      const message = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'O navegador bloqueou o acesso à área de transferência. Baixe o pacote .zip ou permita o acesso.'
        : err instanceof Error ? err.message : String(err)
      if (onShowToast) onShowToast('error', 'Não foi possível copiar a imagem', message)
    }
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
      <div
        className="modal-card"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '820px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} className="text-primary" />
            <h3 id="export-modal-title" className="modal-title">Exportar & Importar Anotações</h3>
          </div>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose} aria-label="Fechar modal">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }} role="tablist">
            <button
              className={`btn ${activeTab === 'markdown' ? 'btn-primary' : 'btn-secondary'}`}
              role="tab"
              aria-selected={activeTab === 'markdown'}
              onClick={() => setActiveTab('markdown')}
            >
              <FileText size={14} />
              <span>Markdown (.md)</span>
            </button>
            <button
              className={`btn ${activeTab === 'json' ? 'btn-primary' : 'btn-secondary'}`}
              role="tab"
              aria-selected={activeTab === 'json'}
              onClick={() => setActiveTab('json')}
            >
              <Code2 size={14} />
              <span>JSON Estruturado</span>
            </button>
            <button
              className={`btn ${activeTab === 'csv' ? 'btn-primary' : 'btn-secondary'}`}
              role="tab"
              aria-selected={activeTab === 'csv'}
              onClick={() => setActiveTab('csv')}
            >
              <Table size={14} />
              <span>CSV (Planilha)</span>
            </button>
            <button
              className={`btn ${activeTab === 'coco' ? 'btn-primary' : 'btn-secondary'}`}
              role="tab"
              aria-selected={activeTab === 'coco'}
              onClick={() => setActiveTab('coco')}
            >
              <Cpu size={14} />
              <span>COCO (Visão Computacional)</span>
            </button>
            <button
              className={`btn ${activeTab === 'import' ? 'btn-primary' : 'btn-secondary'}`}
              role="tab"
              aria-selected={activeTab === 'import'}
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
                {activeTab === 'markdown' && 'Modelo estruturado para IAs de codificação: cabeçalho YAML, instruções de leitura, tabela-resumo e cada observação marcada na imagem (A1, A2…) com posição x/y em pixels.'}
                {activeTab === 'json' && 'Estrutura completa de dados para APIs, backup e integrações.'}
                {activeTab === 'csv' && 'Ideal para abrir no Excel, Google Sheets ou importar em ferramentas de gestão.'}
                {activeTab === 'coco' && 'Formato padrão MS-COCO para treinar modelos de Inteligência Artificial e visão de máquina.'}
              </p>
              {activeTab === 'markdown' && (
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <fieldset style={{ flex: '1 1 320px', border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <legend style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Anexo da imagem</legend>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }} role="radiogroup" aria-label="Anexo da imagem">
                      {IMAGE_MODE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={imageMode === opt.value}
                          className={`btn ${imageMode === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setImageMode(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                      {IMAGE_MODE_OPTIONS.find(o => o.value === imageMode)?.hint}
                    </p>
                    {annotatedError && (
                      <p role="alert" style={{ fontSize: '0.78rem', color: '#fb7185', margin: 0 }}>
                        Imagem anotada indisponível: {annotatedError} O Markdown será exportado apenas com as coordenadas.
                      </p>
                    )}
                  </fieldset>
                  <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'stretch' }}>
                    <div
                      style={{ height: '120px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'rgba(15,23,42,0.4)' }}
                    >
                      {isRenderingImage ? (
                        <Loader2 size={18} className="spinner-icon" aria-label="Gerando imagem anotada" />
                      ) : annotatedPreviewUrl ? (
                        <img src={annotatedPreviewUrl} alt="Pré-visualização da imagem com os marcadores das observações" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      ) : (
                        <ImageIcon size={18} style={{ color: 'var(--text-muted)' }} aria-label="Sem imagem anotada" />
                      )}
                    </div>
                    <button className="btn btn-secondary" onClick={handleCopyAnnotatedImage} disabled={!annotatedBlob}>
                      <ImageIcon size={14} />
                      <span>Copiar imagem anotada</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="code-preview" tabIndex={0} aria-label="Pré-visualização do conteúdo exportado">{content}</div>
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
                <label htmlFor="import-json-file" className="btn btn-secondary cursor-pointer">
                  <Upload size={14} />
                  <span>Carregar Arquivo JSON</span>
                </label>
              </div>
              <textarea
                className="reply-textarea"
                rows={10}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                placeholder="Cole o código JSON de anotações aqui..."
                aria-label="Conteúdo JSON para importação"
                value={importJsonText}
                onChange={e => setImportJsonText(e.target.value)}
              />
              {importError && (
                <div role="alert" style={{ color: '#fb7185', fontSize: '0.84rem', background: 'rgba(244,63,94,0.1)', padding: '8px 12px', borderRadius: '6px' }}>
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
              <button className="btn btn-primary" onClick={handleDownload} disabled={isExporting}>
                {isExporting ? <Loader2 size={14} className="spinner-icon" /> : <Download size={14} />}
                <span>{activeTab === 'markdown' && imageMode === 'zip' ? 'Baixar Pacote (.zip)' : 'Baixar Arquivo'}</span>
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
