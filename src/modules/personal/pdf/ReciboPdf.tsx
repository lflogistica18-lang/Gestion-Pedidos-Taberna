// Recibo de pago semanal. react-pdf no lee las variables CSS de la app: los colores van
// acá, en un solo lugar, como constantes del documento impreso (papel blanco, tinta oscura).
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { fechaCorta, fechaHora, pesos as pesosPantalla } from '@/shared/lib/formato'
import type { DatosRecibo, LineaRecibo } from './tipos'

const TINTA = '#1f2937'
const TINTA_SUAVE = '#6b7280'
const LINEA = '#d1d5db'
const FONDO_TOTAL = '#f3f4f6'

const estilos = StyleSheet.create({
  pagina: { padding: 36, fontFamily: 'Helvetica', fontSize: 11, color: TINTA },
  local: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  titulo: { fontSize: 11, color: TINTA_SUAVE, marginTop: 2 },
  bloque: { marginTop: 18 },
  etiqueta: { fontSize: 9, color: TINTA_SUAVE, textTransform: 'uppercase' },
  dato: { fontSize: 13, marginTop: 2 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: LINEA },
  filaTexto: { flexGrow: 1, paddingRight: 8 },
  seccion: { marginTop: 16, fontSize: 10, fontFamily: 'Helvetica-Bold', color: TINTA_SUAVE, textTransform: 'uppercase' },
  vacio: { paddingVertical: 5, color: TINTA_SUAVE },
  total: { marginTop: 24, padding: 14, backgroundColor: FONDO_TOTAL, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalEtiqueta: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  totalMonto: { fontSize: 26, fontFamily: 'Helvetica-Bold' },
  pie: { marginTop: 18, fontSize: 10, color: TINTA_SUAVE },
})

/** Helvetica no dibuja el signo menos tipográfico (U+2212): en el PDF va el guion común. */
const pesos = (n: number) => pesosPantalla(n).replace(/−/g, '-')

function detalle(l: LineaRecibo): string {
  return l.modo === 'por_unidad' || l.modo === 'dias_de_sueldo' ? `${l.nombre} (x${String(l.cantidad).replace('.', ',')})` : l.nombre
}

function Lineas({ lineas, signo }: { lineas: LineaRecibo[]; signo: '+' | '-' }) {
  if (lineas.length === 0) return <Text style={estilos.vacio}>Ninguno</Text>
  return (
    <View>
      {lineas.map((l, i) => (
        <View key={i} style={estilos.fila}>
          <Text style={estilos.filaTexto}>{detalle(l)}</Text>
          <Text>{signo}{pesos(l.monto)}</Text>
        </View>
      ))}
    </View>
  )
}

/** Se llama como función (no usa hooks): `pdf()` pide el <Document> mismo, no un componente. */
export function ReciboPdf({ datos }: { datos: DatosRecibo }) {
  const extras = datos.lineas.filter((l) => l.tipo === 'extra')
  const descuentos = datos.lineas.filter((l) => l.tipo === 'descuento')
  return (
    <Document title={`Recibo ${datos.empleada} ${datos.semanaDesde}`} author={datos.local}>
      <Page size="A4" style={estilos.pagina}>
        <Text style={estilos.local}>{datos.local}</Text>
        <Text style={estilos.titulo}>Recibo de pago semanal</Text>

        <View style={estilos.bloque}>
          <Text style={estilos.etiqueta}>Empleada</Text>
          <Text style={estilos.dato}>{datos.empleada}</Text>
        </View>
        <View style={estilos.bloque}>
          <Text style={estilos.etiqueta}>Semana</Text>
          <Text style={estilos.dato}>del {fechaCorta(datos.semanaDesde)} al {fechaCorta(datos.semanaHasta)}</Text>
        </View>

        <Text style={estilos.seccion}>Sueldo semanal</Text>
        <View style={estilos.fila}>
          <Text style={estilos.filaTexto}>Sueldo semanal</Text>
          <Text>{pesos(datos.sueldo)}</Text>
        </View>

        <Text style={estilos.seccion}>Extras</Text>
        <Lineas lineas={extras} signo="+" />

        <Text style={estilos.seccion}>Descuentos</Text>
        <Lineas lineas={descuentos} signo="-" />

        <View style={estilos.total}>
          <Text style={estilos.totalEtiqueta}>A cobrar</Text>
          <Text style={estilos.totalMonto}>{pesos(datos.total)}</Text>
        </View>

        <Text style={estilos.pie}>
          Medio de pago: {datos.medioPago}
          {datos.pagadoAt ? `  ·  Pagado el ${fechaHora(datos.pagadoAt)}` : ''}
        </Text>
      </Page>
    </Document>
  )
}
