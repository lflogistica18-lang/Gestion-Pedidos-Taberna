import { EscPos, envolver, normalizar } from './escpos.js';

export interface ItemPedido {
  product_name: string;
  unit_price: number | string;
  quantity: number;
  subtotal: number | string;
  notes?: string | null;
}

export interface Pedido {
  id?: string;
  order_number: number;
  type: 'local' | 'delivery' | 'directo' | string;
  payment_method: 'efectivo' | 'debito' | 'transferencia' | string;
  total: number | string;
  notes?: string | null;
  customer_name?: string | null;
  delivery_address?: string | null;
  created_at: string;
  order_items?: ItemPedido[] | null;
  /** Cantidad de veces que se editó el pedido (0 o ausente = original). */
  ediciones?: number | null;
  editado_at?: string | null;
}

export interface OpcionesTicket {
  nombreLocal: string;
  columnas: number;
  codepage: number;
  direccion?: string | null;
  telefono?: string | null;
  /** Texto final; vacío = sin pie. */
  pie?: string;
}

const ZONA = 'America/Argentina/Buenos_Aires';

const TIPOS: Record<string, string> = { local: 'Local', delivery: 'Delivery', directo: 'Directo' };
const PAGOS: Record<string, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  transferencia: 'Déb / Transfer',
};

function conMiles(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Formato es-AR: $1.234 si es entero, $1.234,50 si no. */
export function formatoPlata(valor: number | string): string {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '$?';
  const signo = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (Number.isInteger(abs)) return `${signo}$${conMiles(String(abs))}`;
  const [ent, dec] = abs.toFixed(2).split('.');
  return `${signo}$${conMiles(ent)},${dec}`;
}

/** dd/mm/aaaa hh:mm en hora de Buenos Aires. */
export function formatoFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const partes = new Intl.DateTimeFormat('es-AR', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? '';
  return `${p('day')}/${p('month')}/${p('year')} ${p('hour')}:${p('minute')}`;
}

/** hh:mm en hora de Buenos Aires. */
export function formatoHora(iso: string): string {
  const f = formatoFecha(iso);
  return f === iso ? iso : f.slice(11);
}

/**
 * Producto en doble alto + negrita: "<cant> x <nombre>" envuelto (las líneas siguientes con sangría)
 * y el precio en tamaño normal a la derecha de la última línea (o en una línea propia si no entra).
 */
function producto(e: EscPos, cantidad: number, nombre: string, precio: string): void {
  const ancho = e.ancho;
  const prefijo = `${cantidad} x `;
  const sangria = ' '.repeat(prefijo.length);
  const partes = envolver(nombre, Math.max(1, ancho - prefijo.length));
  const lineas = partes.map((t, i) => (i === 0 ? prefijo : sangria) + t);
  const ultima = lineas[lineas.length - 1];
  const p = normalizar(precio).trim();
  const fmt = (texto: string, alto: boolean, negrita: boolean) => ({ texto, alto, ancho: false, negrita });
  lineas.slice(0, -1).forEach((l) => e.segmentos([fmt(l, true, true)]));
  if (ultima.length + 1 + p.length <= ancho) {
    e.segmentos([fmt(ultima, true, true), fmt(' '.repeat(ancho - ultima.length - p.length), false, false), fmt(p, false, false)]);
  } else {
    e.segmentos([fmt(ultima, true, true)]);
    e.segmentos([fmt(' '.repeat(Math.max(0, ancho - p.length)) + p, false, false)]);
  }
}

function construir(pedido: Pedido, op: OpcionesTicket): EscPos {
  const e = new EscPos(op.columnas, op.codepage);

  if ((pedido.ediciones ?? 0) > 0) {
    e.separador();
    e.alinear('centro').tamano(true, true).negrita(true).texto('PEDIDO MODIFICADO').negrita(false).tamano(false, false);
    if (pedido.editado_at) e.texto(`Reemplaza al ticket anterior - ${formatoHora(pedido.editado_at)}`);
    else e.texto('Reemplaza al ticket anterior');
    e.alinear('izq').separador();
  }

  e.alinear('centro').negrita(true).texto(op.nombreLocal).negrita(false);
  if (op.direccion?.trim()) e.texto(op.direccion);
  if (op.telefono?.trim()) e.linea(`Tel: ${op.telefono}`);
  e.doble(true).texto(`PEDIDO #${pedido.order_number}`).doble(false);
  e.alinear('izq');
  e.linea(formatoFecha(pedido.created_at));
  e.alto(true).negrita(true).texto(`Tipo: ${TIPOS[pedido.type] ?? pedido.type}`).negrita(false).alto(false);
  e.linea(`Pago: ${PAGOS[pedido.payment_method] ?? pedido.payment_method}`);
  if (pedido.customer_name?.trim()) {
    e.alto(true).negrita(true).texto(`Cliente: ${pedido.customer_name}`).negrita(false).alto(false);
  }
  if (pedido.delivery_address?.trim()) {
    e.alto(true).negrita(true).texto(`Dirección: ${pedido.delivery_address}`).negrita(false).alto(false);
  }
  e.separador();

  const items = pedido.order_items ?? [];
  items.forEach((it, i) => {
    producto(e, it.quantity, it.product_name, formatoPlata(it.subtotal));
    if (it.quantity > 1) e.linea(`    ${formatoPlata(it.unit_price)} c/u`);
    if (it.notes?.trim()) {
      e.alto(true);
      envolver(it.notes, e.ancho - 6).forEach((l, j) => e.linea((j === 0 ? '    > ' : '      ') + l));
      e.alto(false);
    }
    if (i < items.length - 1) e.linea('');
  });
  e.separador();

  if (pedido.notes?.trim()) {
    e.negrita(true).linea('NOTAS:').negrita(false);
    e.alto(true).texto(pedido.notes).alto(false);
    e.feed(1);
  }

  // En doble tamaño entran columnas/2 caracteres por línea.
  e.doble(true).fila('TOTAL', formatoPlata(pedido.total)).doble(false);
  e.feed(1);
  const pie = op.pie ?? '¡Gracias por su compra!';
  if (pie.trim()) e.alinear('centro').texto(pie).alinear('izq');
  e.feed(4);
  e.cortar();
  return e;
}

/** Función pura: pedido -> bytes ESC/POS listos para mandar a la impresora. */
export function armarTicket(pedido: Pedido, opciones: OpcionesTicket): Buffer {
  return construir(pedido, opciones).build();
}

/** Mismo ticket, como texto legible (modo simulado y verificación). */
export function ticketComoTexto(pedido: Pedido, opciones: OpcionesTicket): string {
  return construir(pedido, opciones).comoTexto();
}

/** Líneas con formato (tamaño, negrita, alineación) del mismo ticket: para dibujar cómo sale en papel. */
export function ticketComoLineas(pedido: Pedido, opciones: OpcionesTicket) {
  return construir(pedido, opciones).lineas();
}
