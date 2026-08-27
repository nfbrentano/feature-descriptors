import { describe, it, expect } from 'vitest'
import { analyzeAnnotationContent } from './aiHelper'

describe('aiHelper analyzeAnnotationContent', () => {
  it('classifies bug and validation issues and estimates points', () => {
    const result = analyzeAnnotationContent(
      'Erro no campo de email',
      'Validação de regex falha ao inserir domínio com traço.',
      ['O formulário trava e não envia.']
    )

    expect(result.suggestedTags).toContain('bug')
    expect(result.suggestedTags).toContain('validação')
    expect(result.suggestedEstimate).toBe(3)
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('classifies backend/api tasks with higher story point estimates', () => {
    const result = analyzeAnnotationContent(
      'Integrar endpoint de autenticação',
      'Criar rota no backend com autenticação Supabase e query de permissão RLS.'
    )

    expect(result.suggestedTags).toContain('backend')
    expect(result.suggestedTags).toContain('api')
    expect(result.suggestedEstimate).toBe(5)
  })

  it('classifies visual and styling adjustments as UX with 2 points', () => {
    const result = analyzeAnnotationContent(
      'Ajustar cor e espaçamento do botão',
      'O hover está sem contraste no modo escuro e o alinhamento está torto.'
    )

    expect(result.suggestedTags).toContain('ux')
    expect(result.suggestedEstimate).toBe(2)
  })
})
