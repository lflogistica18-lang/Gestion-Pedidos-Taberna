import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, MessageSquare, Plus, Trash2, UserRound } from 'lucide-react'
import { EstadoCargando } from '@/shared/components/comunes/EstadoCargando'
import { EstadoError } from '@/shared/components/comunes/EstadoError'
import { AvisoEstado, Boton, EncabezadoPagina, EncabezadoSeccion, Modal, TarjetaDato, mostrarToast } from '@/shared/components/panel'
import { fechaCorta, pesos } from '@/shared/lib/formato'
import { ListaNovedades } from './components/ListaNovedades'
import { ListaRecibos } from './components/ListaRecibos'
import { ModalNovedad } from './components/ModalNovedad'
import { useFichaEmpleada, type DatosNovedad } from './hooks/useFichaEmpleada'

const VOLVER = (
  <Link to="/personal" className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-texto-secundario hover:text-texto-primario">
    <ArrowLeft size={16} />Volver a Personal
  </Link>
)

export default function FichaEmpleadaPage() {
  const { id = '' } = useParams()
  const { empleado, pagos, novedades, cargando, error, recargar, crearNovedad, quitarNovedad, borrarEmpleada } = useFichaEmpleada(id)
  const navigate = useNavigate()
  const [nuevaNovedad, setNuevaNovedad] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [borrandoOcupado, setBorrandoOcupado] = useState(false)
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null)

  if (cargando) return <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">{VOLVER}<EstadoCargando /></div>
  if (error) return <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">{VOLVER}<EstadoError mensaje={error} onReintentar={() => void recargar()} /></div>
  if (!empleado) return <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">{VOLVER}<p className="text-sm text-texto-secundario">No se encontró a esa empleada.</p></div>

  const guardarNovedad = async (d: DatosNovedad) => {
    const r = await crearNovedad(d)
    if (!r.error) mostrarToast('Novedad guardada', 'exito')
    return r
  }

  const quitar = async (nid: string) => {
    const r = await quitarNovedad(nid)
    if (r.error) mostrarToast(`No se pudo quitar la novedad: ${r.error}`, 'error')
    else mostrarToast('Novedad quitada', 'exito')
  }

  const borrar = async () => {
    setBorrandoOcupado(true)
    setErrorBorrar(null)
    const r = await borrarEmpleada()
    setBorrandoOcupado(false)
    if (r.error) {
      setErrorBorrar(r.error)
      return
    }
    mostrarToast('Empleada borrada', 'exito')
    navigate('/personal')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      {VOLVER}
      <EncabezadoPagina
        icono={<UserRound size={22} />}
        titulo={empleado.nombre}
        detalle={empleado.active ? 'Activa' : 'Inactiva'}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaDato etiqueta="Sueldo semanal" valor={pesos(empleado.sueldo_semanal)} />
        <TarjetaDato etiqueta="Días por semana" valor={String(empleado.dias_por_semana)} />
        <TarjetaDato etiqueta="Valor del día" valor={pesos(Math.round(empleado.sueldo_semanal / empleado.dias_por_semana))} />
        <TarjetaDato etiqueta="Ingreso" valor={fechaCorta(empleado.fecha_ingreso)} detalle={empleado.telefono ?? undefined} />
      </div>
      {empleado.notas && <p className="mb-6 break-words text-sm text-texto-secundario">{empleado.notas}</p>}

      <section className="mb-8">
        <div className="mb-3"><EncabezadoSeccion icono={<FileText size={16} />} titulo="Recibos anteriores" /></div>
        <ListaRecibos empleado={empleado} pagos={pagos} onCambio={() => void recargar()} />
      </section>

      <section className="mb-8">
        <div className="mb-3">
          <EncabezadoSeccion icono={<MessageSquare size={16} />} titulo="Novedades">
            <Boton onClick={() => setNuevaNovedad(true)}><Plus size={16} />Nueva novedad</Boton>
          </EncabezadoSeccion>
        </div>
        <ListaNovedades novedades={novedades} onQuitar={quitar} />
      </section>

      <section className="border-t border-borde-sutil pt-4">
        <Boton variante="peligro" className="w-full sm:w-auto" onClick={() => { setErrorBorrar(null); setBorrando(true) }}>
          <Trash2 size={16} />Borrar empleada
        </Boton>
      </section>

      <ModalNovedad open={nuevaNovedad} onClose={() => setNuevaNovedad(false)} onGuardar={guardarNovedad} />
      <Modal open={borrando} onClose={() => setBorrando(false)} title={`Borrar a ${empleado.nombre}`} subtitulo="Solo para cargas por error">
        <div className="space-y-4">
          <p className="text-sm text-texto-primario">
            Si ya cobró algún sueldo no se puede borrar: usá Dar de baja (pestaña Empleadas) para guardar su historial.
          </p>
          {errorBorrar && <AvisoEstado tono="rojo" titulo="No se pudo borrar">{errorBorrar}</AvisoEstado>}
          <div className="flex flex-col-reverse gap-2 border-t border-borde-sutil pt-4 sm:flex-row sm:justify-end">
            <Boton onClick={() => setBorrando(false)} disabled={borrandoOcupado}>Volver</Boton>
            <Boton variante="peligro" onClick={() => void borrar()} disabled={borrandoOcupado}>
              {borrandoOcupado ? 'Borrando…' : 'Borrar empleada'}
            </Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
