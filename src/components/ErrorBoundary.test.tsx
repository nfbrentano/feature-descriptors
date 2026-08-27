import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Erro de teste simulado')
  }
  return <div>Conteúdo Normal</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Filho Funcional</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Filho Funcional')).toBeInTheDocument()
  })

  it('renders fallback alert and allows retry when an error is caught', () => {
    // Suppress console.error and window error events during expected error throwing
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const errorHandler = (event: Event) => {
      event.preventDefault()
    }
    window.addEventListener('error', errorHandler)

    try {
      const { rerender } = render(
        <ErrorBoundary fallbackTitle="Erro no Teste">
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Erro no Teste')).toBeInTheDocument()
      expect(screen.getByText('Erro de teste simulado')).toBeInTheDocument()

      const retryButton = screen.getByText('Tentar Novamente')
      expect(retryButton).toBeInTheDocument()

      // Rerender with normal child and click retry
      rerender(
        <ErrorBoundary fallbackTitle="Erro no Teste">
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      )

      fireEvent.click(retryButton)
      expect(screen.getByText('Conteúdo Normal')).toBeInTheDocument()
    } finally {
      window.removeEventListener('error', errorHandler)
      spy.mockRestore()
    }
  })
})
