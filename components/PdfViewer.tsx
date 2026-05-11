'use client'
import { useEffect, useRef, useState } from 'react'
import { Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileDown } from 'lucide-react'

type Props = { url: string }
const VIEWER_HEIGHT = 'calc(100vh - 180px)'

export default function PdfViewer({ url }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)
  const pdfDocRef = useRef<unknown>(null)

  useEffect(() => {
    let cancelled = false

    async function loadPdf() {
      setLoading(true)
      setError('')
      setNumPages(0)
      setCurrentPage(1)
      pdfDocRef.current = null

      try {
        const pdfjs = await import('pdfjs-dist')

        // Use the worker that ships with pdfjs-dist, served from our own /public folder.
        // This avoids any CDN dependency and works offline after first load.
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const task = (pdfjs as any).getDocument({ url })
        const pdf = await task.promise
        if (cancelled) return
        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
      } catch (e) {
        if (!cancelled) {
          console.error('PDF error:', e)
          setError('Failed to load PDF.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPdf()
    return () => { cancelled = true }
  }, [url])

  useEffect(() => {
    if (!pdfDocRef.current || loading || !numPages) return
    let cancelled = false

    async function render() {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }
      const canvas = containerRef.current?.querySelector('canvas')
      if (!canvas) return
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const page = await (pdfDocRef.current as any).getPage(currentPage)
        if (cancelled) return
        const dpr = window.devicePixelRatio || 1
        const viewport = page.getViewport({ scale: scale * dpr })
        const ctx = canvas.getContext('2d')
        if (!ctx || cancelled) return
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${viewport.width / dpr}px`
        canvas.style.height = `${viewport.height / dpr}px`
        const task = page.render({ canvasContext: ctx, viewport })
        renderTaskRef.current = task
        await task.promise
        renderTaskRef.current = null
      } catch (e: unknown) {
        if (e instanceof Error && e.message?.toLowerCase().includes('cancel')) return
      }
    }

    render()
    return () => { cancelled = true }
  }, [currentPage, scale, loading, numPages])

  if (loading) return (
    <div style={{ height: VIEWER_HEIGHT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--surface)', color: 'var(--text3)' }}>
      <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
      <div style={{ fontSize: 14 }}>Loading PDF...</div>
    </div>
  )

  if (error) return (
    <div style={{ height: VIEWER_HEIGHT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--surface)', color: 'var(--text3)', padding: 40, textAlign: 'center' }}>
      <FileDown size={48} />
      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text2)' }}>Could not render PDF</div>
      <div style={{ fontSize: 13, maxWidth: 280, lineHeight: 1.6 }}>Try downloading the file to view it.</div>
      <a href={url} download className="btn btn-primary"><FileDown size={14} /> Download PDF</a>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: VIEWER_HEIGHT }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} style={{ width: 32, height: 32 }}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', minWidth: 80, textAlign: 'center' }}>{currentPage} / {numPages}</span>
        <button className="btn btn-ghost btn-icon" onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages} style={{ width: 32, height: 32 }}><ChevronRight size={16} /></button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
        <button className="btn btn-ghost btn-icon" onClick={() => setScale(s => Math.max(0.5, s - 0.25))} style={{ width: 32, height: 32 }}><ZoomOut size={15} /></button>
        <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 44, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
        <button className="btn btn-ghost btn-icon" onClick={() => setScale(s => Math.min(3, s + 0.25))} style={{ width: 32, height: 32 }}><ZoomIn size={15} /></button>
      </div>
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', background: '#525659', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 16, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <canvas style={{ display: 'block', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', borderRadius: 4, maxWidth: '100%' }} />
      </div>
    </div>
  )
}
