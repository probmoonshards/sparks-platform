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
import { getSession, clearSession, Note, NoteFile, gradeColors, fileExt, formatBytes, fmtDate, Session } from '@/lib/constants'
import { useToast } from '@/components/Toast'

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const { isOnline, getOfflineNotes } = useCache()
  const [session, setSession] = useState<Session | null>(null)
  const [note, setNote] = useState<Note | null>(null)
  const [selFile, setSelFile] = useState<NoteFile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { setSession(getSession()) }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)

      // ── OFFLINE: find in localStorage ─────────────────────
      if (!isOnline) {
        const cached = getOfflineNotes().find(n => n.id === id)
        if (cached) {
          setNote(cached)
          if (cached.files?.length) setSelFile(cached.files[0])
        }
        setLoading(false)
        return
      }

      // ── ONLINE: fetch from Supabase ────────────────────────
      try {
        const { data } = await sb.from('notes').select('*, files:note_files(*)').eq('id', id).single()
        if (data) {
          setNote(data)
          if (data.files?.length) setSelFile(data.files[0])
        }
      } catch {
        // Network failed — try localStorage
        const cached = getOfflineNotes().find(n => n.id === id)
        if (cached) {
          setNote(cached)
          if (cached.files?.length) setSelFile(cached.files[0])
          toast('Showing cached version of this note', 'info')
        }
      }
      setLoading(false)
    }
    if (id) load()
  }, [id, isOnline, getOfflineNotes, toast])

  if (loading) return (
    <div>
      <Navbar session={null} onLogout={() => {}} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', textAlign: 'center', color: 'var(--text3)' }}>
        <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} /> Loading...
      </div>
    </div>
  )

  if (!note) return (
    <div>
      <Navbar session={null} onLogout={() => {}} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', textAlign: 'center', color: 'var(--text3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <WifiOff size={48} />
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text2)' }}>
          {!isOnline ? 'Note not cached' : 'Note not found'}
        </div>
        <div style={{ fontSize: 14 }}>
          {!isOnline ? 'This note wasn\'t saved offline. Go online to view it.' : 'This note doesn\'t exist.'}
        </div>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 8 }}>Go Home</Link>
      </div>
    </div>
  )

  const gc = gradeColors(note.grade)
  const bgVars: Record<string, string> = { grade9: 'var(--grade9-bg)', grade10: 'var(--grade10-bg)', grade11: 'var(--grade11-bg)', grade12: 'var(--grade12-bg)' }

  return (
    <div>
      <Navbar session={session} onLogout={() => { clearSession(); setSession(null) }} />

      {!isOnline && (
        <div style={{ background: '#fef3c7', borderBottom: '1.5px solid #f59e0b', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#92400e', fontWeight: 600 }}>
          <WifiOff size={15} /> You&apos;re offline — showing cached version
        </div>
      )}

      <div style={{ padding: '16px 24px' }}>
        <Link href="/" className="back-btn"><ArrowLeft size={14} /> Back to Notes</Link>
        <div className="detail-page">

          {/* Left: metadata */}
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
            {note.files?.map(f => (
              <div key={f.id} className="file-row" style={{ marginBottom: 10 }}>
                <div className="file-type">{fileExt(f.file_name)}</div>
                <div className="file-name" style={{ fontSize: 13 }}>{f.file_name}</div>
                <div className="file-size">{formatBytes(f.file_size)}</div>
                <div className="file-actions" style={{ gap: 6 }}>
                  <OfflineDownloadButton url={f.url} fileName={f.file_name} small />
                  {isOnline && <button className="btn btn-outline btn-xs" onClick={() => navigator.clipboard.writeText(f.url).then(() => toast('Link copied!', 'info'))}><Share2 size={11} /></button>}
                </div>
              </div>
            ))}
          </div>

          {/* Right: viewer */}
          <div className="detail-viewer">
            <div className="viewer-header">
              {note.files && note.files.length > 1 && (
                <div className="file-tab-wrap">
                  {note.files.map(f => (
                    <div key={f.id} className={`file-tab${selFile?.id === f.id ? ' active' : ''}`} onClick={() => setSelFile(f)}>
                      {fileExt(f.file_name)} {f.file_name.slice(0, 20)}
                    </div>
                  ))}
                </div>
              )}
              {selFile && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <OfflineDownloadButton url={selFile.url} fileName={selFile.file_name} />
                  {isOnline && <button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(window.location.href).then(() => toast('Link copied!', 'info'))}><Share2 size={13} /> Share</button>}
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
