import React, { useState } from 'react'
import { X, Database, Key, Globe, User, CheckCircle2, AlertCircle } from 'lucide-react'
import { UserProfile } from '../types'
import { setSupabaseCustomConfig, isSupabaseConfigured, getSupabase } from '../lib/supabase'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: UserProfile
  onUpdateUser: (user: UserProfile) => void
  onSupabaseConnected: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onSupabaseConnected
}) => {
  const [userName, setUserName] = useState(currentUser.name)
  const [userEmail, setUserEmail] = useState(currentUser.email)
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem('feature_descriptors_supabase_url') || ''
  )
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(
    localStorage.getItem('feature_descriptors_supabase_key') || ''
  )
  const [connStatus, setConnStatus] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  if (!isOpen) return null

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdateUser({
      ...currentUser,
      name: userName.trim() || 'Usuário',
      email: userEmail.trim() || 'usuario@empresa.com'
    })
    setConnStatus('Perfil atualizado com sucesso!')
    setIsError(false)
  }

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnStatus('Testando conexão com Supabase...')
    setIsError(false)

    try {
      setSupabaseCustomConfig(supabaseUrl.trim(), supabaseAnonKey.trim())
      const client = getSupabase()
      if (!client) {
        throw new Error('Não foi possível inicializar o cliente Supabase.')
      }

      const { error } = await client.from('descriptors').select('id').limit(1)
      if (error) {
        throw error
      }

      setConnStatus('Conexão com Supabase estabelecida com sucesso!')
      setIsError(false)
      onSupabaseConnected()
    } catch (err: any) {
      setIsError(true)
      setConnStatus('Erro na conexão: ' + (err.message || 'Verifique URL e Anon Key'))
    }
  }

  const hasConfig = isSupabaseConfigured()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} className="text-primary" />
            <h3 className="modal-title">Configurações & Conexão Supabase</h3>
          </div>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User Profile Form */}
          <form onSubmit={handleSaveProfile} className="thread-meta-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <User size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Identificação do Autor</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="meta-field">
                <label className="meta-label">Seu Nome / Cargo</label>
                <input
                  type="text"
                  className="meta-input"
                  value={userName}
                  placeholder="Ex: Natanael Brentano (PO)"
                  onChange={e => setUserName(e.target.value)}
                />
              </div>

              <div className="meta-field">
                <label className="meta-label">E-mail</label>
                <input
                  type="email"
                  className="meta-input"
                  value={userEmail}
                  placeholder="seu.email@empresa.com"
                  onChange={e => setUserEmail(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="submit" className="btn btn-secondary" style={{ fontSize: '0.78rem' }}>
                Salvar Identificação
              </button>
            </div>
          </form>

          {/* Supabase Config Form */}
          <form onSubmit={handleSaveSupabaseConfig} className="thread-meta-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Database size={16} style={{ color: hasConfig ? '#10b981' : 'var(--text-muted)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Conexão Supabase</span>
              </div>
              <span
                style={{
                  fontSize: '0.74rem',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: hasConfig ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                  color: hasConfig ? '#34d399' : '#94a3b8'
                }}
              >
                {hasConfig ? 'Configurado' : 'Modo Offline (LocalStorage)'}
              </span>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Insira as credenciais do seu projeto Supabase para sincronização em nuvem e limite de até 5 telas com comentários ilimitados.
            </p>

            <div className="meta-field" style={{ marginBottom: '10px' }}>
              <label className="meta-label">
                <Globe size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Project URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="text"
                className="meta-input"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
              />
            </div>

            <div className="meta-field" style={{ marginBottom: '14px' }}>
              <label className="meta-label">
                <Key size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Anon / Public API Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <input
                type="password"
                className="meta-input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseAnonKey}
                onChange={e => setSupabaseAnonKey(e.target.value)}
              />
            </div>

            {connStatus && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isError ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                  color: isError ? '#fb7185' : '#34d399'
                }}
              >
                {isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                <span>{connStatus}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
                Conectar e Validar
              </button>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
