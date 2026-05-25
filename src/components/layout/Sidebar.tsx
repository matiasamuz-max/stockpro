'use client'
// src/components/layout/Sidebar.tsx

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Warehouse, ArrowLeftRight,
  Upload, BarChart2, History, Settings, UserCircle
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',          icon: LayoutDashboard  },
  { href: '/depositos',  label: 'Depósitos',           icon: Warehouse        },
  { href: '/neteo',      label: 'Neteo inteligente',   icon: ArrowLeftRight   },
  { href: '/carga',      label: 'Carga de control',    icon: Upload           },
  { href: '/analisis',   label: 'Análisis comercial',  icon: BarChart2        },
  { href: '/historial',  label: 'Historial',           icon: History          },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-52 bg-white border-r border-gray-100 flex flex-col px-3 py-4 z-10">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 pb-4 mb-2 border-b border-gray-100">
        <Warehouse size={18} className="text-blue-600" />
        <span className="font-medium text-sm text-gray-900">
          Stock<span className="text-blue-600">Pro</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                ${active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-0.5 pt-2 border-t border-gray-100">
        <Link href="/configuracion" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
          <Settings size={15} /> Configuración
        </Link>
        <Link href="/perfil" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
          <UserCircle size={15} /> Admin
        </Link>
      </div>
    </aside>
  )
}
