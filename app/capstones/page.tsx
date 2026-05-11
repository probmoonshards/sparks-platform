'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Upload, Zap, Paperclip, Download, CheckCircle, WifiOff, Eye, Loader2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useCache } from '@/components/CacheContext'
import { sb } from '@/lib/supabase'
import { getSession, clearSession, Capstone, capColors, PUB_YEARS, RESEARCH_DESIGNS, Session } from '@/lib/constants'
import { useToast } from '@/components/Toast'

export default function CapstoneListPage() {
  const { toast } = useToast()
  const { isOnline, cachedIds, getOfflineCaps, getOfflineCap, saveCapsData } = useCache()
  const [session, setSession] = useState<Session | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [designFilter, setDesignFilter] = useState('')
  const [caps, setCaps] = useState<Capstone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { setSession(getSession()) }, [])

  const fetchCaps = useCallback(async () => {
    setLoading(true)

    // Step 1: Always load cached data instantly from localStorage — synchronous, never fails.
    // Merge bulk snapshot with individually cached capstones (sparks_cap_{id} keys)
    // so items cached one-by-one appear in the offline list.
    const bulkCaps = getOfflineCaps()
    const bulkIds = new Set(bulkCaps.map((c: Capstone) => c.id))
    const cachedIdsArr = Array.from(cachedIds)
    const individualCaps: Capstone[] = cachedIdsArr
      .map(id => {
        if (bulkIds.has(id)) return null
        const c = getOfflineCap(id)
        return c && 'project_type' in c ? c as Capstone : null
      })
      .filter(Boolean) as Capstone[]
    const offlineData = [...bulkCaps, ...individualCaps]
    const filtered = offlineData.filter(c => {
      const ms = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.author_name?.toLowerCase().includes(search.toLowerCase())
      const mt = !typeFilter || c.project_type === typeFilter
      const my = !yearFilter || c.pub_year === yearFilter
      const md = !designFilter || c.research_design === designFilter
      return ms && mt && my && md
    })
    if (filtered.length > 0) { setCaps(filtered); setLoading(false) }

    // Step 2: If offline, stop here — never fire Supabase when there is no connection.
    // Without this guard, the Supabase JS client returns { data: null } offline, which
    // causes `setCaps([])` to overwrite and wipe the cached projects from the screen.
    if (!isOnline) {
      if (filtered.length === 0) { setCaps([]) }
      setLoading(false)
      return
    }

    // Step 3: Online — fire Supabase in background
    try {
      let q = sb.from('capstones').select('*, files:capstone_files(*)').order('created_at', { ascending: false })
      if (search) q = q.or(`title.ilike.%${search}%,author_name.ilike.%${search}%`)
      if (typeFilter) q = q.eq('project_type', typeFilter)
      if (yearFilter) q = q.eq('pub_year', yearFilter)
      if (designFilter) q = q.eq('research_design', designFilter)
      const { data, error } = await q.limit(50)
      // If Supabase returns an error or null data, don't overwrite what's already showing
      if (error || !data) {
        if (filtered.length === 0) { setCaps([]) }
      } else {
        setCaps(data)
        if (!search && !typeFilter && !yearFilter && !designFilter) {
          saveCapsData(data)
        } else {
          Promise.resolve(sb.from('capstones').select('*, files:capstone_files(*)').order('created_at', { ascending: false }).limit(200))
            .then(({ data: all }) => { if (all) saveCapsData(all) })
            .catch(() => {})
        }
      }
    } catch {
      // Network threw — cached data already showing, just stop spinner
      if (filtered.length === 0) { setCaps([]) }
    }
    setLoading(false)
  }, [search, typeFilter, yearFilter, designFilter, isOnline, cachedIds, saveCapsData, getOfflineCaps, getOfflineCap])

  useEffect(() => {
    const t = setTimeout(fetchCaps, 300)
    return () => clearTimeout(t)
  }, [fetchCaps])

  return (
    <div>
      <Navbar session={session} onLogout={() => { clearSession(); setSession(null) }} />

      {!isOnline && (
        <div style={{ background: '#fef3c7', borderBottom: '1.5px solid #f59e0b', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e', fontWeight: 600 }}>
          <WifiOff size={14} /> Offline — showing cached projects
        </div>
      )}

      <section className="hero">
        <h1 className="hero-title">Browse Academic Papers</h1>
        <p className="hero-sub">Browse student research papers, SIPs, and capstone projects.</p>
        <div className="hero-actions">
          {session
            ? <Link href="/uploadpaper" prefetch={false} className="btn btn-yellow" style={!isOnline ? { opacity: 0.45, pointerEvents: 'none', filter: 'grayscale(1)' } : {}}>
                <Upload size={16} /> Upload Research
              </Link>
            : <Link href="/login" className="btn btn-yellow" prefetch={false}><Upload size={16} /> Sign In to Upload</Link>
          }
        </div>
      </section>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 240 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }}><Search size={13} /></span>
          <input className="form-input" style={{ paddingLeft: 34, borderRadius: 10, height: 36, fontSize: 13 }} type="text" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {['Capstone', 'SIP', 'Research'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
          <option value="">All Years</option>
          {PUB_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="select" value={designFilter} onChange={e => setDesignFilter(e.target.value)}>
          <option value="">All Designs</option>
          {RESEARCH_DESIGNS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <Link href="/" className="btn btn-sm" prefetch={false} style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', marginLeft: 'auto' }}>
          📖 Notes
        </Link>
      </div>

      <div className="grid-section">
        {loading && caps.length === 0 ? (
          <div className="notes-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="note-card" style={{ height: 200 }}>
                <div className="card-top-border skeleton" />
                <div className="card-body" style={{ gap: 10 }}>
                  <div className="skeleton" style={{ height: 20, width: '40%' }} />
                  <div className="skeleton" style={{ height: 16, width: '80%' }} />
                  <div className="skeleton" style={{ height: 13, width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : caps.length === 0 ? (
          <div className="empty-state">
            <Zap size={48} />
            <h3>{!isOnline ? 'No cached projects' : 'No projects yet'}</h3>
            <p>{!isOnline ? 'Cache projects while online.' : 'Be the first to share!'}</p>
            {session && isOnline && <Link href="/uploadpaper" prefetch={false} className="btn btn-primary" style={{ marginTop: 16 }}><Upload size={14} /> Upload Research</Link>}
          </div>
        ) : (
          <div className="notes-grid">
            {caps.map((cap, i) => <CapCard key={cap.id} cap={cap} idx={i} toast={toast} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function CapCard({ cap, idx, toast }: { cap: Capstone; idx: number; toast: (m: string, t?: 'success' | 'error' | 'info') => void }) {
  const { isCached, cacheItem, uncacheItem, isOnline } = useCache()
  const cached = isCached(cap.id)
  const fileUrls = (cap.files || []).map(f => f.url)
  const cc = capColors(cap.project_type)
  const borderColor = cc.label === 'cap' ? '#2563eb' : cc.label === 'sip' ? '#b45309' : '#be185d'
  const bgMap: Record<string, string> = { cap: 'var(--cap-bg)', sip: 'var(--sip-bg)', res: 'var(--res-bg)' }

  const [caching, setCaching] = useState(false)

  async function toggleCache(e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault()
    if (!isOnline) { toast('Go online to cache files', 'info'); return }
    if (caching) return
    setCaching(true)
    try {
      if (cached) { await uncacheItem(cap.id, fileUrls); toast('Removed from cache', 'info') }
      else { await cacheItem(cap.id, fileUrls, cap); toast('Saved for offline!', 'success') }
    } catch {
      toast('Cache failed — check your connection and try again', 'error')
    } finally {
      setCaching(false)
    }
  }

  return (
    <div className="note-card card-animate" style={{ animationDelay: `${idx * 0.05}s` }}>
      <div className="card-top-border" style={{ background: borderColor }} />
      <div className="card-body">
        <div style={{ position: 'relative', minHeight: 28 }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', paddingRight: 64 }}>
            <span className="pill" style={{ background: bgMap[cc.label], color: cc.pill }}>{cap.project_type || 'Research'}</span>
            {cap.pub_year && <span className="pill" style={{ background: 'var(--surface)', color: 'var(--text3)', border: '1px solid var(--border)' }}>{cap.pub_year}</span>}
            {cap.research_design && <span className="pill" style={{ background: '#f3e8ff', color: '#7c3aed', border: '1px solid var(--border)' }}>{cap.research_design}</span>}
            {cap.files && <span className="tag" style={{ fontSize: 11 }}><Paperclip size={10} /> {cap.files.length}</span>}
          </div>
          <button onClick={toggleCache} disabled={caching} title={caching ? 'Caching...' : cached ? 'Cached — click to remove' : 'Save offline'} style={{
            position: 'absolute', top: 0, right: 0,
            background: caching ? '#fff8e1' : cached ? 'var(--grade9-bg)' : 'var(--surface)',
            border: `1.5px solid ${caching ? '#f59e0b' : cached ? '#007400' : 'var(--border)'}`,
            borderRadius: 24, padding: '2px 7px',
            display: 'flex', alignItems: 'center', gap: 3,
            cursor: caching ? 'wait' : 'pointer', transition: 'all 0.2s',
            fontSize: 10, fontWeight: 600, color: caching ? '#b45309' : cached ? '#007400' : 'var(--text3)', whiteSpace: 'nowrap',
          }}>
            {caching
              ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Caching...</>
              : cached
                ? <><CheckCircle size={11} /> Cached</>
                : <><Download size={11} /> Cache</>
            }
          </button>
        </div>
        <div className="card-title" style={{ fontSize: 14, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{cap.title}</div>
        <div className="card-meta">
          <span>👤 {cap.author_name || 'Anonymous'}</span>
          {(cap.pub_month || cap.pub_year) && <span>📅 {[cap.pub_month, cap.pub_year].filter(Boolean).join(' ')}</span>}
        </div>
        {cap.description && <div className="card-desc">{cap.description}</div>}
      </div>
      <div className="card-footer">
        <Link href={`/capstones/${cap.id}`} prefetch={false} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          <Eye size={13} /> View Paper
        </Link>
      </div>
    </div>
  )
}
