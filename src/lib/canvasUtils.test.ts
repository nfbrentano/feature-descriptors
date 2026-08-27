import { describe, it, expect } from 'vitest'
import { getRelativeCoords, getAbsoluteCoords } from './canvasUtils'

describe('canvasUtils', () => {
  const containerRect = {
    left: 100,
    top: 50,
    width: 800,
    height: 600,
    right: 900,
    bottom: 650,
    x: 100,
    y: 50,
    toJSON: () => {}
  }

  const pan = { x: 0, y: 0 }
  const zoom = 1
  const imageDimensions = { width: 1000, height: 800 }

  it('converts client click coordinates to relative percentages (0 to 1)', () => {
    // Click at center of image (pan: 0, zoom: 1, so image top-left is at container top-left)
    const clientX = 100 + 500 // 500px in image
    const clientY = 50 + 400 // 400px in image

    const rel = getRelativeCoords(clientX, clientY, containerRect, pan, zoom, imageDimensions)

    expect(rel).not.toBeNull()
    expect(rel!.x).toBeCloseTo(0.5, 2)
    expect(rel!.y).toBeCloseTo(0.5, 2)
  })

  it('clamps coordinates to boundaries between 0 and 1', () => {
    // Click far outside to top-left
    const relTopLeft = getRelativeCoords(0, 0, containerRect, pan, zoom, imageDimensions)
    expect(relTopLeft).not.toBeNull()
    expect(relTopLeft!.x).toBe(0)
    expect(relTopLeft!.y).toBe(0)

    // Click far outside to bottom-right
    const relBottomRight = getRelativeCoords(2000, 2000, containerRect, pan, zoom, imageDimensions)
    expect(relBottomRight).not.toBeNull()
    expect(relBottomRight!.x).toBe(1)
    expect(relBottomRight!.y).toBe(1)
  })

  it('accounts for pan and zoom transformation', () => {
    const zoomedZoom = 2
    const panOffset = { x: 50, y: 50 }

    // ClientX at containerLeft (100) + pan.x (50) + (250 * 2) = 650
    const clientX = 100 + 50 + 500
    const clientY = 50 + 50 + 400

    const rel = getRelativeCoords(clientX, clientY, containerRect, panOffset, zoomedZoom, imageDimensions)
    expect(rel).not.toBeNull()
    expect(rel!.x).toBeCloseTo(0.25, 2)
    expect(rel!.y).toBeCloseTo(0.25, 2)
  })

  it('converts relative coordinates back to absolute coordinates correctly', () => {
    const rel = { x: 0.25, y: 0.5 }
    const abs = getAbsoluteCoords(rel.x, rel.y, imageDimensions)

    expect(abs.x).toBe(250)
    expect(abs.y).toBe(400)
  })
})
