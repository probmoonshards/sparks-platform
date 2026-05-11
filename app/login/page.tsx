'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { sb } from '@/lib/supabase'
import { CLASSES, Session, setSession } from '@/lib/constants'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', className: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.className) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    try {
      const session: Session = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        className: form.className,
        createdAt: new Date().toISOString(),
      }
      await sb.from('student_sessions').insert({
        first_name: session.firstName,
        last_name: session.lastName,
        class_name: session.className,
      })
      setSession(session)
      router.push('/')
    } catch {
      setError('Login failed. Please try again.')
    }
    setLoading(false)
  }

  const floats = ['📚', '📖', '✏️', '📝', '🔬', '📐']

  return (
    <div className="login-page">
      {/* Background decorations */}
      <div style={{ position: 'absolute', width: 400, height: 400, background: 'rgba(0,116,0,0.08)', borderRadius: '50%', top: -100, right: -100, animation: 'floatCircle 8s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, background: 'rgba(253,224,4,0.08)', borderRadius: '50%', bottom: -80, left: -60, animation: 'floatCircle 8s ease-in-out infinite', animationDelay: '3s' }} />
      {floats.map((f, i) => (
        <div key={i} style={{ position: 'absolute', top: `${10 + i * 12}%`, left: `${5 + i * 14}%`, fontSize: 30, opacity: 0.15, animation: 'floatUp 6s ease-in-out infinite', animationDelay: `${i * 1.2}s`, pointerEvents: 'none' }}>
          {f}
        </div>
      ))}

      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#007400,#009900)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(0,116,0,0.30)' }}>
            <svg viewBox="0 0 32 32" width={36} height={36} fill="none">
              <path d="M6 24l5-13 6 4 5-11" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              <polygon points="18,2 22,9 15,7" fill="#fde004" />
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', letterSpacing: -0.5 }}>SPARKS</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>hi! pls sign in so we know whos using our platform ♡</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">First Name</label>
          <input
            className="form-input"
            placeholder="Enter your first name"
            value={form.firstName}
            onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Last Name</label>
          <input
            className="form-input"
            placeholder="Enter your last name"
            value={form.lastName}
            onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Select Your Class</label>
          <select
            className="form-input select"
            value={form.className}
            onChange={e => setForm(p => ({ ...p, className: e.target.value }))}
          >
            <option value="">Choose your class...</option>
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 8 }}
          onClick={submit}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : <LogIn size={16} />}
          {' '}{loading ? 'Signing in...' : 'Login SPARKS'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 16 }}>
          A digital notes/lecture archival platform for TPS-AUH students
        </p>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link href="/" style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            ⬅️ Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
