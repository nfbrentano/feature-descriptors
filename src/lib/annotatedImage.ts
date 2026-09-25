import { Annotation, BBoxCoords, FreehandCoords, PolygonCoords } from '../types'
import { getAnnotationAnchor, getAnnotationLabel } from './markdownExporter'

const DEFAULT_COLOR = '#ef4444'
const RESOLVED_COLOR = '#64748b'

type MarkerContext = Pick<
  CanvasRenderingContext2D,
  | 'save' | 'restore' | 'beginPath' | 'closePath' | 'moveTo' | 'lineTo' | 'arc' | 'rect'
  | 'stroke' | 'fill' | 'fillText' | 'lineWidth' | 'strokeStyle' | 'fillStyle' | 'font'
  | 'textAlign' | 'textBaseline' | 'lineCap' | 'lineJoin' | 'setLineDash'
>

/** Marker radius proportional to the image, never below 14px. */
export function getMarkerRadius(width: number, height: number): number {
  return Math.max(14, Math.round(Math.min(width, height) * 0.022))
}

/**
 * Draws every annotation shape plus a numbered "A{n}" badge at its anchor.
 * Numbering and anchors match the markdown export exactly.
 */
export function drawAnnotationMarkers(ctx: MarkerContext, annotations: Annotation[], width: number, height: number): void {
  const radius = getMarkerRadius(width, height)
  const line = Math.max(2, radius / 6)

  annotations.forEach(ann => {
    const color = ann.color || (ann.status === 'resolved' ? RESOLVED_COLOR : DEFAULT_COLOR)
    ctx.save()
    ctx.lineWidth = line
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash(ann.status === 'resolved' ? [line * 3, line * 2] : [])

    if (ann.type === 'bbox') {
      const b = ann.coords as BBoxCoords
      ctx.beginPath()
      ctx.rect(b.x * width, b.y * height, b.w * width, b.h * height)
      ctx.stroke()
    } else if (ann.type === 'polygon') {
      const pts = (ann.coords as PolygonCoords).points || []
      if (pts.length > 1) {
        ctx.beginPath()
        pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * width, p.y * height) : ctx.lineTo(p.x * width, p.y * height)))
        ctx.closePath()
        ctx.stroke()
      }
    } else if (ann.type === 'freehand') {
      ;((ann.coords as FreehandCoords).strokes || []).forEach(stroke => {
        if (stroke.length === 0) return
        ctx.beginPath()
        stroke.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * width, p.y * height) : ctx.lineTo(p.x * width, p.y * height)))
        ctx.stroke()
      })
    }
    ctx.restore()
  })

  // Badges last, so shapes never cover a number
  annotations.forEach((ann, idx) => {
    const color = ann.color || (ann.status === 'resolved' ? RESOLVED_COLOR : DEFAULT_COLOR)
    const anchor = getAnnotationAnchor(ann)
    const x = anchor.x * width
    const y = anchor.y * height
    const label = getAnnotationLabel(idx)

    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.lineWidth = Math.max(2, radius / 7)
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.round(radius * (label.length > 3 ? 0.7 : 0.85))}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x, y)
    ctx.restore()
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!url.startsWith('data:')) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem da tela.'))
    img.src = url
  })
}

/** Renders the screen at its original resolution with the numbered markers drawn on top. */
export async function renderAnnotatedImage(imageUrl: string, annotations: Annotation[]): Promise<Blob> {
  const img = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D indisponível neste navegador.')

  ctx.drawImage(img, 0, 0)
  drawAnnotationMarkers(ctx, annotations, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Falha ao gerar o PNG.'))), 'image/png')
    } catch (err) {
      // Tainted canvas (remote image without CORS)
      reject(err instanceof Error ? err : new Error(String(err)))
    }
  })
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg'
}

export function extensionForMime(mime: string, fallbackName = ''): string {
  const fromMime = MIME_EXTENSIONS[mime.toLowerCase()]
  if (fromMime) return fromMime
  const match = fallbackName.match(/\.([a-z0-9]+)$/i)
  return match ? match[1].toLowerCase() : 'png'
}

export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const match = dataUrl.match(/^data:([^;,]*)((?:;[^;,]*)*),(.*)$/s)
  if (!match) throw new Error('Data URL inválida.')
  const mime = match[1] || 'application/octet-stream'
  const payload = match[3]
  const isBase64 = match[2].split(';').includes('base64')
  if (!isBase64) {
    // Text payloads (e.g. "data:image/svg+xml;utf8,<svg…>") may or may not be percent-encoded
    let text = payload
    try {
      text = decodeURIComponent(payload)
    } catch {
      // keep raw payload
    }
    return { bytes: new TextEncoder().encode(text), mime }
  }
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return { bytes, mime }
}

/** Original image bytes, from a data URL or by fetching a public URL. */
export async function getOriginalImageBytes(url: string): Promise<{ bytes: Uint8Array; mime: string }> {
  if (url.startsWith('data:')) return dataUrlToBytes(url)
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`Falha ao baixar a imagem (${res.status}).`)
  const blob = await res.blob()
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: blob.type }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
