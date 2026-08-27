import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center p-8 m-4 rounded-xl bg-slate-900/90 border border-rose-500/30 text-slate-200 shadow-2xl backdrop-blur-md"
        >
          <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 mb-4 border border-rose-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">
            {this.props.fallbackTitle || 'Algo deu errado nesta seção'}
          </h2>
          <p className="text-sm text-slate-400 text-center max-w-md mb-6">
            {this.props.fallbackMessage ||
              this.state.error?.message ||
              'Ocorreu uma falha inesperada na interface. Você pode tentar recarregar esta parte da aplicação.'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
