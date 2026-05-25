'use client'
import { useState } from 'react'

export default function CargaPage() {
  const [dep, setDep] = useState('dep-norte')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-medium mb-6">Carga de control semanal</h1>
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-medium mb-3">Seleccioná el depósito</h2>
        <select value={dep} onChange={e => setDep(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="dep-norte">Depósito Norte</option>
          <option value="dep-sur">Depósito Sur</option>
          <option value="dep-centro">Depósito Centro</option>
          <option value="dep-oeste">Depósito Oeste</option>
        </select>
      </div>
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
        <p className="text-sm font-medium text-gray-700 mb-1">Arrastrá tu archivo Excel o CSV acá</p>
        <p className="text-xs text-gray-400">Formatos: .xlsx · .xls · .csv</p>
      </div>
    </div>
  )
}
