import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Square,
  Dot,
  Hexagon,
  MousePointer,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Upload,
  Image as ImageIcon,
  Flame,
  Grid,
  Ruler,
  RotateCcw,
  RotateCw,
  Loader2,
  Scale,
  PenTool,
  Sliders
} from 'lucide-react'
import {
  AnnotationType,
  BBoxCoords,
  PointCoords,
  ViewTool,
  Descriptor
} from '../types'
import { drawCanvas, getRelativeCoords } from '../lib/canvasUtils'

interface CanvasViewportProps {
  descriptor: Descriptor | null
  activeTool: ViewTool
  onSelectTool: (tool: ViewTool) => void
  selectedAnnotationId: string | null
  onSelectAnnotation: (id: string | null) => void
  onCreateAnnotation: (type: AnnotationType, coords: any) => void
  onUploadImage: (file: File) => void
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  theme?: 'dark' | 'light'
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  descriptor,
  activeTool,
  onSelectTool,
  selectedAnnotationId,
  onSelectAnnotation,
  onCreateAnnotation,
  onUploadImage,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  theme = 'dark'
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Grid & Measure Tool state
  const [showGrid, setShowGrid] = useState(false)
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null)
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [currentBBox, setCurrentBBox] = useState<BBoxCoords | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<Array<{ x: number; y: number }>>([])
  const [freehandStrokes, setFreehandStrokes] = useState<Array<Array<{ x: number; y: number }>>>([])
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }> | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Filters state
  const [imageFilter, setImageFilter] = useState({ brightness: 100, contrast: 100, grayscale: 0 })
  const [showFilters, setShowFilters] = useState(false)

  // Image loading state
  const [imageLoading, setImageLoading] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0
  })

  // Load image element safely
  useEffect(() => {
    if (!descriptor?.image?.url) {
      setImageLoaded(false)
      imageRef.current = null
      return
    }

    setImageLoading(true)
    const img = new Image()
    img.src = descriptor.image.url

    img.onload = () => {
      imageRef.current = img
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
      setImageLoaded(true)
      setImageLoading(false)

      if (containerRef.current) {
        const cw = containerRef.current.clientWidth - 80
        const ch = containerRef.current.clientHeight - 80
        const fitScale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight, 1)
        setZoom(fitScale)
        setPan({
          x: (containerRef.current.clientWidth - img.naturalWidth * fitScale) / 2,
          y: (containerRef.current.clientHeight - img.naturalHeight * fitScale) / 2
        })
      }
    }

    img.onerror = () => {
      setImageLoading(false)
      setImageLoaded(false)
      imageRef.current = null
    }

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [descriptor?.image?.url])

  // Paste image handler from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            onUploadImage(file)
            break
          }
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [onUploadImage])

  // Render Canvas with requestAnimationFrame for smooth 60fps
  const renderCanvas = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
    }

    animFrameRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas || !containerRef.current) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = containerRef.current.clientWidth
      canvas.height = containerRef.current.clientHeight

      drawCanvas({
        ctx,
        width: canvas.width,
        height: canvas.height,
        image: imageRef.current,
        imageLoaded,
        imageDimensions,
        pan,
        zoom,
        descriptor,
        selectedAnnotationId,
        activeTool,
        isDrawing,
        currentBBox,
        polygonPoints,
        currentFreehandStrokes: currentStroke ? [...freehandStrokes, currentStroke] : freehandStrokes,
        measureStart,
        measureEnd,
        imageFilter,
        showGrid,
        theme
      })
      animFrameRef.current = null
    })
  }, [
    imageLoaded,
    pan,
    zoom,
    imageDimensions,
    descriptor,
    selectedAnnotationId,
    activeTool,
    isDrawing,
    currentBBox,
    polygonPoints,
    freehandStrokes,
    currentStroke,
    measureStart,
    measureEnd,
    imageFilter,
    showGrid,
    theme
  ])

  useEffect(() => {
    renderCanvas()
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [renderCanvas])

  // Resize listener
  useEffect(() => {
    const handleResize = () => renderCanvas()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [renderCanvas])

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          if (onRedo) onRedo()
        } else {
          if (onUndo) onUndo()
        }
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        if (onRedo) onRedo()
        return
      }

      switch (e.key.toLowerCase()) {
        case 's':
        case 'v':
          onSelectTool('select')
          break
        case 'b':
          onSelectTool('bbox')
          break
        case 'p':
          onSelectTool('point')
          break
        case 'l':
          onSelectTool('polygon')
          setPolygonPoints([])
          break
        case 'f':
          onSelectTool('freehand')
          setFreehandStrokes([])
          break
        case 'h':
          onSelectTool(activeTool === 'heatmap' ? 'select' : 'heatmap')
          break
        case 'g':
          setShowGrid(g => !g)
          break
        case 'm':
          onSelectTool('measure')
          break
        case '+':
        case '=':
          setZoom(z => Math.min(z * 1.25, 5))
          break
        case '-':
        case '_':
          setZoom(z => Math.max(z * 0.8, 0.1))
          break
        case '0':
          handleFitZoom()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTool, onSelectTool, onUndo, onRedo])

  // Mouse Coords helper
  const getMouseCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    return getRelativeCoords(e.clientX, e.clientY, rect, pan, zoom, imageDimensions)
  }

  // Mouse / Canvas Events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return

    if (e.button === 1 || activeTool === 'pan') {
      setIsPanning(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      return
    }

    const relCoords = getMouseCoords(e)
    if (!relCoords) return

    if (activeTool === 'select') {
      let hitId: string | null = null
      if (descriptor?.annotations) {
        for (let i = descriptor.annotations.length - 1; i >= 0; i--) {
          const ann = descriptor.annotations[i]
          if (ann.type === 'bbox') {
            const b = ann.coords as BBoxCoords
            if (
              relCoords.x >= b.x &&
              relCoords.x <= b.x + b.w &&
              relCoords.y >= b.y &&
              relCoords.y <= b.y + b.h
            ) {
              hitId = ann.id
              break
            }
          } else if (ann.type === 'point') {
            const pt = ann.coords as PointCoords
            const dist = Math.hypot(
              (relCoords.x - pt.x) * imageDimensions.width,
              (relCoords.y - pt.y) * imageDimensions.height
            )
            if (dist <= 20) {
              hitId = ann.id
              break
            }
          }
        }
      }
      onSelectAnnotation(hitId)
      return
    }

    if (activeTool === 'bbox') {
      setIsDrawing(true)
      setDrawStart(relCoords)
      setCurrentBBox({ x: relCoords.x, y: relCoords.y, w: 0, h: 0 })
    } else if (activeTool === 'point') {
      onCreateAnnotation('point', { x: relCoords.x, y: relCoords.y })
      onSelectTool('select')
    } else if (activeTool === 'polygon') {
      const nextPoints = [...polygonPoints, relCoords]
      setPolygonPoints(nextPoints)
    } else if (activeTool === 'freehand') {
      setIsDrawing(true)
      setCurrentStroke([relCoords])
    } else if (activeTool === 'measure') {
      setMeasureStart(relCoords)
      setMeasureEnd(relCoords)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
      return
    }

    const currentCoords = getMouseCoords(e)
    if (!currentCoords) return

    if (isDrawing && drawStart && activeTool === 'bbox') {
      const minX = Math.min(drawStart.x, currentCoords.x)
      const minY = Math.min(drawStart.y, currentCoords.y)
      const w = Math.abs(currentCoords.x - drawStart.x)
      const h = Math.abs(currentCoords.y - drawStart.y)

      setCurrentBBox({ x: minX, y: minY, w, h })
    } else if (isDrawing && activeTool === 'freehand' && currentStroke) {
      setCurrentStroke([...currentStroke, currentCoords])
    } else if (activeTool === 'measure' && measureStart) {
      setMeasureEnd(currentCoords)
    }
  }

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
      return
    }

    if (isDrawing && currentBBox && activeTool === 'bbox') {
      setIsDrawing(false)
      setDrawStart(null)
      if (currentBBox.w > 0.01 && currentBBox.h > 0.01) {
        onCreateAnnotation('bbox', currentBBox)
        onSelectTool('select')
      }
      setCurrentBBox(null)
    } else if (isDrawing && currentStroke && activeTool === 'freehand') {
      setIsDrawing(false)
      if (currentStroke.length > 1) {
        setFreehandStrokes([...freehandStrokes, currentStroke])
      }
      setCurrentStroke(null)
    }
  }

  const handleDoubleClick = () => {
    if (activeTool === 'polygon' && polygonPoints.length >= 3) {
      onCreateAnnotation('polygon', { points: polygonPoints })
      setPolygonPoints([])
      onSelectTool('select')
    } else if (activeTool === 'freehand' && freehandStrokes.length > 0) {
      onCreateAnnotation('freehand', { strokes: freehandStrokes })
      setFreehandStrokes([])
      onSelectTool('select')
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.1), 5)

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom)
      const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom)

      setZoom(newZoom)
      setPan({ x: newPanX, y: newPanY })
    }
  }

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.25, 5))
  const handleZoomOut = () => setZoom(z => Math.max(z * 0.8, 0.1))

  const handleFitZoom = () => {
    if (containerRef.current && imageDimensions.width && imageDimensions.height) {
      const cw = containerRef.current.clientWidth - 80
      const ch = containerRef.current.clientHeight - 80
      const fitScale = Math.min(cw / imageDimensions.width, ch / imageDimensions.height, 1)
      setZoom(fitScale)
      setPan({
        x: (containerRef.current.clientWidth - imageDimensions.width * fitScale) / 2,
        y: (containerRef.current.clientHeight - imageDimensions.height * fitScale) / 2
      })
    }
  }

  const handle100Zoom = () => {
    setZoom(1)
    if (containerRef.current && imageDimensions.width && imageDimensions.height) {
      setPan({
        x: (containerRef.current.clientWidth - imageDimensions.width) / 2,
        y: (containerRef.current.clientHeight - imageDimensions.height) / 2
      })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadImage(e.dataTransfer.files[0])
    }
  }

  return (
    <div
      className="canvas-container"
      ref={containerRef}
      role="region"
      aria-label="Área de Desenho e Wireframe"
      onDragOver={e => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Loading Spinner */}
      {imageLoading && (
        <div className="canvas-loading-overlay" role="status" aria-live="polite">
          <Loader2 size={36} className="spinner-icon text-primary" />
          <span>Carregando Imagem...</span>
        </div>
      )}

      {/* Floating Toolbar */}
      {imageLoaded && (
        <div className="canvas-toolbar" role="toolbar" aria-label="Ferramentas de Anotação">
          {/* Undo / Redo */}
          {onUndo && (
            <button
              className="tool-button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Desfazer (Ctrl+Z)"
              aria-label="Desfazer alteração"
            >
              <RotateCcw size={16} />
            </button>
          )}
          {onRedo && (
            <button
              className="tool-button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Refazer (Ctrl+Y)"
              aria-label="Refazer alteração"
            >
              <RotateCw size={16} />
            </button>
          )}

          <div className="tool-divider" />

          <button
            className={`tool-button ${activeTool === 'select' ? 'active' : ''}`}
            onClick={() => onSelectTool('select')}
            title="Selecionar Anotação (Atalho: S)"
            aria-label="Ferramenta de seleção"
            aria-pressed={activeTool === 'select'}
          >
            <MousePointer size={16} />
          </button>
          <button
            className={`tool-button ${activeTool === 'bbox' ? 'active' : ''}`}
            onClick={() => onSelectTool('bbox')}
            title="Desenhar Retângulo Bounding Box (Atalho: B)"
            aria-label="Ferramenta de retângulo"
            aria-pressed={activeTool === 'bbox'}
          >
            <Square size={16} />
          </button>
          <button
            className={`tool-button ${activeTool === 'point' ? 'active' : ''}`}
            onClick={() => onSelectTool('point')}
            title="Marcar Ponto (Atalho: P)"
            aria-label="Ferramenta de ponto"
            aria-pressed={activeTool === 'point'}
          >
            <Dot size={20} />
          </button>
          <button
            className={`tool-button ${activeTool === 'polygon' ? 'active' : ''}`}
            onClick={() => {
              onSelectTool('polygon')
              setPolygonPoints([])
            }}
            title="Polígono (Atalho: L - Duplo clique para fechar)"
            aria-label="Ferramenta de polígono"
            aria-pressed={activeTool === 'polygon'}
          >
            <Hexagon size={16} />
          </button>
          <button
            className={`tool-button ${activeTool === 'freehand' ? 'active' : ''}`}
            onClick={() => {
              onSelectTool('freehand')
              setFreehandStrokes([])
            }}
            title="Desenho Livre (Atalho: F - Duplo clique para salvar)"
            aria-label="Ferramenta de desenho livre"
            aria-pressed={activeTool === 'freehand'}
          >
            <PenTool size={16} />
          </button>
          <button
            className={`tool-button ${activeTool === 'pan' ? 'active' : ''}`}
            onClick={() => onSelectTool('pan')}
            title="Mover Imagem / Pan"
            aria-label="Ferramenta de navegação da imagem"
            aria-pressed={activeTool === 'pan'}
          >
            <Hand size={16} />
          </button>
          <button
            className={`tool-button ${activeTool === 'measure' ? 'active' : ''}`}
            onClick={() => {
              onSelectTool('measure')
              setMeasureStart(null)
              setMeasureEnd(null)
            }}
            title="Régua de Medição em Pixels (Atalho: M)"
            aria-label="Ferramenta de medição em pixels"
            aria-pressed={activeTool === 'measure'}
          >
            <Ruler size={16} />
          </button>

          <div className="tool-divider" />

          {/* Grid Overlay Toggle */}
          <button
            className={`tool-button ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(g => !g)}
            title="Grade de Alinhamento (Atalho: G)"
            aria-label="Alternar grade de alinhamento"
            aria-pressed={showGrid}
          >
            <Grid size={16} />
          </button>

          {/* Heatmap Quick Toggle */}
          <button
            className={`tool-button ${activeTool === 'heatmap' ? 'active' : ''}`}
            onClick={() => onSelectTool(activeTool === 'heatmap' ? 'select' : 'heatmap')}
            title="Mapa de Calor / Heatmap (Atalho: H)"
            aria-label="Alternar mapa de calor"
            aria-pressed={activeTool === 'heatmap'}
          >
            <Flame size={16} />
          </button>

          {/* Image Filters Toggle */}
          <button
            className={`tool-button ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Ajustes de Imagem"
            aria-label="Ajustes de imagem"
            aria-expanded={showFilters}
          >
            <Sliders size={16} />
          </button>
        </div>
      )}

      {/* Image Filters Panel */}
      {showFilters && imageLoaded && (
        <div
          className="canvas-filters-panel"
          style={{
            position: 'absolute',
            top: 70,
            right: 20,
            background: 'var(--bg-panel)',
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 10,
            width: 250
          }}
          role="region"
          aria-label="Painel de Filtros de Imagem"
        >
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>Ajustes de Imagem</h4>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Brilho <span>{imageFilter.brightness}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={imageFilter.brightness}
              aria-label="Ajustar brilho"
              onChange={e => setImageFilter({ ...imageFilter, brightness: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Contraste <span>{imageFilter.contrast}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={imageFilter.contrast}
              aria-label="Ajustar contraste"
              onChange={e => setImageFilter({ ...imageFilter, contrast: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Preto e Branco <span>{imageFilter.grayscale}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={imageFilter.grayscale}
              aria-label="Ajustar escala de cinza"
              onChange={e => setImageFilter({ ...imageFilter, grayscale: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => setImageFilter({ brightness: 100, contrast: 100, grayscale: 0 })}
          >
            Resetar
          </button>
        </div>
      )}

      {/* Canvas or Empty State Dropzone */}
      {imageLoaded ? (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Canvas de visualização da interface para anotações"
          tabIndex={0}
          style={{
            width: '100%',
            height: '100%',
            cursor:
              activeTool === 'pan' || isPanning
                ? 'grab'
                : activeTool === 'bbox' || activeTool === 'polygon' || activeTool === 'point' || activeTool === 'measure'
                ? 'crosshair'
                : 'default'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          onWheel={handleWheel}
        />
      ) : (
        <div
          className={`canvas-dropzone ${isDragOver ? 'drag-over' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Carregar imagem para anotação"
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*'
              input.onchange = (ev: any) => {
                if (ev.target?.files?.[0]) onUploadImage(ev.target.files[0])
              }
              input.click()
            }
          }}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = (e: any) => {
              if (e.target?.files?.[0]) onUploadImage(e.target.files[0])
            }
            input.click()
          }}
        >
          <div className="dropzone-icon">
            <ImageIcon size={34} />
          </div>
          <h3 className="dropzone-title">Carregar Tela da Aplicação</h3>
          <p className="dropzone-subtitle">
            Arraste e solte uma imagem aqui, clique para selecionar ou cole com{' '}
            <kbd className="key-badge">Ctrl + V</kbd> / <kbd className="key-badge">Cmd + V</kbd>.
          </p>
          <button className="btn btn-primary" onClick={e => e.stopPropagation()}>
            <Upload size={16} />
            <span>Selecionar Arquivo</span>
          </button>
        </div>
      )}

      {/* Zoom Controls */}
      {imageLoaded && (
        <div className="canvas-zoom-controls" role="group" aria-label="Controles de Zoom">
          <button className="zoom-btn" onClick={handleZoomOut} title="Diminuir Zoom (-)" aria-label="Diminuir zoom">
            <ZoomOut size={15} />
          </button>
          <span className="zoom-text" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button className="zoom-btn" onClick={handleZoomIn} title="Aumentar Zoom (+)" aria-label="Aumentar zoom">
            <ZoomIn size={15} />
          </button>
          <button className="zoom-btn" onClick={handleFitZoom} title="Ajustar à Tela (0)" aria-label="Ajustar zoom à tela">
            <Maximize2 size={15} />
          </button>
          <button className="zoom-btn" onClick={handle100Zoom} title="Zoom Real 100%" aria-label="Definir zoom em 100%">
            <Scale size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
