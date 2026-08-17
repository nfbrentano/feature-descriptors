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
  Scale
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
  const [isDragOver, setIsDragOver] = useState(false)

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
      setImageLoading(false)
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

      // Auto fit zoom on load
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
    }
  }, [descriptor?.image?.url])

  // Paste image handler (Ctrl+V / Cmd+V anywhere on page)
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

  // Render Canvas with modular helper
  const renderCanvas = useCallback(() => {
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
      measureStart,
      measureEnd,
      showGrid,
      theme
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
    measureStart,
    measureEnd,
    showGrid,
    theme
  ])

  useEffect(() => {
    renderCanvas()
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
      // Don't intercept when user is typing in input or textarea
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

    // Middle click or Pan tool: start pan
    if (e.button === 1 || activeTool === 'pan') {
      setIsPanning(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      return
    }

    const relCoords = getMouseCoords(e)
    if (!relCoords) return

    if (activeTool === 'select') {
      // Find clicked annotation
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
      // Only create if not tiny
      if (currentBBox.w > 0.01 && currentBBox.h > 0.01) {
        onCreateAnnotation('bbox', currentBBox)
        onSelectTool('select')
      }
      setCurrentBBox(null)
    }
  }

  // Finish polygon on double click
  const handleDoubleClick = () => {
    if (activeTool === 'polygon' && polygonPoints.length >= 3) {
      onCreateAnnotation('polygon', { points: polygonPoints })
      setPolygonPoints([])
      onSelectTool('select')
    }
  }

  // Wheel Zoom
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

  // Zoom control actions
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

  // Drag-and-drop file
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
      onDragOver={e => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Loading Spinner */}
      {imageLoading && (
        <div className="canvas-loading-overlay">
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
          >
            <MousePointer size={16} />
          </button>
          <button
            className={`tool-button ${activeTool === 'bbox' ? 'active' : ''}`}
            onClick={() => onSelectTool('bbox')}
            title="Desenhar Retângulo Bounding Box (Atalho: B)"
            aria-label="Ferramenta de retângulo"
          >
            <Square size={16} />
          </button>
          <button
            className={`tool-button ${activeTool === 'point' ? 'active' : ''}`}
            onClick={() => onSelectTool('point')}
            title="Marcar Ponto (Atalho: P)"
            aria-label="Ferramenta de ponto"
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
          >
            <Hexagon size={16} />
          </button>
          <button
            className={`tool-button ${activeTool === 'pan' ? 'active' : ''}`}
            onClick={() => onSelectTool('pan')}
            title="Mover Imagem / Pan"
            aria-label="Ferramenta de navegação da imagem"
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
          >
            <Grid size={16} />
          </button>

          {/* Heatmap Quick Toggle */}
          <button
            className={`tool-button ${activeTool === 'heatmap' ? 'active' : ''}`}
            onClick={() => onSelectTool(activeTool === 'heatmap' ? 'select' : 'heatmap')}
            title="Mapa de Calor / Heatmap (Atalho: H)"
            aria-label="Alternar mapa de calor"
          >
            <Flame size={16} />
          </button>
        </div>
      )}

      {/* Canvas or Empty State Dropzone */}
      {imageLoaded ? (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Canvas de visualização da interface para anotações"
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
        <div className="canvas-zoom-controls" aria-label="Controles de Zoom">
          <button className="zoom-btn" onClick={handleZoomOut} title="Diminuir Zoom (-)">
            <ZoomOut size={15} />
          </button>
          <span className="zoom-text">{Math.round(zoom * 100)}%</span>
          <button className="zoom-btn" onClick={handleZoomIn} title="Aumentar Zoom (+)">
            <ZoomIn size={15} />
          </button>
          <button className="zoom-btn" onClick={handleFitZoom} title="Ajustar à Tela (0)">
            <Maximize2 size={15} />
          </button>
          <button className="zoom-btn" onClick={handle100Zoom} title="Zoom Real 100%">
            <Scale size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
