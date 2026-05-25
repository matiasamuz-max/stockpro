// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'StockPro — Control de inventario',
  description: 'Plataforma de control de stock y conciliación para múltiples depósitos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-52 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
