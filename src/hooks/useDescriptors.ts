import { useState, useEffect, useCallback } from 'react'
import {
  Descriptor,
  Annotation,
  AnnotationType,
  UserProfile
} from '../types'
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
} from '../lib/storage'
import { getSupabase } from '../lib/supabase'
import { useHistory } from '../lib/history'
import { analyzeAnnotationContent } from '../lib/aiHelper'
import { withRetry } from '../lib/retry'

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

export function useDescriptors(
  onShowToast: (type: 'success' | 'info' | 'error' | 'warning', title: string, message?: string) => void
) {
  const [currentUser, setCurrentUser] = useState<UserProfile>(getLocalUser)
  const [activeDescriptorId, setActiveDescriptorId] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRealtimeSyncing, setIsRealtimeSyncing] = useState(false)

  const {
    state: descriptors,
    set: setDescriptors,
    undo: undoDescriptors,
    redo: redoDescriptors,
    reset: resetDescriptorsHistory,
    canUndo,
    canRedo
  } = useHistory<Descriptor[]>([])

  // Load initial data
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

  const currentDescriptor = descriptors.find(d => d.id === activeDescriptorId) || descriptors[0] || null

  const syncDescriptor = useCallback(
    async (updated: Descriptor, recordHistory = true) => {
      if (recordHistory) {
        setDescriptors(prev => prev.map(d => (d.id === updated.id ? updated : d)))
      }

      saveLocalDescriptor(updated)

      if (isSupabaseConfigured()) {
        setIsSyncing(true)
        try {
          await withRetry(() => saveSupabaseDescriptor(updated, currentUser), { maxRetries: 2 })
        } catch (err: any) {
          console.error('Supabase sync error:', err)
        } finally {
          setIsSyncing(false)
        }
      }
    },
    [currentUser, setDescriptors]
  )

  const createAnnotation = useCallback(
    (type: AnnotationType, coords: any) => {
      if (!currentDescriptor) return null

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
      onShowToast('success', 'Anotação criada!', `Nova anotação A${count} adicionada.`)
      return newAnnotation
    },
    [currentDescriptor, currentUser.id, syncDescriptor, onShowToast]
  )

  const updateAnnotation = useCallback(
    (updatedAnnotation: Annotation) => {
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
    },
    [currentDescriptor, syncDescriptor]
  )

  const deleteAnnotation = useCallback(
    (id: string) => {
      if (!currentDescriptor) return

      const updatedAnnotations = currentDescriptor.annotations.filter(a => a.id !== id)
      const updatedDescriptor = {
        ...currentDescriptor,
        annotations: updatedAnnotations,
        updated_at: new Date().toISOString()
      }

      syncDescriptor(updatedDescriptor)
      onShowToast('info', 'Anotação removida')
    },
    [currentDescriptor, syncDescriptor, onShowToast]
  )

  const importAnnotations = useCallback(
    (newAnnotations: Annotation[]) => {
      if (!currentDescriptor) return

      const updatedDescriptor = {
        ...currentDescriptor,
        annotations: [...currentDescriptor.annotations, ...newAnnotations],
        updated_at: new Date().toISOString()
      }

      syncDescriptor(updatedDescriptor)
    },
    [currentDescriptor, syncDescriptor]
  )

  const uploadImage = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = e => {
        const dataUrl = e.target?.result as string
        if (!dataUrl) return

        const img = new Image()
        img.src = dataUrl
        img.onload = () => {
          if (!currentDescriptor) return

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
          onShowToast('success', 'Imagem Carregada', `Imagem ${file.name} aplicada com sucesso!`)
        }
      }
      reader.readAsDataURL(file)
    },
    [currentDescriptor, syncDescriptor, onShowToast]
  )

  const createNewDescriptor = useCallback(
    (title: string, file?: File) => {
      if (descriptors.length >= MAX_DESCRIPTORS_LIMIT) {
        onShowToast(
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
          onShowToast('error', 'Erro ao salvar', saveRes.error)
          return
        }

        setDescriptors(prev => [newDesc, ...prev])
        setActiveDescriptorId(newDesc.id)
        onShowToast('success', 'Novo Descritivo Criado', `Descritivo "${title}" pronto para uso.`)
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
    },
    [descriptors.length, currentUser, onShowToast, setDescriptors]
  )

  const removeDescriptor = useCallback(
    (id: string) => {
      deleteLocalDescriptor(id)
      const remaining = descriptors.filter(d => d.id !== id)
      setDescriptors(remaining)
      if (activeDescriptorId === id) {
        setActiveDescriptorId(remaining[0]?.id || null)
      }
      onShowToast('info', 'Descritivo Excluído')
    },
    [descriptors, activeDescriptorId, onShowToast, setDescriptors]
  )

  const updateUserProfile = useCallback(
    (updatedUser: UserProfile) => {
      setCurrentUser(updatedUser)
      setLocalUser(updatedUser)
      onShowToast('success', 'Perfil Atualizado')
    },
    [onShowToast]
  )

  const reloadFromSupabase = useCallback(async (silent = false) => {
    if (!silent) setIsSyncing(true)
    else setIsRealtimeSyncing(true)
    try {
      const list = await fetchSupabaseDescriptors(currentUser.id)
      if (list && list.length > 0) {
        // Only override if there are actually changes, or just trust the new state
        setDescriptors(list)
        if (!silent) {
          setActiveDescriptorId(list[0].id)
          onShowToast('success', 'Supabase Conectado', 'Anotações sincronizadas com a nuvem.')
        }
      }
    } catch (err: any) {
      if (!silent) onShowToast('error', 'Erro de Sincronização', err.message)
    } finally {
      if (!silent) setIsSyncing(false)
      else setIsRealtimeSyncing(false)
    }
  }, [currentUser.id, onShowToast, setDescriptors])

  // Supabase Realtime Subscriptions
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase || !isSupabaseConfigured()) return

    let timeoutId: ReturnType<typeof setTimeout>

    const handleRealtimeEvent = (payload: any) => {
      console.log('Realtime change received:', payload)
      // Debounce the reload to avoid hammering the database
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        reloadFromSupabase(true)
      }, 500)
    }

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'annotations' }, handleRealtimeEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, handleRealtimeEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'descriptors' }, handleRealtimeEvent)
      .subscribe()

    return () => {
      clearTimeout(timeoutId)
      supabase.removeChannel(channel)
    }
  }, [reloadFromSupabase])

  return {
    descriptors,
    currentDescriptor,
    activeDescriptorId,
    setActiveDescriptorId,
    currentUser,
    isSyncing: isSyncing || isRealtimeSyncing,
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
  }
}
