'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Share2, WifiOff } from 'lucide-react'
import Navbar from '@/components/Navbar'
import FileViewer from '@/components/FileViewer'
import OfflineDownloadButton from '@/components/OfflineDownloadButton'
import { useCache } from '@/components/CacheContext'
import { sb } from '@/lib/supabase'
import { getSession, clearSession, Note, NoteFile, gradeColors, fileExt, formatBytes, fmtDate, Session, fileTypeColor } from '@/lib/constants'
import { useToast } from '@/components/Toast'

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const { isOnline, getOfflineNote } = useCache()
  const [session, setSession] = useState<Session | null>(null)
  const [note, setNote] = useState<Note | null>(null)
  const [selFile, setSelFile] = useState<NoteFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [usingCache, setUsingCache] = useState(false)

  useEffect(() => { setSession(getSession()) }, [])

  useEffect(() => {
    if (!id) return

    // Step 1: Load from localStorage IMMEDIATELY — synchronous, never fails.
    // getOfflineNote checks the individual item key (sparks_note_{id}) first —
    // written by cacheItem() when the user pressed Cache — then falls back to
    // the bulk home-page snapshot. This means any cached note loads here
    // regardless of whether it appeared within the home page's limit(50).
    const localNote = getOfflineNote(id)
    if (localNote) {
      setNote(localNote)
      if (localNote.files?.length) setSelFile(localNote.files[0])
      setUsingCache(true)
      setLoading(false)
    }

    // Step 2: Try Supabase in background — wrapped in its own timeout
    // Does NOT block rendering or offline access
    let alive = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)

    Promise.resolve(sb.from('notes')
      .select('*, files:note_files(*)')
      .eq('id', id)
      .single()
    ).then(({ data }) => {
        clearTimeout(timer)
        if (!alive || !data) return
        setNote(data)
        setSelFile(f => f ?? (data.files?.[0] ?? null))
        setUsingCache(false)
        setLoading(false)
      })
      .catch(() => {
        clearTimeout(timer)
        // Network failed — cached version already showing (or not found)
        if (alive && !localNote) setLoading(false)
      })

    return () => { alive = false; controller.abort() }
  }, [id, getOfflineNote])

  if (loading && !note) return (
    <div>
      <Navbar session={null} onLogout={() => {}} />
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text3)' }}>
        <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} /> Loading...
      </div>
    </div>
  )

  if (!note) return (
    <div>
      <Navbar session={null} onLogout={() => {}} />
      <div style={{ maxWidth: 500, margin: '60px auto', padding: '0 24px', textAlign: 'center', color: 'var(--text3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <WifiOff size={48} />
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text2)' }}>
          {!isOnline ? 'Note not cached' : 'Note not found'}
        </div>
        <div style={{ fontSize: 14 }}>
          {!isOnline ? 'Cache this note while online to view it offline.' : "This note doesn't exist."}
        </div>
        <Link href="/" prefetch={false} className="btn btn-primary" style={{ marginTop: 8 }}>Go Home</Link>
      </div>
    </div>
  )

  const gc = gradeColors(note.grade)
  const bgVars: Record<string, string> = {
    grade9: 'var(--grade9-bg)', grade10: 'var(--grade10-bg)',
    grade11: 'var(--grade11-bg)', grade12: 'var(--grade12-bg)',
  }

  return (
    <div>
      <Navbar session={session} onLogout={() => { clearSession(); setSession(null) }} />

      {(usingCache || !isOnline) && (
        <div style={{ background: '#fef3c7', borderBottom: '1.5px solid #f59e0b', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e', fontWeight: 600 }}>
          <WifiOff size={14} /> {!isOnline ? 'Offline — showing cached version' : 'Showing cached version'}
        </div>
      )}

      <div style={{ padding: '16px 24px' }}>
        <Link href="/" prefetch={false} className="back-btn"><ArrowLeft size={14} /> Back to Notes</Link>
        <div className="detail-page">
          <div className="detail-card">
            <div className="card-badges" style={{ marginBottom: 12 }}>
              <span className="pill" style={{ background: bgVars[gc.bgVar], color: gc.pill }}>{note.grade}</span>
              {note.subject && <span className="pill" style={{ background: 'var(--surface)', color: 'var(--text3)', border: '1px solid var(--border)' }}>{note.subject}</span>}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8, lineHeight: 1.3 }}>{note.title}</h1>
            {note.description && <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 12 }}>{note.description}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
              <span>👤 {note.author_name || 'Anonymous'}</span>
              <span>📅 {fmtDate(note.created_at)}</span>
              {note.school_year && <span>🏫 {note.school_year}</span>}
            </div>
            <div className="divider" />
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Files</div>
            {note.files?.map(f => {
              const fc = fileTypeColor(f.file_name)
              return (
                <div key={f.id} className="file-row" style={{ marginBottom: 10 }}>
                  <div className="file-type" style={{ background: fc.bg, color: fc.color }}>{fileExt(f.file_name)}</div>
                  <div className="file-name" style={{ fontSize: 12 }}>{f.file_name}</div>
                  <div className="file-size">{formatBytes(f.file_size)}</div>
                  <div className="file-actions" style={{ gap: 4 }}>
                    <OfflineDownloadButton url={f.url} fileName={f.file_name} small />
                    {isOnline && <button className="btn btn-outline btn-xs" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/notes/${note.id}`).then(() => toast('Link copied!', 'info'))}><Share2 size={10} /></button>}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="detail-viewer">
            <div className="viewer-header">
              {note.files && note.files.length > 1 && (
                <div className="file-tab-wrap">
                  {note.files.map(f => (
                    <div key={f.id} className={`file-tab${selFile?.id === f.id ? ' active' : ''}`} onClick={() => setSelFile(f)}>
                      {fileExt(f.file_name)} {f.file_name.slice(0, 18)}
                    </div>
                  ))}
                </div>
              )}
              {selFile && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <OfflineDownloadButton url={selFile.url} fileName={selFile.file_name} />
                  {isOnline && <button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(window.location.href).then(() => toast('Copied!', 'info'))}><Share2 size={13} /> Share</button>}
                </div>
              )}
            </div>
            <FileViewer file={selFile} />
          </div>
        </div>
      </div>
    </div>
  )
}
