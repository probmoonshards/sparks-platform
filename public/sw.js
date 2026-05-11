/**
 * SPARKS Service Worker — v6
 *
 * Cache buckets:
 *   sparks-files-v1  — user-cached Supabase file blobs (managed by CacheContext)
 *   sparks-shell-v2  — Next.js JS/CSS chunks + page HTML + RSC payloads
 *
 * Storage keys:
 *   HTML navigate responses → stored under pathname           e.g. /notes/abc123
 *   RSC payloads           → stored under pathname + |rsc    e.g. /notes/abc123|rsc
 *   Static assets          → stored under full URL
 *
 * WHY SEPARATE KEYS:
 *   cacheItem() fetches both the HTML and the RSC for each note/capstone URL.
 *   If both are stored under the same pathname key, the second write (RSC)
 *   overwrites the first (HTML). The navigate handler then serves RSC text/x-component
 *   as the page HTML — React receives malformed content and renders a blank screen.
 */

const SHELL_CACHE = 'sparks-shell-v2'
const FILES_CACHE = 'sparks-files-v1'
const RSC_SUFFIX  = '|rsc'

const SHELL_PRECACHE = ['/', '/offline', '/manifest.json']

// ─── Message ────────────────────────────────────────────────────────────────
// Allows ServiceWorkerRegistrar to force this SW to take over immediately
// without the user having to close all tabs or unregister manually.
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => Promise.allSettled(SHELL_PRECACHE.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  )
})

// ─── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  const VALID = new Set([SHELL_CACHE, FILES_CACHE])
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !VALID.has(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function isSupabaseFile(url) {
  return url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/')
}

function isNextStatic(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/pdf.worker.min.mjs' ||
    /\.(ico|png|svg|webp|woff2?|ttf)$/.test(url.pathname)
  )
}

function isRscFetch(request, url, origin) {
  if (url.origin !== origin) return false
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/')) return false
  return (
    request.headers.get('RSC') === '1' ||
    request.headers.has('Next-Router-State-Tree') ||
    (request.headers.get('Accept') || '').includes('text/x-component') ||
    url.searchParams.has('_rsc')
  )
}

function isSameOriginNavigation(request, url, origin) {
  return (
    request.mode === 'navigate' &&
    url.origin === origin &&
    !url.pathname.startsWith('/_next/') &&
    !url.pathname.startsWith('/api/')
  )
}

// HTML key = pathname (no query string)
function htmlKey(url) { return url.pathname }

// RSC key = pathname + suffix (never collides with HTML key)
function rscKey(url) { return url.pathname + RSC_SUFFIX }

async function safeMatchShell(key) {
  try {
    const cache = await caches.open(SHELL_CACHE)
    return await cache.match(key, { ignoreVary: true })
  } catch { return undefined }
}

async function safeMatchFiles(url) {
  try {
    const cache = await caches.open(FILES_CACHE)
    return await cache.match(url, { ignoreVary: true })
  } catch { return undefined }
}

async function safePut(cacheName, key, response) {
  if (!response || !response.ok) return
  try {
    const cache = await caches.open(cacheName)
    await cache.put(key, response)
  } catch {}
}

// Navigate fallback: serve the cached HTML for this exact URL, then fall back to /
async function navigationFallback(url) {
  // Try the exact page HTML first (stored by cacheItem or a prior online visit)
  const exact = await safeMatchShell(htmlKey(url))
  if (exact) {
    // Verify it's actually HTML — not an RSC payload that snuck in
    const ct = exact.headers.get('content-type') || ''
    if (ct.includes('text/html')) return exact.clone()
  }
  // Fall back to app shell /
  const shell = await safeMatchShell('/')
  if (shell) return shell.clone()
  const offline = await safeMatchShell('/offline')
  if (offline) return offline.clone()
  return new Response(
    '<h1>You are offline</h1><p>Open SPARKS online at least once to cache the app shell.</p>',
    { status: 503, headers: { 'Content-Type': 'text/html' } }
  )
}

// RSC fallback: serve the cached RSC payload for this URL (stored under rscKey)
async function rscFallback(url) {
  const cached = await safeMatchShell(rscKey(url))
  if (cached) return cached.clone()
  return new Response('Offline', { status: 503 })
}

// ─── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  let url
  try { url = new URL(request.url) } catch { return }

  const origin = self.location.origin

  // ── 1. Supabase file URLs → Cache-first, ignoreVary ───────────────────────
  if (isSupabaseFile(url)) {
    event.respondWith(
      safeMatchFiles(url).then(cached => {
        if (cached) return cached.clone()
        return fetch(request).catch(() =>
          new Response(
            JSON.stringify({ error: 'offline', message: 'File not cached.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
        )
      })
    )
    return
  }

  // ── 2. Next.js static assets → Cache-first ────────────────────────────────
  if (isNextStatic(url)) {
    event.respondWith(
      safeMatchShell(request.url).then(cached => {
        if (cached) return cached.clone()
        return fetch(request)
          .then(res => { safePut(SHELL_CACHE, request.url, res.clone()); return res })
          .catch(() => new Response('', { status: 503 }))
      })
    )
    return
  }

  // ── 3. RSC fetches → store under rscKey (pathname + |rsc) ─────────────────
  if (isRscFetch(request, url, origin)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Store RSC under a key that can NEVER overwrite the HTML
          if (response.ok) safePut(SHELL_CACHE, rscKey(url), response.clone())
          return response
        })
        .catch(() => rscFallback(url))
    )
    return
  }

  // ── 4. Hard navigations → Network-first, exact HTML fallback, then / ──────
  if (isSameOriginNavigation(request, url, origin)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Store HTML under htmlKey (pathname only, no query string)
          if (response.ok) safePut(SHELL_CACHE, htmlKey(url), response.clone())
          return response
        })
        .catch(() => navigationFallback(url))
    )
    return
  }

  // ── 5. Everything else → network only ─────────────────────────────────────
})
