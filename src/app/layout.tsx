import type { Metadata } from 'next'
import './globals.css'
import { EmpresaProvider } from '@/contexts/EmpresaContext'

export const metadata: Metadata = {
  title: 'Eco Carvão - Sistema de Gestão Sustentável',
  description: 'Gerencie seu negócio de forma inteligente e ecológica',
  manifest: '/manifest.json',
  themeColor: '#10b981',
  viewport: 'width=device-width, initial-scale=1',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'EcoCarvão',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="antialiased">
        <EmpresaProvider>
          {children}
        </EmpresaProvider>
      </body>
    </html>
  )
}