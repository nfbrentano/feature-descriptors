import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Try reading from window/localStorage or Vite env
const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const localUrl = localStorage.getItem('feature_descriptors_supabase_url')
  const localKey = localStorage.getItem('feature_descriptors_supabase_key')

  return {
    url: localUrl || envUrl || '',
    key: localKey || envKey || ''
  }
}

let supabaseInstance: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient | null => {
  const { url, key } = getSupabaseConfig()
  if (!url || !key) return null

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key)
    } catch (e) {
      console.error('Failed to initialize Supabase client', e)
      return null
    }
  }
  return supabaseInstance
}

export const setSupabaseCustomConfig = (url: string, key: string) => {
  localStorage.setItem('feature_descriptors_supabase_url', url)
  localStorage.setItem('feature_descriptors_supabase_key', key)
  supabaseInstance = null
  return getSupabase()
}

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseConfig()
  return Boolean(url && key)
}
