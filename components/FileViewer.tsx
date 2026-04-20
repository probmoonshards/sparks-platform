'use client'
import { useEffect, useState } from 'react'
import { FileDown, File, WifiOff, Loader2 } from 'lucide-react'
import { useCache } from './CacheContext'
import type { NoteFile, CapstoneFile } from '@/lib/constants'

type AnyFile = NoteFile | CapstoneFile

const CACHE_NAME = 'sparks-files-v1'
const VIEWER_HEIGHT = 'calc(100vh - 180px)'

export default function FileViewer({ file }: { file: AnyFile | null }) {
  const { isOnline } = useCache()
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [notCached, setNotCached] = useState(false)

  useEffect(() => {
    return () => {
      if (resolvedUrl?.startsWith('blob:')) URL.revokeObjectURL(resolvedUrl)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.url])

  useEffect(() => {
    if (!file) { setResolvedUrl(null); return }

    async function resolve() {
      setResolving(true)
      setNotCached(false)

      if (isOnline) {
        setResolvedUrl(file!.url)
        setResolving(false)
        return
      }

      // Offline: pull blob from Cache API
      try {
        if (!('caches' in window)) { setNotCached(true); setResolving(false); return }
        const cache = await caches.open(CACHE_NAME)
        const cached = await cache.match(file!.url)
        if (cached) {
          const blob = await cached.blob()
          setResolvedUrl(URL.createObjectURL(blob))
        } else {
          setNotCached(true)
        }
      } catch {
        setNotCached(true)
      }
      setResolving(false)
    }

    resolve()
  }, [file, isOnline])

  if (!file) return (
    <div style={{ height: VIEWER_HEIGHT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text3)', background: 'var(--surface)' }}>
      <File size={48} />
      <div>Select a file to preview</div>
    </div>
  )

  if (resolving) return (
    <div style={{ height: VIEWER_HEIGHT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text3)', background: 'var(--surface)' }}>
      <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
      <div>Loading file...</div>
    </div>
  )

  if (!isOnline && notCached) return (
    <div style={{ height: VIEWER_HEIGHT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text3)', background: 'var(--surface)', padding: 40, textAlign: 'center' }}>
      <WifiOff size={48} />
      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text2)' }}>File not cached</div>
      <div style={{ fontSize: 13, maxWidth: 280, lineHeight: 1.6 }}>
        This file wasn&apos;t saved for offline use. Go online and press <strong>Cache</strong> to save it.
      </div>
    </div>
  )

  if (!resolvedUrl) return null

  const ext = (file.file_name || '').split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'pdf') return (
    <iframe
      src={`${resolvedUrl}${isOnline ? '#toolbar=0' : ''}`}
      title={file.file_name}
      style={{ width: '100%', height: VIEWER_HEIGHT, border: 'none', background: '#fff', display: 'block' }}
    />
  )

  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return (
    <div style={{ height: VIEWER_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', padding: 24 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolvedUrl} alt={file.file_name} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, objectFit: 'contain' }} />
    </div>
  )

  if (['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls'].includes(ext)) {
    if (!isOnline) return (
      <div style={{ height: VIEWER_HEIGHT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text3)', background: 'var(--surface)', padding: 40, textAlign: 'center' }}>
        <WifiOff size={48} />
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text2)' }}>Office viewer needs internet</div>
        <div style={{ fontSize: 13 }}>The file is cached — connect to view it, or download it.</div>
        <a href={resolvedUrl} download={file.file_name} className="btn btn-primary" style={{ marginTop: 8 }}>
          <FileDown size={14} /> Download File
        </a>
      </div>
    )
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`
    return (
      <iframe
        src={viewerUrl}
        title={file.file_name}
        style={{ width: '100%', height: VIEWER_HEIGHT, border: 'none', display: 'block' }}
      />
    )
  }

  return (
    <div style={{ height: VIEWER_HEIGHT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text3)', background: 'var(--surface)', padding: 40, textAlign: 'center' }}>
      <FileDown size={48} />
      <div style={{ fontWeight: 600, color: 'var(--text2)' }}>{file.file_name}</div>
      <div style={{ fontSize: 13 }}>Preview not available for this file type</div>
      <a href={resolvedUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginTop: 8 }}>
        <FileDown size={14} /> Download File
      </a>
    </div>
  )
}
