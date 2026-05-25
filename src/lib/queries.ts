// src/lib/queries.ts
// Funciones de consulta a Supabase

import { supabase } from './supabase'
import { calcularNeteo, detallesADiferencias } from './neteo'
import { calcularMetricasControl } from './parser'
import type {
  EstadoDeposito, ControlSemanal, DetalleControl,
  Transferencia, Movimiento, SugerenciaNeteo, FilaInventario
} from '@/types'

// ─── Depósitos ────────────────────────────────────────────────

export async function getEstadoDepositos(): Promise<EstadoDeposito[]> {
  const { data, error } = await supabase
    .from('v_estado_depositos')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data as EstadoDeposito[]
}

// ─── Controles ────────────────────────────────────────────────

export async function getControlesPorDeposito(
  depositoId: string, limit = 10
): Promise<ControlSemanal[]> {
  const { data, error } = await supabase
    .from('controles_semanales')
    .select('*')
    .eq('deposito_id', depositoId)
    .order('anio', { ascending: false })
    .order('semana', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as ControlSemanal[]
}

export async function getDetalleControl(
  controlId: string
): Promise<DetalleControl[]> {
  const { data, error } = await supabase
    .from('detalle_control')
    .select('*, producto:productos(codigo, nombre, categoria:categorias(nombre))')
    .eq('control_id', controlId)
    .order('diferencia')
  if (error) throw error
  return data as unknown as DetalleControl[]
}

// ─── Neteo ────────────────────────────────────────────────────

export async function getSugerenciasNeteo(
  semana: number, anio: number
): Promise<SugerenciaNeteo[]> {
  // Traer todos los detalles con diferencias de la semana actual
  const { data, error } = await supabase
    .from('detalle_control')
    .select(`
      *,
      control:controles_semanales!inner(semana, anio, deposito_id,
        deposito:depositos(id, nombre)),
      producto:productos(id, codigo, nombre, stock_minimo)
    `)
    .eq('controles_semanales.semana', semana)
    .eq('controles_semanales.anio', anio)
    .neq('diferencia', 0)

  if (error) throw error
  if (!data?.length) return []

  const diferencias = (data as any[]).map(d => ({
    producto_id:     d.producto.id,
    producto_codigo: d.producto.codigo,
    producto_nombre: d.producto.nombre,
    deposito_id:     d.control.deposito.id,
    deposito_nombre: d.control.deposito.nombre,
    diferencia:      d.diferencia,
  }))

  const stockMinimos = Object.fromEntries(
    (data as any[]).map(d => [d.producto.id, d.producto.stock_minimo])
  )

  return calcularNeteo(diferencias, stockMinimos)
}

// ─── Transferencias ───────────────────────────────────────────

export async function getTransferencias(
  estado?: string
): Promise<Transferencia[]> {
  let query = supabase
    .from('transferencias')
    .select(`
      *,
      producto:productos(codigo, nombre),
      depositoOrigen:depositos!deposito_origen(nombre),
      depositoDestino:depositos!deposito_destino(nombre)
    `)
    .order('created_at', { ascending: false })

  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) throw error
  return data as unknown as Transferencia[]
}

export async function crearTransferencia(
  t: Omit<Transferencia, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await supabase.from('transferencias').insert(t)
  if (error) throw error
}

export async function aprobarTransferencias(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('transferencias')
    .update({ estado: 'aprobada' })
    .in('id', ids)
  if (error) throw error
}

// ─── Carga de control ─────────────────────────────────────────

export async function guardarControl(
  depositoId: string,
  semana: number,
  anio: number,
  filas: FilaInventario[],
  usuarioId: string
): Promise<string> {
  // 1. Obtener stock teórico del depósito
  const { data: stockData, error: stockError } = await supabase
    .from('stock')
    .select('cantidad, producto:productos(id, codigo)')
    .eq('deposito_id', depositoId)

  if (stockError) throw stockError

  const stockTeorico = (stockData as any[]).map(s => ({
    producto_id: s.producto.id,
    codigo:      s.producto.codigo,
    cantidad:    s.cantidad,
  }))

  // 2. Comparar con el archivo
  const { compararConStockTeorico } = await import('./parser')
  const detalles = compararConStockTeorico(filas, stockTeorico)
  const metricas = calcularMetricasControl(detalles)

  // 3. Insertar cabecera del control
  const { data: control, error: ctrlError } = await supabase
    .from('controles_semanales')
    .insert({
      deposito_id: depositoId,
      semana,
      anio,
      usuario_id:  usuarioId,
      ...metricas,
      estado: metricas.total_difs > 10 ? 'revision' : 'procesado',
    })
    .select()
    .single()

  if (ctrlError) throw ctrlError

  // 4. Insertar detalles en lotes de 500
  const BATCH = 500
  for (let i = 0; i < detalles.length; i += BATCH) {
    const lote = detalles.slice(i, i + BATCH).map(d => ({
      ...d,
      control_id: control.id,
    }))
    const { error } = await supabase.from('detalle_control').insert(lote)
    if (error) throw error
  }

  return control.id
}

// ─── Movimientos / Historial ──────────────────────────────────

export async function getMovimientos(filtros: {
  depositoId?: string
  productoId?: string
  desde?: string
  hasta?: string
  limit?: number
}): Promise<Movimiento[]> {
  let query = supabase
    .from('movimientos')
    .select(`
      *,
      producto:productos(codigo, nombre),
      deposito:depositos(nombre)
    `)
    .order('created_at', { ascending: false })
    .limit(filtros.limit ?? 50)

  if (filtros.depositoId) query = query.eq('deposito_id', filtros.depositoId)
  if (filtros.productoId) query = query.eq('producto_id', filtros.productoId)
  if (filtros.desde)      query = query.gte('created_at', filtros.desde)
  if (filtros.hasta)      query = query.lte('created_at', filtros.hasta)

  const { data, error } = await query
  if (error) throw error
  return data as unknown as Movimiento[]
}
