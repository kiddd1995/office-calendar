import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AlertTriangle, LockKeyhole, LogIn, Mail } from 'lucide-react'
import {
  getSupabaseClient,
  supabaseConfigurationError,
} from '../lib/supabaseClient'

interface AdminLoginProps {
  onAuthenticated: (session: Session) => void
}

export function AdminLogin({ onAuthenticated }: AdminLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting || supabaseConfigurationError) return
    if (!email.trim()) {
      setError('請輸入 Email')
      return
    }
    if (!password) {
      setError('請輸入 Password')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const { data, error: signInError } = await getSupabaseClient().auth
        .signInWithPassword({
          email: email.trim(),
          password,
        })

      if (signInError || !data.session) {
        setPassword('')
        setError('登入失敗，請檢查 Email 與 Password 是否正確。')
        return
      }

      setPassword('')
      onAuthenticated(data.session)
    } catch {
      setPassword('')
      setError('登入服務暫時無法連線，請稍後再試。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="admin-login-card">
      <span className="admin-login-icon"><LockKeyhole size={23} /></span>
      <span className="eyebrow">ADMIN ACCESS</span>
      <h2>管理員登入</h2>
      <p>使用 Supabase 管理員帳號登入後管理課程活動。</p>

      {supabaseConfigurationError ? (
        <div className="admin-config-warning" role="alert">
          <AlertTriangle size={18} />
          <span>
            <strong>Supabase 尚未完成設定</strong>
            <small>{supabaseConfigurationError}</small>
          </span>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <label htmlFor="admin-email">Email</label>
          <div className="admin-input-wrap">
            <Mail size={16} />
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
              }}
              autoComplete="username"
              aria-invalid={Boolean(error)}
              autoFocus
            />
          </div>
          <label htmlFor="admin-password">Password</label>
          <div className="admin-input-wrap">
            <LockKeyhole size={16} />
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
            />
          </div>
          {error && <small className="admin-login-error" role="alert">{error}</small>}
          <button type="submit" className="primary-button" disabled={submitting}>
            <LogIn size={17} />{submitting ? '登入中…' : '登入編輯頁'}
          </button>
        </form>
      )}
    </section>
  )
}
