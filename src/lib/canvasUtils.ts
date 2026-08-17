import {
  BBoxCoords,
  Descriptor,
  PointCoords,
  PolygonCoords,
  ViewTool
} from '../types'

export interface RenderCanvasOptions {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  image: HTMLImageElement | null
  imageLoaded: boolean
  imageDimensions: { width: number; height: number }
  pan: { x: number; y: number }
  zoom: number
  descriptor: Descriptor | null
  selectedAnnotationId: string | null
  activeTool: ViewTool
  isDrawing: boolean
  currentBBox: BBoxCoords | null
  polygonPoints: Array<{ x: number; y: number }>
  measureStart: { x: number; y: number } | null
  measureEnd: { x: number; y: number } | null
  showGrid: boolean
  gridSize?: number // percentage of width e.g. 0.05
  heatmapRadius?: number
  heatmapOpacity?: number
  theme?: 'dark' | 'light'
}

/**
 * Converts screen relative mouse position to normalized image coordinates (0..1)
 */
export function getRelativeCoords(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  pan: { x: number; y: number },
  zoom: number,
  imageDimensions: { width: number; height: number }
): { x: number; y: number } | null {
  if (!imageDimensions.width || !imageDimensions.height) return null
  const mouseX = clientX - containerRect.left
  const mouseY = clientY - containerRect.top

  const imgX = (mouseX - pan.x) / zoom
  const imgY = (mouseY - pan.y) / zoom

  const relX = Math.max(0, Math.min(1, imgX / imageDimensions.width))
  const relY = Math.max(0, Math.min(1, imgY / imageDimensions.height))

  return { x: relX, y: relY }
}

/**
 * Main offscreen / canvas render function
 */
export function drawCanvas({
  ctx,
  width,
  height,
  image,
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
  showGrid = false,
  gridSize = 0.05,
  heatmapRadius = 0.15,
  heatmapOpacity = 0.65,
  theme = 'dark'
}: RenderCanvasOptions) {
  ctx.clearRect(0, 0, width, height)

  if (!imageLoaded || !image) return

  ctx.save()
  ctx.translate(pan.x, pan.y)
  ctx.scale(zoom, zoom)

  // Draw background image
  ctx.drawImage(image, 0, 0, imageDimensions.width, imageDimensions.height)

  // Draw optional Grid Overlay
  if (showGrid) {
    ctx.save()
    ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1 / zoom
    const stepX = imageDimensions.width * gridSize
    const stepY = imageDimensions.height * gridSize

    for (let x = stepX; x < imageDimensions.width; x += stepX) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, imageDimensions.height)
      ctx.stroke()
    }
    for (let y = stepY; y < imageDimensions.height; y += stepY) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(imageDimensions.width, y)
      ctx.stroke()
    }
    ctx.restore()
  }

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
      } else if (ann.type === 'polygon') {
        const poly = ann.coords as PolygonCoords
        if (poly.points && poly.points.length > 0) {
          const sumX = poly.points.reduce((acc, pt) => acc + pt.x, 0)
          const sumY = poly.points.reduce((acc, pt) => acc + pt.y, 0)
          cx = (sumX / poly.points.length) * imageDimensions.width
          cy = (sumY / poly.points.length) * imageDimensions.height
        }
      }
      const radius = Math.max(imageDimensions.width, imageDimensions.height) * heatmapRadius
      const radGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, radius)
      radGrad.addColorStop(0, `rgba(239, 68, 68, ${heatmapOpacity})`)
      radGrad.addColorStop(0.5, `rgba(245, 158, 11, ${heatmapOpacity * 0.6})`)
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

  // Draw active drawing shape (BBox preview)
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

  // Draw active Measure tool line & distance label
  if (activeTool === 'measure' && measureStart && measureEnd) {
    ctx.save()
    const x1 = measureStart.x * imageDimensions.width
    const y1 = measureStart.y * imageDimensions.height
    const x2 = measureEnd.x * imageDimensions.width
    const y2 = measureEnd.y * imageDimensions.height

    const dx = x2 - x1
    const dy = y2 - y1
    const distPx = Math.round(Math.hypot(dx, dy))

    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2 / zoom
    ctx.setLineDash([6 / zoom, 4 / zoom])

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    // End points
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.arc(x1, y1, 4 / zoom, 0, Math.PI * 2)
    ctx.arc(x2, y2, 4 / zoom, 0, Math.PI * 2)
    ctx.fill()

    // Distance Label
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const textStr = `${distPx} px`

    ctx.fillStyle = '#1e1b4b'
    ctx.beginPath()
    ctx.roundRect(midX - 30 / zoom, midY - 14 / zoom, 60 / zoom, 22 / zoom, 4 / zoom)
    ctx.fill()
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 1 / zoom
    ctx.setLineDash([])
    ctx.stroke()

    ctx.font = `bold ${Math.max(11 / zoom, 9)}px sans-serif`
    ctx.fillStyle = '#f59e0b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(textStr, midX, midY)

    ctx.restore()
  }

  ctx.restore()
}
