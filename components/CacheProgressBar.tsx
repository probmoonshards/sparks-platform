'use client'
import { useCache } from './CacheContext'

export default function CacheProgressBar() {
  const { isCaching, cacheProgress } = useCache()

  if (!isCaching && cacheProgress === 0) return null

  return (
    <div className="cache-progress-bar">
      <div
        className="cache-progress-fill"
        style={{ width: `${cacheProgress}%` }}
      />
    </div>
  )
}
