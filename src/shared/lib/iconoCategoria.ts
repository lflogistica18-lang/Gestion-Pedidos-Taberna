// Dibujo de referencia para cada categoría, elegido por palabras clave del nombre.
// Función pura: no accede a datos. Los dibujos viven en public/iconos-categorias/.

const CARPETA = '/iconos-categorias'
const ICONO_GENERICO = 'generico'

/** Extensión de cada dibujo. Los propios (generados con IA) son .png; el resto sigue siendo Fluent Emoji (.svg). */
const ARCHIVO_POR_ICONO: Readonly<Record<string, string>> = {
  empanada: 'empanada.png',
  bebida: 'bebida.png',
  postre: 'postre.png',
  pasta: 'pasta.png',
  milanesa: 'milanesa.png',
  hamburguesa: 'hamburguesa.png',
  ensalada: 'ensalada.png',
  sandwich: 'sandwich.png',
  'sandwich-milanesa': 'sandwich-milanesa.png',
  tortilla: 'tortilla.png',
  guiso: 'guiso.png',
  tarta: 'tarta.png',
  combo: 'combo.png',
  vianda: 'vianda.png',
  carnes: 'carnes.png',
  arrollado: 'arrollado.png',
  adicional: 'adicional.png',
  generico: 'generico.png',
  // Fluent Emoji (MIT), todavía sin dibujo propio
  papas: 'papas.svg',
  pizza: 'pizza.svg',
  cafe: 'cafe.svg',
  helado: 'helado.svg',
  cerveza: 'cerveza.svg',
  vino: 'vino.svg',
  sopa: 'sopa.svg',
  desayuno: 'desayuno.svg',
}

/** Cada regla: si el nombre (sin acentos, en minúsculas) contiene alguna palabra, va ese dibujo. El orden importa. */
const REGLAS: ReadonlyArray<{ icono: string; palabras: readonly string[] }> = [
  // Sandwiches primero (incluye errores de tipeo como "sandiwiches"); el de milanesa tiene su propio dibujo
  { icono: 'sandwich-milanesa', palabras: ['sandwich de milanesa', 'sandiwich de milanesa', 'sandwiches de milanesa', 'sandiwiches de milanesa', 'sanguche de milanesa', 'sanguches de milanesa'] },
  { icono: 'sandwich', palabras: ['sandwich', 'sandiwich', 'sanwich', 'sandwhich', 'sanguch', 'lomito', 'tostado', 'pancho', 'choripan'] },
  { icono: 'milanesa', palabras: ['milanesa', 'milanga', 'napolitana', 'schnitzel'] },
  { icono: 'hamburguesa', palabras: ['hamburguesa', 'burger'] },
  { icono: 'papas', palabras: ['papas', 'fritas', 'bastones'] },
  { icono: 'arrollado', palabras: ['arrollado', 'rollo', 'wrap', 'burrito'] },
  { icono: 'empanada', palabras: ['empanada'] },
  { icono: 'tortilla', palabras: ['tortilla', 'omelette', 'huevo'] },
  { icono: 'tarta', palabras: ['tarta', 'pastelito', 'quiche'] },
  { icono: 'pizza', palabras: ['pizza', 'fugazza', 'fainá', 'faina'] },
  { icono: 'ensalada', palabras: ['ensalada', 'verdura'] },
  { icono: 'guiso', palabras: ['guiso', 'estofado', 'locro', 'puchero', 'cazuela'] },
  { icono: 'sopa', palabras: ['sopa', 'caldo', 'crema de'] },
  { icono: 'postre', palabras: ['postre', 'dulce', 'torta', 'flan', 'pastel', 'brownie', 'alfajor'] },
  { icono: 'helado', palabras: ['helado'] },
  { icono: 'pasta', palabras: ['pasta', 'fideo', 'tallarin', 'ravioles', 'noquis', 'ñoquis', 'spaghetti', 'sorrentino', 'lasagna', 'lasana', 'canelones'] },
  { icono: 'cerveza', palabras: ['cerveza', 'birra', 'chopp'] },
  { icono: 'vino', palabras: ['vino', 'espumante', 'champagne', 'fernet', 'trago', 'aperitivo'] },
  { icono: 'cafe', palabras: ['cafe', 'cafeteria', 'infusion', 'submarino'] },
  { icono: 'desayuno', palabras: ['desayuno', 'merienda', 'medialuna', 'panaderia', 'facturas'] },
  { icono: 'bebida', palabras: ['bebida', 'gaseosa', 'jugo', 'agua', 'licuado', 'limonada', 'refresco'] },
  { icono: 'combo', palabras: ['combo', 'promo', 'menu del dia', 'menu ejecutivo'] },
  { icono: 'vianda', palabras: ['vianda', 'delivery', 'para llevar', 'takeaway'] },
  { icono: 'carnes', palabras: ['carne', 'pollo', 'pescado', 'parrilla', 'asado', 'cerdo', 'bife', 'mariscos'] },
  { icono: 'adicional', palabras: ['adicional', 'extra', 'agregado', 'guarnicion', 'salsa', 'aderezo'] },
]

/** Minúsculas y sin acentos. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Nombre del archivo (sin extensión) que le toca a una categoría. */
export function nombreIconoCategoria(nombre: string): string {
  const texto = normalizar(nombre)
  const regla = REGLAS.find((r) => r.palabras.some((p) => texto.includes(normalizar(p))))
  return regla ? regla.icono : ICONO_GENERICO
}

/** Ruta pública del dibujo de una categoría. */
export function iconoCategoria(nombre: string): string {
  const archivo = ARCHIVO_POR_ICONO[nombreIconoCategoria(nombre)] ?? ARCHIVO_POR_ICONO[ICONO_GENERICO]
  return `${CARPETA}/${archivo}`
}

/** Primera letra en mayúscula, aunque en la base esté en minúscula. */
export function capitalizar(nombre: string): string {
  const limpio = nombre.trim()
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}
