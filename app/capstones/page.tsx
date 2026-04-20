'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Upload, Zap, Paperclip, Download, CheckCircle, WifiOff } from 'lucide-react'
import Navbar from '@/components/Navbar'
import UploadCapstoneModal from '@/components/UploadCapstoneModal'
import { useCache } from '@/components/CacheContext'
import { sb } from '@/lib/supabase'
import { getSession, clearSession, Capstone, capColors, fmtDate, SCHOOL_YEARS, Session } from '@/lib/constants'
import { useToast } from '@/components/Toast'

export default function CapstoneListPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isOnline, saveCapsData, getOfflineCaps } = useCache()
  const [session, setSession] = useState<Session | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [caps, setCaps] = useState<Capstone[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => { setSession(getSession()) }, [])

  const fetchCaps = useCallback(async () => {
    setLoading(true)

    // ── OFFLINE: serve from localStorage ──────────────────
    if (!isOnline) {
      const offline = getOfflineCaps()
      const filtered = offline.filter(c => {
        const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.author_name?.toLowerCase().includes(search.toLowerCase())
        const matchType = !typeFilter || c.project_type === typeFilter
        const matchYear = !yearFilter || c.school_year === yearFilter
        return matchSearch && matchType && matchYear
      })
      setCaps(filtered)
      setLoading(false)
      return
    }

    // ── ONLINE: fetch from Supabase ────────────────────────
    try {
      let q = sb.from('capstones').select('*, files:capstone_files(*)').order('created_at', { ascending: false })
      if (search) q = q.or(`title.ilike.%${search}%,author_name.ilike.%${search}%`)
      if (typeFilter) q = q.eq('project_type', typeFilter)
      if (yearFilter) q = q.eq('school_year', yearFilter)
      const { data } = await q.limit(50)
      const fetched = data || []
      setCaps(fetched)
      // Save unfiltered snapshot for offline
      if (!search && !typeFilter && !yearFilter) saveCapsData(fetched)
    } catch {
      const offline = getOfflineCaps()
      setCaps(offline)
      toast('Could not reach server — showing cached projects', 'info')
    }
    setLoading(false)
  }, [search, typeFilter, yearFilter, isOnline, saveCapsData, getOfflineCaps, toast])

  useEffect(() => {
    const t = setTimeout(fetchCaps, 300)
    return () => clearTimeout(t)
  }, [fetchCaps])

  return (
    <div>
      <Navbar
        session={session}
        onLogout={() => { clearSession(); setSession(null) }}
        onUpload={() => session ? setShowUpload(true) : router.push('/login')}
      />

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ background: '#fef3c7', borderBottom: '1.5px solid #f59e0b', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#92400e', fontWeight: 600 }}>
          <WifiOff size={15} /> You&apos;re offline — showing cached projects
        </div>
      )}

      <section className="hero">
        <h1 className="hero-title">Research, Capstone, and SIPs</h1>
        <p className="hero-sub">Browse student research papers, SIPs, and capstone projects.</p>
        <div className="hero-actions">
          {session
            ? <button className="btn btn-yellow" onClick={() => setShowUpload(true)}><Upload size={16} /> Upload Research</button>
            : <Link href="/login" className="btn btn-yellow"><Upload size={16} /> Sign In to Upload</Link>
          }
        </div>
      </section>

      <div className="filter-bar">
        <div style={{ position: 'relative', maxWidth: 260 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }}>
            <Search size={14} />
          </span>
          <input
            className="form-input"
            style={{ paddingLeft: 36, borderRadius: 10 }}
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {['Capstone', 'SIP', 'Research'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
          <option value="">All Years</option>
          {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <Link href="/" className="btn btn-sm" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', marginLeft: 'auto' }}>
          📖 Notes
        </Link>
      </div>

      <div className="grid-section">
        {loading ? (
          <div className="notes-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="cap-card" style={{ height: 180 }}>
                <div className="skeleton" style={{ height: 22, width: '40%', marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 18, width: '80%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 14, width: '30%' }} />
              </div>
            ))}
          </div>
        ) : caps.length === 0 ? (
          <div className="empty-state">
            <Zap size={48} />
            <h3>{!isOnline ? 'No cached projects available' : 'No projects yet'}</h3>
            <p>{!isOnline ? 'Go online and click "Cache all" to save projects for offline viewing.' : search || typeFilter || yearFilter ? 'Try different filters' : 'Be the first to share your research!'}</p>
            {session && isOnline && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowUpload(true)}>
                <Upload size={14} /> Upload Research
              </button>
            )}
          </div>
        ) : (
          <div className="notes-grid">
            {caps.map((cap, i) => <CapCard key={cap.id} cap={cap} idx={i} toast={toast} />)}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadCapstoneModal onClose={() => setShowUpload(false)} onDone={fetchCaps} />
      )}
    </div>
  )
}

function CapCard({ cap, idx, toast }: { cap: Capstone; idx: number; toast: (m: string, t?: 'success' | 'error' | 'info') => void }) {
  const { isCached, cacheItem, uncacheItem, isOnline } = useCache()
  const cached = isCached(cap.id)
  const fileUrls = (cap.files || []).map(f => f.url)
  const cc = capColors(cap.project_type)
  const bgMap: Record<string, string> = { cap: 'var(--cap-bg)', sip: 'var(--sip-bg)', res: 'var(--res-bg)' }

  async function toggleCache(e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault()
    if (!isOnline) { toast('Go online to change cache settings', 'info'); return }
    if (cached) {
      await uncacheItem(cap.id, fileUrls)
      toast('Removed from offline cache', 'info')
    } else {
      await cacheItem(cap.id, fileUrls)
      toast('Saved for offline viewing!', 'success')
    }
  }

  return (
    <Link href={`/capstones/${cap.id}`} style={{ textDecoration: 'none' }}>
      <div className="cap-card card-animate" style={{ animationDelay: `${idx * 0.05}s` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="pill" style={{ background: bgMap[cc.label], color: cc.pill }}>
              {cap.project_type || 'Research'}
            </span>
            {cap.school_year && (
              <span className="pill" style={{ background: 'var(--surface)', color: 'var(--text3)', border: '1px solid var(--border)' }}>
                {cap.school_year}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={toggleCache}
              title={cached ? 'Cached for offline — click to remove' : 'Save for offline'}
              style={{
                background: cached ? 'var(--grade9-bg)' : 'var(--surface)',
                border: `1.5px solid ${cached ? '#007400' : 'var(--border)'}`,
                borderRadius: 24, padding: '3px 8px',
                display: 'flex', alignItems: 'center', gap: 4,
                cursor: 'pointer', transition: 'all 0.2s',
                fontSize: 11, fontWeight: 600,
                color: cached ? '#007400' : 'var(--text3)',
                flexShrink: 0,
              }}
            >
              {cached ? <><CheckCircle size={12} /> Cached</> : <><Download size={12} /> Cache</>}
            </button>
            {cap.files && (
              <span className="tag">
                <Paperclip size={11} /> {cap.files.length} file{cap.files.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, marginBottom: 6 }}>{cap.title}</h3>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8 }}>👤 {cap.author_name || 'Anonymous'}</div>
        {cap.description && (
          <div style={{ fontSize: 13, color: 'var(--text3)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {cap.description}
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>📅 {fmtDate(cap.created_at)}</div>
      </div>
    </Link>
  )
}
