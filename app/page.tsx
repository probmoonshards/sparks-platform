'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Filter, Download, Share2, BookOpen, Eye, CheckCircle, WifiOff } from 'lucide-react'
import Navbar from '@/components/Navbar'
import UploadNotesModal from '@/components/UploadNotesModal'
import { useCache } from '@/components/CacheContext'
import { sb } from '@/lib/supabase'
import { getSession, clearSession, SUBJECTS, Note, gradeColors, fileExt, formatBytes, fmtDate, Session } from '@/lib/constants'
import { useToast } from '@/components/Toast'

export default function HomePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isOnline, saveNotesData, getOfflineNotes } = useCache()
  const [session, setSession] = useState<Session | null>(null)
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [search, setSearch] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => { setSession(getSession()) }, [])

  const fetchNotes = useCallback(async () => {
    setLoading(true)

    // ── OFFLINE: serve from localStorage ──────────────────
    if (!isOnline) {
      const offline = getOfflineNotes()
      const filtered = offline.filter(n => {
        const matchSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.subject?.toLowerCase().includes(search.toLowerCase()) || n.author_name?.toLowerCase().includes(search.toLowerCase())
        const matchGrade = !grade || n.grade === grade
        const matchSubject = !subject || n.subject === subject
        return matchSearch && matchGrade && matchSubject
      })
      setNotes(filtered)
      setTotal(filtered.length)
      setLoading(false)
      return
    }

    // ── ONLINE: fetch from Supabase ────────────────────────
    try {
      let q = sb.from('notes').select('*, files:note_files(*)', { count: 'exact' }).order('created_at', { ascending: false })
      if (search) q = q.or(`title.ilike.%${search}%,subject.ilike.%${search}%,author_name.ilike.%${search}%`)
      if (grade) q = q.eq('grade', grade)
      if (subject) q = q.eq('subject', subject)
      const { data, count } = await q.limit(50)
      const fetched = data || []
      setNotes(fetched)
      setTotal(count || 0)
      // Always save the latest unfiltered snapshot for offline use
      if (!search && !grade && !subject) saveNotesData(fetched)
    } catch {
      // Network failed even though isOnline — fall back to cache
      const offline = getOfflineNotes()
      setNotes(offline)
      setTotal(offline.length)
      toast('Could not reach server — showing cached notes', 'info')
    }
    setLoading(false)
  }, [search, grade, subject, isOnline, saveNotesData, getOfflineNotes, toast])

  useEffect(() => {
    const t = setTimeout(fetchNotes, 300)
    return () => clearTimeout(t)
  }, [fetchNotes])

  const subjects = SUBJECTS[grade] || []

  return (
    <div>
      <Navbar
        session={session}
        onLogout={() => { clearSession(); setSession(null) }}
        onUpload={() => session ? setShowUpload(true) : router.push('/login')}
        search={search}
        setSearch={setSearch}
      />

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ background: '#fef3c7', borderBottom: '1.5px solid #f59e0b', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#92400e', fontWeight: 600 }}>
          <WifiOff size={15} /> You&apos;re offline — showing cached notes
        </div>
      )}

      <section className="hero">
        <h1 className="hero-title">Browse Academic Notes</h1>
        <p className="hero-sub">
          {total > 0 ? `${total} resource${total === 1 ? '' : 's'} available` : 'Find and share notes with your classmates'}
        </p>
        <div className="hero-actions">
          {session
            ? <button className="btn btn-yellow" onClick={() => setShowUpload(true)}><BookOpen size={16} /> Share Your Notes</button>
            : <Link href="/login" className="btn btn-yellow"><BookOpen size={16} /> Sign In to Share</Link>
          }
        </div>
      </section>

      <div className="filter-bar">
        <span className="filter-label"><Filter size={14} /> Filter by:</span>
        <select className="select" value={grade} onChange={e => { setGrade(e.target.value); setSubject('') }}>
          <option value="">All Grades</option>
          {Object.keys(SUBJECTS).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="select" value={subject} onChange={e => setSubject(e.target.value)} disabled={!grade}>
          <option value="">{grade ? 'All Subjects' : 'Select grade first'}</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Link href="/capstones" className="btn btn-sm" style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', color: '#fff', marginLeft: 'auto' }}>
          ⚡ Capstones &amp; SIPs
        </Link>
      </div>

      <div className="grid-section">
        {loading ? (
          <div className="notes-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="note-card" style={{ height: 240 }}>
                <div className="card-top-border skeleton" />
                <div className="card-body" style={{ gap: 12 }}>
                  <div className="skeleton" style={{ height: 20, width: '60%' }} />
                  <div className="skeleton" style={{ height: 16, width: '90%' }} />
                  <div className="skeleton" style={{ height: 14, width: '70%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} />
            <h3>{!isOnline ? 'No cached notes available' : search || grade || subject ? 'No notes match your filters' : 'No notes yet'}</h3>
            <p>{!isOnline ? 'Go online and click "Cache all" in the toolbar to save notes for offline viewing.' : search || grade || subject ? 'Try different filters or search terms' : 'Be the first to share your notes!'}</p>
            {session && isOnline && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowUpload(true)}>
                Share Notes
              </button>
            )}
          </div>
        ) : (
          <div className="notes-grid">
            {notes.map((note, i) => <NoteCard key={note.id} note={note} idx={i} toast={toast} />)}
          </div>
        )}
      </div>

      {showUpload && session && (
        <UploadNotesModal session={session} onClose={() => setShowUpload(false)} onDone={fetchNotes} />
      )}
    </div>
  )
}

function NoteCard({ note, idx, toast }: { note: Note; idx: number; toast: (m: string, t?: 'success' | 'error' | 'info') => void }) {
  const { isCached, cacheItem, uncacheItem, isOnline } = useCache()
  const cached = isCached(note.id)
  const fileUrls = (note.files || []).map(f => f.url)
  const gc = gradeColors(note.grade)
  const borderColors: Record<string, string> = { grade9: '#007400', grade10: '#2563eb', grade11: '#b45309', grade12: '#be185d' }
  const bgVars: Record<string, string> = { grade9: 'var(--grade9-bg)', grade10: 'var(--grade10-bg)', grade11: 'var(--grade11-bg)', grade12: 'var(--grade12-bg)' }

  async function toggleCache(e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault()
    if (!isOnline) { toast('Go online to change cache settings', 'info'); return }
    if (cached) {
      await uncacheItem(note.id, fileUrls)
      toast('Removed from offline cache', 'info')
    } else {
      await cacheItem(note.id, fileUrls)
      toast('Saved for offline viewing!', 'success')
    }
  }

  return (
    <div className="note-card card-animate" style={{ animationDelay: `${idx * 0.05}s` }}>
      <div className="card-top-border" style={{ background: borderColors[gc.bgVar] || '#007400' }} />
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="card-badges">
            <span className="pill" style={{ background: bgVars[gc.bgVar], color: gc.pill }}>{note.grade}</span>
            {note.subject && <span className="pill" style={{ background: 'var(--surface)', color: 'var(--text3)', border: '1px solid var(--border)' }}>{note.subject}</span>}
          </div>
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
        </div>
        <div className="card-title">{note.title}</div>
        {note.description && <div className="card-desc">{note.description}</div>}
        <div className="card-meta">
          <span>👤 {note.author_name || 'Anonymous'}</span>
          <span>📅 {fmtDate(note.created_at)}</span>
          {note.school_year && <span>🏫 {note.school_year}</span>}
        </div>
        {note.files && note.files.length > 0 && (
          <div className="card-files">
            {note.files.slice(0, 3).map(f => (
              <div key={f.id} className="file-row">
                <div className="file-type">{fileExt(f.file_name)}</div>
                <div className="file-name">{f.file_name}</div>
                <div className="file-size">{formatBytes(f.file_size)}</div>
                <div className="file-actions">
                  <a href={f.url} target="_blank" rel="noreferrer" className="icon-btn" onClick={e => e.stopPropagation()} title="Download"><Download size={13} /></a>
                  <button className="icon-btn" title="Copy link" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(f.url).then(() => toast('Link copied!', 'info')) }}><Share2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card-footer">
        <Link href={`/notes/${note.id}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          <Eye size={14} /> View Notes
        </Link>
      </div>
    </div>
  )
}
