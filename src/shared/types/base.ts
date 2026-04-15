// Tipos base compartidos — todo proyecto los usa

export interface EntidadBase {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Respuesta<T> {
  data: T | null
  error: string | null
}

// Schema de campos para CrudManager
export interface CampoSchema {
  nombre: string
  etiqueta: string
  tipo: 'texto' | 'numero' | 'fecha' | 'select' | 'boolean' | 'textarea'
  obligatorio?: boolean
  opciones?: string[] // para tipo select
  placeholder?: string
}

// Estado de una operacion async
export interface EstadoAsync<T> {
  datos: T | null
  cargando: boolean
  error: string | null
}
