// src/types/index.ts

export type Rol = 'admin' | 'supervisor' | 'operador'
export type EstadoColor = 'verde' | 'amarillo' | 'rojo'
export type EstadoControl = 'procesado' | 'revision' | 'cerrado'
export type EstadoTransferencia = 'pendiente' | 'aprobada' | 'completada' | 'cancelada'
export type Prioridad = 'urgente' | 'alta' | 'media' | 'baja'
export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste' | 'transferencia' | 'control'

export interface Deposito {
  id: string
  nombre: string
  responsable: string
  direccion?: string
  activo: boolean
  created_at: string
}

export interface Categoria {
  id: string
  nombre: string
}

export interface Producto {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  categoria_id: string
  categoria?: Categoria
  stock_minimo: number
  activo: boolean
}

export interface Stock {
  id: string
  producto_id: string
  deposito_id: string
  cantidad: number
  producto?: Producto
  deposito?: Deposito
}

export interface ControlSemanal {
  id: string
  deposito_id: string
  deposito?: Deposito
  semana: number
  anio: number
  fecha_carga: string
  usuario_id: string
  archivo_url?: string
  total_skus: number
  total_difs: number
  precision: number
  estado: EstadoControl
}

export interface DetalleControl {
  id: string
  control_id: string
  producto_id: string
  producto?: Producto
  cantidad_teorica: number
  cantidad_real: number
  diferencia: number
}

export interface Transferencia {
  id: string
  producto_id: string
  producto?: Producto
  deposito_origen: string
  depositoOrigen?: Deposito
  deposito_destino: string
  depositoDestino?: Deposito
  cantidad: number
  prioridad: Prioridad
  estado: EstadoTransferencia
  control_id?: string
  created_at: string
  completada_at?: string
}

export interface Movimiento {
  id: string
  tipo: TipoMovimiento
  producto_id: string
  producto?: Producto
  deposito_id: string
  deposito?: Deposito
  cantidad: number
  detalle?: string
  usuario_id: string
  created_at: string
}

export interface Perfil {
  id: string
  nombre: string
  rol: Rol
  deposito_id?: string
}

// Vista v_estado_depositos
export interface EstadoDeposito {
  id: string
  nombre: string
  responsable: string
  total_skus: number
  total_diferencias: number
  precision: number
  estado_color: EstadoColor
  semana?: number
  anio?: number
}

// Para la carga de archivos Excel/CSV
export interface FilaInventario {
  codigo: string
  nombre: string
  cantidad_real: number
}

// Resultado del neteo inteligente
export interface SugerenciaNeteo {
  producto_id: string
  producto_codigo: string
  producto_nombre: string
  deposito_origen_id: string
  deposito_origen_nombre: string
  deposito_destino_id: string
  deposito_destino_nombre: string
  cantidad_sugerida: number
  prioridad: Prioridad
  faltante_original: number
  sobrante_disponible: number
}
