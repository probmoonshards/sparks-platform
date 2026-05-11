import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ToastProvider } from '@/components/Toast'
import { CacheProvider } from '@/components/CacheContext'
import CacheProgressBar from '@/components/CacheProgressBar'
import PageTransition from '@/components/PageTransition'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'

export const metadata: Metadata = {
  title: 'SPARKS – Academic Resource Platform',
  description: 'Sharing Peer Academic Resources and Knowledge – TPS-AUH',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#007400" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <ThemeProvider>
          <ToastProvider>
            <CacheProvider>
              <CacheProgressBar />
              <PageTransition>
                {children}
              </PageTransition>
            </CacheProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
