import { describe, it, expect } from 'vitest'
import {
  isValidDescriptor,
  isValidAnnotation,
  parseAndValidateDescriptorImport
} from './validators'

describe('validators', () => {
  it('validates a complete Descriptor object structure', () => {
    const validDescriptor = {
      id: 'desc-1',
      owner_id: 'user-1',
      title: 'Valid Descriptor',
      image: {
        url: 'data:image/png;base64,...',
        name: 'test.png',
        width: 800,
        height: 600,
        version: 1
      },
      annotations: [
        {
          id: 'ann-1',
          descriptor_id: 'desc-1',
          type: 'bbox',
          coords: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
          title: 'Header bar',
          tags: ['ux'],
          status: 'open',
          created_at: '2026-08-20T00:00:00Z',
          updated_at: '2026-08-20T00:00:00Z',
          messages: []
        }
      ],
      created_at: '2026-08-20T00:00:00Z',
      updated_at: '2026-08-20T00:00:00Z'
    }

    expect(isValidDescriptor(validDescriptor)).toBe(true)
    expect(isValidAnnotation(validDescriptor.annotations[0])).toBe(true)
  })

  it('rejects invalid or corrupted descriptors', () => {
    expect(isValidDescriptor(null)).toBe(false)
    expect(isValidDescriptor({})).toBe(false)
    expect(isValidDescriptor({ id: 'desc-1' })).toBe(false)
    expect(isValidDescriptor({ id: 'desc-1', title: 'Test', image: null, annotations: [] })).toBe(false)
  })

  it('safely parses and validates JSON string imports', () => {
    const validJson = JSON.stringify({
      id: 'desc-1',
      owner_id: 'user-1',
      title: 'Valid Descriptor',
      image: { url: 'https://test.com/img.png', name: 'img.png', width: 800, height: 600, version: 1 },
      annotations: [],
      created_at: '2026-08-20T00:00:00Z',
      updated_at: '2026-08-20T00:00:00Z'
    })

    const res = parseAndValidateDescriptorImport(validJson)
    expect(res.valid).toBe(true)
    expect(res.data?.title).toBe('Valid Descriptor')

    const invalidJson = '{ bad json'
    const errRes = parseAndValidateDescriptorImport(invalidJson)
    expect(errRes.valid).toBe(false)
    expect(errRes.error).toContain('Formato JSON inválido')
  })
})
