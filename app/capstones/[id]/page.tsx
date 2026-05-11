'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Share2, WifiOff, Copy } from 'lucide-react'
import Navbar from '@/components/Navbar'
import FileViewer from '@/components/FileViewer'
import OfflineDownloadButton from '@/components/OfflineDownloadButton'
import { useCache } from '@/components/CacheContext'
import { sb } from '@/lib/supabase'
import { getSession, clearSession, Capstone, CapstoneFile, capColors, fileExt, formatBytes, fileTypeColor, Session, buildAPA } from '@/lib/constants'
import { useToast } from '@/components/Toast'

export default function CapstoneDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const { isOnline, getOfflineCap } = useCache()
  const [session, setSession] = useState<Session | null>(null)
  const [cap, setCap] = useState<Capstone | null>(null)
  const [selFile, setSelFile] = useState<CapstoneFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [usingCache, setUsingCache] = useState(false)
  const [pageUrl, setPageUrl] = useState('')

  useEffect(() => {
    setSession(getSession())
    if (typeof window !== 'undefined') setPageUrl(window.location.href)
  }, [])

  useEffect(() => {
    if (!id) return

    // Step 1: Load from localStorage IMMEDIATELY.
    // getOfflineCap checks the individual item key (sparks_cap_{id}) first —
    // written by cacheItem() when the user pressed Cache — then falls back to
    // the bulk home-page snapshot.
    const localCap = getOfflineCap(id)
    if (localCap) {
      setCap(localCap)
      if (localCap.files?.length) setSelFile(localCap.files[0])
      setUsingCache(true)
      setLoading(false)
    }

    // Step 2: Try Supabase in background — fire and forget
    let alive = true

    Promise.resolve(sb.from('capstones')
      .select('*, files:capstone_files(*)')
      .eq('id', id)
      .single()
    ).then(({ data }) => {
        if (!alive || !data) return
        setCap(data)
        setSelFile(f => f ?? (data.files?.[0] ?? null))
        setUsingCache(false)
        setLoading(false)
      })
      .catch(() => {
        if (alive && !localCap) setLoading(false)
      })

    return () => { alive = false }
  }, [id, getOfflineCap])

  if (loading && !cap) return (
    <div>
      <Navbar session={null} onLogout={() => {}} />
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text3)' }}>
        <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} /> Loading...
      </div>
    </div>
  )

  if (!cap) return (
    <div>
      <Navbar session={null} onLogout={() => {}} />
      <div style={{ maxWidth: 500, margin: '60px auto', padding: '0 24px', textAlign: 'center', color: 'var(--text3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <WifiOff size={48} />
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text2)' }}>
          {!isOnline ? 'Project not cached' : 'Project not found'}
        </div>
        <div style={{ fontSize: 14 }}>
          {!isOnline ? 'Cache this project while online to view it offline.' : "This project doesn't exist."}
        </div>
        <Link href="/capstones" prefetch={false} className="btn btn-primary" style={{ marginTop: 8 }}>Back to Research</Link>
      </div>
    </div>
  )

  const cc = capColors(cap.project_type)
  const bgMap: Record<string, string> = { cap: 'var(--cap-bg)', sip: 'var(--sip-bg)', res: 'var(--res-bg)' }
  const apa = buildAPA({
    authorName: cap.author_name || '',
    members: cap.members || '',
    pubYear: cap.pub_year || '',
    pubMonth: cap.pub_month || '',
    title: cap.title || '',
    url: pageUrl,
  })

  return (
    <div>
      <Navbar session={session} onLogout={() => { clearSession(); setSession(null) }} />

      {(usingCache || !isOnline) && (
        <div style={{ background: '#fef3c7', borderBottom: '1.5px solid #f59e0b', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e', fontWeight: 600 }}>
          <WifiOff size={14} /> {!isOnline ? 'Offline — showing cached version' : 'Showing cached version'}
        </div>
      )}

      <div style={{ padding: '16px 24px' }}>
        <Link href="/capstones" prefetch={false} className="back-btn"><ArrowLeft size={14} /> Back to Research</Link>
        <div className="detail-page">
          <div className="detail-card">
            <div className="card-badges" style={{ marginBottom: 12 }}>
              <span className="pill" style={{ background: bgMap[cc.label], color: cc.pill }}>
                {cap.project_type || 'Research'}
              </span>
            </div>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 10, lineHeight: 1.4 }}>{cap.title}</h1>
            {cap.description && <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.6 }}>{cap.description}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
              <span>👤 {cap.author_name || 'Anonymous'}</span>
              {cap.members && <span style={{ fontSize: 12 }}>👥 {cap.members}</span>}
              {(cap.pub_month || cap.pub_year) && <span>📅 {[cap.pub_month, cap.pub_year].filter(Boolean).join(' ')}</span>}
              {cap.research_design && <span>🔬 {cap.research_design}</span>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>APA 7th Citation</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.7, background: 'var(--surface)', padding: '10px 12px', borderRadius: 8, fontStyle: 'italic', userSelect: 'all', cursor: 'text', border: '1px solid var(--border)' }}>
                {apa}
              </div>
              <button className="btn btn-ghost btn-xs" style={{ marginTop: 6 }} onClick={() => { navigator.clipboard.writeText(apa); toast('Citation copied!', 'success') }}>
                <Copy size={11} /> Copy citation
              </button>
            </div>
            <div className="divider" />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Files</div>
            {cap.files?.map(f => {
              const fc = fileTypeColor(f.file_name)
              return (
                <div key={f.id} className="file-row" style={{ marginBottom: 10 }}>
                  <div className="file-type" style={{ background: fc.bg, color: fc.color }}>{fileExt(f.file_name)}</div>
                  <div className="file-name" style={{ fontSize: 12 }}>{f.file_name}</div>
                  <div className="file-size">{formatBytes(f.file_size)}</div>
                  <div className="file-actions" style={{ gap: 4 }}>
                    <OfflineDownloadButton url={f.url} fileName={f.file_name} small />
                    {isOnline && <button className="btn btn-outline btn-xs" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/capstones/${cap.id}`).then(() => toast('Link copied!', 'info'))}><Share2 size={10} /></button>}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="detail-viewer">
            <div className="viewer-header">
              {cap.files && cap.files.length > 1 && (
                <div className="file-tab-wrap">
                  {cap.files.map(f => (
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
