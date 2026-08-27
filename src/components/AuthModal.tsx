import React, { useState } from 'react'
import { X, Database, Key, Globe, User, CheckCircle2, AlertCircle } from 'lucide-react'
import { UserProfile } from '../types'
import { setSupabaseCustomConfig, isSupabaseConfigured, getSupabase } from '../lib/supabase'
import { useFocusTrap } from '../hooks/useFocusTrap'

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
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose })
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

      setConnStatus('Conectado com sucesso ao Supabase!')
      setIsError(false)
      onSupabaseConnected()
    } catch (err: any) {
      console.error('Supabase connection test failed', err)
      setConnStatus(`Falha na conexão: ${err.message || 'Verifique URL e Key'}`)
      setIsError(true)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '540px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} className="text-primary" />
            <h3 id="auth-modal-title" className="modal-title">Perfil & Sincronização em Nuvem</h3>
          </div>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose} aria-label="Fechar modal">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User profile form */}
          <form onSubmit={handleSaveProfile} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <User size={16} className="text-primary" />
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Identificação do Colaborador</h4>
            </div>

            <div className="meta-field" style={{ marginBottom: '10px' }}>
              <label className="meta-label">Seu Nome / Apelido</label>
              <input
                type="text"
                className="meta-input"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="Ex: Ana Silva (Dev Frontend)"
                required
              />
            </div>

            <div className="meta-field" style={{ marginBottom: '12px' }}>
              <label className="meta-label">Seu E-mail Corporativo</label>
              <input
                type="email"
                className="meta-input"
                value={userEmail}
                onChange={e => setUserEmail(e.target.value)}
                placeholder="ana.silva@empresa.com"
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                Salvar Perfil
              </button>
            </div>
          </form>

          {/* Supabase config form */}
          <form onSubmit={handleSaveSupabaseConfig} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Database size={16} className="text-primary" />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Configuração Supabase (Opcional)</h4>
              </div>
              {isSupabaseConfigured() && (
                <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Configurado
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Por padrão, seus descritivos ficam salvos com segurança localmente. Insira as credenciais do seu projeto Supabase para habilitar sincronização em nuvem e colaboração em tempo real.
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
                role="status"
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
