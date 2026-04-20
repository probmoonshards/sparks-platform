'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Note, Capstone } from '@/lib/constants'

const CACHE_NAME = 'sparks-files-v1'
const CACHED_IDS_KEY = 'sparks_cached_ids'
const CACHED_NOTES_KEY = 'sparks_cached_notes'
const CACHED_CAPS_KEY = 'sparks_cached_caps'

type CacheCtxType = {
  cachedIds: Set<string>
  isOnline: boolean
  isCaching: boolean
  cacheProgress: number
  cacheItem: (id: string, fileUrls: string[]) => Promise<void>
  uncacheItem: (id: string, fileUrls: string[]) => Promise<void>
  isCached: (id: string) => boolean
  cacheAll: (items: { id: string; fileUrls: string[] }[], notes: Note[], caps: Capstone[]) => Promise<void>
  getOfflineNotes: () => Note[]
  getOfflineCaps: () => Capstone[]
  saveNotesData: (notes: Note[]) => void
  saveCapsData: (caps: Capstone[]) => void
}

const CacheCtx = createContext<CacheCtxType>({
  cachedIds: new Set(),
  isOnline: true,
  isCaching: false,
  cacheProgress: 0,
  cacheItem: async () => {},
  uncacheItem: async () => {},
  isCached: () => false,
  cacheAll: async () => {},
  getOfflineNotes: () => [],
  getOfflineCaps: () => [],
  saveNotesData: () => {},
  saveCapsData: () => {},
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

export function CacheProvider({ children }: { children: React.ReactNode }) {
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set())
  const [isOnline, setIsOnline] = useState(true)
  const [isCaching, setIsCaching] = useState(false)
  const [cacheProgress, setCacheProgress] = useState(0)

  useEffect(() => {
    setCachedIds(new Set(ls<string[]>(CACHED_IDS_KEY, [])))
    setIsOnline(navigator.onLine)
    const up = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  const cacheItem = useCallback(async (id: string, fileUrls: string[]) => {
    if (!('caches' in window)) return
    try {
      const cache = await caches.open(CACHE_NAME)
      await Promise.all(fileUrls.map(url => cache.add(url).catch(() => {})))
      setCachedIds(prev => {
        const next = new Set(prev)
        next.add(id)
        lsSet(CACHED_IDS_KEY, Array.from(next))
        return next
      })
    } catch {}
  }, [])

  const uncacheItem = useCallback(async (id: string, fileUrls: string[]) => {
    if (!('caches' in window)) return
    try {
      const cache = await caches.open(CACHE_NAME)
      await Promise.all(fileUrls.map(url => cache.delete(url).catch(() => {})))
      setCachedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        lsSet(CACHED_IDS_KEY, Array.from(next))
        return next
      })
    } catch {}
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
    const newIds = new Set(cachedIds)
    for (const item of items) {
      await Promise.all(item.fileUrls.map(url => cache.add(url).catch(() => {})))
      newIds.add(item.id)
      done++
      setCacheProgress(Math.round((done / items.length) * 100))
    }
    lsSet(CACHED_IDS_KEY, Array.from(newIds))
    lsSet(CACHED_NOTES_KEY, notes)
    lsSet(CACHED_CAPS_KEY, caps)
    setCachedIds(newIds)
    setIsCaching(false)
    setCacheProgress(100)
    setTimeout(() => setCacheProgress(0), 2000)
  }, [cachedIds])

  const getOfflineNotes = useCallback((): Note[] => ls<Note[]>(CACHED_NOTES_KEY, []), [])
  const getOfflineCaps = useCallback((): Capstone[] => ls<Capstone[]>(CACHED_CAPS_KEY, []), [])

  const saveNotesData = useCallback((notes: Note[]) => {
    lsSet(CACHED_NOTES_KEY, notes)
  }, [])

  const saveCapsData = useCallback((caps: Capstone[]) => {
    lsSet(CACHED_CAPS_KEY, caps)
  }, [])

  return (
    <CacheCtx.Provider value={{
      cachedIds, isOnline, isCaching, cacheProgress,
      cacheItem, uncacheItem, isCached, cacheAll,
      getOfflineNotes, getOfflineCaps, saveNotesData, saveCapsData,
    }}>
      {children}
    </CacheCtx.Provider>
  )
}

export const useCache = () => useContext(CacheCtx)
