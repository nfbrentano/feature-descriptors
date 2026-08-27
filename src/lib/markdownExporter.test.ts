import { describe, it, expect } from 'vitest'
import { exportDescriptorToMarkdown, formatCoords, generateHeatmapSummary } from './markdownExporter'
import { Descriptor } from '../types'

describe('markdownExporter', () => {
  const sampleDescriptor: Descriptor = {
    id: 'desc-test-1',
    owner_id: 'user-1',
    title: 'Tela de Checkout',
    image: {
      url: 'https://example.com/checkout.png',
      name: 'checkout.png',
      width: 1200,
      height: 800,
      version: 1
    },
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-20T12:00:00Z',
    annotations: [
      {
        id: 'ann-1',
        descriptor_id: 'desc-test-1',
        type: 'bbox',
        coords: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
        title: 'Botão Pagar com PIX',
        description: 'Deve gerar QR Code dinâmico e copiar código copia-e-cola.',
        tags: ['pagamento', 'pix'],
        estimate_points: 3,
        suggested_assignee: '@dev-backend',
        status: 'open',
        created_at: '2026-08-20T10:00:00Z',
        updated_at: '2026-08-20T11:00:00Z',
        messages: [
          {
            id: 'm1',
            annotation_id: 'ann-1',
            author_id: 'user-1',
            author_name: 'PO',
            content: 'Tempo de expiração do PIX deve ser de 15 minutos.',
            created_at: '2026-08-20T10:30:00Z'
          }
        ]
      }
    ]
  }

  it('generates markdown containing title, metadata and annotations', () => {
    const md = exportDescriptorToMarkdown(sampleDescriptor, 'Test User')

    expect(md).toContain('# Tela: Tela de Checkout')
    expect(md).toContain('![Tela de Checkout](https://example.com/checkout.png)')
    expect(md).toContain('### A1 — "Botão Pagar com PIX"')
    expect(md).toContain('Deve gerar QR Code dinâmico e copiar código copia-e-cola.')
    expect(md).toContain('Tags: pagamento, pix')
    expect(md).toContain('Estimativa: 3 pontos')
    expect(md).toContain('Responsável sugerido: @dev-backend')
    expect(md).toContain('Tempo de expiração do PIX deve ser de 15 minutos.')
    expect(md).toContain('Exportado por: @test_user')
  })

  it('formats coordinates and calculates heatmap summary correctly', () => {
    const formatted = formatCoords('bbox', { x: 0.1, y: 0.2, w: 0.3, h: 0.4 }, 1000, 800)
    expect(formatted).toContain('bbox: x=100,y=160,w=300,h=320')

    const heatmap = generateHeatmapSummary(sampleDescriptor.annotations)
    expect(heatmap).toContain('topo-esquerdo')
  })
})
