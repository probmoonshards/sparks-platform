'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Filter, Download, Share2, BookOpen, Eye, CheckCircle, WifiOff, Loader2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import CachedDownloadButton from '@/components/CachedDownloadButton'
import { useCache } from '@/components/CacheContext'
import { sb } from '@/lib/supabase'
import { getSession, clearSession, SUBJECTS, Note, gradeColors, fileExt, formatBytes, fmtDate, Session, fileTypeColor, NOTE_TYPES, QUARTERS } from '@/lib/constants'
import { useToast } from '@/components/Toast'

export default function HomePage() {
  const { toast } = useToast()
  const router = useRouter()
  const { isOnline, cachedIds, getOfflineNotes, getOfflineNote, saveNotesData } = useCache()
  const [session, setSession] = useState<Session | null>(null)

  // When the SW's app-shell fallback serves the '/' HTML for a dynamic route
  // like /notes/[id] or /capstones/[id], this home page component mounts at
  // the wrong URL. Detect this and do a client-side navigation to the correct
  // route so Next.js mounts the right page component from its cached JS bundle.
  useEffect(() => {
    const path = window.location.pathname
    if (path !== '/' && path !== '') {
      router.replace(path)
    }
  }, [router])
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [search, setSearch] = useState('')
  const [noteType, setNoteType] = useState('')
  const [quarter, setQuarter] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { setSession(getSession()) }, [])

  const fetchNotes = useCallback(async () => {
    setLoading(true)

    // Step 1: Always load cached data instantly from localStorage — synchronous, never fails.
    // Merge the bulk snapshot (sparks_cached_notes) with individually cached notes
    // (sparks_note_{id}) so notes cached one-by-one via the Cache button appear
    // in the offline list even if they were never in the home-page snapshot.
    const bulkNotes = getOfflineNotes()
    const bulkIds = new Set(bulkNotes.map((n: Note) => n.id))
    const cachedIdsArr = Array.from(cachedIds)
    const individualNotes: Note[] = cachedIdsArr
      .map(id => {
        if (bulkIds.has(id)) return null
        const n = getOfflineNote(id)
        return n && 'grade' in n ? n as Note : null
      })
      .filter(Boolean) as Note[]
    const offlineData = [...bulkNotes, ...individualNotes]

    const filtered = offlineData.filter(n => {
      const ms = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.subject?.toLowerCase().includes(search.toLowerCase()) || n.author_name?.toLowerCase().includes(search.toLowerCase())
      const mg = !grade || n.grade === grade
      const msub = !subject || n.subject === subject
      const mnt = !noteType || n.note_type === noteType
      const mq = !quarter || n.quarter === quarter
      return ms && mg && msub && mnt && mq
    })
    if (filtered.length > 0) {
      setNotes(filtered)
      setTotal(filtered.length)
      setLoading(false)
    }

    // Step 2: If offline, stop here — never fire Supabase when there is no connection.
    // Without this guard, the Supabase JS client returns { data: null } offline, which
    // causes `setNotes([])` to overwrite and wipe the cached notes from the screen.
    if (!isOnline) {
      if (filtered.length === 0) { setNotes([]); setTotal(0) }
      setLoading(false)
      return
    }

    // Step 3: Online — fire Supabase in background
    try {
      let q = sb.from('notes').select('*, files:note_files(*)', { count: 'exact' }).order('created_at', { ascending: false })
      if (search) q = q.or(`title.ilike.%${search}%,subject.ilike.%${search}%,author_name.ilike.%${search}%`)
      if (grade) q = q.eq('grade', grade)
      if (subject) q = q.eq('subject', subject)
      if (noteType) q = q.eq('note_type', noteType)
      if (quarter) q = q.eq('quarter', quarter)
      const { data, count, error } = await q.limit(50)
      // If Supabase returns an error or null data, don't overwrite what's already showing
      if (error || !data) {
        if (filtered.length === 0) { setNotes([]); setTotal(0) }
      } else {
        setNotes(data)
        setTotal(count || 0)
        if (!search && !grade && !subject && !noteType && !quarter) {
          saveNotesData(data)
        } else {
          Promise.resolve(sb.from('notes').select('*, files:note_files(*)').order('created_at', { ascending: false }).limit(200))
            .then(({ data: all }) => { if (all) saveNotesData(all) })
            .catch(() => {})
        }
      }
    } catch {
      // Network threw — cached data already showing, just stop spinner
      if (filtered.length === 0) { setNotes([]); setTotal(0) }
    }
    setLoading(false)
  }, [search, grade, subject, noteType, quarter, isOnline, cachedIds, saveNotesData, getOfflineNotes, getOfflineNote])

  useEffect(() => {
    const t = setTimeout(fetchNotes, 300)
    return () => clearTimeout(t)
  }, [fetchNotes])

  const subjects = SUBJECTS[grade] || []

  return (
    <div>
      <Navbar session={session} onLogout={() => { clearSession(); setSession(null) }} search={search} setSearch={setSearch} />

      {!isOnline && (
        <div style={{ background: '#fef3c7', borderBottom: '1.5px solid #f59e0b', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e', fontWeight: 600 }}>
          <WifiOff size={14} /> Offline — showing cached notes
        </div>
      )}

      <section className="hero">
        <h1 className="hero-title">Student Notes &amp; Teacher Lectures</h1>
        <p className="hero-sub">
          {total > 0 ? `${total} resource${total === 1 ? '' : 's'} available` : 'Browse student research papers, SIPs, and capstone projects.'}
        </p>
        <div className="hero-actions">
          {session
            ? <Link href="/uploadnotes" prefetch={false} className="btn btn-yellow" style={!isOnline ? { opacity: 0.45, pointerEvents: 'none', filter: 'grayscale(1)' } : {}}>
                <BookOpen size={16} /> Share Your Notes
              </Link>
            : <Link href="/login" className="btn btn-yellow" prefetch={false}><BookOpen size={16} /> Sign In to Share</Link>
          }
        </div>
      </section>

      <div className="filter-bar">
        <span className="filter-label"><Filter size={14} /> Filter:</span>
        <select className="select" value={grade} onChange={e => { setGrade(e.target.value); setSubject('') }}>
          <option value="">All Grades</option>
          {Object.keys(SUBJECTS).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="select" value={subject} onChange={e => setSubject(e.target.value)} disabled={!grade}>
          <option value="">{grade ? 'All Subjects' : 'Select grade first'}</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select" value={noteType} onChange={e => setNoteType(e.target.value)}>
          <option value="">All Types</option>
          {NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select" value={quarter} onChange={e => setQuarter(e.target.value)}>
          <option value="">All Quarters</option>
          {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
        <Link href="/capstones" className="btn btn-sm" prefetch={false} style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', color: '#fff', marginLeft: 'auto' }}>
          ⚡ Research &amp; SIPs
        </Link>
      </div>

      <div className="grid-section">
        {loading && notes.length === 0 ? (
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
            <h3>{!isOnline ? 'No cached notes' : search || grade || subject ? 'No notes match your filters' : 'No notes yet'}</h3>
            <p>{!isOnline ? 'Cache notes while online to browse offline.' : 'Be the first to share!'}</p>
            {session && isOnline && <Link href="/uploadnotes" prefetch={false} className="btn btn-primary" style={{ marginTop: 16 }}>Share Notes</Link>}
          </div>
        ) : (
          <div className="notes-grid">
            {notes.map((note, i) => <NoteCard key={note.id} note={note} idx={i} toast={toast} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function NoteCard({ note, idx, toast }: { note: Note; idx: number; toast: (m: string, t?: 'success' | 'error' | 'info') => void }) {
  const { isCached, cacheItem, uncacheItem, isOnline } = useCache()
  const cached = isCached(note.id)
  const [caching, setCaching] = useState(false)
  const fileUrls = (note.files || []).map(f => f.url)
  const gc = gradeColors(note.grade)
  const borderColors: Record<string, string> = { grade9: '#007400', grade10: '#2563eb', grade11: '#b45309', grade12: '#be185d' }
  const bgVars: Record<string, string> = { grade9: 'var(--grade9-bg)', grade10: 'var(--grade10-bg)', grade11: 'var(--grade11-bg)', grade12: 'var(--grade12-bg)' }

  async function toggleCache(e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault()
    if (!isOnline) { toast('Go online to cache files', 'info'); return }
    if (caching) return
    setCaching(true)
    try {
      if (cached) { await uncacheItem(note.id, fileUrls); toast('Removed from cache', 'info') }
      else { await cacheItem(note.id, fileUrls, note); toast('Saved for offline!', 'success') }
    } catch {
      toast('Cache failed — check your connection and try again', 'error')
    } finally {
      setCaching(false)
    }
  }

  return (
    <div className="note-card card-animate" style={{ animationDelay: `${idx * 0.05}s` }}>
      <div className="card-top-border" style={{ background: borderColors[gc.bgVar] || '#007400' }} />
      <div className="card-body">
        <div style={{ position: 'relative', minHeight: 28 }}>
          <div className="card-badges" style={{ paddingRight: 60 }}>
            <span className="pill" style={{ background: bgVars[gc.bgVar], color: gc.pill }}>{note.grade}</span>
            {note.subject && <span className="pill" style={{ background: 'var(--surface)', color: 'var(--text3)', border: '1px solid var(--border)' }}>{note.subject}</span>}
            {note.note_type && (
              <span className="pill" style={{ background: note.note_type === 'Teacher Lectures' ? '#e8f0ff' : '#e8f5e8', color: note.note_type === 'Teacher Lectures' ? '#2563eb' : '#007400', border: '1px solid var(--border)' }}>
                {note.note_type === 'Teacher Lectures' ? '🎓 Lecture' : '📝 Notes'}
              </span>
            )}
            {note.quarter && <span className="pill" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid var(--border)' }}>{note.quarter}</span>}
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
        <div className="card-title">{note.title}</div>
        {note.description && <div className="card-desc">{note.description}</div>}
        <div className="card-meta">
          <span>👤 {note.author_name || 'Anonymous'}</span>
          <span>📅 {fmtDate(note.created_at)}</span>
          {note.school_year && <span>🏫 {note.school_year}</span>}
        </div>
        {note.files && note.files.length > 0 && (
          <div className="card-files">
            {note.files.slice(0, 2).map(f => {
              const fc = fileTypeColor(f.file_name)
              return (
                <div key={f.id} className="file-row">
                  <div className="file-type" style={{ background: fc.bg, color: fc.color }}>{fileExt(f.file_name)}</div>
                  <div className="file-name">{f.file_name}</div>
                  <div className="file-size">{formatBytes(f.file_size)}</div>
                  <div className="file-actions">
                    <CachedDownloadButton url={f.url} fileName={f.file_name} onStop={e => e.stopPropagation()} />
                    <button className="icon-btn" title="Share note" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/notes/${note.id}`).then(() => toast('Link copied!', 'info')) }}><Share2 size={12} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="card-footer">
        <Link href={`/notes/${note.id}`} prefetch={false} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          <Eye size={13} /> View Notes
        </Link>
      </div>
    </div>
  )
}
