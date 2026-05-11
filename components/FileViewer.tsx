'use client'
import { useEffect, useState } from 'react'
import { FileDown, File, WifiOff, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCache } from './CacheContext'
import type { NoteFile, CapstoneFile } from '@/lib/constants'

// Dynamically import PdfViewer — pdfjs-dist is client only, no SSR
const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
  loading: () => (
    <div style={{ height: VIEWER_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--surface)', color: 'var(--text3)', flexDirection: 'column' }}>
      <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
      <div>Loading PDF viewer...</div>
    </div>
  ),
})

type AnyFile = NoteFile | CapstoneFile
const CACHE_NAME = 'sparks-files-v1'
const VIEWER_HEIGHT = 'calc(100vh - 180px)'

export default function FileViewer({ file }: { file: AnyFile | null }) {
  const { isOnline } = useCache()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [notCached, setNotCached] = useState(false)

  useEffect(() => {
    return () => { if (blobUrl?.startsWith('blob:')) URL.revokeObjectURL(blobUrl) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.url])

  useEffect(() => {
    if (!file) { setBlobUrl(null); setNotCached(false); return }
    let cancelled = false

    async function resolve() {
      setResolving(true)
      setNotCached(false)
      setBlobUrl(null)

      // Always try cache first.
      // ignoreVary: true — Supabase storage responses include "Vary: Origin, Accept-Encoding".
      // Android Chrome and iPadOS Safari honour this in the Cache API, so a plain
      // cache.match() returns undefined even when the file IS stored, because the
      // request Origin from the page context differs from the one used when the file
      // was fetched by CacheContext. ignoreVary bypasses the Vary check entirely.
      try {
        if ('caches' in window) {
          const cache = await caches.open(CACHE_NAME)
          const cached = await cache.match(file!.url, { ignoreVary: true })
          if (cached && !cancelled) {
            const blob = await cached.blob()
            if (!cancelled) {
              setBlobUrl(URL.createObjectURL(blob))
              setResolving(false)
              return
            }
          }
        }
      } catch { /* cache miss */ }

      if (!isOnline) {
        if (!cancelled) { setNotCached(true); setResolving(false) }
        return
      }

      // Online fallback — use URL directly
      if (!cancelled) { setBlobUrl(file!.url); setResolving(false) }
    }

    resolve()
    return () => { cancelled = true }
  }, [file, isOnline])

  const centerBox = (children: React.ReactNode) => (
    <div style={{ height: VIEWER_HEIGHT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text3)', background: 'var(--surface)', padding: 40, textAlign: 'center' }}>
      {children}
    </div>
  )

  if (!file) return centerBox(<><File size={48} /><div>Select a file to preview</div></>)
  if (resolving) return centerBox(<><Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} /><div>Loading...</div></>)
  if (notCached) return centerBox(
    <>
      <WifiOff size={48} />
      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text2)' }}>File not cached</div>
      <div style={{ fontSize: 13, maxWidth: 280, lineHeight: 1.6 }}>
        You&apos;re offline and this file wasn&apos;t downloaded by cache, Go online and press <strong>Cache</strong> on the card to save it for offline mode!
      </div>
    </>
  )
  if (!blobUrl) return null

  const ext = (file.file_name || '').split('.').pop()?.toLowerCase() ?? ''

  // PDF — use canvas-based viewer (works on iOS Safari)
  if (ext === 'pdf') return <PdfViewer url={blobUrl} />

  // Images
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return (
    <div style={{ height: VIEWER_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', padding: 24, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={blobUrl} alt={file.file_name} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, objectFit: 'contain' }} />
    </div>
  )

  // Office docs — Office Online viewer requires internet; blobUrl used for offline download
  if (['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls'].includes(ext)) {
    // Check offline FIRST — never attempt to render the iframe when offline,
    // because the browser will show an error frame before we can detect it.
    // blobUrl here is either a blob: URL (cached) or the remote URL (online fallback).
    // Either way it's safe to use as the download href.
    if (!isOnline) return centerBox(
      <>
        <WifiOff size={48} />
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text2)' }}>Unfortunately, office viewer needs internet</div>
        <div style={{ fontSize: 13 }}>buuuuut, the file is cached, you can download the file offline using the button below.</div>
        <a href={blobUrl} download={file.file_name} className="btn btn-primary" style={{ marginTop: 8 }}>
          <FileDown size={14} /> Download Cached File
        </a>
      </>
    )
    // Online — Office Online viewer. Always pass file.url (the remote Supabase URL)
    // because Office Online needs a publicly accessible URL, not a blob: URL.
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`
    return (
      <div style={{ height: VIEWER_HEIGHT }}>
        <iframe src={viewerUrl} title={file.file_name} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
      </div>
    )
  }

  // Fallback download
  return centerBox(
    <>
      <FileDown size={48} />
      <div style={{ fontWeight: 600, color: 'var(--text2)' }}>{file.file_name}</div>
      <div style={{ fontSize: 13 }}>Preview not available for this file type</div>
      <a href={blobUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginTop: 8 }}>
        <FileDown size={14} /> Download file instead
      </a>
    </>
  )
}
