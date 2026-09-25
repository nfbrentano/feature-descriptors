import { describe, it, expect } from 'vitest'
import {
  exportDescriptorToMarkdown,
  formatCoords,
  generateHeatmapSummary,
  getAnnotationAnchor,
  getScreenRegion
} from './markdownExporter'
import { Annotation, Descriptor } from '../types'

const baseAnnotation = (overrides: Partial<Annotation>): Annotation => ({
  id: 'ann-x',
  descriptor_id: 'desc-test-1',
  type: 'point',
  coords: { x: 0.5, y: 0.5 },
  title: 'Observação',
  tags: [],
  status: 'open',
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-20T10:00:00Z',
  messages: [],
  ...overrides
})

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
      baseAnnotation({
        id: 'ann-1',
        type: 'bbox',
        coords: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
        title: 'Botão Pagar com PIX',
        description: 'Deve gerar QR Code dinâmico e copiar código copia-e-cola.',
        tags: ['pagamento', 'pix'],
        estimate_points: 3,
        suggested_assignee: '@dev-backend',
        priority: 'high',
        css_selector: '#pay-pix',
        messages: [
          {
            id: 'm1',
            annotation_id: 'ann-1',
            author_id: 'user-1',
            author_name: 'PO',
            content: 'Tempo de expiração do PIX deve ser de 15 minutos.',
            created_at: '2026-08-20T10:30:00Z'
          },
          {
            id: 'm2',
            annotation_id: 'ann-1',
            author_id: 'user-2',
            author_name: 'Dev',
            content: 'Combinado, vou usar o timer do backend.',
            created_at: '2026-08-20T11:00:00Z'
          }
        ]
      })
    ]
  }

  it('CT01: starts with YAML front-matter and AI instructions', () => {
    const md = exportDescriptorToMarkdown(sampleDescriptor, 'Test User')

    expect(md.startsWith('---\nspec: feature-descriptor\n')).toBe(true)
    expect(md).toContain('title: "Tela de Checkout"')
    expect(md).toContain('  width: 1200\n')
    expect(md).toContain('  height: 800\n')
    expect(md).toContain('coordinate_system:')
    expect(md).toContain('## Instruções para a IA')
    expect(md).toContain('# Especificação de tela: Tela de Checkout')
    expect(md).toContain('Exportado por: @test_user')
  })

  it('CT02: computes bbox anchor, region and summary row', () => {
    const anchor = getAnnotationAnchor(sampleDescriptor.annotations[0])
    expect(anchor.x).toBeCloseTo(0.25)
    expect(anchor.y).toBeCloseTo(0.4)
    expect(getScreenRegion(anchor.x, anchor.y)).toBe('centro-esquerda')

    const md = exportDescriptorToMarkdown(sampleDescriptor)
    expect(md).toContain('| A1 | Botão Pagar com PIX | retângulo | (300, 320) | centro-esquerda | aberto | alta | 3 pts |')
    expect(md).toContain('- **Posição:** x=300, y=320 px (25.0%, 40.0%) · região: centro-esquerda')
    expect(md).toContain('- **Área (retângulo):** x=120..480, y=160..480 (w=360, h=320)')
  })

  it('CT03: gives polygon and freehand a numeric anchor and area', () => {
    const descriptor: Descriptor = {
      ...sampleDescriptor,
      annotations: [
        baseAnnotation({ type: 'polygon', coords: { points: [{ x: 0.6, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.4 }] } }),
        baseAnnotation({ type: 'freehand', coords: { strokes: [[{ x: 0.1, y: 0.8 }, { x: 0.3, y: 0.9 }]] } })
      ]
    }
    const md = exportDescriptorToMarkdown(descriptor)

    expect(md).toContain('| A1 | Observação | polígono | (960, 160) | topo-direita |')
    expect(md).toContain('- **Vértices:** (720, 80), (1080, 80), (1080, 320)')
    expect(md).toContain('| A2 | Observação | desenho livre | (240, 680) | base-esquerda |')
    expect(md).toContain('- **Área (desenho livre):** x=120..360, y=640..720')
    expect(md).not.toContain('coords: custom')
  })

  it('CT04: includes requirement and full team discussion', () => {
    const md = exportDescriptorToMarkdown(sampleDescriptor)

    expect(md).toContain('### A1 — Botão Pagar com PIX')
    expect(md).toContain('**Requisito**\n\nDeve gerar QR Code dinâmico e copiar código copia-e-cola.')
    expect(md).toContain('- **PO** (2026-08-20 10:30): Tempo de expiração do PIX deve ser de 15 minutos.')
    expect(md).toContain('- **Dev** (2026-08-20 11:00): Combinado, vou usar o timer do backend.')
    expect(md).toContain('- **Tags:** pagamento, pix')
    expect(md).toContain('- **Responsável sugerido:** @dev-backend')
    expect(md).toContain('- **Seletor CSS:** `#pay-pix`')
  })

  it('CT05: references the image according to the attachment mode', () => {
    const files = exportDescriptorToMarkdown(sampleDescriptor, 'x', {
      imageRef: { mode: 'files', annotated: 'imagem-anotada.png', original: 'imagem-original.png' }
    })
    expect(files).toContain('](imagem-anotada.png)')
    expect(files).toContain('[checkout.png](imagem-original.png)')
    expect(files).toContain('  file: "imagem-anotada.png"')
    expect(files).toContain('marcadores numerados (A1, A2, …)')

    const embedded = exportDescriptorToMarkdown(sampleDescriptor, 'x', {
      imageRef: { mode: 'embedded', dataUrl: 'data:image/png;base64,AAAA' }
    })
    expect(embedded).toContain('](data:image/png;base64,AAAA)')

    const localOnly = exportDescriptorToMarkdown(
      { ...sampleDescriptor, image: { ...sampleDescriptor.image, url: 'data:image/png;base64,BBBB' } },
      'x',
      { imageRef: { mode: 'none' } }
    )
    expect(localOnly).not.toContain('![')
    expect(localOnly).not.toContain('BBBB')
    expect(localOnly).toContain('Imagem não anexada')

    const remoteOnly = exportDescriptorToMarkdown(sampleDescriptor, 'x', { imageRef: { mode: 'none' } })
    expect(remoteOnly).toContain('![Tela de Checkout](https://example.com/checkout.png)')
  })

  it('CT07: escapes pipes and newlines in the summary table', () => {
    const descriptor: Descriptor = { ...sampleDescriptor, annotations: [baseAnnotation({ title: 'a|b\nc' })] }
    const md = exportDescriptorToMarkdown(descriptor)
    const lines = md.split('\n')
    const header = lines.find(l => l.startsWith('| ID |'))!
    const row = lines.find(l => l.startsWith('| A1 |'))!
    const cols = (l: string) => l.replace(/\\\|/g, '').split('|').length
    expect(row).toContain('a\\|b c')
    expect(cols(row)).toBe(cols(header))
  })

  it('CT08: handles a descriptor without annotations', () => {
    const md = exportDescriptorToMarkdown({ ...sampleDescriptor, annotations: [] })
    expect(md).toContain('Nenhuma observação registrada')
    expect(md).not.toContain('## Resumo das observações')
    expect(md).toContain('annotations: 0')
  })

  it('formats coordinates and calculates heatmap summary correctly', () => {
    const formatted = formatCoords('bbox', { x: 0.1, y: 0.2, w: 0.3, h: 0.4 }, 1000, 800)
    expect(formatted).toContain('bbox: x=100,y=160,w=300,h=320')

    const heatmap = generateHeatmapSummary(sampleDescriptor.annotations)
    expect(heatmap).toContain('topo-esquerdo')
  })
})
