import { useMemo, useState } from 'react'
import { EstadoCargando } from '@/shared/components/comunes/EstadoCargando'
import { EstadoError } from '@/shared/components/comunes/EstadoError'
import { EstadoVacio } from '@/shared/components/comunes/EstadoVacio'
import { TarjetaDato } from '@/shared/components/panel'
import { pesos } from '@/shared/lib/formato'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import type { ConceptoPago, Empleado } from '@/types/database.types'
import { useAbrirRecibo } from '../hooks/useAbrirRecibo'
import { usePersonalSemana } from '../hooks/usePersonalSemana'
import { estadoEmpleada, hoyArgentina, moverSemana, resumenSemana, semanaVencida } from '../lib/calculos'
import { ModalPagarSemana } from './ModalPagarSemana'
import { NavegadorSemana } from './NavegadorSemana'
import { TarjetaEmpleada } from './TarjetaEmpleada'

interface Props {
  empleados: Empleado[]
  conceptos: ConceptoPago[]
}

export function SemanaTab({ empleados, conceptos }: Props) {
  const diaPago = useConfiguracion((s) => s.config.dia_pago)
  const [hoy] = useState(() => hoyArgentina())
  // 0 = la semana vencida; -1 = la anterior, etc. No se paga una semana que no terminó.
  const [atras, setAtras] = useState(0)
  const [pagando, setPagando] = useState<Empleado | null>(null)

  const vencida = useMemo(() => semanaVencida(hoy, diaPago), [hoy, diaPago])
  const semana = useMemo(() => moverSemana(vencida, atras), [vencida, atras])
  const { datos, cargando, error, recargar } = usePersonalSemana(semana.desde, vencida.desde)
  const { abrir, ocupado } = useAbrirRecibo(() => void recargar())
  const [abriendo, setAbriendo] = useState<string | null>(null)

  const activas = empleados.filter((e) => e.active)
  const pagoDe = (id: string) => datos.pagos.find((p) => p.empleado_id === id && p.semana_desde === semana.desde)
  const { pagadas, totalPagado } = resumenSemana(activas, datos.pagos, semana.desde)

  let contenido
  if (cargando) {
    contenido = <EstadoCargando />
  } else if (error) {
    contenido = <EstadoError mensaje={error} onReintentar={() => void recargar()} />
  } else if (activas.length === 0) {
    contenido = <EstadoVacio mensaje="Todavía no cargaste empleadas. Agregalas en la pestaña Empleadas." />
  } else {
    contenido = (
      <>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <TarjetaDato etiqueta="Pagadas" valor={`${pagadas} de ${activas.length}`} />
          <TarjetaDato etiqueta="Total pagado" valor={pesos(totalPagado)} />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activas.map((e) => {
            const pago = pagoDe(e.id)
            return (
              <TarjetaEmpleada
                key={e.id}
                empleado={e}
                estado={estadoEmpleada(e, vencida, datos.pagos, datos.novedadesPendientes)}
                pago={pago}
                ocupado={ocupado && abriendo === e.id}
                onPagar={() => setPagando(e)}
                onRecibo={() => {
                  if (!pago) return
                  setAbriendo(e.id)
                  void abrir(pago, e)
                }}
              />
            )
          })}
        </ul>
      </>
    )
  }

  return (
    <>
      <NavegadorSemana
        semana={semana}
        esLaVencida={atras === 0}
        onAnterior={() => setAtras((a) => a - 1)}
        onSiguiente={() => setAtras((a) => Math.min(0, a + 1))}
      />
      {contenido}
      {pagando && (
        <ModalPagarSemana
          empleado={pagando}
          semana={semana}
          pago={datos.pagos.find((p) => p.empleado_id === pagando.id && p.semana_desde === semana.desde) ?? null}
          conceptos={conceptos.filter((c) => c.active)}
          novedades={datos.novedadesPendientes}
          onCerrar={() => setPagando(null)}
          onCambio={() => void recargar()}
        />
      )}
    </>
  )
}
