import { ArrowLeft } from 'lucide-react'
import { Boton } from '@/shared/components/panel'
import { capitalizar } from '../lib/iconoCategoria'
import { IconoCategoria } from './IconoCategoria'

interface CabeceraCategoriaProps {
  nombre: string
  cantidad: number
  onVolver: () => void
}

/** Categoría elegida, grande arriba de su lista de productos (vista de tablet). */
export function CabeceraCategoria({ nombre, cantidad, onVolver }: CabeceraCategoriaProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-borde-sutil bg-tono-naranja-fondo p-4 shadow-tarjeta">
      <IconoCategoria nombre={nombre} tamano={72} />
      <div className="min-w-0 flex-1">
        <h3 className="break-words text-2xl font-bold leading-tight text-texto-primario">{capitalizar(nombre)}</h3>
        <p className="text-base text-texto-secundario">
          {cantidad} {cantidad === 1 ? 'producto' : 'productos'}
        </p>
      </div>
      <Boton onClick={onVolver} className="min-h-12 text-base sm:min-h-12">
        <ArrowLeft size={20} />
        Todas las categorías
      </Boton>
    </div>
  )
}
