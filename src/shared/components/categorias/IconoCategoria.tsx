import { iconoCategoria } from '@/shared/lib/iconoCategoria'

interface IconoCategoriaProps {
  nombre: string
  /** Lado del dibujo en píxeles. */
  tamano: number
}

/** Dibujo de referencia de una categoría. `alt` vacío: el nombre ya está escrito al lado. */
export function IconoCategoria({ nombre, tamano }: IconoCategoriaProps) {
  return (
    <img
      src={iconoCategoria(nombre)}
      alt=""
      width={tamano}
      height={tamano}
      loading="lazy"
      className="shrink-0 select-none"
      draggable={false}
    />
  )
}
