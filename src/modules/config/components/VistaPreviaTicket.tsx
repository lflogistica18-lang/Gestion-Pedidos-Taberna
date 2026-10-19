import { fmtMonto } from '@/shared/components/panel'
import { cn } from '@/shared/lib/cn'
import type { PapelMm } from '@/shared/lib/config'

interface VistaPreviaTicketProps {
  nombreLocal: string
  direccion: string | null
  telefono: string | null
  pie: string
  papel: PapelMm
}

const EJEMPLO = [
  { cant: 1, nombre: 'Hamburguesa Clásica', precio: 3500 },
  { cant: 2, nombre: 'Fernet con Coca', precio: 3000 },
]

// Tirita simulada: ayuda a ver cómo queda el ticket antes de imprimir.
export function VistaPreviaTicket({ nombreLocal, direccion, telefono, pie, papel }: VistaPreviaTicketProps) {
  const total = EJEMPLO.reduce((acc, i) => acc + i.cant * i.precio, 0)
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1.5 text-sm font-medium text-texto-primario">Vista previa</figcaption>
      <div
        className={cn(
          'max-w-full rounded-md border border-dashed border-borde-sutil bg-bg-tarjeta p-3 font-mono text-xs',
          papel === 80 ? 'w-72' : 'w-52',
        )}
      >
        <p className="break-words text-center text-sm font-bold text-texto-primario">{nombreLocal || 'Nombre del local'}</p>
        {direccion && <p className="mt-0.5 break-words text-center text-texto-secundario">{direccion}</p>}
        {telefono && <p className="break-words text-center text-texto-secundario">{telefono}</p>}
        <p className="my-2 border-y border-dashed border-borde-sutil py-1 text-center font-bold text-texto-primario">PEDIDO #123</p>
        <ul className="space-y-0.5 text-texto-primario">
          {EJEMPLO.map((i) => (
            <li key={i.nombre} className="flex justify-between gap-2">
              <span className="min-w-0 break-words">{i.cant} x {i.nombre}</span>
              <span className="shrink-0">{fmtMonto(i.cant * i.precio)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex justify-between border-t border-dashed border-borde-sutil pt-1 font-bold text-texto-primario">
          <span>TOTAL</span>
          <span>{fmtMonto(total)}</span>
        </p>
        {pie && <p className="mt-2 break-words text-center text-texto-secundario">{pie}</p>}
      </div>
    </figure>
  )
}
