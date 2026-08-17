import { Descriptor, Annotation, BBoxCoords, PointCoords, PolygonCoords } from '../types'

/**
 * Export annotations to CSV format
 */
export function exportToCSV(descriptor: Descriptor): string {
  const headers = [
    'ID',
    'Tipo',
    'Título',
    'Descrição',
    'Status',
    'Tags',
    'Estimativa (Pontos)',
    'Responsável Sugerido',
    'Coordenadas X',
    'Coordenadas Y',
    'Largura (W)',
    'Altura (H)',
    'CSS Selector',
    'Criado em'
  ]

  const rows = descriptor.annotations.map(ann => {
    let x = 0
    let y = 0
    let w = ''
    let h = ''

    if (ann.type === 'bbox') {
      const b = ann.coords as BBoxCoords
      x = Math.round(b.x * descriptor.image.width)
      y = Math.round(b.y * descriptor.image.height)
      w = Math.round(b.w * descriptor.image.width).toString()
      h = Math.round(b.h * descriptor.image.height).toString()
    } else if (ann.type === 'point') {
      const p = ann.coords as PointCoords
      x = Math.round(p.x * descriptor.image.width)
      y = Math.round(p.y * descriptor.image.height)
    } else if (ann.type === 'polygon') {
      const poly = ann.coords as PolygonCoords
      if (poly.points && poly.points.length > 0) {
        x = Math.round(poly.points[0].x * descriptor.image.width)
        y = Math.round(poly.points[0].y * descriptor.image.height)
      }
    }

    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`

    return [
      escapeCsv(ann.id),
      escapeCsv(ann.type),
      escapeCsv(ann.title),
      escapeCsv(ann.description || ''),
      escapeCsv(ann.status),
      escapeCsv(ann.tags ? ann.tags.join(';') : ''),
      ann.estimate_points || 0,
      escapeCsv(ann.suggested_assignee || ''),
      x,
      y,
      w,
      h,
      escapeCsv(ann.css_selector || ''),
      escapeCsv(ann.created_at)
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

/**
 * Export annotations in MS-COCO JSON format for AI computer vision training
 */
export function exportToCOCO(descriptor: Descriptor): string {
  const imageId = 1

  const cocoData = {
    info: {
      description: descriptor.title,
      url: '',
      version: '1.0',
      year: new Date().getFullYear(),
      contributor: descriptor.owner_name || 'Feature Descriptors App',
      date_created: descriptor.created_at
    },
    images: [
      {
        id: imageId,
        width: descriptor.image.width,
        height: descriptor.image.height,
        file_name: descriptor.image.name || 'image.png'
      }
    ],
    categories: Array.from(
      new Set(descriptor.annotations.flatMap(a => a.tags || ['ui-element']))
    ).map((tag, index) => ({
      id: index + 1,
      name: tag,
      supercategory: 'ui'
    })),
    annotations: descriptor.annotations.map((ann, index) => {
      const categoryMap = Array.from(
        new Set(descriptor.annotations.flatMap(a => a.tags || ['ui-element']))
      )
      const primaryTag = ann.tags?.[0] || 'ui-element'
      const categoryId = categoryMap.indexOf(primaryTag) + 1

      let bbox: [number, number, number, number] = [0, 0, 0, 0]
      let area = 0
      let segmentation: number[][] = []

      if (ann.type === 'bbox') {
        const b = ann.coords as BBoxCoords
        const bx = Math.round(b.x * descriptor.image.width)
        const by = Math.round(b.y * descriptor.image.height)
        const bw = Math.round(b.w * descriptor.image.width)
        const bh = Math.round(b.h * descriptor.image.height)
        bbox = [bx, by, bw, bh]
        area = bw * bh
        segmentation = [[bx, by, bx + bw, by, bx + bw, by + bh, bx, by + bh]]
      } else if (ann.type === 'polygon') {
        const poly = ann.coords as PolygonCoords
        const flatPts: number[] = []
        if (poly.points) {
          poly.points.forEach(p => {
            flatPts.push(Math.round(p.x * descriptor.image.width))
            flatPts.push(Math.round(p.y * descriptor.image.height))
          })
        }
        segmentation = [flatPts]
        area = 0
      } else if (ann.type === 'point') {
        const pt = ann.coords as PointCoords
        const px = Math.round(pt.x * descriptor.image.width)
        const py = Math.round(pt.y * descriptor.image.height)
        bbox = [px - 5, py - 5, 10, 10]
        area = 100
        segmentation = [[px, py]]
      }

      return {
        id: index + 1,
        image_id: imageId,
        category_id: categoryId,
        segmentation,
        area,
        bbox,
        iscrowd: 0,
        attributes: {
          title: ann.title,
          status: ann.status,
          css_selector: ann.css_selector
        }
      }
    })
  }

  return JSON.stringify(cocoData, null, 2)
}

/**
 * Parses and validates imported JSON annotations
 */
export function importAnnotationsFromJSON(
  jsonText: string,
  targetDescriptorId: string
): { success: boolean; annotations?: Annotation[]; error?: string } {
  try {
    const data = JSON.parse(jsonText)

    let rawAnnotations: any[] = []

    if (Array.isArray(data)) {
      rawAnnotations = data
    } else if (data.annotations && Array.isArray(data.annotations)) {
      rawAnnotations = data.annotations
    } else {
      return { success: false, error: 'Formato JSON inválido: não contém array de anotações.' }
    }

    const validAnnotations: Annotation[] = rawAnnotations.map((item, idx) => ({
      id: item.id || `imported-${Date.now()}-${idx}`,
      descriptor_id: targetDescriptorId,
      type: ['bbox', 'point', 'polygon'].includes(item.type) ? item.type : 'bbox',
      coords: item.coords || { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
      title: item.title || `Anotação Importada ${idx + 1}`,
      description: item.description || '',
      tags: Array.isArray(item.tags) ? item.tags : ['importado'],
      estimate_points: item.estimate_points || 2,
      estimate_source: item.estimate_source || 'manual',
      suggested_assignee: item.suggested_assignee || '',
      css_selector: item.css_selector || '',
      xpath: item.xpath || '',
      status: ['open', 'in_progress', 'resolved'].includes(item.status) ? item.status : 'open',
      created_at: item.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: Array.isArray(item.messages) ? item.messages : []
    }))

    return { success: true, annotations: validAnnotations }
  } catch (err: any) {
    return { success: false, error: `Erro de análise no arquivo JSON: ${err.message}` }
  }
}
