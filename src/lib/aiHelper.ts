export interface AiAnalysisResult {
  suggestedTags: string[]
  suggestedEstimate: number
  rationale: string
  confidence: number
}

/**
 * Heuristic/AI classifier that analyzes title, description, and comments
 * to recommend tags (bug, ux, enhancement, api, validation) and story points.
 */
export function analyzeAnnotationContent(
  title: string,
  description: string = '',
  messages: string[] = []
): AiAnalysisResult {
  const fullText = `${title} ${description} ${messages.join(' ')}`.toLowerCase()
  const tags: Set<string> = new Set()

  let points = 2
  let rationale = 'Esforço padrão para ajuste visual ou funcionalidade simples.'

  // Tag classification heuristics
  if (fullText.match(/erro|bug|quebr|falha|crash|não funciona|invalid|exception|invalido|validação|validacao/)) {
    tags.add('bug')
    if (fullText.match(/validação|validacao|email|campo|regex|obrigatorio/)) {
      tags.add('validação')
    }
  }

  if (fullText.match(/layout|cor|espaçamento|fonte|alinhamento|ux|ui|design|responsiv|mobile|visual|hover|animação|loading/)) {
    tags.add('ux')
    if (fullText.match(/loading|spinner|feedback/)) {
      tags.add('enhancement')
    }
  }

  if (fullText.match(/novo|adicionar|criar|recurso|funcionalidade|enhancement|melhoria|suporte/)) {
    tags.add('enhancement')
  }

  if (fullText.match(/api|backend|endpoint|banco|sql|query|payload|requisição|supabase|autenticação/)) {
    tags.add('backend')
    tags.add('api')
  }

  if (fullText.match(/segurança|permissão|auth|login|token|rls/)) {
    tags.add('security')
  }

  // Estimate point heuristics
  if (tags.has('backend') || fullText.match(/complexo|refator|migração|arquitetura/)) {
    points = 5
    rationale = 'Demanda alterações de lógica, banco de dados ou integração entre serviços.'
  } else if (tags.has('bug') && tags.has('validação')) {
    points = 3
    rationale = 'Ajuste de validação e feedback inline no formulário.'
  } else if (tags.has('ux') && !tags.has('backend')) {
    points = 2
    rationale = 'Ajuste pontual de estilo/interface ou micro-interação.'
  } else if (tags.has('enhancement')) {
    points = 3
    rationale = 'Nova funcionalidade ou melhoria com fluxo de interação.'
  }

  if (tags.size === 0) {
    tags.add('enhancement')
  }

  return {
    suggestedTags: Array.from(tags),
    suggestedEstimate: points,
    rationale,
    confidence: 0.88
  }
}
