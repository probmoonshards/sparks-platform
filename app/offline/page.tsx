export default function OfflinePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', background: 'var(--bg)', color: 'var(--text)' }}>
      <div style={{ fontSize: 48 }}>📶</div>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>You&apos;re offline</h1>
      <p style={{ fontSize: 15, color: 'var(--text3)', textAlign: 'center', maxWidth: 320 }}>
        Open SPARKS while online first and click &ldquo;Cache all&rdquo; to browse notes offline.
      </p>
      <a href="/" style={{ marginTop: 8, padding: '10px 24px', background: '#007400', color: '#fff', borderRadius: 24, fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>
        Try again
      </a>
    </div>
  )
}
