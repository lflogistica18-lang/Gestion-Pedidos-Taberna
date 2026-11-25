import { useState, useMemo } from 'react'
import { Package, Plus } from 'lucide-react'
import { Boton, EncabezadoPagina } from '@/shared/components/panel'
import { PestanasProductos, type PestanaProductos } from './components/PestanasProductos'
import { PanelCategorias } from './components/PanelCategorias'
import { TarjetasProductos } from './components/TarjetasProductos'
import { CabeceraCategoria } from '@/shared/components/categorias/CabeceraCategoria'
import { useEsTablet } from './hooks/useEsTablet'
import { FiltrosProductos } from './components/FiltrosProductos'
import { COLUMNAS_PRODUCTOS } from './components/columnasProductos'
import { useProducts } from './hooks/useProducts'
import { useUpsertProduct, useToggleProduct, productSchema } from './hooks/useUpsertProduct'
import { useCategories } from './hooks/useCategories'
import { CrudManager } from '@/shared/components/comunes/CrudManager'
import type { CampoSchema } from '@/shared/types/base'
import type { Product } from '@/types/database.types'

type Tab = PestanaProductos

// ─── Página principal de Productos ──────────────────────────────
export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>('activos')
  const [catFiltro, setCatFiltro] = useState<string>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)

  const { products, loading, error, refetch } = useProducts({
    activeOnly: tab !== 'inactivos',
  })
  const { upsert } = useUpsertProduct()
  const { toggle } = useToggleProduct()
  const { categories } = useCategories()
  const esTablet = useEsTablet()

  const buscando = busqueda.trim() !== ''
  // Con texto en el buscador se busca en todas las categorías (sin tarjetas ni cabecera)
  const categoriaActiva = buscando ? 'todas' : catFiltro
  const tarjetas = esTablet && !buscando && catFiltro === 'todas' && !error
  // Tablet/compu: cabecera grande; celular: cabecera compacta en lugar de las pastillas
  const cabecera = !buscando && catFiltro !== 'todas'

  // Filtrar productos por categoría seleccionada
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return products.filter(p =>
      (categoriaActiva === 'todas' || p.category === categoriaActiva) &&
      (q === '' || p.name.toLowerCase().includes(q)))
  }, [products, categoriaActiva, busqueda])

  const campos: CampoSchema[] = [
    { nombre: 'name', etiqueta: 'Nombre', tipo: 'texto', obligatorio: true },
    {
      nombre: 'category',
      etiqueta: 'Categoría',
      tipo: 'select',
      obligatorio: true,
      opciones: categories.map(c => c.name)
    },
    { nombre: 'price', etiqueta: 'Precio', tipo: 'numero', obligatorio: true },
    { nombre: 'cost', etiqueta: 'Costo', tipo: 'numero', obligatorio: false, placeholder: 'Valor de costo (referencia)' }
  ]

  const handleCrear = async (datos: Partial<Product>): Promise<{ error: string | null }> => {
    try {
      const result = await upsert({
        name: datos.name || '',
        category: datos.category || '',
        price: Number(datos.price) || 0,
        cost: Number(datos.cost) || 0
      })
      if (!result) return { error: 'Error al crear producto' }
      refetch()
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Error de conexión' }
    }
  }

  const handleEditar = async (id: string, datos: Partial<Product>): Promise<{ error: string | null }> => {
    try {
      const result = await upsert({
        name: datos.name || '',
        category: datos.category || '',
        price: Number(datos.price) || 0,
        cost: Number(datos.cost) || 0
      }, id)
      if (!result) return { error: 'Error al actualizar producto' }
      refetch()
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Error de conexión' }
    }
  }

  const handleDesactivar = async (id: string): Promise<{ error: string | null }> => {
    try {
      const isActivating = tab === 'inactivos'
      const ok = await toggle(id, isActivating)
      if (!ok) return { error: 'Error al modificar estado' }
      refetch()
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Error de conexión' }
    }
  }

  const cambiarTab = (t: Tab) => {
    setTab(t)
    setCatFiltro('todas')
    setBusqueda('')
    setCreando(false)
  }

  const conteoPorCategoria = useMemo(() => {
    const r: Record<string, number> = {}
    products.forEach(p => { r[p.category] = (r[p.category] ?? 0) + 1 })
    return r
  }, [products])

  const detalle = tab === 'inactivos'
    ? `${products.length} ${products.length === 1 ? 'producto inactivo' : 'productos inactivos'}`
    : tab === 'categorias'
      ? `${categories.length} ${categories.length === 1 ? 'categoría' : 'categorías'}`
      : `${products.length} activos en ${categories.length} categorías`

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <EncabezadoPagina
        icono={<Package size={22} />}
        titulo="Productos"
        detalle={(loading || error) && tab !== 'categorias' ? undefined : detalle}
        acciones={tab !== 'categorias' && (
          <Boton variante="primario" onClick={() => setCreando(true)}>
            <Plus size={16} />Nuevo producto
          </Boton>
        )}
        pestanas={<PestanasProductos valor={tab} onCambiar={cambiarTab} />}
      />

      {tab === 'categorias' ? (
        <PanelCategorias conteos={loading ? undefined : conteoPorCategoria} />
      ) : (
        <>
          <FiltrosProductos
            busqueda={busqueda}
            onBusqueda={setBusqueda}
            categoria={catFiltro}
            onCategoria={setCatFiltro}
            total={products.length}
            opciones={categories.map(c => ({ nombre: c.name, cantidad: conteoPorCategoria[c.name] ?? 0 }))}
            pastillasSoloCelu
          />

          {tarjetas && (
            <TarjetasProductos
              categorias={categories}
              conteos={conteoPorCategoria}
              loading={loading}
              ocultarVacias={tab === 'inactivos'}
              onElegir={setCatFiltro}
            />
          )}
          {cabecera && (
            <>
              <div className="hidden md:block">
                <CabeceraCategoria nombre={catFiltro} cantidad={productosFiltrados.length} onVolver={() => setCatFiltro('todas')} />
              </div>
              <div className="md:hidden">
                <CabeceraCategoria compacta nombre={catFiltro} cantidad={productosFiltrados.length} onVolver={() => setCatFiltro('todas')} />
              </div>
            </>
          )}

          {/* Con tarjetas la lista no se ve, pero el formulario de alta tiene que poder abrirse */}
          {(!tarjetas || creando) && (
          <div className={tarjetas ? 'h-0 overflow-hidden' : undefined}>
          <CrudManager<Product>
            nombreSingular="producto"
            datos={productosFiltrados}
            campos={campos}
            columnas={COLUMNAS_PRODUCTOS}
            cargando={loading}
            error={error}
            hayFiltro={buscando || categoriaActiva !== 'todas'}
            mensajeVacio={tab === 'inactivos' ? 'No hay productos inactivos' : undefined}
            permitirCrear={tab !== 'inactivos'}
            creando={creando}
            onCerrarCrear={() => setCreando(false)}
            onPedirCrear={() => setCreando(true)}
            subtituloEditar={p => p.category}
            onCrear={handleCrear}
            onEditar={handleEditar}
            onDesactivar={handleDesactivar}
            onRecargar={refetch}
            validar={(d) => {
              const r = productSchema.safeParse({
                name: d.name,
                category: d.category,
                price: Number(d.price),
                cost: Number(d.cost ?? 0),
              })
              return r.success ? null : r.error.issues[0].message
            }}
          />
          </div>
          )}
        </>
      )}
    </div>
  )
}
