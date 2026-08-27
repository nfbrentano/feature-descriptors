import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { CanvasViewport } from './components/CanvasViewport'
import { AnnotationSidebar } from './components/AnnotationSidebar'
import { ThreadPanel } from './components/ThreadPanel'
import { ExportModal } from './components/ExportModal'
import { PresentationModal } from './components/PresentationModal'
import { AuthModal } from './components/AuthModal'
import { DescriptorManagerModal } from './components/DescriptorManagerModal'
import { ToastContainer, ToastMessage } from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useDescriptors } from './hooks/useDescriptors'
import { useCanvasState } from './hooks/useCanvasState'

export function App() {
  // Toasts notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback(
    (type: 'success' | 'info' | 'error' | 'warning', title: string, message?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      setToasts(prev => [...prev, { id, type, title, message }])
    },
    []
  )

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Modals visibility state
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isPresentationOpen, setIsPresentationOpen] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isDescriptorsManagerOpen, setIsDescriptorsManagerOpen] = useState(false)

  // Custom Hooks for domain state
  const {
    descriptors,
    currentDescriptor,
    activeDescriptorId,
    setActiveDescriptorId,
    currentUser,
    isSyncing,
    canUndo,
    canRedo,
    undoDescriptors,
    redoDescriptors,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    importAnnotations,
    uploadImage,
    createNewDescriptor,
    removeDescriptor,
    updateUserProfile,
    reloadFromSupabase
  } = useDescriptors(addToast)

  const {
    activeTool,
    setActiveTool,
    selectedAnnotationId,
    setSelectedAnnotationId
  } = useCanvasState()

  // Theme state ('dark' or 'light')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light'
    if (savedTheme) return savedTheme
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    addToast('info', 'Tema alterado', `Modo ${nextTheme === 'dark' ? 'Escuro' : 'Claro'} ativado.`)
  }

  const selectedAnnotation =
    currentDescriptor?.annotations.find(a => a.id === selectedAnnotationId) || null

  const handleCreateAnnotation = (type: any, coords: any) => {
    const newAnn = createAnnotation(type, coords)
    if (newAnn) {
      setSelectedAnnotationId(newAnn.id)
    }
  }

  const handleDeleteAnnotation = (id: string) => {
    deleteAnnotation(id)
    if (selectedAnnotationId === id) {
      setSelectedAnnotationId(null)
    }
  }

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Navigation Header */}
      <Header
        currentDescriptor={currentDescriptor}
        descriptorsCount={descriptors.length}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenPresentation={() => setIsPresentationOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenDescriptorsList={() => setIsDescriptorsManagerOpen(true)}
        onNewDescriptor={() => setIsDescriptorsManagerOpen(true)}
        currentUser={currentUser}
        isSyncing={isSyncing}
        theme={theme}
        onToggleTheme={toggleTheme}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undoDescriptors}
        onRedo={redoDescriptors}
      />

      {/* Main Workspace Layout with Error Boundaries */}
      <main className="app-main">
        {/* Left Sidebar: Annotations list */}
        <ErrorBoundary fallbackTitle="Falha na barra lateral de anotações">
          <AnnotationSidebar
            descriptor={currentDescriptor}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={id => {
              setSelectedAnnotationId(id)
              setActiveTool('select')
            }}
            onAddAnnotationPrompt={() => setActiveTool('bbox')}
            onUpdateAnnotation={updateAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
          />
        </ErrorBoundary>

        {/* Center: Canvas Viewport */}
        <ErrorBoundary fallbackTitle="Erro na renderização do Canvas">
          <CanvasViewport
            descriptor={currentDescriptor}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={setSelectedAnnotationId}
            onCreateAnnotation={handleCreateAnnotation}
            onUploadImage={uploadImage}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undoDescriptors}
            onRedo={redoDescriptors}
            theme={theme}
          />
        </ErrorBoundary>

        {/* Right Sidebar: Discussion & Details */}
        {selectedAnnotation && (
          <ErrorBoundary fallbackTitle="Erro no painel de discussão da anotação">
            <ThreadPanel
              annotation={selectedAnnotation}
              currentUser={currentUser}
              onClose={() => setSelectedAnnotationId(null)}
              onUpdateAnnotation={updateAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
            />
          </ErrorBoundary>
        )}
      </main>

      {/* Application Modals wrapped in ErrorBoundaries */}
      <ErrorBoundary>
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          descriptor={currentDescriptor}
          currentUser={currentUser}
          onImportAnnotations={importAnnotations}
          onShowToast={addToast}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <PresentationModal
          isOpen={isPresentationOpen}
          onClose={() => setIsPresentationOpen(false)}
          descriptor={currentDescriptor}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <DescriptorManagerModal
          isOpen={isDescriptorsManagerOpen}
          onClose={() => setIsDescriptorsManagerOpen(false)}
          descriptors={descriptors}
          activeDescriptorId={activeDescriptorId}
          onSelectDescriptor={id => {
            setActiveDescriptorId(id)
            setSelectedAnnotationId(null)
          }}
          onCreateNewDescriptor={createNewDescriptor}
          onDeleteDescriptor={removeDescriptor}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          currentUser={currentUser}
          onUpdateUser={updateUserProfile}
          onSupabaseConnected={reloadFromSupabase}
        />
      </ErrorBoundary>
    </div>
  )
}

export default App
