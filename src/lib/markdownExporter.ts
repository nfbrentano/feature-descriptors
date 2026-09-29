import { Descriptor, Annotation, AnnotationType, BBoxCoords, PointCoords, PolygonCoords, FreehandCoords } from '../types'

export const MARKDOWN_FORMAT_VERSION = 2
export const ANNOTATED_IMAGE_FILE = 'imagem-anotada.png'

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
    const { x, y } = getAnnotationAnchor(a)
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

type NormPoint = { x: number; y: number }

/** All normalized (0..1) points that define the annotation shape. */
export function getAnnotationPoints(ann: Annotation): NormPoint[] {
  switch (ann.type) {
    case 'bbox': {
      const b = ann.coords as BBoxCoords
      return [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y + b.h }]
    }
    case 'point': {
      const p = ann.coords as PointCoords
      return [{ x: p.x, y: p.y }]
    }
    case 'polygon':
      return (ann.coords as PolygonCoords).points || []
    case 'freehand':
      return ((ann.coords as FreehandCoords).strokes || []).flat()
    default:
      return []
  }
}

/**
 * Single (x, y) anchor where the numbered marker is drawn, normalized 0..1.
 * bbox → center; point → itself; polygon → vertex average; freehand → average of all points.
 */
export function getAnnotationAnchor(ann: Annotation): NormPoint {
  if (ann.type === 'bbox') {
    const b = ann.coords as BBoxCoords
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
  }
  const pts = getAnnotationPoints(ann)
  if (pts.length === 0) return { x: 0.5, y: 0.5 }
  const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / pts.length, y: sum.y / pts.length }
}

/** Screen region in a 3×3 grid, e.g. "topo-esquerda", "centro", "base-direita". */
export function getScreenRegion(x: number, y: number): string {
  const row = y < 1 / 3 ? 'topo' : y < 2 / 3 ? 'centro' : 'base'
  const col = x < 1 / 3 ? 'esquerda' : x < 2 / 3 ? 'centro' : 'direita'
  if (row === 'centro' && col === 'centro') return 'centro'
  return `${row}-${col}`
}

export function getAnnotationLabel(index: number): string {
  return `A${index + 1}`
}

const TYPE_LABELS: Record<AnnotationType, string> = {
  bbox: 'retângulo',
  point: 'ponto',
  polygon: 'polígono',
  freehand: 'desenho livre'
}

const STATUS_LABELS: Record<Annotation['status'], string> = {
  open: 'aberto',
  in_progress: 'em progresso',
  resolved: 'resolvido'
}

const PRIORITY_LABELS: Record<NonNullable<Annotation['priority']>, string> = {
  low: 'baixa',
  medium: 'média',
  high: 'alta',
  critical: 'crítica'
}

function inline(text: string): string {
  return text.replace(/\s*\r?\n\s*/g, ' ').trim()
}

function tableCell(text: string): string {
  return inline(text)
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|') || '—'
}

function yamlString(text: string): string {
  return JSON.stringify(inline(text))
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/**
 * How the exported markdown references the screen image.
 * - files: images shipped next to the .md (zip package), referenced by relative path
 * - embedded: annotated image inlined as a data URI
 * - none: text only; links the original image only when it has a public URL
 */
export type MarkdownImageRef =
  | { mode: 'files'; annotated: string | null; original: string | null }
  | { mode: 'embedded'; dataUrl: string }
  | { mode: 'none' }

export interface MarkdownExportOptions {
  imageRef?: MarkdownImageRef
  exportedAt?: Date
}

export function exportDescriptorToMarkdown(
  descriptor: Descriptor,
  currentUsername: string = 'autor',
  options: MarkdownExportOptions = {}
): string {
  const imageRef = options.imageRef ?? { mode: 'none' }
  const dateStr = (options.exportedAt ?? new Date()).toISOString()
  const imgName = descriptor.image.name || 'tela.png'
  const imgWidth = descriptor.image.width || 1200
  const imgHeight = descriptor.image.height || 800
  const publicUrl = descriptor.image.url && !descriptor.image.url.startsWith('data:') ? descriptor.image.url : null
  const username = `@${currentUsername.replace(/\s+/g, '_').toLowerCase()}`
  const annotations = descriptor.annotations
  const px = (v: number, size: number) => Math.round(v * size)

  let annotatedRef: string | null = null
  let originalRef: string | null = publicUrl
  if (imageRef.mode === 'files') {
    annotatedRef = imageRef.annotated
    originalRef = imageRef.original ?? publicUrl
  } else if (imageRef.mode === 'embedded') {
    annotatedRef = imageRef.dataUrl
  }
  const hasMarkers = annotatedRef !== null

  // Front-matter: machine-readable header
  let md = `---\n`
  md += `spec: feature-descriptor\n`
  md += `format_version: ${MARKDOWN_FORMAT_VERSION}\n`
  md += `title: ${yamlString(descriptor.title)}\n`
  md += `image:\n`
  md += `  file: ${annotatedRef && imageRef.mode === 'files' ? yamlString(annotatedRef) : hasMarkers ? '"embutida (data URI)"' : 'null'}\n`
  md += `  original: ${originalRef ? yamlString(originalRef) : 'null'}\n`
  md += `  name: ${yamlString(imgName)}\n`
  md += `  width: ${imgWidth}\n`
  md += `  height: ${imgHeight}\n`
  md += `  version: ${descriptor.image.version || 1}\n`
  md += `coordinate_system: "pixels da imagem original; origem (0,0) no canto superior esquerdo; x cresce para a direita, y cresce para baixo"\n`
  md += `annotations: ${annotations.length}\n`
  md += `exported_at: ${dateStr}\n`
  md += `exported_by: ${yamlString(username)}\n`
  md += `---\n\n`

  md += `# Especificação de tela: ${inline(descriptor.title)}\n\n`

  md += `## Instruções para a IA\n\n`
  md += `Este documento descreve uma tela de interface e as observações feitas pelo time durante a especificação. Use-o como requisito de implementação.\n\n`
  if (hasMarkers) {
    md += `- A imagem anotada mostra a tela com **marcadores numerados (A1, A2, …)**. Cada marcador corresponde à seção de mesmo ID em "Observações".\n`
  } else {
    md += `- Cada observação tem um ID (A1, A2, …) e uma posição na imagem da tela; use as coordenadas para localizar o elemento visual.\n`
  }
  md += `- Coordenadas estão em **pixels da imagem original (${imgWidth}×${imgHeight})**, com origem (0,0) no canto superior esquerdo; x cresce para a direita e y para baixo. As porcentagens são relativas à largura/altura.\n`
  md += `- "Posição" é o ponto do marcador (centro do retângulo, o próprio ponto, ou o centro de polígonos/desenhos). "Área" são os limites da região marcada.\n`
  md += `- "Requisito" é o que deve ser implementado. "Discussão do time" traz contexto e decisões; em caso de conflito, a mensagem mais recente prevalece.\n`
  md += `- Observações com status **resolvido** já foram atendidas; priorize as **abertas** e **em progresso**.\n`
  md += `- Quando houver seletor CSS ou XPath, ele aponta o elemento correspondente no código.\n\n`

  md += `## Imagem da tela\n\n`
  if (annotatedRef) {
    md += `![${inline(descriptor.title)} — com marcadores das observações](${annotatedRef})\n\n`
    if (originalRef) md += `Imagem original, sem marcações: [${imgName}](${originalRef})\n\n`
  } else if (originalRef) {
    md += `![${inline(descriptor.title)}](${originalRef})\n\n`
    md += `*A imagem acima não contém marcadores; use as coordenadas de cada observação.*\n\n`
  } else {
    md += `*Imagem não anexada a este arquivo (${imgName}, ${imgWidth}×${imgHeight}). Exporte como pacote .zip ou com imagem embutida para incluí-la.*\n\n`
  }

  if (annotations.length === 0) {
    md += `## Observações\n\n*Nenhuma observação registrada nesta tela.*\n\n`
  } else {
    md += `## Resumo das observações\n\n`
    md += `| ID | Título | Tipo | Posição (x, y) px | Região | Status | Prioridade | Estimativa |\n`
    md += `|----|--------|------|-------------------|--------|--------|------------|------------|\n`
    annotations.forEach((ann, idx) => {
      const a = getAnnotationAnchor(ann)
      md += `| ${getAnnotationLabel(idx)} | ${tableCell(ann.title)} | ${TYPE_LABELS[ann.type] ?? ann.type} | (${px(a.x, imgWidth)}, ${px(a.y, imgHeight)}) | ${getScreenRegion(a.x, a.y)} | ${STATUS_LABELS[ann.status] ?? ann.status} | ${ann.priority ? PRIORITY_LABELS[ann.priority] : '—'} | ${ann.estimate_points !== undefined ? `${ann.estimate_points} pts` : '—'} |\n`
    })
    md += `\n## Observações\n\n`

    annotations.forEach((ann, idx) => {
      const label = getAnnotationLabel(idx)
      const a = getAnnotationAnchor(ann)
      const pts = getAnnotationPoints(ann)

      md += `### ${label} — ${inline(ann.title)}\n\n`
      md += `- **Posição:** x=${px(a.x, imgWidth)}, y=${px(a.y, imgHeight)} px (${pct(a.x)}, ${pct(a.y)}) · região: ${getScreenRegion(a.x, a.y)}\n`

      if (ann.type !== 'point' && pts.length > 0) {
        const minX = px(Math.min(...pts.map(p => p.x)), imgWidth)
        const maxX = px(Math.max(...pts.map(p => p.x)), imgWidth)
        const minY = px(Math.min(...pts.map(p => p.y)), imgHeight)
        const maxY = px(Math.max(...pts.map(p => p.y)), imgHeight)
        md += `- **Área (${TYPE_LABELS[ann.type]}):** x=${minX}..${maxX}, y=${minY}..${maxY} (w=${maxX - minX}, h=${maxY - minY})\n`
        if (ann.type === 'polygon') {
          md += `- **Vértices:** ${pts.map(p => `(${px(p.x, imgWidth)}, ${px(p.y, imgHeight)})`).join(', ')}\n`
        }
      }

      const details = [`**Status:** ${STATUS_LABELS[ann.status] ?? ann.status}`]
      if (ann.priority) details.push(`**Prioridade:** ${PRIORITY_LABELS[ann.priority]}`)
      if (ann.estimate_points !== undefined) {
        details.push(`**Estimativa:** ${ann.estimate_points} pts${ann.estimate_source === 'ai_suggestion' ? ' (sugestão IA)' : ''}`)
      }
      md += `- ${details.join(' · ')}\n`
      if (ann.tags && ann.tags.length > 0) md += `- **Tags:** ${ann.tags.join(', ')}\n`
      if (ann.suggested_assignee) md += `- **Responsável sugerido:** ${ann.suggested_assignee}\n`
      if (ann.css_selector) md += `- **Seletor CSS:** \`${ann.css_selector}\`\n`
      if (ann.xpath) md += `- **XPath:** \`${ann.xpath}\`\n`
      md += `\n`

      md += `**Requisito**\n\n`
      md += ann.description?.trim() ? `${ann.description.trim()}\n\n` : `*Sem descrição; baseie-se no título e na discussão.*\n\n`

      if (ann.messages && ann.messages.length > 0) {
        md += `**Discussão do time**\n\n`
        ann.messages.forEach(msg => {
          const time = msg.created_at ? msg.created_at.substring(0, 16).replace('T', ' ') : 'sem data'
          md += `- **${inline(msg.author_name)}** (${time}): ${inline(msg.content)}\n`
        })
        md += `\n`
      }

      md += `---\n\n`
    })
  }

  md += `## Metadados\n\n`
  md += `- Exportado por: ${username}\n`
  md += `- Exportado em: ${dateStr}\n`
  md += `- Versão da imagem: ${imgName} (v${descriptor.image.version || 1})\n`
  md += `- Áreas mais comentadas: ${generateHeatmapSummary(annotations)}\n`

  return md
}
