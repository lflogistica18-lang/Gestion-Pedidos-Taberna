export interface ErrorBase {
  message: string
  code?: string
}

/** Texto para la pantalla a partir de un error de Supabase (o de cualquier cosa que se tire). */
export function textoError(err: ErrorBase | null, repetido = 'Ya existe un registro igual'): string {
  if (!err) return 'Error desconocido'
  if (err.code === '23505') return repetido
  return err.message
}

export function mensajeDeExcepcion(e: unknown): string {
  return e instanceof Error ? e.message : 'Error de conexión'
}

export type Resultado = { error: string | null }
