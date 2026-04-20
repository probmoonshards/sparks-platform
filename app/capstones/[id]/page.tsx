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
import { getSession, clearSession, Capstone, CapstoneFile, capColors, fileExt, formatBytes, fmtDate, Session } from '@/lib/constants'
import { useToast } from '@/components/Toast'

export default function CapstoneDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const { isOnline, getOfflineCaps } = useCache()
  const [session, setSession] = useState<Session | null>(null)
  const [cap, setCap] = useState<Capstone | null>(null)
  const [selFile, setSelFile] = useState<CapstoneFile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { setSession(getSession()) }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)

      // ── OFFLINE: find in localStorage ─────────────────────
      if (!isOnline) {
        const cached = getOfflineCaps().find(c => c.id === id)
        if (cached) {
          setCap(cached)
          if (cached.files?.length) setSelFile(cached.files[0])
        }
        setLoading(false)
        return
      }

      // ── ONLINE: fetch from Supabase ────────────────────────
      try {
        const { data } = await sb.from('capstones').select('*, files:capstone_files(*)').eq('id', id).single()
        if (data) {
          setCap(data)
          if (data.files?.length) setSelFile(data.files[0])
        }
      } catch {
        const cached = getOfflineCaps().find(c => c.id === id)
        if (cached) {
          setCap(cached)
          if (cached.files?.length) setSelFile(cached.files[0])
          toast('Showing cached version of this project', 'info')
        }
      }
      setLoading(false)
    }
    if (id) load()
  }, [id, isOnline, getOfflineCaps, toast])

  if (loading) return (
    <div>
      <Navbar session={null} onLogout={() => {}} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', textAlign: 'center', color: 'var(--text3)' }}>
        <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} /> Loading...
      </div>
    </div>
  )

  if (!cap) return (
    <div>
      <Navbar session={null} onLogout={() => {}} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', textAlign: 'center', color: 'var(--text3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <WifiOff size={48} />
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text2)' }}>
          {!isOnline ? 'Project not cached' : 'Project not found'}
        </div>
        <div style={{ fontSize: 14 }}>
          {!isOnline ? 'This project wasn\'t saved offline. Go online to view it.' : 'This project doesn\'t exist.'}
        </div>
        <Link href="/capstones" className="btn btn-primary" style={{ marginTop: 8 }}>Back to Research</Link>
      </div>
    </div>
  )

  const cc = capColors(cap.project_type)
  const bgMap: Record<string, string> = { cap: 'var(--cap-bg)', sip: 'var(--sip-bg)', res: 'var(--res-bg)' }

  return (
    <div>
      <Navbar session={session} onLogout={() => { clearSession(); setSession(null) }} />

      {!isOnline && (
        <div style={{ background: '#fef3c7', borderBottom: '1.5px solid #f59e0b', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#92400e', fontWeight: 600 }}>
          <WifiOff size={15} /> You&apos;re offline — showing cached version
        </div>
      )}

      <div style={{ padding: '16px 24px' }}>
        <Link href="/capstones" className="back-btn"><ArrowLeft size={14} /> Back to Research</Link>
        <div className="detail-page">

          {/* Left: metadata */}
          <div className="detail-card">
            <div className="card-badges" style={{ marginBottom: 12 }}>
              <span className="pill" style={{ background: bgMap[cc.label], color: cc.pill }}>
                {cap.project_type || 'Research'}
              </span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8, lineHeight: 1.3 }}>{cap.title}</h1>
            {cap.description && <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 12 }}>{cap.description}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
              <span>👤 {cap.author_name || 'Anonymous'}</span>
              <span>📅 {fmtDate(cap.created_at)}</span>
              {cap.school_year && <span>🏫 {cap.school_year}</span>}
            </div>
            <div className="divider" />
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Files</div>
            {cap.files?.map(f => (
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
              {cap.files && cap.files.length > 1 && (
                <div className="file-tab-wrap">
                  {cap.files.map(f => (
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
