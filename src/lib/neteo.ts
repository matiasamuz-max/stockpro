// src/lib/neteo.ts
// Algoritmo de neteo inteligente entre depósitos

import { DetalleControl, SugerenciaNeteo, Prioridad } from '@/types'

interface DifPorProducto {
  producto_id: string
  producto_codigo: string
  producto_nombre: string
  deposito_id: string
  deposito_nombre: string
  diferencia: number // negativo = faltante, positivo = sobrante
}

/**
 * Calcula la prioridad de una transferencia basándose en
 * la magnitud del faltante y el impacto en el stock mínimo.
 */
function calcularPrioridad(faltante: number, stockMinimo: number): Prioridad {
  const ratio = Math.abs(faltante) / Math.max(stockMinimo, 1)
  if (ratio >= 1.5) return 'urgente'
  if (ratio >= 1)   return 'alta'
  if (ratio >= 0.5) return 'media'
  return 'baja'
}

/**
 * Algoritmo principal de neteo.
 * Recibe diferencias de múltiples depósitos y devuelve
 * las transferencias sugeridas para compensar faltantes con sobrantes.
 *
 * Estrategia: greedy matching — faltantes más grandes primero,
 * sobrantes más grandes primero.
 */
export function calcularNeteo(
  diferencias: DifPorProducto[],
  stockMinimos: Record<string, number> = {}
): SugerenciaNeteo[] {
  const sugerencias: SugerenciaNeteo[] = []

  // Agrupar por producto
  const porProducto = diferencias.reduce((acc, d) => {
    if (!acc[d.producto_id]) acc[d.producto_id] = []
    acc[d.producto_id].push(d)
    return acc
  }, {} as Record<string, DifPorProducto[]>)

  for (const [productoId, diffs] of Object.entries(porProducto)) {
    // Separar faltantes (diferencia < 0) de sobrantes (diferencia > 0)
    const faltantes = diffs
      .filter(d => d.diferencia < 0)
      .sort((a, b) => a.diferencia - b.diferencia) // más negativos primero

    const sobrantes = diffs
      .filter(d => d.diferencia > 0)
      .sort((a, b) => b.diferencia - a.diferencia) // más positivos primero

    if (!faltantes.length || !sobrantes.length) continue

    // Copias mutables para el algoritmo greedy
    const sobrantesDisp = sobrantes.map(s => ({ ...s, disponible: s.diferencia }))

    for (const faltante of faltantes) {
      let necesita = Math.abs(faltante.diferencia)

      for (const sobrante of sobrantesDisp) {
        if (necesita <= 0) break
        if (sobrante.disponible <= 0) continue
        if (sobrante.deposito_id === faltante.deposito_id) continue

        const mover = Math.min(necesita, sobrante.disponible)
        sobrante.disponible -= mover
        necesita -= mover

        const stockMin = stockMinimos[productoId] ?? 5
        sugerencias.push({
          producto_id:            productoId,
          producto_codigo:        faltante.producto_codigo,
          producto_nombre:        faltante.producto_nombre,
          deposito_origen_id:     sobrante.deposito_id,
          deposito_origen_nombre: sobrante.deposito_nombre,
          deposito_destino_id:    faltante.deposito_id,
          deposito_destino_nombre:faltante.deposito_nombre,
          cantidad_sugerida:      mover,
          prioridad:              calcularPrioridad(faltante.diferencia, stockMin),
          faltante_original:      Math.abs(faltante.diferencia),
          sobrante_disponible:    sobrante.diferencia,
        })
      }
    }
  }

  // Ordenar por prioridad
  const orden: Record<Prioridad, number> = { urgente: 0, alta: 1, media: 2, baja: 3 }
  return sugerencias.sort((a, b) => orden[a.prioridad] - orden[b.prioridad])
}

/**
 * Convierte detalles de control (de múltiples depósitos) al formato
 * que espera calcularNeteo().
 */
export function detallesADiferencias(
  detalles: (DetalleControl & {
    deposito_id: string
    deposito_nombre: string
    producto_codigo: string
    producto_nombre: string
  })[]
): DifPorProducto[] {
  return detalles
    .filter(d => d.diferencia !== 0)
    .map(d => ({
      producto_id:     d.producto_id,
      producto_codigo: d.producto_codigo,
      producto_nombre: d.producto_nombre,
      deposito_id:     d.deposito_id,
      deposito_nombre: d.deposito_nombre,
      diferencia:      d.diferencia,
    }))
}
