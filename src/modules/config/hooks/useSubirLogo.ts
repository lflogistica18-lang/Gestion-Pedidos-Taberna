import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { mostrarToast } from '@/shared/components/panel'
import { useConfiguracion } from '@/shared/store/useConfiguracion'

const BUCKET = 'sgp-logo'
const RUTA = 'actual'
export const TIPOS_LOGO = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_LOGO_BYTES = 2 * 1024 * 1024

/** Sube el logo a la ruta fija del bucket público y guarda su URL (o la borra para volver al original). */
export function useSubirLogo() {
  const guardarEnStore = useConfiguracion((s) => s.guardar)
  const [trabajando, setTrabajando] = useState(false)

  async function subir(archivo: File) {
    if (!TIPOS_LOGO.includes(archivo.type)) {
      mostrarToast('El logo tiene que ser una imagen png, jpeg o webp', 'error')
      return
    }
    if (archivo.size > MAX_LOGO_BYTES) {
      mostrarToast('El logo pesa más de 2 MB: elegí una imagen más liviana', 'error')
      return
    }
    setTrabajando(true)
    try {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(RUTA, archivo, { upsert: true, contentType: archivo.type, cacheControl: '60' })
      if (error) {
        mostrarToast(`No se pudo subir el logo: ${error.message}`, 'error')
        return
      }
      const { publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(RUTA).data
      const { error: errGuardar } = await guardarEnStore({ logo_url: `${publicUrl}?v=${Date.now()}` })
      if (errGuardar) {
        mostrarToast(`El logo se subió pero no se pudo guardar: ${errGuardar}`, 'error')
        return
      }
      mostrarToast('Logo actualizado')
    } catch (e) {
      mostrarToast(`No se pudo subir el logo: ${e instanceof Error ? e.message : 'error de conexión'}`, 'error')
    } finally {
      setTrabajando(false)
    }
  }

  async function volverAlOriginal() {
    setTrabajando(true)
    try {
      // El login lee `actual` sin sesión: tiene que volver a ser el original también ahí.
      const resp = await fetch('/logo-taberna.png')
      if (!resp.ok) throw new Error(`no se encontró el logo original (${resp.status})`)
      const blob = await resp.blob()
      const { error: errSubir } = await supabase.storage
        .from(BUCKET)
        .upload(RUTA, blob, { upsert: true, contentType: 'image/png', cacheControl: '60' })
      if (errSubir) {
        mostrarToast(`No se pudo volver al logo original: ${errSubir.message}`, 'error')
        return
      }
      const { error } = await guardarEnStore({ logo_url: null })
      if (error) mostrarToast(`No se pudo volver al logo original: ${error}`, 'error')
      else mostrarToast('Se volvió al logo original')
    } catch (e) {
      mostrarToast(`No se pudo volver al logo original: ${e instanceof Error ? e.message : 'error de conexión'}`, 'error')
    } finally {
      setTrabajando(false)
    }
  }

  return { trabajando, subir, volverAlOriginal }
}
