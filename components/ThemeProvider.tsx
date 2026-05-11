'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { getTheme, saveTheme } from '@/lib/constants'

const ThemeCtx = createContext<{ theme: string; toggle: () => void }>({ theme: 'light', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const t = getTheme()
    setTheme(t)
    document.documentElement.classList.toggle('dark', t === 'dark')
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    saveTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)
