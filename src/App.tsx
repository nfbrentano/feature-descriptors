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
import { useHistory } from './lib/history'
import {
  Descriptor,
  Annotation,
  AnnotationType,
  UserProfile,
  ViewTool
} from './types'
import {
  getLocalDescriptors,
  saveLocalDescriptor,
  deleteLocalDescriptor,
  getLocalUser,
  setLocalUser,
  saveSupabaseDescriptor,
  fetchSupabaseDescriptors,
  isSupabaseConfigured,
  MAX_DESCRIPTORS_LIMIT
} from './lib/storage'
import { analyzeAnnotationContent } from './lib/aiHelper'

// Initial mock data matching README example for rich first impression
const createInitialSampleDescriptor = (user: UserProfile): Descriptor => {
  const svgWireframe = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" fill="%230f131a">
    <rect width="1200" height="800" fill="%230c0e14"/>
    <rect x="50" y="40" width="1100" height="70" rx="8" fill="%23171c28" stroke="%232b354f" stroke-width="2"/>
    <circle cx="90" cy="75" r="16" fill="%236366f1"/>
    <rect x="130" y="65" width="140" height="20" rx="4" fill="%2338bdf8"/>
    <rect x="950" y="60" width="160" height="30" rx="6" fill="%236366f1"/>
    
    <!-- Main Card Form -->
    <rect x="250" y="160" width="700" height="560" rx="14" fill="%23151a26" stroke="%232b354f" stroke-width="2"/>
    <text x="300" y="220" fill="%23f1f5f9" font-size="24" font-family="sans-serif" font-weight="bold">Criar Nova Conta</text>
    
    <!-- Input 1: Nome -->
    <text x="300" y="270" fill="%2394a3b8" font-size="14" font-family="sans-serif">Nome Completo</text>
    <rect x="300" y="285" width="600" height="48" rx="8" fill="%230c0e14" stroke="%23334155" stroke-width="1.5"/>
    
    <!-- Input 2: Email -->
    <text x="300" y="370" fill="%2394a3b8" font-size="14" font-family="sans-serif">E-mail Profissional</text>
    <rect x="300" y="385" width="600" height="48" rx="8" fill="%230c0e14" stroke="%23ef4444" stroke-width="2"/>
    <text x="300" y="450" fill="%23f43f5e" font-size="12" font-family="sans-serif">Insira um e-mail válido (ex: nome@empresa.com)</text>
    
    <!-- Input 3: Senha -->
    <text x="300" y="490" fill="%2394a3b8" font-size="14" font-family="sans-serif">Senha de Acesso</text>
    <rect x="300" y="505" width="600" height="48" rx="8" fill="%230c0e14" stroke="%23334155" stroke-width="1.5"/>
    
    <!-- Submit Button -->
    <rect x="300" y="590" width="600" height="52" rx="8" fill="%236366f1"/>
    <text x="560" y="622" fill="%23ffffff" font-size="16" font-family="sans-serif" font-weight="bold">Cadastrar</text>
  </svg>`

  return {
    id: 'desc-cadastro-usuario-demo',
    owner_id: user.id,
    owner_name: user.name,
    title: 'Cadastro de Usuário',
    image: {
      url: svgWireframe,
      name: 'cadastro_v1.png',
      width: 1200,
      height: 800,
      version: 1
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    annotations: [
      {
        id: 'ann-1',
        descriptor_id: 'desc-cadastro-usuario-demo',
        type: 'bbox',
        coords: { x: 0.25, y: 0.46, w: 0.5, h: 0.1 },
        title: 'Campo Email - validação e feedback inline',
        description: 'O campo deve aceitar emails corporativos com subdomínios e exibir erro inline quando formato inválido.',
        tags: ['bug', 'validação'],
        estimate_points: 3,
        estimate_source: 'ai_suggestion',
        suggested_assignee: '@dev-ana',
        css_selector: "#signup-form input[name='email']",
        xpath: "/html/body/div[1]/form/div[2]/input",
        status: 'open',
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        messages: [
          {
            id: 'm1',
            annotation_id: 'ann-1',
            author_id: 'po-1',
            author_name: 'PO (João)',
            content: 'Registrar que o campo deve aceitar emails com subdomínios e exibir erro inline com destaque.',
            created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
            reactions: { '👍': ['po-1'] }
          },
          {
            id: 'm2',
            annotation_id: 'ann-1',
            author_id: 'dev-1',
            author_name: 'Dev (Ana)',
            content: "Ok — qual mensagem de erro exatamente? Sugiro: 'Insira um e-mail válido (ex: nome@exemplo.com)'.",
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
            reactions: { '🚀': ['po-1', 'dev-1'] }
          }
        ]
      },
      {
        id: 'ann-2',
        descriptor_id: 'desc-cadastro-usuario-demo',
        type: 'point',
        coords: { x: 0.5, y: 0.77 },
        title: 'Botão Enviar - estado de loading e spinner',
        description: 'Adicionar feedback visual de loading desabilitando múltiplos cliques durante a requisição.',
        tags: ['enhancement', 'ux'],
        estimate_points: 2,
        estimate_source: 'manual',
        suggested_assignee: '@dev-marcos',
        css_selector: '#signup-form button[type="submit"]',
        status: 'resolved',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
        messages: [
          {
            id: 'm3',
            annotation_id: 'ann-2',
            author_id: 'po-1',
            author_name: 'PO (João)',
            content: 'Adicionar feedback visual de loading com spinner ao submeter.',
            created_at: new Date(Date.now() - 3600000 * 5).toISOString()
          },
          {
            id: 'm4',
            annotation_id: 'ann-2',
            author_id: 'dev-2',
            author_name: 'Dev (Marcos)',
            content: 'Implementado e testado com sucesso! PR #123 enviado.',
            created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
            reactions: { '❤️': ['po-1'] }
          }
        ]
      }
    ]
  }
}

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(getLocalUser)
  
  // Undo/Redo state management with useHistory hook for Descriptors array
  const {
    state: descriptors,
    set: setDescriptors,
    undo: undoDescriptors,
    redo: redoDescriptors,
    reset: resetDescriptorsHistory,
    canUndo,
    canRedo
  } = useHistory<Descriptor[]>([])

  const [activeDescriptorId, setActiveDescriptorId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<ViewTool>('select')
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)

  // Theme state ('dark' or 'light')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light'
    if (savedTheme) return savedTheme
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
  })

  // Toasts state
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

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isPresentationOpen, setIsPresentationOpen] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isDescriptorsManagerOpen, setIsDescriptorsManagerOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Initialize Descriptors & apply theme attribute to root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    addToast('info', 'Tema alterado', `Modo ${nextTheme === 'dark' ? 'Escuro' : 'Claro'} ativado.`)
  }

  useEffect(() => {
    const user = getLocalUser()
    setCurrentUser(user)

    const saved = getLocalDescriptors()
    if (saved && saved.length > 0) {
      resetDescriptorsHistory(saved)
      setActiveDescriptorId(saved[0].id)
    } else {
      const initial = createInitialSampleDescriptor(user)
      saveLocalDescriptor(initial)
      resetDescriptorsHistory([initial])
      setActiveDescriptorId(initial.id)
    }
  }, [resetDescriptorsHistory])

  // Active descriptor object
  const currentDescriptor = descriptors.find(d => d.id === activeDescriptorId) || descriptors[0] || null
  const selectedAnnotation = currentDescriptor?.annotations.find(a => a.id === selectedAnnotationId) || null

  // Auto sync function with localStorage & Supabase
  const syncDescriptor = useCallback(
    async (updated: Descriptor, recordHistory = true) => {
      if (recordHistory) {
        setDescriptors(prev => prev.map(d => (d.id === updated.id ? updated : d)))
      }

      saveLocalDescriptor(updated)

      if (isSupabaseConfigured()) {
        setIsSyncing(true)
        await saveSupabaseDescriptor(updated, currentUser)
        setIsSyncing(false)
      }
    },
    [currentUser, setDescriptors]
  )

  // Create new annotation
  const handleCreateAnnotation = (type: AnnotationType, coords: any) => {
    if (!currentDescriptor) return

    const count = currentDescriptor.annotations.length + 1
    const defaultTitle = `Nova Anotação A${count}`

    const analysis = analyzeAnnotationContent(defaultTitle)

    const newAnnotation: Annotation = {
      id: 'ann-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      descriptor_id: currentDescriptor.id,
      type,
      coords,
      title: defaultTitle,
      description: '',
      tags: analysis.suggestedTags,
      estimate_points: analysis.suggestedEstimate,
      estimate_source: 'ai_suggestion',
      status: 'open',
      owner_id: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: []
    }

    const updatedDescriptor = {
      ...currentDescriptor,
      annotations: [...currentDescriptor.annotations, newAnnotation],
      updated_at: new Date().toISOString()
    }

    syncDescriptor(updatedDescriptor)
    setSelectedAnnotationId(newAnnotation.id)
    addToast('success', 'Anotação criada!', `Nova anotação A${count} adicionada.`)
  }

  // Update existing annotation
  const handleUpdateAnnotation = (updatedAnnotation: Annotation) => {
    if (!currentDescriptor) return

    const updatedAnnotations = currentDescriptor.annotations.map(a =>
      a.id === updatedAnnotation.id ? updatedAnnotation : a
    )

    const updatedDescriptor = {
      ...currentDescriptor,
      annotations: updatedAnnotations,
      updated_at: new Date().toISOString()
    }

    syncDescriptor(updatedDescriptor)
  }

  // Delete annotation
  const handleDeleteAnnotation = (id: string) => {
    if (!currentDescriptor) return

    const updatedAnnotations = currentDescriptor.annotations.filter(a => a.id !== id)
    const updatedDescriptor = {
      ...currentDescriptor,
      annotations: updatedAnnotations,
      updated_at: new Date().toISOString()
    }

    syncDescriptor(updatedDescriptor)
    if (selectedAnnotationId === id) {
      setSelectedAnnotationId(null)
    }
    addToast('info', 'Anotação removida')
  }

  // Import annotations
  const handleImportAnnotations = (newAnnotations: Annotation[]) => {
    if (!currentDescriptor) return

    const updatedDescriptor = {
      ...currentDescriptor,
      annotations: [...currentDescriptor.annotations, ...newAnnotations],
      updated_at: new Date().toISOString()
    }

    syncDescriptor(updatedDescriptor)
  }

  // Upload/Paste image to current or new descriptor
  const handleUploadImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      if (!dataUrl) return

      const img = new Image()
      img.src = dataUrl
      img.onload = () => {
        if (!currentDescriptor) {
          handleCreateNewDescriptor(file.name.replace(/\.[^/.]+$/, ''), file)
          return
        }

        const updatedDescriptor: Descriptor = {
          ...currentDescriptor,
          image: {
            url: dataUrl,
            name: file.name,
            width: img.naturalWidth,
            height: img.naturalHeight,
            version: (currentDescriptor.image.version || 1) + 1
          },
          updated_at: new Date().toISOString()
        }

        syncDescriptor(updatedDescriptor)
        addToast('success', 'Imagem Carregada', `Imagem ${file.name} aplicada com sucesso!`)
      }
    }
    reader.readAsDataURL(file)
  }

  // Create new Descriptor
  const handleCreateNewDescriptor = (title: string, file?: File) => {
    if (descriptors.length >= MAX_DESCRIPTORS_LIMIT) {
      addToast(
        'warning',
        'Limite de Imagens',
        `Limite de ${MAX_DESCRIPTORS_LIMIT} imagens atingido! Remova uma tela antiga primeiro.`
      )
      return
    }

    const newId = 'desc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)

    const init = (imageUrl: string, width = 1200, height = 800, name = 'tela.png') => {
      const newDesc: Descriptor = {
        id: newId,
        owner_id: currentUser.id,
        owner_name: currentUser.name,
        title,
        image: {
          url: imageUrl,
          name,
          width,
          height,
          version: 1
        },
        annotations: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const saveRes = saveLocalDescriptor(newDesc)
      if (!saveRes.success) {
        addToast('error', 'Erro ao salvar', saveRes.error)
        return
      }

      setDescriptors(prev => [newDesc, ...prev])
      setActiveDescriptorId(newDesc.id)
      setSelectedAnnotationId(null)
      addToast('success', 'Novo Descritivo Criado', `Descritivo "${title}" pronto para uso.`)
    }

    if (file) {
      const reader = new FileReader()
      reader.onload = ev => {
        const url = ev.target?.result as string
        const img = new Image()
        img.src = url
        img.onload = () => init(url, img.naturalWidth, img.naturalHeight, file.name)
      }
      reader.readAsDataURL(file)
    } else {
      init('')
    }
  }

  // Delete descriptor
  const handleDeleteDescriptor = (id: string) => {
    deleteLocalDescriptor(id)
    const remaining = descriptors.filter(d => d.id !== id)
    setDescriptors(remaining)
    if (activeDescriptorId === id) {
      setActiveDescriptorId(remaining[0]?.id || null)
      setSelectedAnnotationId(null)
    }
    addToast('info', 'Descritivo Excluído')
  }

  // Handle user profile update
  const handleUpdateUser = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser)
    setLocalUser(updatedUser)
    addToast('success', 'Perfil Atualizado')
  }

  // Fetch from Supabase when connected
  const handleSupabaseConnected = async () => {
    setIsSyncing(true)
    const list = await fetchSupabaseDescriptors(currentUser.id)
    if (list && list.length > 0) {
      setDescriptors(list)
      setActiveDescriptorId(list[0].id)
    }
    setIsSyncing(false)
    addToast('success', 'Supabase Conectado', 'Anotações sincronizadas com a nuvem.')
  }

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Navbar */}
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

      {/* Main workspace */}
      <main className="app-main">
        {/* Left Sidebar: Annotations list */}
        <AnnotationSidebar
          descriptor={currentDescriptor}
          selectedAnnotationId={selectedAnnotationId}
          onSelectAnnotation={id => {
            setSelectedAnnotationId(id)
            setActiveTool('select')
          }}
          onAddAnnotationPrompt={() => setActiveTool('bbox')}
        />

        {/* Center: Canvas Viewport */}
        <CanvasViewport
          descriptor={currentDescriptor}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          selectedAnnotationId={selectedAnnotationId}
          onSelectAnnotation={setSelectedAnnotationId}
          onCreateAnnotation={handleCreateAnnotation}
          onUploadImage={handleUploadImage}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undoDescriptors}
          onRedo={redoDescriptors}
          theme={theme}
        />

        {/* Right Sidebar: Discussion & Details */}
        {selectedAnnotation && (
          <ThreadPanel
            annotation={selectedAnnotation}
            currentUser={currentUser}
            onClose={() => setSelectedAnnotationId(null)}
            onUpdateAnnotation={handleUpdateAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
          />
        )}
      </main>

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        descriptor={currentDescriptor}
        currentUser={currentUser}
        onImportAnnotations={handleImportAnnotations}
        onShowToast={addToast}
      />

      <PresentationModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        descriptor={currentDescriptor}
      />

      <DescriptorManagerModal
        isOpen={isDescriptorsManagerOpen}
        onClose={() => setIsDescriptorsManagerOpen(false)}
        descriptors={descriptors}
        activeDescriptorId={activeDescriptorId}
        onSelectDescriptor={id => {
          setActiveDescriptorId(id)
          setSelectedAnnotationId(null)
        }}
        onCreateNewDescriptor={handleCreateNewDescriptor}
        onDeleteDescriptor={handleDeleteDescriptor}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        onSupabaseConnected={handleSupabaseConnected}
      />
    </div>
  )
}

export default App
