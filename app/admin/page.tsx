'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { ADMIN_PASSWORD, setAdmin } from '@/lib/constants'

export default function AdminLoginPage() {
  const router = useRouter()
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // useMemo so dots don't re-randomize on every keystroke
  const dots = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    top: `${Math.floor(Math.random() * 100)}%`,
    left: `${Math.floor(Math.random() * 100)}%`,
    dur: `${(2 + Math.random() * 2).toFixed(1)}s`,
    delay: `${(Math.random() * 2).toFixed(1)}s`,
  })), [])

  function submit() {
    setLoading(true)
    setTimeout(() => {
      if (pass === ADMIN_PASSWORD) {
        setAdmin()
        router.push('/admin/dashboard')
      } else {
        setError('invalid password, get out.')
        setLoading(false)
      }
    }, 600)
  }

  return (
    <div className="admin-page">
      {dots.map(d => (
        <div key={d.id} style={{
          position: 'absolute',
          width: 4, height: 4, borderRadius: '50%',
          background: '#4caf50',
          top: d.top,
          left: d.left,
          animation: `pulse ${d.dur} ease-in-out infinite`,
          animationDelay: d.delay,
          opacity: 0.4,
        }} />
      ))}

      <div className="admin-card">
        <div className="admin-shield">
          <Shield size={32} color="#4caf50" />
        </div>
        <h1 className="admin-title">Admin Panel</h1>
        <p className="admin-sub">sparks platform hacker site 2026 not patched</p>

        <div style={{ marginTop: 28 }} />

        {error && <div className="admin-error">{error}</div>}

        <div className="form-group">
          <div style={{ position: 'relative' }}>
            <input
              className="form-input admin-input"
              type={show ? 'text' : 'password'}
              placeholder="enter the pin if u know it"
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
            <button
              onClick={() => setShow(s => !s)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', display: 'flex' }}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 8, boxShadow: '0 4px 20px rgba(0,116,0,.4)' }}
          onClick={submit}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : <Shield size={16} />}
          {' '}{loading ? 'Checking...' : 'access the stuff'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,.25)', marginTop: 20 }}>
          only for sigma 12d guys
        </p>
      </div>
    </div>
  )
}
