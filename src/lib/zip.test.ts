import { describe, it, expect } from 'vitest'
import { crc32, createZipBytes } from './zip'

describe('zip', () => {
  it('computes CRC32', () => {
    expect(crc32(new TextEncoder().encode('hello'))).toBe(0x3610a686)
    expect(crc32(new Uint8Array())).toBe(0)
  })

  it('CT06: writes a valid STORE archive with local headers and central directory', () => {
    const bytes = createZipBytes([
      { name: 'spec.md', data: '# oi' },
      { name: 'imagem-anotada.png', data: new Uint8Array([1, 2, 3]) }
    ])
    const view = new DataView(bytes.buffer)

    expect(view.getUint32(0, true)).toBe(0x04034b50)
    expect(view.getUint32(14, true)).toBe(crc32(new TextEncoder().encode('# oi')))

    const eocd = bytes.length - 22
    expect(view.getUint32(eocd, true)).toBe(0x06054b50)
    expect(view.getUint16(eocd + 10, true)).toBe(2)

    const centralOffset = view.getUint32(eocd + 16, true)
    expect(view.getUint32(centralOffset, true)).toBe(0x02014b50)
    const names = new TextDecoder().decode(bytes)
    expect(names).toContain('spec.md')
    expect(names).toContain('imagem-anotada.png')
  })
})
