'use client'
import { useEffect, useState } from 'react'
import { Download, CheckCircle, Loader2 } from 'lucide-react'
import { useCache } from './CacheContext'

const CACHE_NAME = 'sparks-files-v1'

type Props = {
  url: string
  fileName: string
  onStop?: (e: React.MouseEvent) => void
}

export default function CachedDownloadButton({ url, fileName, onStop }: Props) {
  const { isOnline, cachedIds } = useCache()
  const [isCachedFile, setIsCachedFile] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Re-check the Cache API whenever cachedIds changes.
  // CacheContext creates a new Set reference on every update, so cachedIds
  // itself is a stable dep — but we use cachedIds.size as a primitive dep
  // to avoid the linter complaining about Set identity comparisons.
  // This means the green checkmark appears the moment cacheItem() finishes,
  // with no page refresh required.
  useEffect(() => {
    if (!('caches' in window)) return
    let alive = true
    caches.open(CACHE_NAME)
      .then(cache => cache.match(url, { ignoreVary: true }))
      .then(match => { if (alive) setIsCachedFile(!!match) })
      .catch(() => {})
    return () => { alive = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, cachedIds]) // cachedIds ref changes on every cache/uncache → re-check

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (onStop) onStop(e)

    if (isOnline) {
      window.open(url, '_blank')
      return
    }

    if (!isCachedFile) {
      alert('This file is not cached. Go online and press Cache on the card to save it.')
      return
    }

    setDownloading(true)
    try {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(url, { ignoreVary: true })
      if (!cached) { alert('Cache miss — try going online.'); return }
      const blob = await cached.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000)
    } catch {
      alert('Download failed.')
    } finally {
      setDownloading(false)
    }
  }

  const color = isCachedFile ? '#007400' : 'var(--text3)'
  const bg    = isCachedFile ? 'var(--grade9-bg)' : 'transparent'

  return (
    <button
      className="icon-btn"
      onClick={handleClick}
      title={isCachedFile ? 'Cached — click to download offline' : isOnline ? 'Download' : 'Not cached'}
      style={{
        color,
        background: bg,
        borderRadius: 6,
        transition: 'color 0.2s, background 0.2s',
        opacity: (!isOnline && !isCachedFile) ? 0.35 : 1,
      }}
    >
      {downloading
        ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
        : isCachedFile
          ? <CheckCircle size={12} />
          : <Download size={12} />
      }
    </button>
  )
}
