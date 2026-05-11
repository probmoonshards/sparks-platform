'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Upload, LogIn, LogOut, Sun, Moon, Download, Loader2, Filter, X, ChevronDown } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useCache } from './CacheContext'
import { useToast } from './Toast'
import { Session, clearSession, initials, SUBJECTS, SCHOOL_YEARS, QUARTERS } from '@/lib/constants'
import { sb } from '@/lib/supabase'

const CACHE_NAME = 'sparks-files-v1'

type Props = {
  session: Session | null
  onLogout: () => void
  onUpload?: () => void
  search?: string
  setSearch?: (v: string) => void
}

type CacheFilter = { grade: string; subject: string; year: string; quarter: string }

export default function Navbar({ session, onLogout, onUpload, search = '', setSearch }: Props) {
  const { theme, toggle } = useTheme()
  const { isOnline, isCaching, cacheProgress, cacheAll, cachedIds, clearCache } = useCache()
  const { toast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [cacheMenuOpen, setCacheMenuOpen] = useState(false)
  const [liveCount, setLiveCount] = useState(0)
  const [cacheFilter, setCacheFilter] = useState<CacheFilter>({ grade: '', subject: '', year: '', quarter: '' })
  const [cacheStep, setCacheStep] = useState<'main' | 'filter'>('main')
  const menuRef = useRef<HTMLDivElement>(null)
  const cacheMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const subjects = SUBJECTS[cacheFilter.grade] || []

  // Count actual cached files from Cache API
  const countCached = useCallback(async () => {
    if (!('caches' in window)) { setLiveCount(cachedIds.size); return }
    try {
      const cache = await caches.open(CACHE_NAME)
      const keys = await cache.keys()
      setLiveCount(keys.length)
    } catch { setLiveCount(cachedIds.size) }
  }, [cachedIds])

  useEffect(() => { countCached() }, [countCached])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (cacheMenuRef.current && !cacheMenuRef.current.contains(e.target as Node)) {
        setCacheMenuOpen(false); setCacheStep('main')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleLogout() {
    clearSession(); onLogout(); setMenuOpen(false); router.push('/')
  }

  async function handleCacheAll(filter?: CacheFilter) {
    setCacheMenuOpen(false); setCacheStep('main')
    try {
      const [{ data: notes }, { data: caps }] = await Promise.all([
        sb.from('notes').select('*, files:note_files(*)'),
        sb.from('capstones').select('*, files:capstone_files(*)'),
      ])
      let noteList = (notes || []) as { id: string; grade: string; subject: string; school_year: string; quarter: string; files: { url: string }[] }[]
      let capList = (caps || []) as { id: string; project_type: string; pub_year: string; pub_month: string; files: { url: string }[] }[]

      // Notes-only filters: grade, subject, school year, quarter
      if (filter?.grade) noteList = noteList.filter(n => n.grade === filter.grade)
      if (filter?.subject) noteList = noteList.filter(n => n.subject === filter.subject)
      if (filter?.year) noteList = noteList.filter(n => n.school_year === filter.year)
      if (filter?.quarter) noteList = noteList.filter(n => n.quarter === filter.quarter)

      const items = [
        ...noteList.map(n => ({ id: n.id, fileUrls: (n.files || []).map(f => f.url) })),
        ...capList.map(c => ({ id: c.id, fileUrls: (c.files || []).map(f => f.url) })),
      ].filter(item => item.fileUrls.length > 0)

      if (items.length === 0) { toast('No files match your filter', 'info'); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await cacheAll(items, noteList as any, capList as any)
      toast(`Cached ${items.length} items!`, 'success')
    } catch { toast('Failed to cache files', 'error') }
  }

  const onlineColor = isOnline ? '#007400' : '#be185d'

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo" prefetch={false}>
        <SparkLogo size={32} />
        <span className="nav-logo-text">SPARKS</span>
      </Link>

      {setSearch && (
        <div className="nav-search">
          <span className="nav-search-icon"><Search size={15} /></span>
          <input type="text" placeholder="Search notes or research..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      <div className="nav-actions">
        {/* Online/Offline dot indicator — no text */}
        <div title={isOnline ? 'Online' : 'Offline'} style={{
          width: 10, height: 10, borderRadius: '50%',
          background: onlineColor,
          boxShadow: `0 0 0 3px ${isOnline ? 'rgba(0,116,0,0.2)' : 'rgba(190,24,93,0.2)'}`,
          flexShrink: 0, transition: 'all 0.3s',
        }} />

        {/* Cache button — icon + count only, no "Offline" text */}
        <div style={{ position: 'relative' }} ref={cacheMenuRef}>
          <button
            className="btn btn-outline btn-icon"
            onClick={() => { setCacheMenuOpen(o => !o); setCacheStep('main') }}
            disabled={isCaching}
            title="Cache for offline"
            style={{ position: 'relative', width: 36, height: 36 }}
          >
            {isCaching
              ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              : <Download size={15} />
            }
            {liveCount > 0 && !isCaching && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#007400', color: '#fff',
                borderRadius: 24, padding: '0 4px',
                fontSize: 9, fontWeight: 700, lineHeight: '14px',
                minWidth: 14, textAlign: 'center',
              }}>{liveCount}</span>
            )}
          </button>

          {cacheMenuOpen && (
            <div className="dropdown" style={{ minWidth: 260, right: 0, zIndex: 600 }}>
              {cacheStep === 'main' ? (
                <>
                  <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5 }}>
                    Offline Cache
                  </div>
                  <div style={{ padding: '0 12px 8px', fontSize: 12, color: 'var(--text3)' }}>
                    {liveCount > 0 ? `${liveCount} files cached` : 'Nothing cached yet'}
                  </div>
                  <div style={{ height: 1, background: 'var(--border)', margin: '0 0 4px' }} />
                  <div className="dropdown-item" onClick={() => handleCacheAll()} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                    <Download size={14} /> Cache everything
                  </div>
                  <div className="dropdown-item" onClick={() => setCacheStep('filter')}>
                    <Filter size={14} /> Cache by filter
                    <ChevronDown size={12} style={{ marginLeft: 'auto', transform: 'rotate(-90deg)' }} />
                  </div>
                  {liveCount > 0 && (
                    <div className="dropdown-item" onClick={async () => { await clearCache(); setCacheMenuOpen(false); toast('Cache cleared', 'info') }} style={{ color: '#dc2626' }}>
                      <X size={14} /> Clear all cache
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ padding: '8px 12px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn btn-ghost btn-xs" onClick={() => setCacheStep('main')} style={{ padding: '2px 6px' }}>← Back</button>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5 }}>Filter Cache</span>
                  </div>
                  <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <select className="select" style={{ fontSize: 12 }} value={cacheFilter.grade} onChange={e => setCacheFilter(p => ({ ...p, grade: e.target.value, subject: '' }))}>
                      <option value="">All Grade Levels</option>
                      {Object.keys(SUBJECTS).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    {cacheFilter.grade && (
                      <select className="select" style={{ fontSize: 12 }} value={cacheFilter.subject} onChange={e => setCacheFilter(p => ({ ...p, subject: e.target.value }))}>
                        <option value="">All Subjects</option>
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                    <select className="select" style={{ fontSize: 12 }} value={cacheFilter.year} onChange={e => setCacheFilter(p => ({ ...p, year: e.target.value }))}>
                      <option value="">All School Years</option>
                      {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select className="select" style={{ fontSize: 12 }} value={cacheFilter.quarter} onChange={e => setCacheFilter(p => ({ ...p, quarter: e.target.value }))}>
                      <option value="">All Quarters</option>
                      {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={() => handleCacheAll(cacheFilter)} style={{ justifyContent: 'center', marginTop: 4 }}>
                      <Download size={13} /> Download selected
                    </button>
                    <button className="btn btn-ghost btn-xs" onClick={() => setCacheFilter({ grade: '', subject: '', year: '', quarter: '' })} style={{ justifyContent: 'center' }}>
                      <X size={11} /> Clear filters
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button className="theme-toggle" onClick={toggle} title="Toggle theme">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Share Notes — routes to page, grayed offline */}
        {session && onUpload && (
          <Link
            href="/uploadnotes"
            prefetch={false}
            className="btn btn-yellow btn-sm"
            style={!isOnline ? { opacity: 0.45, pointerEvents: 'none', filter: 'grayscale(1)' } : {}}
            title={!isOnline ? 'Go online to share notes' : 'Share Notes'}
          >
            <Upload size={13} /> <span className="nav-btn-text">Share</span>
          </Link>
        )}

        {/* Avatar / Sign In */}
        {session ? (
          <div style={{ position: 'relative' }} ref={menuRef}>
            <div className="avatar" onClick={() => setMenuOpen(o => !o)}>
              {initials(session.firstName, session.lastName)}
            </div>
            {menuOpen && (
              <div className="dropdown">
                <div className="dropdown-name">
                  {session.firstName} {session.lastName}
                  <div className="dropdown-class">{session.className}</div>
                </div>
                <div className="dropdown-item" onClick={handleLogout}>
                  <LogOut size={14} /> Sign Out
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className="btn btn-outline btn-icon" prefetch={false} title="Sign In">
            <LogIn size={15} />
          </Link>
        )}
      </div>
    </nav>
  )
}

function SparkLogo({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: 'linear-gradient(135deg,#007400,#009900)',
      borderRadius: size * 0.28, display: 'flex', alignItems: 'center',
      justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,116,0,0.3)',
    }}>
      <svg viewBox="0 0 20 20" width={size * 0.65} height={size * 0.65} fill="none">
        <path d="M4 15l3-8 4 3 3-7" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="12,2 14,6 10,5" fill="#fde004" />
      </svg>
    </div>
  )
}
