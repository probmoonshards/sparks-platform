'use client'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Upload, LogIn, LogOut, Sun, Moon, Download, WifiOff, Wifi, Loader2 } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useCache } from './CacheContext'
import { useToast } from './Toast'
import { Session, clearSession, initials } from '@/lib/constants'
import { sb } from '@/lib/supabase'

const CACHE_NAME = 'sparks-files-v1'

type Props = {
  session: Session | null
  onLogout: () => void
  onUpload?: () => void
  search?: string
  setSearch?: (v: string) => void
}

export default function Navbar({ session, onLogout, onUpload, search = '', setSearch }: Props) {
  const { theme, toggle } = useTheme()
  const { isOnline, isCaching, cacheProgress, cacheAll, cachedIds } = useCache()
  const { toast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [cacheMenuOpen, setCacheMenuOpen] = useState(false)
  const [liveCount, setLiveCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const cacheMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Actively count cached files from Cache API
  useEffect(() => {
    async function countCached() {
      if (!('caches' in window)) { setLiveCount(cachedIds.size); return }
      try {
        const cache = await caches.open(CACHE_NAME)
        const keys = await cache.keys()
        setLiveCount(keys.length)
      } catch {
        setLiveCount(cachedIds.size)
      }
    }
    countCached()
  }, [cachedIds]) // Re-runs whenever cachedIds changes (after caching/uncaching)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (cacheMenuRef.current && !cacheMenuRef.current.contains(e.target as Node)) setCacheMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleLogout() {
    clearSession()
    onLogout()
    setMenuOpen(false)
    router.push('/')
  }

  async function handleCacheAll() {
    setCacheMenuOpen(false)
    try {
      const [{ data: notes }, { data: caps }] = await Promise.all([
        sb.from('notes').select('*, files:note_files(*)'),
        sb.from('capstones').select('*, files:capstone_files(*)'),
      ])
      const noteList = notes || []
      const capList = caps || []
      const items: { id: string; fileUrls: string[] }[] = [
        ...noteList.map((n: { id: string; files: { url: string }[] }) => ({
          id: n.id,
          fileUrls: (n.files || []).map((f: { url: string }) => f.url),
        })),
        ...capList.map((c: { id: string; files: { url: string }[] }) => ({
          id: c.id,
          fileUrls: (c.files || []).map((f: { url: string }) => f.url),
        })),
      ].filter(item => item.fileUrls.length > 0)

      if (items.length === 0) { toast('No files to cache yet', 'info'); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await cacheAll(items, noteList as any, capList as any)
      toast(`Cached ${items.length} items for offline use!`, 'success')
    } catch {
      toast('Failed to cache files', 'error')
    }
  }

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        <SparkLogo size={34} />
        <span className="nav-logo-text">SPARKS</span>
      </Link>

      {setSearch && (
        <div className="nav-search">
          <span className="nav-search-icon"><Search size={15} /></span>
          <input
            type="text"
            placeholder="Search notes or research by topic or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      <div className="nav-actions">
        {/* Online/Offline indicator */}
        <div title={isOnline ? 'Online' : 'Offline — viewing cached content'} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 24,
          background: isOnline ? 'var(--grade9-bg)' : 'var(--grade12-bg)',
          border: `1.5px solid ${isOnline ? 'var(--border)' : '#be185d'}`,
          fontSize: 12, fontWeight: 600,
          color: isOnline ? 'var(--primary)' : '#be185d',
          flexShrink: 0, transition: 'all 0.3s',
        }}>
          {isOnline ? <><Wifi size={13} /> Online</> : <><WifiOff size={13} /> Offline</>}
        </div>

        {/* Cache button */}
        <div style={{ position: 'relative' }} ref={cacheMenuRef}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setCacheMenuOpen(o => !o)}
            disabled={isCaching}
            style={{ gap: 6, flexShrink: 0 }}
          >
            {isCaching
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {cacheProgress}%</>
              : <><Download size={14} /> Offline</>
            }
            {/* Live count badge — counts actual cached files from Cache API */}
            {liveCount > 0 && !isCaching && (
              <span style={{
                background: '#007400', color: '#fff',
                borderRadius: 24, padding: '0 5px',
                fontSize: 10, fontWeight: 700, lineHeight: '16px',
                minWidth: 16, textAlign: 'center',
              }}>
                {liveCount}
              </span>
            )}
          </button>

          {cacheMenuOpen && (
            <div className="dropdown" style={{ minWidth: 220, right: 0 }}>
              <div style={{ padding: '8px 12px 4px', fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5 }}>
                Offline Mode
              </div>
              <div style={{ padding: '0 12px 8px', fontSize: 12, color: 'var(--text3)' }}>
                {liveCount > 0
                  ? `${liveCount} file${liveCount === 1 ? '' : 's'} cached`
                  : 'No files cached yet'
                }
              </div>
              <div style={{ height: 1, background: 'var(--border)', margin: '0 0 6px' }} />
              <div className="dropdown-item" onClick={handleCacheAll} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                <Download size={14} /> Cache all notes &amp; files
              </div>
              {liveCount > 0 && (
                <div className="dropdown-item" style={{ color: 'var(--text3)', fontSize: 13, cursor: 'default' }}>
                  <Wifi size={14} /> {liveCount} files ready offline
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button className="theme-toggle" onClick={toggle} title="Toggle theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Share Notes */}
        {session && onUpload && (
          <button className="btn btn-yellow btn-sm" onClick={onUpload}>
            <Upload size={14} /> Share Notes
          </button>
        )}

        {/* User avatar / sign in */}
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
          <Link href="/login" className="btn btn-outline btn-sm">
            <LogIn size={14} /> Sign In
          </Link>
        )}
      </div>
    </nav>
  )
}

function SparkLogo({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      background: 'linear-gradient(135deg,#007400,#009900)',
      borderRadius: size * 0.28, display: 'flex', alignItems: 'center',
      justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,116,0,0.3)', flexShrink: 0,
    }}>
      <svg viewBox="0 0 20 20" width={size * 0.65} height={size * 0.65} fill="none">
        <path d="M4 15l3-8 4 3 3-7" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="12,2 14,6 10,5" fill="#fde004" />
      </svg>
    </div>
  )
}
