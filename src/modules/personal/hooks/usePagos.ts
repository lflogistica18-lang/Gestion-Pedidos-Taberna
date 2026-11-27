import { supabase } from '@/shared/lib/supabase'
import type { Empleado, MedioPagoPersonal, PagoPersonal, PagoPersonalItem } from '@/types/database.types'
import type { ItemPropuesto, Semana } from '../lib/calculos'
import { armarDatosRecibo, rutaRecibo } from '../lib/recibo'
import { mensajeDeExcepcion, textoError } from './errores'

const BUCKET = 'sgp-recibos'
const SEMANA_REPETIDA = 'Ya hay un pago para esa semana'

export interface RespuestaPago {
  error: string | null
  pago: PagoPersonal | null
}

async function leerPago(id: string): Promise<RespuestaPago> {
  const { data, error } = await supabase.from('pagos_personal').select('*').eq('id', id).single()
  if (error) return { error: textoError(error), pago: null }
  return { error: null, pago: data as PagoPersonal }
}

/** Operaciones del pago semanal. Sin estado: la pantalla decide cuándo recargar. */
export function usePagos() {
  const cargarItems = async (pagoId: string): Promise<{ error: string | null; items: PagoPersonalItem[] }> => {
    try {
      const { data, error } = await supabase.from('pagos_personal_items').select('*')
        .eq('pago_id', pagoId).is('deleted_at', null).order('created_at')
      if (error) return { error: error.message, items: [] }
      return { error: null, items: (data ?? []) as PagoPersonalItem[] }
    } catch (e) {
      return { error: mensajeDeExcepcion(e), items: [] }
    }
  }

  /**
   * Crea el borrador (o lo actualiza) y deja sus ítems como la pantalla los tiene.
   * Los totales los calcula la base: se devuelven leídos de vuelta.
   * Si el pago llegó a crearse pero algo falló después, `pago` viene igual para no duplicarlo.
   */
  const guardarBorrador = async (
    empleado: Empleado, semana: Semana, items: ItemPropuesto[], pagoId: string | null,
  ): Promise<RespuestaPago> => {
    try {
      let id = pagoId
      const foto = { sueldo_semanal: empleado.sueldo_semanal, dias_por_semana: empleado.dias_por_semana }
      if (id) {
        const { error } = await supabase.from('pagos_personal').update(foto).eq('id', id)
        if (error) return { error: textoError(error), pago: null }
        const { error: errQuitar } = await supabase.from('pagos_personal_items')
          .update({ deleted_at: new Date().toISOString() }).eq('pago_id', id).is('deleted_at', null)
        if (errQuitar) return { error: textoError(errQuitar), pago: null }
      } else {
        const { data, error } = await supabase.from('pagos_personal')
          .insert({ empleado_id: empleado.id, semana_desde: semana.desde, semana_hasta: semana.hasta, ...foto })
          .select('id').single()
        if (error) return { error: textoError(error, SEMANA_REPETIDA), pago: null }
        id = (data as { id: string }).id
      }

      if (items.length > 0) {
        const filas = items.map((i) => ({ ...i, pago_id: id }))
        const { error } = await supabase.from('pagos_personal_items').insert(filas)
        if (error) {
          const leido = await leerPago(id)
          return { error: textoError(error), pago: leido.pago }
        }
      }
      return await leerPago(id)
    } catch (e) {
      return { error: mensajeDeExcepcion(e), pago: null }
    }
  }

  /** Paso 1 de marcar pagado: el pago queda pagado y las novedades descontadas quedan con su pago_id. */
  const marcarPagado = async (
    pagoId: string, medio: MedioPagoPersonal, novedadIds: string[],
  ): Promise<RespuestaPago & { aviso: string | null }> => {
    try {
      const { data, error } = await supabase.from('pagos_personal')
        .update({ estado: 'pagado', medio_pago: medio }).eq('id', pagoId).select('*').single()
      if (error) return { error: textoError(error), pago: null, aviso: null }
      let aviso: string | null = null
      if (novedadIds.length > 0) {
        const { error: errNov } = await supabase.from('novedades_personal').update({ pago_id: pagoId }).in('id', novedadIds)
        if (errNov) aviso = `El pago quedó registrado, pero no se pudieron marcar los adelantos/faltas como descontados: avisale a Lucas. (${errNov.message})`
      }
      return { error: null, pago: data as PagoPersonal, aviso }
    } catch (e) {
      return { error: mensajeDeExcepcion(e), pago: null, aviso: null }
    }
  }

  /**
   * Pasos 2 a 4: arma el PDF, lo sube a sgp-recibos y guarda recibo_ruta.
   * Si falla algo el pago sigue pagado y se puede volver a llamar (si el archivo ya
   * estaba subido, se reutiliza). Devuelve el PDF para compartirlo o bajarlo.
   */
  const emitirRecibo = async (
    pago: PagoPersonal, empleado: Pick<Empleado, 'nombre'>, local: string,
  ): Promise<{ error: string | null; blob: Blob | null; ruta: string | null }> => {
    try {
      const { error: errItems, items } = await cargarItems(pago.id)
      if (errItems) return { error: errItems, blob: null, ruta: null }
      const { generarRecibo } = await import('../pdf/generarRecibo')
      const blob = await generarRecibo(armarDatosRecibo(pago, empleado, items, local))

      const ruta = rutaRecibo(pago)
      const { error: errSubir } = await supabase.storage.from(BUCKET).upload(ruta, blob, { contentType: 'application/pdf', upsert: false })
      const yaEstaba = errSubir !== null && /already exists|duplicate/i.test(errSubir.message)
      if (errSubir && !yaEstaba) return { error: `No se pudo guardar el recibo: ${errSubir.message}`, blob, ruta: null }

      const { error: errRuta } = await supabase.from('pagos_personal')
        .update({ recibo_ruta: ruta }).eq('id', pago.id).is('recibo_ruta', null)
      if (errRuta) return { error: `El recibo se subió pero no se pudo registrar: ${errRuta.message}`, blob, ruta: null }
      return { error: null, blob, ruta }
    } catch (e) {
      return { error: mensajeDeExcepcion(e), blob: null, ruta: null }
    }
  }

  /** Link temporal (5 minutos) para abrir un recibo guardado. */
  const urlRecibo = async (ruta: string): Promise<{ error: string | null; url: string | null }> => {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 300)
      if (error) return { error: error.message, url: null }
      return { error: null, url: data.signedUrl }
    } catch (e) {
      return { error: mensajeDeExcepcion(e), url: null }
    }
  }

  return { cargarItems, guardarBorrador, marcarPagado, emitirRecibo, urlRecibo }
}
