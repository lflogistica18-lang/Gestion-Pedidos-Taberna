import { useRef } from 'react'
import { ImagePlus, Store, Undo2 } from 'lucide-react'
import { Boton, Campo, Entrada } from '@/shared/components/panel'
import { LogoLocal } from '@/shared/components/LogoLocal'
import { valorDe, type PropsSeccion } from '../secciones'
import { useGuardarSeccion } from '../hooks/useGuardarSeccion'
import { TIPOS_LOGO, useSubirLogo } from '../hooks/useSubirLogo'
import { TarjetaSeccion } from './TarjetaSeccion'

export function SeccionLocal({ config, borrador, onCambiar, onGuardado, bloqueado }: PropsSeccion) {
  const { guardando, guardar } = useGuardarSeccion(onGuardado)
  const { trabajando, subir, volverAlOriginal } = useSubirLogo()
  const inputArchivo = useRef<HTMLInputElement>(null)
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
      <Campo etiqueta="Logo" ayuda="png, jpeg o webp, hasta 2 MB. Se cambia al instante, sin tocar Guardar.">
        <div className="flex flex-wrap items-center gap-3">
          <LogoLocal alt="Logo del local" className="size-16 rounded-2xl" />
          <input
            ref={inputArchivo}
            type="file"
            accept={TIPOS_LOGO.join(',')}
            className="hidden"
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              e.target.value = ''
              if (archivo) void subir(archivo)
            }}
          />
          <Boton disabled={trabajando || bloqueado} onClick={() => inputArchivo.current?.click()}>
            <ImagePlus size={16} />
            {trabajando ? 'Subiendo…' : 'Cambiar logo'}
          </Boton>
          {config.logo_url && (
            <Boton disabled={trabajando} onClick={() => void volverAlOriginal()}>
              <Undo2 size={16} />
              Volver al logo original
            </Boton>
          )}
        </div>
      </Campo>
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
