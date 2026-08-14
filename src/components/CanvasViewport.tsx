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
  Flame
} from 'lucide-react'
import {
  AnnotationType,
  BBoxCoords,
  PointCoords,
  PolygonCoords,
  ViewTool,
  Descriptor
} from '../types'

interface CanvasViewportProps {
  descriptor: Descriptor | null
  activeTool: ViewTool
  onSelectTool: (tool: ViewTool) => void
  selectedAnnotationId: string | null
  onSelectAnnotation: (id: string | null) => void
  onCreateAnnotation: (type: AnnotationType, coords: any) => void
  onUploadImage: (file: File) => void
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  descriptor,
  activeTool,
  onSelectTool,
  selectedAnnotationId,
  onSelectAnnotation,
  onCreateAnnotation,
  onUploadImage
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [currentBBox, setCurrentBBox] = useState<BBoxCoords | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<Array<{ x: number; y: number }>>([])
  const [isDragOver, setIsDragOver] = useState(false)

  // Image load
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0
  })

  // Load image element
  useEffect(() => {
    if (!descriptor?.image?.url) {
      setImageLoaded(false)
      return
    }
    const img = new Image()
    img.src = descriptor.image.url
    img.onload = () => {
      imageRef.current = img
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
      setImageLoaded(true)
      // Auto fit zoom
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

  // Helper to convert screen coordinates to relative image coordinates (0..1)
  const getRelativeCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || !imageDimensions.width || !imageDimensions.height) return null
      const rect = containerRef.current.getBoundingClientRect()
      const mouseX = clientX - rect.left
      const mouseY = clientY - rect.top

      // Screen to Image coords
      const imgX = (mouseX - pan.x) / zoom
      const imgY = (mouseY - pan.y) / zoom

      // Normalize to 0..1
      const relX = Math.max(0, Math.min(1, imgX / imageDimensions.width))
      const relY = Math.max(0, Math.min(1, imgY / imageDimensions.height))

      return { x: relX, y: relY }
    },
    [pan, zoom, imageDimensions]
  )

  // Render Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !containerRef.current) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = containerRef.current.clientWidth
    canvas.height = containerRef.current.clientHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!imageLoaded || !imageRef.current) return

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Draw background image
    ctx.drawImage(imageRef.current, 0, 0, imageDimensions.width, imageDimensions.height)

    // Draw Heatmap mode
    if (activeTool === 'heatmap' && descriptor) {
      ctx.save()
      descriptor.annotations.forEach(ann => {
        let cx = 0
        let cy = 0
        if (ann.type === 'bbox') {
          const b = ann.coords as BBoxCoords
          cx = (b.x + b.w / 2) * imageDimensions.width
          cy = (b.y + b.h / 2) * imageDimensions.height
        } else if (ann.type === 'point') {
          const p = ann.coords as PointCoords
          cx = p.x * imageDimensions.width
          cy = p.y * imageDimensions.height
        }
        const radius = Math.max(imageDimensions.width, imageDimensions.height) * 0.15
        const radGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius)
        radGrad.addColorStop(0, 'rgba(239, 68, 68, 0.65)')
        radGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)')
        radGrad.addColorStop(1, 'rgba(59, 130, 246, 0)')
        ctx.fillStyle = radGrad
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.restore()
    }

    // Draw existing annotations
    if (descriptor?.annotations) {
      descriptor.annotations.forEach((ann, idx) => {
        const isSelected = ann.id === selectedAnnotationId
        const isResolved = ann.status === 'resolved'
        const labelNumber = `A${idx + 1}`

        ctx.save()
        ctx.lineWidth = isSelected ? 3 / zoom : 2 / zoom
        ctx.strokeStyle = isSelected ? '#6366f1' : isResolved ? '#64748b' : '#38bdf8'
        ctx.fillStyle = isSelected
          ? 'rgba(99, 102, 241, 0.25)'
          : isResolved
          ? 'rgba(100, 116, 139, 0.15)'
          : 'rgba(56, 189, 248, 0.15)'

        if (ann.type === 'bbox') {
          const b = ann.coords as BBoxCoords
          const bx = b.x * imageDimensions.width
          const by = b.y * imageDimensions.height
          const bw = b.w * imageDimensions.width
          const bh = b.h * imageDimensions.height

          ctx.strokeRect(bx, by, bw, bh)
          ctx.fillRect(bx, by, bw, bh)

          // Tag badge label
          ctx.fillStyle = isSelected ? '#6366f1' : '#0f172a'
          ctx.beginPath()
          ctx.roundRect(bx, by - 24 / zoom, 34 / zoom, 20 / zoom, 4 / zoom)
          ctx.fill()
          ctx.strokeStyle = '#38bdf8'
          ctx.stroke()

          ctx.font = `bold ${Math.max(11 / zoom, 9)}px sans-serif`
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(labelNumber, bx + 17 / zoom, by - 14 / zoom)
        } else if (ann.type === 'point') {
          const pt = ann.coords as PointCoords
          const px = pt.x * imageDimensions.width
          const py = pt.y * imageDimensions.height
          const pr = 14 / zoom

          ctx.beginPath()
          ctx.arc(px, py, pr, 0, Math.PI * 2)
          ctx.fillStyle = isSelected ? '#6366f1' : '#0f172a'
          ctx.fill()
          ctx.strokeStyle = isSelected ? '#ffffff' : '#38bdf8'
          ctx.stroke()

          ctx.font = `bold ${Math.max(10 / zoom, 8)}px sans-serif`
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(labelNumber, px, py)
        } else if (ann.type === 'polygon') {
          const poly = ann.coords as PolygonCoords
          if (poly.points && poly.points.length > 0) {
            ctx.beginPath()
            poly.points.forEach((p, pidx) => {
              const px = p.x * imageDimensions.width
              const py = p.y * imageDimensions.height
              if (pidx === 0) ctx.moveTo(px, py)
              else ctx.lineTo(px, py)
            })
            ctx.closePath()
            ctx.stroke()
            ctx.fill()

            const firstP = poly.points[0]
            const fx = firstP.x * imageDimensions.width
            const fy = firstP.y * imageDimensions.height
            ctx.font = `bold ${Math.max(10 / zoom, 8)}px sans-serif`
            ctx.fillStyle = '#ffffff'
            ctx.fillText(labelNumber, fx, fy - 10 / zoom)
          }
        }

        ctx.restore()
      })
    }

    // Draw active drawing shape
    if (isDrawing && currentBBox) {
      ctx.save()
      ctx.lineWidth = 2 / zoom
      ctx.strokeStyle = '#a855f7'
      ctx.setLineDash([4 / zoom, 4 / zoom])
      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)'

      const bx = currentBBox.x * imageDimensions.width
      const by = currentBBox.y * imageDimensions.height
      const bw = currentBBox.w * imageDimensions.width
      const bh = currentBBox.h * imageDimensions.height

      ctx.strokeRect(bx, by, bw, bh)
      ctx.fillRect(bx, by, bw, bh)
      ctx.restore()
    }

    // Draw active polygon preview
    if (activeTool === 'polygon' && polygonPoints.length > 0) {
      ctx.save()
      ctx.lineWidth = 2 / zoom
      ctx.strokeStyle = '#a855f7'
      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)'
      ctx.beginPath()
      polygonPoints.forEach((p, idx) => {
        const px = p.x * imageDimensions.width
        const py = p.y * imageDimensions.height
        if (idx === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.stroke()
      polygonPoints.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x * imageDimensions.width, p.y * imageDimensions.height, 4 / zoom, 0, Math.PI * 2)
        ctx.fillStyle = '#a855f7'
        ctx.fill()
      })
      ctx.restore()
    }

    ctx.restore()
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
    polygonPoints
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

  // Mouse / Canvas Events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return

    // Middle click or Pan tool: start pan
    if (e.button === 1 || activeTool === 'pan') {
      setIsPanning(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      return
    }

    const relCoords = getRelativeCoords(e.clientX, e.clientY)
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

    if (isDrawing && drawStart && activeTool === 'bbox') {
      const currentCoords = getRelativeCoords(e.clientX, e.clientY)
      if (!currentCoords) return

      const minX = Math.min(drawStart.x, currentCoords.x)
      const minY = Math.min(drawStart.y, currentCoords.y)
      const w = Math.abs(currentCoords.x - drawStart.x)
      const h = Math.abs(currentCoords.y - drawStart.y)

      setCurrentBBox({ x: minX, y: minY, w, h })
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

  // Zoom control buttons
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.25, 5))
  const handleZoomOut = () => setZoom(z => Math.max(z * 0.8, 0.1))
  const handleResetZoom = () => {
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
      {/* Floating Toolbar */}
      {imageLoaded && (
        <div className="canvas-toolbar">
          <button
            className={`tool-button ${activeTool === 'select' ? 'active' : ''}`}
            onClick={() => onSelectTool('select')}
            title="Selecionar / Mover Anotação"
          >
            <MousePointer size={16} />
          </button>
          <button
            className={`tool-button ${activeTool === 'bbox' ? 'active' : ''}`}
            onClick={() => onSelectTool('bbox')}
            title="Desenhar Retângulo / Bounding Box"
          >
            <Square size={16} />
          </button>
          <button
            className={`tool-button ${activeTool === 'point' ? 'active' : ''}`}
            onClick={() => onSelectTool('point')}
            title="Marcar Ponto Específico"
          >
            <Dot size={20} />
          </button>
          <button
            className={`tool-button ${activeTool === 'polygon' ? 'active' : ''}`}
            onClick={() => {
              onSelectTool('polygon')
              setPolygonPoints([])
            }}
            title="Polígono (Clique pontos e dê duplo clique para fechar)"
          >
            <Hexagon size={16} />
          </button>
          <button
            className={`tool-button ${activeTool === 'pan' ? 'active' : ''}`}
            onClick={() => onSelectTool('pan')}
            title="Mover Imagem (Pan)"
          >
            <Hand size={16} />
          </button>

          <div className="tool-divider" />

          <button
            className={`tool-button ${activeTool === 'heatmap' ? 'active' : ''}`}
            onClick={() => onSelectTool(activeTool === 'heatmap' ? 'select' : 'heatmap')}
            title="Visualização de Mapa de Calor (Heatmap)"
          >
            <Flame size={16} />
          </button>
        </div>
      )}

      {/* Canvas or Empty State Dropzone */}
      {imageLoaded ? (
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            cursor:
              activeTool === 'pan' || isPanning
                ? 'grab'
                : activeTool === 'bbox' || activeTool === 'polygon' || activeTool === 'point'
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
            <ImageIcon size={32} />
          </div>
          <h3 className="dropzone-title">Carregar Tela da Aplicação</h3>
          <p className="dropzone-subtitle">
            Arraste e solte uma imagem aqui, clique para selecionar ou simplesmente pressione{' '}
            <kbd style={{ background: '#1e2638', padding: '2px 6px', borderRadius: '4px' }}>Ctrl + V</kbd> / <kbd style={{ background: '#1e2638', padding: '2px 6px', borderRadius: '4px' }}>Cmd + V</kbd> para colar da área de transferência.
          </p>
          <button className="btn btn-primary" onClick={e => e.stopPropagation()}>
            <Upload size={16} />
            <span>Selecionar Arquivo</span>
          </button>
        </div>
      )}

      {/* Zoom Controls */}
      {imageLoaded && (
        <div className="canvas-zoom-controls">
          <button className="zoom-btn" onClick={handleZoomOut} title="Diminuir Zoom">
            <ZoomOut size={15} />
          </button>
          <span className="zoom-text">{Math.round(zoom * 100)}%</span>
          <button className="zoom-btn" onClick={handleZoomIn} title="Aumentar Zoom">
            <ZoomIn size={15} />
          </button>
          <button className="zoom-btn" onClick={handleResetZoom} title="Ajustar à Tela">
            <Maximize2 size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
