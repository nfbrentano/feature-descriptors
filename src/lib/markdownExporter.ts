import { Descriptor, Annotation, BBoxCoords, PointCoords, PolygonCoords } from '../types'

export function formatCoords(type: string, coords: any, imgWidth: number = 1000, imgHeight: number = 800): string {
  if (type === 'bbox') {
    const bbox = coords as BBoxCoords
    const x = Math.round(bbox.x * imgWidth)
    const y = Math.round(bbox.y * imgHeight)
    const w = Math.round(bbox.w * imgWidth)
    const h = Math.round(bbox.h * imgHeight)
    return `bbox: x=${x},y=${y},w=${w},h=${h} (${Math.round(bbox.x * 100)}%, ${Math.round(bbox.y * 100)}%)`
  }
  if (type === 'point') {
    const pt = coords as PointCoords
    const x = Math.round(pt.x * imgWidth)
    const y = Math.round(pt.y * imgHeight)
    return `point: x=${x},y=${y} (${Math.round(pt.x * 100)}%, ${Math.round(pt.y * 100)}%)`
  }
  if (type === 'polygon') {
    const poly = coords as PolygonCoords
    const pts = (poly.points || []).map(p => `(${Math.round(p.x * imgWidth)},${Math.round(p.y * imgHeight)})`).join(', ')
    return `polygon: [${pts}]`
  }
  return 'coords: custom'
}

export function generateHeatmapSummary(annotations: Annotation[]): string {
  if (annotations.length === 0) return 'Nenhuma anotação registrada.'

  let topCount = 0
  let bottomCount = 0
  let leftCount = 0
  let rightCount = 0

  annotations.forEach(a => {
    let y = 0.5
    let x = 0.5
    if (a.type === 'bbox') {
      const b = a.coords as BBoxCoords
      x = b.x + b.w / 2
      y = b.y + b.h / 2
    } else if (a.type === 'point') {
      const p = a.coords as PointCoords
      x = p.x
      y = p.y
    }
    if (y < 0.5) topCount++
    else bottomCount++
    if (x < 0.5) leftCount++
    else rightCount++
  })

  const areas: string[] = []
  if (topCount >= bottomCount && leftCount >= rightCount) areas.push('topo-esquerdo (formulários / cabeçalho)')
  if (topCount >= bottomCount && rightCount > leftCount) areas.push('topo-direito (ações principais / navegação)')
  if (bottomCount > topCount && leftCount >= rightCount) areas.push('rodapé-esquerdo (informações secundárias)')
  if (bottomCount > topCount && rightCount > leftCount) areas.push('rodapé-direito (botões de ação / confirmação)')

  return areas.join(', ') || 'Distribuição uniforme ao longo da tela'
}

export function exportDescriptorToMarkdown(descriptor: Descriptor, currentUsername: string = 'autor'): string {
  const dateStr = new Date().toISOString()
  const imgName = descriptor.image.name || 'tela.png'
  const imgWidth = descriptor.image.width || 1200
  const imgHeight = descriptor.image.height || 800

  let md = `# Tela: ${descriptor.title}\n`
  md += `![${descriptor.title}](${descriptor.image.url ? (descriptor.image.url.startsWith('data:') ? 'imagem_anexa.png' : descriptor.image.url) : 'assets/' + imgName})\n\n`

  md += `## Anotações\n`

  if (descriptor.annotations.length === 0) {
    md += `*Nenhuma anotação criada nesta tela.*\n\n`
  }

  descriptor.annotations.forEach((ann, idx) => {
    const idTag = `A${idx + 1}`
    const coordStr = formatCoords(ann.type, ann.coords, imgWidth, imgHeight)
    md += `### ${idTag} — "${ann.title}" (${coordStr})\n`

    if (ann.tags && ann.tags.length > 0) {
      md += `Tags: ${ann.tags.join(', ')}\n`
    }

    if (ann.estimate_points !== undefined) {
      const source = ann.estimate_source === 'ai_suggestion' ? ' (sugestão AI)' : ''
      md += `Estimativa: ${ann.estimate_points} pontos${source}\n`
    }

    if (ann.suggested_assignee) {
      md += `Responsável sugerido: ${ann.suggested_assignee}\n`
    }

    md += `Status: ${ann.status === 'resolved' ? 'resolvido' : ann.status === 'in_progress' ? 'em progresso' : 'aberto'}\n\n`

    if (ann.description) {
      md += `> **Descrição do Requisito:** ${ann.description}\n\n`
    }

    if (ann.messages && ann.messages.length > 0) {
      ann.messages.forEach(msg => {
        const time = msg.created_at ? msg.created_at.substring(0, 16).replace('T', ' ') : '2026-08-14'
        md += `- ${msg.author_name} (${time}): "${msg.content.replace(/"/g, "'")}"\n`
      })
      md += '\n'
    }

    const techMeta: string[] = []
    if (ann.css_selector) techMeta.push(`css_selector: "${ann.css_selector}"`)
    if (ann.xpath) techMeta.push(`xpath: "${ann.xpath}"`)

    if (techMeta.length > 0) {
      md += `Metadados técnicos: ${techMeta.join(', ')}\n`
    }

    md += `---\n\n`
  })

  md += `## Heatmap\n`
  md += `- Áreas mais comentadas: ${generateHeatmapSummary(descriptor.annotations)}\n\n`

  md += `## Metadados\n`
  md += `- Exportado por: @${currentUsername.replace(/\s+/g, '_').toLowerCase()}\n`
  md += `- Exportado em: ${dateStr}\n`
  md += `- Versão imagem: ${imgName} (v${descriptor.image.version || 1})\n`

  return md
}
