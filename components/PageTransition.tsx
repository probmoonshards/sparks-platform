'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [visible, setVisible] = useState(true)
  const [prevPath, setPrevPath] = useState(pathname)

  useEffect(() => {
    if (pathname === prevPath) return
    // Fade out briefly then fade back in for the new page
    setVisible(false)
    const t = setTimeout(() => {
      setPrevPath(pathname)
      setVisible(true)
    }, 180)
    return () => clearTimeout(t)
  }, [pathname, prevPath])

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: visible
        ? 'opacity 0.3s ease, transform 0.3s ease'
        : 'opacity 0.18s ease, transform 0.18s ease',
    }}>
      {children}
    </div>
  )
}
