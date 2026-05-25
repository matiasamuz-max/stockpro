'use client'
// src/app/neteo/page.tsx

import { useEffect, useState } from 'react'
import { getSugerenciasNeteo, aprobarTransferencias } from '@/lib/queries'
import type { SugerenciaNeteo, Prioridad } from '@/types'
import { ArrowRight, Wand2, Download, Check } from 'lucide-react'

const PRIORIDAD_STYLE: Record<Prioridad, { label: string; cls: string }> = {
  urgente: { label: 'Urgente', cls: 'badge-danger'  },
  alta:    { label: 'Alta',    cls: 'badge-warn'    },
  media:   { label: 'Media',   cls: 'badge-info'    },
  baja:    { label: 'Baja',    cls: 'badge-ok'      },
}

export default function NeteoPage() {
  const [sugerencias, setSugerencias] = useState<SugerenciaNeteo[]>([])
  const [loading, setLoading]         = useState(true)
  const [aprobando, setAprobando]     = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())

  useEffect(() => {
    const now = new Date()
    // Semana ISO actual (aproximación)
    const semana = Math.ceil((now.getDate() + new Date(now.getFullYear(), 0, 1).getDay()) / 7)
    getSugerenciasNeteo(semana, now.getFullYear())
      .then(setSugerencias)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const toggleSelect = (i: number) => {
    const next = new Set(seleccionados)
    next.has(i) ? next.delete(i) : next.add(i)
    setSeleccionados(next)
  }

  const handleAprobarTodas = async () => {
    setAprobando(true)
    // En producción, aquí se crean las transferencias en Supabase
    // y se actualizan los stocks
    await new Promise(r => setTimeout(r, 1000))
    alert('Transferencias aprobadas. Se generaron las órdenes de movimiento.')
    setAprobando(false)
  }

  const totalFaltantes = sugerencias.reduce((s, t) => s + t.faltante_original, 0)
  const totalSobrantes = sugerencias.reduce((s, t) => s + t.sobrante_disponible, 0)
  const totalMover     = sugerencias.reduce((s, t) => s + t.cantidad_sugerida, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Neteo inteligente</h1>
          <p className="text-sm text-gray-500">Compensación automática de faltantes con sobrantes entre depósitos</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Download size={14} /> Exportar plan
          </button>
          <button
            onClick={handleAprobarTodas}
            disabled={aprobando}
            className="btn-primary flex items-center gap-2"
          >
            <Check size={14} />
            {aprobando ? 'Aprobando...' : 'Aprobar todas'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Faltantes totales</p>
          <p className="text-2xl font-medium text-red-600">-{totalFaltantes} u</p>
          <p className="text-xs text-gray-400 mt-1">En múltiples depósitos</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Sobrantes totales</p>
          <p className="text-2xl font-medium text-green-700">+{totalSobrantes} u</p>
          <p className="text-xs text-gray-400 mt-1">Disponibles para netear</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Unidades a mover</p>
          <p className="text-2xl font-medium text-gray-900">{totalMover}</p>
          <p className="text-xs text-gray-400 mt-1">{sugerencias.length} transferencias sugeridas</p>
        </div>
      </div>

      {/* Lista de transferencias */}
      <div className="card">
        <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Wand2 size={15} /> Transferencias sugeridas
        </h2>

        {loading ? (
          <p className="text-sm text-gray-400">Calculando neteo...</p>
        ) : sugerencias.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Check size={32} className="mx-auto mb-2 text-green-500" />
            <p className="text-sm">No hay diferencias compensables esta semana.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sugerencias.map((s, i) => {
              const pr = PRIORIDAD_STYLE[s.prioridad]
              return (
                <div
                  key={i}
                  onClick={() => toggleSelect(i)}
                  className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-colors
                    ${seleccionados.has(i) ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  {/* Origen */}
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-center min-w-[110px]">
                    <p className="text-xs font-medium text-blue-800">{s.deposito_origen_nombre}</p>
                    <p className="text-xs text-blue-600 mt-0.5">+{s.sobrante_disponible} disponibles</p>
                  </div>

                  <ArrowRight size={16} className="text-blue-500 flex-shrink-0" />

                  {/* Detalle */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Mover <span className="text-blue-600">{s.cantidad_sugerida} un.</span> — {s.producto_nombre}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {s.producto_codigo} · Faltante original: {s.faltante_original} un.
                    </p>
                  </div>

                  {/* Destino */}
                  <div className="bg-red-50 rounded-lg px-3 py-2 text-center min-w-[110px]">
                    <p className="text-xs font-medium text-red-800">{s.deposito_destino_nombre}</p>
                    <p className="text-xs text-red-600 mt-0.5">-{s.faltante_original} faltante</p>
                  </div>

                  <span className={`badge ${pr.cls} flex-shrink-0`}>{pr.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
