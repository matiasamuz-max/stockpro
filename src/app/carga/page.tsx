'use client'
import { useState, useRef } from 'react'
import { parsearArchivoInventario } from '@/lib/parser'
import { guardarControl } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import type { FilaInventario } from '@/types'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react'

const SEMANA_ACTUAL = 22
const ANIO_ACTUAL = 2026
const DEPOSITOS_DEMO = [
  { id: 'dep-norte', nombre: 'Depósito Norte' },
  { id: 'dep-sur', nombre: 'Depósito Sur' },
  { id: 'dep-centro', nombre: 'Depósito Centro' },
  { id: 'dep-este', nombre: 'Depósito Este' },
  { id: 'dep-oeste', nombre: 'Depósito Oeste' },
  { id: 'dep-palermo', nombre: 'Depósito Palermo' },
  { id: 'dep-avellaneda', nombre: 'Depósito Avellaneda' },
  { id: 'dep-quilmes', nombre: 'Depósito Quilmes' },
]

type Estado = 'idle' | 'parseando' | 'preview' | 'guardando' | 'ok' | 'error'

export default function CargaPage() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [depositoId, setDepositoId] = useState(DEPOSITOS_DEMO[0].id)
  const [semana, setSemana] = useState(SEMANA_ACTUAL)
  const [estado, setEstado] = useState<Estado>('idle')
  const [filas, setFilas] = useState<FilaInventario[]>([])
  const [errores, setErrores] = useState<string[]>([])
  const [advertencias, setAdvertencias] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setArchivo(file)
    setEstado('parseando')
    const result = await parsearArchivoInventario(file)
    setFilas(result.filas)
    setErrores(result.errores)
    setAdvertencias(result.advertencias)
    setEstado(result.errores.length ? 'error' : 'preview')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleGuardar = async () => {
    setEstado('guardando' as Estado)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await guardarControl(depositoId, semana, ANIO_ACTUAL, filas, user?.id ?? '')
      setEstado('ok' as Estado)
    } catch (err) {
      setErrores([`Error al guardar: ${err instanceof Error ? err.message : 'desconocido'}`])
      setEstado('error' as Estado)
    }
  }

  const isGuardando = estado === ('guardando' as Estado)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Carga de control semanal</h1>
        <p className="text-sm text-gray-500">Subí el archivo Excel o CSV con el inventario físico contado</p>
      </div>

      {estado === ('ok' as Estado) ? (
        <div className="card text-center py-10">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Control procesado correctamente</h2>
          <p className="text-sm text-gray-500 mb-6">
            Se compararon {filas.length} SKUs y se detectaron las diferencias automáticamente.
          </p>
          <div className="flex justify-center gap-3">
            <a href={`/depositos/${depositoId}`} className="btn-secondary">Ver depósito →</a>
            <a href="/neteo" className="btn-primary">Ver neteo inteligente →</a>
          </div>
        </div>
      ) : (
        <>
          <div className="card mb-4">
            <h2 className="text-sm font-medium mb-3">Configuración del control</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Depósito</label>
                <select value={depositoId} onChange={e => setDepositoId(e.target.value)} className="input w-full">
                  {DEPOSITOS_DEMO.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Semana</label>
                <select value={semana} onChange={e => setSemana(Number(e.target.value))} className="input w-full">
                  {[22, 21, 20, 19].map(s => (
                    <option key={s} value={s}>Semana {s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Año</label>
                <input type="text" value={ANIO_ACTUAL} readOnly className="input w-full bg-gray-50" />
              </div>
            </div>
          </div>

          {(estado === ('idle' as Estado) || estado === ('parseando' as Estado)) && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors mb-4"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {estado === ('parseando' as Estado) ? (
                <p className="text-sm text-gray-400">Procesando archivo...</p>
              ) : (
                <>
                  <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium text-gray-700 mb-1">Arrastrá tu archivo acá o hacé click</p>
                  <p className="text-xs text-gray-400">Formatos: .xlsx · .xls · .csv</p>
                </>
              )}
            </div>
          )}

          {errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              {errores.map((e, i) => (
                <p key={i} className="text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {e}
                </p>
              ))}
            </div>
          )}

          {advertencias.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              {advertencias.map((a, i) => (
                <p key={i} className="text-xs text-amber-700">{a}</p>
              ))}
            </div>
          )}

          {estado === ('preview' as Estado) && filas.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium">{filas.length} productos detectados</h2>
                <button onClick={() => { setEstado('idle' as Estado); setArchivo(null); setFilas([]) }}>
                  <X size={16} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto mb-4">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Código</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Nombre</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.slice(0, 50).map((f, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 px-3 text-blue-600 font-medium">{f.codigo}</td>
                        <td className="py-1.5 px-3 text-gray-700">{f.nombre}</td>
                        <td className="py-1.5 px-3 text-right text-gray-900">{f.cantidad_real}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={handleGuardar}
                disabled={isGuardando}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Upload size={15} />
                {isGuardando ? 'Guardando...' : 'Procesar y detectar diferencias'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
