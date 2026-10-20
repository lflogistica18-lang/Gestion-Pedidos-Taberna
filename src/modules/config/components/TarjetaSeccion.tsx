import type { FormEvent, ReactNode } from 'react'
import { Save } from 'lucide-react'
import { Boton, EncabezadoSeccion } from '@/shared/components/panel'

interface TarjetaSeccionProps {
  icono: ReactNode
  titulo: string
  subtitulo: string
  children: ReactNode
  hayCambios: boolean
  guardando: boolean
  /** Motivo por el que no se puede guardar aunque haya cambios (error de carga, dato inválido). */
  motivoBloqueo?: string
  onGuardar: () => void
}

// Tarjeta de formulario: cabecera, campos y pie con "Guardar cambios".
export function TarjetaSeccion({ icono, titulo, subtitulo, children, hayCambios, guardando, motivoBloqueo, onGuardar }: TarjetaSeccionProps) {
  function enviar(e: FormEvent) {
    e.preventDefault()
    if (hayCambios && !guardando && !motivoBloqueo) onGuardar()
  }
  return (
    <form onSubmit={enviar} className="rounded-xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta" noValidate>
      <div className="border-b border-borde-sutil p-4 sm:p-5">
        <EncabezadoSeccion icono={icono} titulo={titulo} subtitulo={subtitulo} />
      </div>
      <div className="space-y-5 p-4 sm:p-5">{children}</div>
      <div className="flex flex-col gap-3 border-t border-borde-sutil p-4 sm:flex-row sm:items-center sm:justify-end sm:p-5">
        {motivoBloqueo && <p className="text-xs text-texto-secundario sm:text-right">{motivoBloqueo}</p>}
        <Boton type="submit" variante="primario" disabled={!hayCambios || guardando || Boolean(motivoBloqueo)} className="w-full sm:w-auto">
          <Save size={16} aria-hidden="true" />
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </Boton>
      </div>
    </form>
  )
}
