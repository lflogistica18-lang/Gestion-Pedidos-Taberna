import { Store } from 'lucide-react'
import { Entrada } from '@/shared/components/panel'
import { valorDe, type PropsSeccion } from '../secciones'
import { useGuardarSeccion } from '../hooks/useGuardarSeccion'
import { TarjetaSeccion } from './TarjetaSeccion'

export function SeccionLocal({ config, borrador, onCambiar, onGuardado, bloqueado }: PropsSeccion) {
  const { guardando, guardar } = useGuardarSeccion(onGuardado)
  const nombre = valorDe(config, borrador, 'nombre_local')
  const direccion = valorDe(config, borrador, 'direccion')
  const telefono = valorDe(config, borrador, 'telefono')
  const nombreVacio = nombre.trim() === ''
  const hayCambios =
    nombre !== config.nombre_local || (direccion ?? '') !== (config.direccion ?? '') || (telefono ?? '') !== (config.telefono ?? '')

  function enviar() {
    void guardar({
      nombre_local: nombre.trim(),
      direccion: (direccion ?? '').trim() || null,
      telefono: (telefono ?? '').trim() || null,
    })
  }

  return (
    <TarjetaSeccion
      icono={<Store size={16} />}
      titulo="Local"
      subtitulo="Así sale en el encabezado del ticket"
      hayCambios={hayCambios}
      guardando={guardando}
      motivoBloqueo={bloqueado ? 'Reintentá antes de guardar' : nombreVacio ? 'Completá el nombre del local para guardar' : undefined}
      onGuardar={enviar}
    >
      <Entrada
        etiqueta="Nombre del local"
        obligatorio
        maxLength={60}
        value={nombre}
        onChange={(e) => onCambiar({ nombre_local: e.target.value })}
        error={nombreVacio ? 'Escribí el nombre del local' : undefined}
        autoComplete="organization"
      />
      <Entrada
        etiqueta="Dirección"
        opcional
        maxLength={120}
        value={direccion ?? ''}
        onChange={(e) => onCambiar({ direccion: e.target.value === '' ? null : e.target.value })}
        autoComplete="street-address"
      />
      <Entrada
        etiqueta="Teléfono"
        opcional
        maxLength={40}
        inputMode="tel"
        value={telefono ?? ''}
        onChange={(e) => onCambiar({ telefono: e.target.value === '' ? null : e.target.value })}
        autoComplete="tel"
      />
    </TarjetaSeccion>
  )
}
