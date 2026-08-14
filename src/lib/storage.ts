import { Descriptor, UserProfile } from '../types'
import { getSupabase, isSupabaseConfigured } from './supabase'

export { isSupabaseConfigured }

const LOCAL_STORAGE_KEY = 'feature_descriptors_docs_v1'
const LOCAL_USER_KEY = 'feature_descriptors_current_user'

export const MAX_DESCRIPTORS_LIMIT = 5

export const getLocalUser = (): UserProfile => {
  const saved = localStorage.getItem(LOCAL_USER_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      // ignore
    }
  }
  const defaultUser: UserProfile = {
    id: 'local-user-' + Math.random().toString(36).substring(2, 9),
    email: 'local@demo.local',
    name: 'Usuário Local'
  }
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(defaultUser))
  return defaultUser
}

export const setLocalUser = (user: UserProfile) => {
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user))
}

// Local Storage helpers
export const getLocalDescriptors = (): Descriptor[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch (e) {
    console.error('Failed to parse local descriptors', e)
    return []
  }
}

export const saveLocalDescriptor = (descriptor: Descriptor): { success: boolean; error?: string } => {
  const list = getLocalDescriptors()
  const index = list.findIndex(d => d.id === descriptor.id)

  if (index >= 0) {
    list[index] = { ...descriptor, updated_at: new Date().toISOString() }
  } else {
    // Check limit
    if (list.length >= MAX_DESCRIPTORS_LIMIT) {
      return {
        success: false,
        error: `Limite de ${MAX_DESCRIPTORS_LIMIT} imagens/descritivos atingido. Remova um descritivo antigo para adicionar um novo.`
      }
    }
    list.unshift({ ...descriptor, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list))
  return { success: true }
}

export const deleteLocalDescriptor = (id: string) => {
  const list = getLocalDescriptors().filter(d => d.id !== id)
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list))
}

// Supabase Async Storage functions
export const fetchSupabaseDescriptors = async (_userId: string): Promise<Descriptor[]> => {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data: descData, error: descErr } = await supabase
    .from('descriptors')
    .select('*')
    .order('updated_at', { ascending: false })

  if (descErr || !descData) {
    console.error('Error fetching descriptors from Supabase:', descErr)
    return []
  }

  // For each descriptor, fetch annotations and messages
  const result: Descriptor[] = []
  for (const d of descData) {
    const { data: annData } = await supabase
      .from('annotations')
      .select('*')
      .eq('descriptor_id', d.id)
      .order('created_at', { ascending: true })

    const annotationsWithMessages = []
    if (annData) {
      for (const a of annData) {
        const { data: msgData } = await supabase
          .from('messages')
          .select('*')
          .eq('annotation_id', a.id)
          .order('created_at', { ascending: true })

        annotationsWithMessages.push({
          id: a.id,
          descriptor_id: a.descriptor_id,
          type: a.type,
          coords: a.coords,
          title: a.title || 'Anotação',
          tags: a.tags || [],
          estimate_points: a.estimate_points,
          css_selector: a.css_selector,
          xpath: a.xpath,
          status: a.status || 'open',
          owner_id: a.owner_id,
          created_at: a.created_at,
          updated_at: a.updated_at,
          messages: (msgData || []).map(m => ({
            id: m.id,
            annotation_id: m.annotation_id,
            author_id: m.author_id,
            author_name: m.meta?.author_name || 'Colaborador',
            content: m.content,
            created_at: m.created_at,
            reactions: m.meta?.reactions || {}
          }))
        })
      }
    }

    result.push({
      id: d.id,
      owner_id: d.owner_id,
      owner_name: d.metadata?.createdBy || 'Autor',
      title: d.title,
      image: {
        url: d.image_path || '',
        name: d.metadata?.image_name || 'imagem.png',
        width: d.metadata?.image_width || 1200,
        height: d.metadata?.image_height || 800,
        version: d.image_version || 1,
        path: d.image_path
      },
      annotations: annotationsWithMessages,
      metadata: d.metadata || {},
      created_at: d.created_at,
      updated_at: d.updated_at
    })
  }

  return result
}

export const saveSupabaseDescriptor = async (
  descriptor: Descriptor,
  user: UserProfile
): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabase()
  if (!supabase) {
    return saveLocalDescriptor(descriptor)
  }

  try {
    // 1. Check count if inserting new
    const { count } = await supabase
      .from('descriptors')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)

    // Check if descriptor already exists
    const { data: existing } = await supabase
      .from('descriptors')
      .select('id')
      .eq('id', descriptor.id)
      .maybeSingle()

    if (!existing && count !== null && count >= MAX_DESCRIPTORS_LIMIT) {
      return {
        success: false,
        error: `Limite de ${MAX_DESCRIPTORS_LIMIT} imagens por usuário atingido no banco de dados.`
      }
    }

    // 2. Upsert descriptor
    const { error: descError } = await supabase
      .from('descriptors')
      .upsert({
        id: descriptor.id,
        owner_id: user.id,
        title: descriptor.title,
        image_path: descriptor.image.url,
        image_version: descriptor.image.version || 1,
        metadata: {
          ...descriptor.metadata,
          createdBy: user.name,
          image_name: descriptor.image.name,
          image_width: descriptor.image.width,
          image_height: descriptor.image.height
        },
        updated_at: new Date().toISOString()
      })

    if (descError) {
      return { success: false, error: descError.message }
    }

    // 3. Upsert annotations
    for (const ann of descriptor.annotations) {
      const { error: annError } = await supabase
        .from('annotations')
        .upsert({
          id: ann.id,
          descriptor_id: descriptor.id,
          type: ann.type,
          coords: ann.coords,
          title: ann.title,
          tags: ann.tags,
          estimate_points: ann.estimate_points,
          css_selector: ann.css_selector,
          xpath: ann.xpath,
          status: ann.status,
          owner_id: ann.owner_id || user.id,
          updated_at: new Date().toISOString()
        })

      if (annError) {
        console.error('Error saving annotation:', annError)
      }

      // 4. Upsert messages
      for (const msg of ann.messages) {
        const { error: msgError } = await supabase
          .from('messages')
          .upsert({
            id: msg.id,
            annotation_id: ann.id,
            author_id: msg.author_id || user.id,
            content: msg.content,
            meta: {
              author_name: msg.author_name,
              reactions: msg.reactions || {}
            }
          })
        if (msgError) console.error('Error saving message:', msgError)
      }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao sincronizar com Supabase' }
  }
}
