'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Note, Capstone } from '@/lib/constants'

const CACHE_NAME = 'sparks-files-v1'
const CACHED_IDS_KEY = 'sparks_cached_ids'
const CACHED_NOTES_KEY = 'sparks_cached_notes'
const CACHED_CAPS_KEY = 'sparks_cached_caps'
// Per-item storage: keyed by ID so detail pages can load any cached item
// offline even if it wasn't in the home-page snapshot (e.g. beyond limit(50))
const NOTE_ITEM_PREFIX = 'sparks_note_'
const CAP_ITEM_PREFIX = 'sparks_cap_'

type CacheCtxType = {
  cachedIds: Set<string>
  isOnline: boolean
  isCaching: boolean
  cacheProgress: number
  cacheItem: (id: string, fileUrls: string[], item?: Note | Capstone) => Promise<void>
  uncacheItem: (id: string, fileUrls: string[]) => Promise<void>
  isCached: (id: string) => boolean
  cacheAll: (items: { id: string; fileUrls: string[] }[], notes: Note[], caps: Capstone[]) => Promise<void>
  clearCache: () => Promise<void>
  getOfflineNotes: () => Note[]
  getOfflineCaps: () => Capstone[]
  getOfflineNote: (id: string) => Note | null
  getOfflineCap: (id: string) => Capstone | null
  saveNotesData: (notes: Note[]) => void
  saveCapsData: (caps: Capstone[]) => void
  /** Resolves true if network reachable within 3s, false otherwise */
  checkNetwork: () => Promise<boolean>
}

const CacheCtx = createContext<CacheCtxType>({
  cachedIds: new Set(),
  isOnline: true,
  isCaching: false,
  cacheProgress: 0,
  cacheItem: async () => {},  // item param optional
  uncacheItem: async () => {},
  isCached: () => false,
  cacheAll: async () => {},
  clearCache: async () => {},
  getOfflineNotes: () => [],
  getOfflineCaps: () => [],
  getOfflineNote: () => null,
  getOfflineCap: () => null,
  saveNotesData: () => {},
  saveCapsData: () => {},
  checkNetwork: async () => true,
})

function ls<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}

function lsSet(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

async function pingNetwork(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  try {
    const controller = new AbortController()
    // 3 second timeout — shorter than before to avoid mobile hangs
    const timer = setTimeout(() => controller.abort(), 3000)
    await fetch('https://cumaqxnrmxjghdwznouj.supabase.co/rest/v1/', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
    return true
  } catch {
    return false
  }
}

export function CacheProvider({ children }: { children: React.ReactNode }) {
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set())
  // Always initialise as true to match the server render.
  // navigator.onLine must NOT be read in useState() — it runs during client
  // hydration before React finishes reconciling, so if the device is offline
  // it returns false while the server rendered true → hydration mismatch.
  // The existing useEffect corrects this to the real value immediately after mount.
  const [isOnline, setIsOnline] = useState(true)
  const [isCaching, setIsCaching] = useState(false)
  const [cacheProgress, setCacheProgress] = useState(0)

  useEffect(() => {
    setCachedIds(new Set(ls<string[]>(CACHED_IDS_KEY, [])))

    // Verify real connectivity on mount (don't block UI on this)
    pingNetwork().then(ok => setIsOnline(ok))

    const handleOnline = () => pingNetwork().then(ok => setIsOnline(ok))
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const checkNetwork = useCallback(async (): Promise<boolean> => {
    const ok = await pingNetwork()
    setIsOnline(ok)
    return ok
  }, [])

  const cacheItem = useCallback(async (id: string, fileUrls: string[], item?: Note | Capstone) => {
    if (!('caches' in window)) return
    try {
      // Step 1: Save metadata to localStorage FIRST — unconditionally.
      // This must happen before any file fetching so that even if files fail,
      // the detail page can still load the note/capstone metadata offline.
      // The detail page (getOfflineNote/getOfflineCap) reads this key directly.
      if (item) {
        const isNote = 'grade' in item
        lsSet(isNote ? NOTE_ITEM_PREFIX + id : CAP_ITEM_PREFIX + id, item)
      }

      // Step 2: Cache files — attempt all, track individual results.
      // A partial failure (some files cached, some not) is still useful:
      // the user can view cached files and the page metadata loads fine.
      // Only throw (and un-mark as cached) if EVERY file failed AND there
      // were files to cache in the first place.
      let anyOk = true
      if (fileUrls.length > 0) {
        const cache = await caches.open(CACHE_NAME)
        const results = await Promise.all(
          fileUrls.map(url =>
            fetch(url, { cache: 'no-store' })
              .then(async res => {
                if (!res.ok) return false
                await cache.put(url, res)
                return true
              })
              .catch(() => false)
          )
        )
        anyOk = results.some(Boolean)
        // If every single file failed, remove the metadata we just saved
        // and throw so the caller can show an error toast
        if (!anyOk) {
          if (item) {
            const isNote = 'grade' in item
            localStorage.removeItem(isNote ? NOTE_ITEM_PREFIX + id : CAP_ITEM_PREFIX + id)
          }
          throw new Error('All files failed to cache')
        }
      }

      // Step 3: Mark as cached in state + localStorage
      setCachedIds(prev => {
        const next = new Set(prev)
        next.add(id)
        lsSet(CACHED_IDS_KEY, Array.from(next))
        return next
      })
    } catch (e) {
      throw e instanceof Error ? e : new Error('Cache failed')
    }
  }, [])

  const uncacheItem = useCallback(async (id: string, fileUrls: string[]) => {
    if (!('caches' in window)) return
    try {
      const cache = await caches.open(CACHE_NAME)
      // Delete all URLs — don't swallow individual errors silently
      await Promise.all(fileUrls.map(url => cache.delete(url)))
      // Remove individual item snapshots (both note and cap keys — only one will exist)
      localStorage.removeItem(NOTE_ITEM_PREFIX + id)
      localStorage.removeItem(CAP_ITEM_PREFIX + id)
      // Only update state after confirmed deletion
      setCachedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        lsSet(CACHED_IDS_KEY, Array.from(next))
        return next
      })
    } catch {
      throw new Error('Uncache failed')
    }
  }, [])

  const isCached = useCallback((id: string) => cachedIds.has(id), [cachedIds])

  const cacheAll = useCallback(async (
    items: { id: string; fileUrls: string[] }[],
    notes: Note[],
    caps: Capstone[]
  ) => {
    if (!('caches' in window) || items.length === 0) return
    setIsCaching(true)
    setCacheProgress(0)
    const cache = await caches.open(CACHE_NAME)
    let done = 0
    const successIds: string[] = []

    // Build lookup maps so we can save individual item objects per ID
    const noteMap = new Map(notes.map(n => [n.id, n]))
    const capMap  = new Map(caps.map(c => [c.id, c]))

    for (const item of items) {
      // Save metadata first — unconditionally — so the detail page can always
      // load the note/capstone offline even if some files fail to cache.
      const note = noteMap.get(item.id)
      const cap  = capMap.get(item.id)
      if (note) lsSet(NOTE_ITEM_PREFIX + item.id, note)
      else if (cap) lsSet(CAP_ITEM_PREFIX + item.id, cap)

      // Cache files
      let anyOk = item.fileUrls.length === 0 // items with no files count as ok
      if (item.fileUrls.length > 0) {
        const results = await Promise.all(
          item.fileUrls.map(url =>
            fetch(url, { cache: 'no-store' })
              .then(async res => {
                if (!res.ok) return false
                await cache.put(url, res)
                return true
              })
              .catch(() => false)
          )
        )
        anyOk = results.some(Boolean)
      }
      // Mark as cached if metadata was saved + at least one file succeeded
      // (or there were no files to cache)
      if (anyOk) successIds.push(item.id)
      else {
        // All files failed — roll back the metadata so UI stays honest
        localStorage.removeItem(NOTE_ITEM_PREFIX + item.id)
        localStorage.removeItem(CAP_ITEM_PREFIX + item.id)
      }

      done++
      setCacheProgress(Math.round((done / items.length) * 100))
    }

    lsSet(CACHED_NOTES_KEY, notes)
    lsSet(CACHED_CAPS_KEY, caps)
    // Use functional updater so we merge with current state — not a stale snapshot
    setCachedIds(prev => {
      const next = new Set(prev)
      successIds.forEach(id => next.add(id))
      lsSet(CACHED_IDS_KEY, Array.from(next))
      return next
    })
    setIsCaching(false)
    setCacheProgress(100)
    setTimeout(() => setCacheProgress(0), 2000)
  }, []) // no cachedIds dependency — uses functional updater instead

  const clearCache = useCallback(async () => {
    if (!('caches' in window)) return
    try {
      await caches.delete(CACHE_NAME)
      lsSet(CACHED_IDS_KEY, [])
      lsSet(CACHED_NOTES_KEY, [])
      lsSet(CACHED_CAPS_KEY, [])
      // Wipe all individual item snapshots saved by cacheItem()
      const toRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith(NOTE_ITEM_PREFIX) || key.startsWith(CAP_ITEM_PREFIX))) {
          toRemove.push(key)
        }
      }
      toRemove.forEach(k => localStorage.removeItem(k))
      setCachedIds(new Set())
    } catch {}
  }, [])

  const getOfflineNotes = useCallback((): Note[] => ls<Note[]>(CACHED_NOTES_KEY, []), [])
  const getOfflineCaps = useCallback((): Capstone[] => ls<Capstone[]>(CACHED_CAPS_KEY, []), [])
  const saveNotesData = useCallback((notes: Note[]) => { lsSet(CACHED_NOTES_KEY, notes) }, [])
  const saveCapsData = useCallback((caps: Capstone[]) => { lsSet(CACHED_CAPS_KEY, caps) }, [])

  // Look up a single cached note/cap by ID.
  // Checks the individual item key first (written by cacheItem() when the user
  // presses Cache on a card), then falls back to the bulk home-page snapshot.
  // This ensures any cached item loads on the detail page even if it was beyond
  // the home page's limit(50) window or uploaded after the snapshot was saved.
  const getOfflineNote = useCallback((id: string): Note | null => {
    const individual = ls<Note | null>(NOTE_ITEM_PREFIX + id, null)
    if (individual) return individual
    return ls<Note[]>(CACHED_NOTES_KEY, []).find(n => n.id === id) ?? null
  }, [])

  const getOfflineCap = useCallback((id: string): Capstone | null => {
    const individual = ls<Capstone | null>(CAP_ITEM_PREFIX + id, null)
    if (individual) return individual
    return ls<Capstone[]>(CACHED_CAPS_KEY, []).find(c => c.id === id) ?? null
  }, [])

  return (
    <CacheCtx.Provider value={{
      cachedIds, isOnline, isCaching, cacheProgress,
      getOfflineNote, getOfflineCap,
      cacheItem, uncacheItem, isCached, cacheAll, clearCache,
      getOfflineNotes, getOfflineCaps, saveNotesData, saveCapsData,
      checkNetwork,
    }}>
      {children}
    </CacheCtx.Provider>
  )
}

export const useCache = () => useContext(CacheCtx)
