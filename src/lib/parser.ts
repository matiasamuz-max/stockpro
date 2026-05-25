// src/lib/parser.ts
// Procesamiento de archivos Excel y CSV para carga de controles

import * as XLSX from 'xlsx'
import { FilaInventario } from '@/types'

/**
 * Columnas aceptadas en el archivo de inventario.
 * El parser es tolerante a mayúsculas/minúsculas y variaciones.
 */
const ALIAS_CODIGO = ['codigo', 'code', 'sku', 'cod', 'código']
const ALIAS_NOMBRE = ['nombre', 'name', 'descripcion', 'descripción', 'producto', 'articulo', 'artículo']
const ALIAS_CANTIDAD = ['cantidad', 'qty', 'quantity', 'stock', 'real', 'cantidad_real', 'fisico', 'físico']

function normalizar(str: string): string {
  return str.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function encontrarColumna(headers: string[], aliases: string[]): string | null {
  for (const h of headers) {
    if (aliases.includes(normalizar(h))) return h
  }
  return null
}

export interface ResultadoParser {
  filas: FilaInventario[]
  errores: string[]
  advertencias: string[]
}

/**
 * Parsea un archivo Excel (.xlsx, .xls) o CSV y devuelve
 * las filas normalizadas con código, nombre y cantidad real.
 */
export async function parsearArchivoInventario(
  file: File
): Promise<ResultadoParser> {
  const errores: string[] = []
  const advertencias: string[] = []
  const filas: FilaInventario[] = []

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })

    // Usar la primera hoja
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      errores.push('El archivo no contiene hojas de datos.')
      return { filas, errores, advertencias }
    }

    const sheet = workbook.Sheets[sheetName]
    const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (!raw.length) {
      errores.push('La hoja está vacía o no tiene datos.')
      return { filas, errores, advertencias }
    }

    const headers = Object.keys(raw[0])
    const colCodigo   = encontrarColumna(headers, ALIAS_CODIGO)
    const colNombre   = encontrarColumna(headers, ALIAS_NOMBRE)
    const colCantidad = encontrarColumna(headers, ALIAS_CANTIDAD)

    if (!colCodigo)   errores.push('No se encontró columna de código/SKU.')
    if (!colCantidad) errores.push('No se encontró columna de cantidad/stock real.')
    if (!colNombre)   advertencias.push('No se encontró columna de nombre; se usará el código como nombre.')

    if (errores.length) return { filas, errores, advertencias }

    let filasSaltadas = 0

    for (let i = 0; i < raw.length; i++) {
      const row = raw[i]
      const codigo   = String(row[colCodigo!]).trim()
      const nombre   = colNombre ? String(row[colNombre]).trim() : codigo
      const cantRaw  = row[colCantidad!]
      const cantidad = Number(cantRaw)

      if (!codigo) { filasSaltadas++; continue }

      if (isNaN(cantidad) || cantidad < 0) {
        advertencias.push(`Fila ${i + 2}: cantidad inválida para ${codigo} ("${cantRaw}") — se omite.`)
        filasSaltadas++
        continue
      }

      filas.push({ codigo, nombre, cantidad_real: Math.round(cantidad) })
    }

    if (filasSaltadas > 0) {
      advertencias.push(`${filasSaltadas} fila(s) omitidas por datos faltantes o inválidos.`)
    }

  } catch (err) {
    errores.push(`Error al leer el archivo: ${err instanceof Error ? err.message : 'desconocido'}`)
  }

  return { filas, errores, advertencias }
}

/**
 * Compara las filas del archivo con el stock teórico y
 * devuelve el detalle de diferencias.
 */
export function compararConStockTeorico(
  filasArchivo: FilaInventario[],
  stockTeorico: { codigo: string; producto_id: string; cantidad: number }[]
): {
  producto_id: string
  cantidad_teorica: number
  cantidad_real: number
  diferencia: number
}[] {
  const mapaArch = new Map(filasArchivo.map(f => [f.codigo.toUpperCase(), f.cantidad_real]))

  return stockTeorico.map(s => {
    const real = mapaArch.get(s.codigo.toUpperCase()) ?? 0
    return {
      producto_id:      s.producto_id,
      cantidad_teorica: s.cantidad,
      cantidad_real:    real,
      diferencia:       real - s.cantidad,
    }
  })
}

/**
 * Calcula métricas del control: total SKUs, diferencias y precisión.
 */
export function calcularMetricasControl(
  detalles: { diferencia: number }[]
): { total_skus: number; total_difs: number; precision: number } {
  const total_skus = detalles.length
  const total_difs = detalles.filter(d => d.diferencia !== 0).length
  const precision  = total_skus > 0
    ? Math.round(((total_skus - total_difs) / total_skus) * 10000) / 100
    : 0
  return { total_skus, total_difs, precision }
}
