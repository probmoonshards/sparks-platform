'use client'
import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useCache } from './CacheContext'

const CACHE_NAME = 'sparks-files-v1'

type Props = {
  url: string
  fileName: string
  className?: string
  style?: React.CSSProperties
  small?: boolean
}

export default function OfflineDownloadButton({ url, fileName, className, style, small }: Props) {
  const { isOnline } = useCache()
  const [downloading, setDownloading] = useState(false)

  // Online — just a normal anchor download
  if (isOnline) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        download={fileName}
        className={className || `btn btn-outline ${small ? 'btn-xs' : 'btn-sm'}`}
        style={style}
      >
        <Download size={small ? 11 : 13} /> {small ? 'DL' : 'Download'}
      </a>
    )
  }

  // Offline — pull from Cache API blob and trigger download
  async function handleOfflineDownload() {
    setDownloading(true)
    try {
      if (!('caches' in window)) {
        alert('Cache not available in this browser.')
        return
      }
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(url)
      if (!cached) {
        alert('This file isn\'t cached for offline use. Go online and press Cache first.')
        return
      }
      const blob = await cached.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // Clean up blob URL after short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000)
    } catch (e) {
      console.error('Offline download failed:', e)
      alert('Download failed. The file may not be cached.')
    }
    setDownloading(false)
  }

  return (
    <button
      onClick={handleOfflineDownload}
      disabled={downloading}
      className={className || `btn btn-outline ${small ? 'btn-xs' : 'btn-sm'}`}
      style={style}
      title="Download cached file"
    >
      {downloading
        ? <Loader2 size={small ? 11 : 13} style={{ animation: 'spin 1s linear infinite' }} />
        : <Download size={small ? 11 : 13} />
      }
      {' '}{small ? 'DL' : 'Download'}
    </button>
  )
}
