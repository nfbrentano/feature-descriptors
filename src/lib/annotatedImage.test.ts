import { describe, it, expect } from 'vitest'
import { dataUrlToBytes, drawAnnotationMarkers, extensionForMime, getMarkerRadius } from './annotatedImage'
import { Annotation } from '../types'

function fakeContext() {
  const texts: Array<{ text: string; x: number; y: number }> = []
  const noop = () => {}
  const ctx: any = {
    save: noop, restore: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, rect: noop, stroke: noop, fill: noop, setLineDash: noop,
    fillText: (text: string, x: number, y: number) => texts.push({ text, x, y })
  }
  return { ctx, texts }
}

const ann = (overrides: Partial<Annotation>): Annotation => ({
  id: 'a', descriptor_id: 'd', type: 'point', coords: { x: 0.5, y: 0.5 }, title: 't', tags: [],
  status: 'open', created_at: '', updated_at: '', messages: [], ...overrides
})

describe('annotatedImage', () => {
  it('CT09: draws numbered markers at the same anchors used in the markdown, including hidden ones', () => {
    const { ctx, texts } = fakeContext()
    drawAnnotationMarkers(ctx, [
      ann({ type: 'bbox', coords: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 } }),
      ann({ type: 'point', coords: { x: 0.9, y: 0.1 }, hidden: true }),
      ann({ type: 'polygon', coords: { points: [{ x: 0, y: 0 }, { x: 0.2, y: 0 }, { x: 0.1, y: 0.3 }] } })
    ], 1200, 800)

    expect(texts.map(t => t.text)).toEqual(['A1', 'A2', 'A3'])
    expect(texts[0]).toMatchObject({ x: 300, y: 320 })
    expect(texts[1]).toMatchObject({ x: 1080, y: 80 })
    expect(texts[2].x).toBeCloseTo(120)
    expect(texts[2].y).toBeCloseTo(80)
  })

  it('scales markers with the image, with a 14px minimum', () => {
    expect(getMarkerRadius(300, 200)).toBe(14)
    expect(getMarkerRadius(3840, 2160)).toBe(48)
  })

  it('decodes data URLs and maps extensions', () => {
    const { bytes, mime } = dataUrlToBytes('data:image/jpeg;base64,AQID')
    expect(mime).toBe('image/jpeg')
    expect(Array.from(bytes)).toEqual([1, 2, 3])
    const svg = dataUrlToBytes('data:image/svg+xml;utf8,<svg width="100%"></svg>')
    expect(svg.mime).toBe('image/svg+xml')
    expect(new TextDecoder().decode(svg.bytes)).toBe('<svg width="100%"></svg>')
    const b64 = dataUrlToBytes('data:image/png;charset=utf-8;base64,AQID')
    expect(Array.from(b64.bytes)).toEqual([1, 2, 3])
    expect(extensionForMime('image/jpeg')).toBe('jpg')
    expect(extensionForMime('', 'tela.webp')).toBe('webp')
    expect(extensionForMime('')).toBe('png')
  })
})
