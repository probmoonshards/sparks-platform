'use client'
import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          // Always re-fetch sw.js from network — never serve from browser cache
          updateViaCache: 'none',
        })

        // If a new SW is already waiting (installed but blocked by old SW),
        // tell it to skip waiting and take over immediately.
        // This fires on every page load so no user action is ever needed.
        const skipWaiting = (sw: ServiceWorker) => {
          sw.postMessage({ type: 'SKIP_WAITING' })
        }

        if (reg.waiting) {
          skipWaiting(reg.waiting)
        }

        // New SW installed while page is open — skip waiting immediately
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing
          if (!newSW) return
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed') {
              skipWaiting(newSW)
            }
          })
        })

        // Once the new SW has claimed this client, reload so the page
        // is served by the fresh SW with correct cache keys
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })

        // Poll for updates on tab focus so deployments propagate quickly
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => {})
          }
        })

      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[SW] Registration failed:', err)
        }
      }
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }
  }, [])

  return null
}
