'use client'
import { useEffect, useState } from 'react'

type CacheEntry = { cacheName: string; url: string; type: string; size: string }
type LSEntry = { key: string; preview: string }

export default function DebugPage() {
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([])
  const [lsEntries, setLsEntries] = useState<LSEntry[]>([])
  const [swStatus, setSwStatus] = useState('checking...')
  const [loading, setLoading] = useState(true)
  const [testUrl, setTestUrl] = useState('')
  const [testResult, setTestResult] = useState('')

  useEffect(() => {
    async function run() {
      // SW status
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg) {
          const sw = reg.active || reg.installing || reg.waiting
          setSwStatus(sw ? `active (scope: ${reg.scope})` : 'registered but no active SW')
        } else {
          setSwStatus('NOT registered')
        }
      } else {
        setSwStatus('not supported')
      }

      // Cache entries
      const entries: CacheEntry[] = []
      if ('caches' in window) {
        const keys = await caches.keys()
        for (const cacheName of keys) {
          const cache = await caches.open(cacheName)
          const requests = await cache.keys()
          for (const req of requests) {
            const res = await cache.match(req, { ignoreVary: true })
            const size = res ? String(res.headers.get('content-length') || '?') : '?'
            const type = res ? (res.headers.get('content-type') || '?') : '?'
            entries.push({ cacheName, url: req.url || String(req), type, size })
          }
        }
      }
      setCacheEntries(entries)

      // localStorage entries
      const ls: LSEntry[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!
        const val = localStorage.getItem(key) || ''
        ls.push({ key, preview: val.slice(0, 120) + (val.length > 120 ? '...' : '') })
      }
      setLsEntries(ls)
      setLoading(false)
    }
    run()
  }, [])

  async function testMatch() {
    if (!testUrl || !('caches' in window)) return
    setTestResult('checking...')
    const keys = await caches.keys()
    const results: string[] = []
    for (const cacheName of keys) {
      const cache = await caches.open(cacheName)
      const m = await cache.match(testUrl, { ignoreVary: true })
      results.push(`${cacheName}: ${m ? `HIT (${m.headers.get('content-type')})` : 'MISS'}`)
    }
    setTestResult(results.join('\n'))
  }

  async function testRscMatch() {
    if (!testUrl || !('caches' in window)) return
    setTestResult('checking RSC...')
    const keys = await caches.keys()
    const results: string[] = []
    for (const cacheName of keys) {
      const cache = await caches.open(cacheName)
      const rscReq = new Request(testUrl, { headers: { 'RSC': '1', 'Next-Router-State-Tree': '%5B%22%22%2C%7B%7D%2Cnull%2Cnull%2Ctrue%5D' } })
      const m1 = await cache.match(rscReq, { ignoreVary: true })
      const m2 = await cache.match(testUrl, { ignoreVary: true })
      results.push(`${cacheName}: RSC-req=${m1 ? 'HIT' : 'MISS'} plain-url=${m2 ? 'HIT' : 'MISS'}`)
    }
    setTestResult(results.join('\n'))
  }

  if (loading) return <div style={{ padding: 24, fontFamily: 'monospace' }}>Loading debug info...</div>

  const shellEntries = cacheEntries.filter(e => e.cacheName.includes('shell'))
  const fileEntries = cacheEntries.filter(e => e.cacheName.includes('files'))
  const sparksLs = lsEntries.filter(e => e.key.startsWith('sparks'))

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', fontSize: 12, maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'sans-serif' }}>SPARKS Cache Debug</h2>

      <section style={{ marginBottom: 24 }}>
        <b>Service Worker:</b> {swStatus}
      </section>

      <section style={{ marginBottom: 24 }}>
        <b>Test URL cache lookup</b>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={testUrl}
            onChange={e => setTestUrl(e.target.value)}
            placeholder="e.g. /notes/abc123 or full URL"
            style={{ flex: 1, padding: '4px 8px', fontFamily: 'monospace', fontSize: 12 }}
          />
          <button onClick={testMatch} style={{ padding: '4px 12px' }}>Match (plain)</button>
          <button onClick={testRscMatch} style={{ padding: '4px 12px' }}>Match (RSC)</button>
        </div>
        {testResult && <pre style={{ background: '#f3f4f6', padding: 8, marginTop: 8 }}>{testResult}</pre>}
      </section>

      <section style={{ marginBottom: 24 }}>
        <b>sparks-shell-v2</b> ({shellEntries.length} entries)
        {shellEntries.length === 0
          ? <div style={{ color: 'red', marginTop: 4 }}>EMPTY — SW shell cache has nothing</div>
          : <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead><tr style={{ background: '#e5e7eb' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>URL</th>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Type</th>
              </tr></thead>
              <tbody>{shellEntries.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: e.url.includes('/notes/') || e.url.includes('/capstones/') ? '#fef9c3' : 'transparent' }}>
                  <td style={{ padding: '3px 8px', wordBreak: 'break-all' }}>{e.url}</td>
                  <td style={{ padding: '3px 8px' }}>{e.type}</td>
                </tr>
              ))}</tbody>
            </table>
        }
      </section>

      <section style={{ marginBottom: 24 }}>
        <b>sparks-files-v1</b> ({fileEntries.length} entries)
        {fileEntries.length === 0
          ? <div style={{ color: 'red', marginTop: 4 }}>EMPTY — no files cached</div>
          : <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead><tr style={{ background: '#e5e7eb' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>URL</th>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Type</th>
              </tr></thead>
              <tbody>{fileEntries.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '3px 8px', wordBreak: 'break-all' }}>{e.url}</td>
                  <td style={{ padding: '3px 8px' }}>{e.type}</td>
                </tr>
              ))}</tbody>
            </table>
        }
      </section>

      <section style={{ marginBottom: 24 }}>
        <b>localStorage (sparks_* keys)</b> ({sparksLs.length} entries)
        {sparksLs.length === 0
          ? <div style={{ color: 'red', marginTop: 4 }}>EMPTY — no sparks localStorage data</div>
          : <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead><tr style={{ background: '#e5e7eb' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Key</th>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Value (truncated)</th>
              </tr></thead>
              <tbody>{sparksLs.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: e.key.startsWith('sparks_note_') || e.key.startsWith('sparks_cap_') ? '#dcfce7' : 'transparent' }}>
                  <td style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}>{e.key}</td>
                  <td style={{ padding: '3px 8px', wordBreak: 'break-all' }}>{e.preview}</td>
                </tr>
              ))}</tbody>
            </table>
        }
      </section>
    </div>
  )
}
