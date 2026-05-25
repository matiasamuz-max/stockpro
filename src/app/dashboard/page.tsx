'use client'
// src/app/dashboard/page.tsx

import { useEffect, useState } from 'react'
import { getEstadoDepositos } from '@/lib/queries'
import type { EstadoDeposito } from '@/types'
import { AlertTriangle, Package, ArrowLeftRight, TrendingUp } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLOR_MAP = {
  verde:    { dot: '#639922', text: '#27500A', bg: '#EAF3DE' },
  amarillo: { dot: '#BA7517', text: '#633806', bg: '#FAEEDA' },
  rojo:     { dot: '#E24B4A', text: '#791F1F', bg: '#FCEBEB' },
}

const precisionHistorica = [
  { semana: 'S16', precision: 89 },
  { semana: 'S17', precision: 91 },
  { semana: 'S18', precision: 88 },
  { semana: 'S19', precision: 92 },
  { semana: 'S20', precision: 92 },
  { semana: 'S21', precision: 93.4 },
]

export default function DashboardPage() {
  const [depositos, setDepositos] = useState<EstadoDeposito[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getEstadoDepositos()
      .then(setDepositos)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalDifs    = depositos.reduce((s, d) => s + d.total_diferencias, 0)
  const precisionAvg = depositos.length
    ? (depositos.reduce((s, d) => s + d.precision, 0) / depositos.length).toFixed(1)
    : '—'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">Semana 21 · Lunes 25 de mayo 2026</p>
          <h1 className="text-xl font-medium text-gray-900">Dashboard general</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Exportar</button>
          <a href="/carga" className="btn-primary">+ Nuevo control</a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Precisión general',       value: `${precisionAvg}%`, sub: '+1.2% vs semana ant.', icon: TrendingUp,      color: 'green' },
          { label: 'Total diferencias',        value: totalDifs,          sub: '12 sin resolver',      icon: AlertTriangle,   color: 'red'   },
          { label: 'Transferencias sugeridas', value: 8,                  sub: 'Neteo pendiente',       icon: ArrowLeftRight,  color: 'blue'  },
          { label: 'Productos críticos',       value: 14,                 sub: 'Sin stock / bajo stock',icon: Package,         color: 'amber' },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className="text-2xl font-medium text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Depósitos */}
        <div className="card">
          <h2 className="text-sm font-medium mb-4">Estado de depósitos</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : (
            <div className="space-y-2">
              {depositos.map(dep => {
                const c = COLOR_MAP[dep.estado_color]
                return (
                  <a
                    key={dep.id}
                    href={`/depositos/${dep.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{dep.nombre}</p>
                      <p className="text-xs text-gray-400">{dep.responsable}</p>
                    </div>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${dep.precision}%`, background: c.dot }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: c.text }}>
                      {dep.total_diferencias} dif
                    </span>
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* Gráfico precisión */}
        <div className="card">
          <h2 className="text-sm font-medium mb-4">Precisión — últimas 6 semanas</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={precisionHistorica}>
              <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Precisión']} />
              <Line
                type="monotone"
                dataKey="precision"
                stroke="#185FA5"
                strokeWidth={2}
                dot={{ r: 3, fill: '#185FA5' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla diferencias */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Diferencias detectadas — semana 21</h2>
          <a href="/neteo" className="btn-secondary text-xs">Ver neteo inteligente →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                {['Código','Producto','Categoría','Depósito','Teórico','Real','Diferencia','Estado'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { cod:'SKU-4421', prod:'Parlante BT X50',   cat:'Audio',    dep:'Dep. Oeste',     teo:24, real:11, dif:-13, estado:'Crítico'  },
                { cod:'SKU-2210', prod:'Smart TV 55"',      cat:'Video',    dep:'Dep. Centro',    teo:8,  real:5,  dif:-3,  estado:'Faltante' },
                { cod:'SKU-7832', prod:'iPhone 16 Pro',     cat:'Telefonía',dep:'Dep. Oeste',     teo:15, real:10, dif:-5,  estado:'Faltante' },
                { cod:'SKU-1104', prod:'Auriculares Sony WH',cat:'Audio',   dep:'Dep. Este',      teo:30, real:36, dif:+6,  estado:'Sobrante' },
                { cod:'SKU-9901', prod:'Control PS5',       cat:'Gaming',   dep:'Dep. Norte',     teo:20, real:22, dif:+2,  estado:'Sobrante' },
              ].map(r => (
                <tr key={r.cod} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 text-blue-600 font-medium">{r.cod}</td>
                  <td className="py-2 px-3 text-gray-900">{r.prod}</td>
                  <td className="py-2 px-3 text-gray-500">{r.cat}</td>
                  <td className="py-2 px-3 text-gray-500">{r.dep}</td>
                  <td className="py-2 px-3 text-right">{r.teo}</td>
                  <td className="py-2 px-3 text-right">{r.real}</td>
                  <td className={`py-2 px-3 text-right font-medium ${r.dif < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {r.dif > 0 ? `+${r.dif}` : r.dif}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`badge ${r.estado === 'Crítico' ? 'badge-danger' : r.estado === 'Faltante' ? 'badge-warn' : 'badge-ok'}`}>
                      {r.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
