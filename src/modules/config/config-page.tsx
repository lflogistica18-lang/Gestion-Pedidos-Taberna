import { useState } from 'react'
import { Settings } from 'lucide-react'
import { AvisoEstado, Boton, EncabezadoPagina } from '@/shared/components/panel'
import { EstadoCargando } from '@/shared/components/comunes/EstadoCargando'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import type { Configuracion } from '@/shared/lib/config'
import { SECCIONES, seccionConCambios, sinCampos, type SeccionId } from './secciones'
import { SeccionImpresion } from './components/SeccionImpresion'
import { SeccionLocal } from './components/SeccionLocal'
import { SeccionMediosPago } from './components/SeccionMediosPago'
import { SeccionPantallas } from './components/SeccionPantallas'
import { SubmenuConfig } from './components/SubmenuConfig'

export default function ConfigPage() {
  const config = useConfiguracion((s) => s.config)
  const cargada = useConfiguracion((s) => s.cargada)
  const cargando = useConfiguracion((s) => s.cargando)
  const error = useConfiguracion((s) => s.error)
  const cargar = useConfiguracion((s) => s.cargar)

  const [activa, setActiva] = useState<SeccionId>('local')
  // Cambios sin guardar de todas las secciones (los campos no se pisan entre secciones).
  const [borrador, setBorrador] = useState<Partial<Configuracion>>({})

  const datosActiva = SECCIONES.find((s) => s.id === activa) ?? SECCIONES[0]

  function elegir(id: SeccionId) {
    if (id === activa) return
    if (seccionConCambios(datosActiva, config, borrador)) {
      if (!window.confirm(`Tenés cambios sin guardar en ${datosActiva.etiqueta}. ¿Descartarlos?`)) return
      setBorrador((b) => sinCampos(b, datosActiva.campos))
    }
    setActiva(id)
  }

  const propsSeccion = {
    config,
    borrador,
    onCambiar: (c: Partial<Configuracion>) => setBorrador((b) => ({ ...b, ...c })),
    onGuardado: () => setBorrador((b) => sinCampos(b, datosActiva.campos)),
    bloqueado: error !== null,
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <EncabezadoPagina icono={<Settings size={22} />} titulo="Configuración" detalle="Datos del local, impresión y Caja" />

      {error && !cargando && (
        <AvisoEstado
          className="mb-4"
          tono="ambar"
          titulo="No se pudo leer la configuración"
          accion={<Boton compacto onClick={() => void cargar()}>Reintentar</Boton>}
        >
          {error}
        </AvisoEstado>
      )}

      {!cargada ? (
        <div className="rounded-xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta">
          <EstadoCargando mensaje="Cargando la configuración…" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          <SubmenuConfig activa={activa} onElegir={elegir} />
          <div className="min-w-0">
            {activa === 'local' && <SeccionLocal {...propsSeccion} />}
            {activa === 'impresion' && <SeccionImpresion {...propsSeccion} />}
            {activa === 'pantallas' && <SeccionPantallas {...propsSeccion} />}
            {activa === 'pagos' && <SeccionMediosPago {...propsSeccion} />}
          </div>
        </div>
      )}
    </div>
  )
}
