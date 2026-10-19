import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Boton, Entrada, mostrarToast } from '@/shared/components/panel'
import { EstadoCargando } from '@/shared/components/comunes/EstadoCargando'
import { EstadoError } from '@/shared/components/comunes/EstadoError'
import { EstadoVacio } from '@/shared/components/comunes/EstadoVacio'
import { useCategories } from '../hooks/useCategories'
import { FilaCategoria } from './FilaCategoria'

interface Props {
  /** Productos activos por categoría, si ya están cargados. */
  conteos?: Record<string, number>
}

export function PanelCategorias({ conteos }: Props) {
  const { categories, loading, error, createCategory, renameCategory, deleteCategory, refetch } = useCategories()

  const [newName, setNewName] = useState('')
  const [savingNew, setSavingNew] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')

  const handleCrear = async () => {
    if (!newName.trim()) return
    setSavingNew(true)
    const { error: err } = await createCategory(newName.trim())
    setSavingNew(false)
    if (err) {
      mostrarToast(err, 'error')
      return
    }
    setNewName('')
  }

  const handleIniciarEdicion = (nombre: string) => {
    setEditando(nombre)
    setEditNombre(nombre)
  }

  const handleGuardarEdicion = async (viejo: string) => {
    if (!editNombre.trim() || editNombre === viejo) {
      setEditando(null)
      return
    }
    const { error: err } = await renameCategory(viejo, editNombre.trim())
    if (err) mostrarToast(err, 'error')
    setEditando(null)
    setEditNombre('')
  }

  const handleEliminar = async (nombre: string) => {
    if (!window.confirm(`¿Eliminar la categoría "${nombre}"?\n\nSolo se puede eliminar si no tiene productos activos.`)) return
    const { error: err } = await deleteCategory(nombre)
    if (err) mostrarToast(err, 'error')
  }

  if (loading) return <EstadoCargando />
  if (error) return <EstadoError mensaje={error} onReintentar={refetch} />

  return (
    <section className="rounded-xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta" aria-label="Categorías">
      {categories.length === 0 ? (
        <EstadoVacio mensaje="Todavía no hay categorías" />
      ) : (
        <ul className="divide-y divide-borde-sutil">
          {categories.map(cat => (
            <FilaCategoria
              key={cat.name}
              nombre={cat.name}
              cantidad={conteos?.[cat.name] ?? (conteos ? 0 : undefined)}
              editando={editando === cat.name}
              valorEdicion={editNombre}
              onCambiarEdicion={setEditNombre}
              onIniciar={() => handleIniciarEdicion(cat.name)}
              onGuardar={() => handleGuardarEdicion(cat.name)}
              onCancelar={() => setEditando(null)}
              onEliminar={() => handleEliminar(cat.name)}
            />
          ))}
        </ul>
      )}

      <div className="border-t border-borde-sutil p-4">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={e => { e.preventDefault(); void handleCrear() }}
        >
          <div className="min-w-0 flex-1 basis-56">
            <Entrada
              etiqueta="Nueva categoría"
              placeholder="Ej: Pizzas"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
          </div>
          <Boton type="submit" variante="primario" disabled={savingNew || !newName.trim()}>
            <Plus size={16} />{savingNew ? 'Guardando…' : 'Agregar'}
          </Boton>
        </form>
        <p className="mt-3 text-xs text-texto-secundario">Al renombrar, se actualiza en todos los productos.</p>
      </div>
    </section>
  )
}
