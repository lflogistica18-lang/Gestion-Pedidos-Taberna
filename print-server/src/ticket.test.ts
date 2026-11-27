import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarTicket, ticketComoTexto, type Pedido } from './ticket.js';

const op = (columnas = 48) => ({ nombreLocal: 'La Taberna', columnas, codepage: 16 });
const GS_ALTO = Buffer.from([0x1d, 0x21, 0x01]);
const GS_NORMAL = Buffer.from([0x1d, 0x21, 0x00]);
const GS_DOBLE = Buffer.from([0x1d, 0x21, 0x11]);

const base: Pedido = {
  order_number: 212,
  type: 'delivery',
  payment_method: 'transferencia',
  total: 6500,
  customer_name: 'Jessica',
  delivery_address: 'Corea 1774',
  created_at: '2026-11-25T15:30:00Z',
  order_items: [{ product_name: 'Albóndigas de carne con fileto y pure', unit_price: 6500, quantity: 1, subtotal: 6500 }],
};

test('un producto corto: nombre en doble alto (mayúsculas en el espejo) y precio a la derecha', () => {
  const t = ticketComoTexto(base, op());
  assert.match(t, /^1 X ALBÓNDIGAS DE CARNE CON FILETO Y PURE +\$6\.500$/m);
  assert.match(t, /^TIPO: DELIVERY$/m);
  assert.match(t, /^CLIENTE: JESSICA$/m);
  assert.match(t, /^DIRECCIÓN: COREA 1774$/m);
  assert.ok(!t.includes('PEDIDO MODIFICADO'));
});

test('nombre de 49 letras: se envuelve con sangría y nunca desborda', () => {
  const nombre = 'Milanesa napolitana con papas fritas y huevo frito';
  assert.equal(nombre.length, 50);
  const nombre49 = 'Milanesa napolitana con papas fritas y huevo frit';
  assert.equal(nombre49.length, 49);
  for (const n of [nombre, nombre49]) {
    const t = ticketComoTexto({ ...base, order_items: [{ product_name: n, unit_price: 9000, quantity: 1, subtotal: 9000 }] }, op());
    const lineas = t.split('\n');
    for (const l of lineas) assert.ok(l.length <= 48, `desborda: ${l}`);
    const sinEspacios = lineas.join(' ').replace(/\s+/g, ' ').toUpperCase();
    assert.ok(sinEspacios.includes('MILANESA NAPOLITANA CON PAPAS FRITAS Y HUEVO FRIT'));
    assert.ok(lineas.some((l) => /^ {4}\S/.test(l)), 'las líneas siguientes llevan sangría');
    assert.match(t, /\$9\.000$/m);
  }
});

test('cantidad mayor a 1 muestra "$X c/u" en normal', () => {
  const t = ticketComoTexto({ ...base, order_items: [{ product_name: 'Papas', unit_price: 2500, quantity: 3, subtotal: 7500 }] }, op());
  assert.match(t, /^3 X PAPAS {2,}\$7\.500$/m);
  assert.match(t, /^ {4}\$2\.500 c\/u$/m);
});

test('notas del producto y del pedido salen en doble alto, envueltas', () => {
  const pedido: Pedido = {
    ...base,
    notes: 'Tocar timbre dos veces, el perro no muerde. Sin cubiertos descartables por favor.',
    order_items: [{ product_name: 'Hamburguesa', unit_price: 9500, quantity: 1, subtotal: 9500, notes: 'sin cebolla, bien cocida y con mucha salsa extra aparte por favor' }],
  };
  const t = ticketComoTexto(pedido, op());
  assert.match(t, /^ {4}> SIN CEBOLLA/m);
  assert.match(t, /^NOTAS:$/m);
  assert.match(t, /^TOCAR TIMBRE/m);
  for (const l of t.split('\n')) assert.ok(l.length <= 48, l);
});

test('delivery con dirección larga: se parte en líneas sin cortar palabras', () => {
  const t = ticketComoTexto({ ...base, delivery_address: 'Avenida Libertador General San Martín 12345, piso 5 departamento B, entre Güemes y Sarmiento' }, op());
  const l = t.split('\n').filter((x) => x.length > 0);
  assert.ok(t.includes('SARMIENTO'));
  assert.ok(t.includes('LIBERTADOR GENERAL SAN MARTÍN'));
  for (const x of l) assert.ok(x.length <= 48, x);
});

test('pedido editado: PEDIDO MODIFICADO antes del número y hora de Buenos Aires', () => {
  const t = ticketComoTexto({ ...base, ediciones: 2, editado_at: '2026-11-25T17:05:00Z' }, op());
  const iMod = t.indexOf('P E D I D O   M O D I F I C A D O');
  assert.ok(iMod >= 0);
  assert.ok(iMod < t.indexOf('P E D I D O   # 2 1 2'));
  assert.match(t, /Reemplaza al ticket anterior - 14:05/);
});

test('pedido sin editar (0, null o ausente): no avisa', () => {
  for (const ediciones of [0, null, undefined]) {
    assert.ok(!ticketComoTexto({ ...base, ediciones }, op()).includes('M O D I F I C A D O'));
  }
});

test('58 mm (32 columnas): ninguna línea del espejo supera el ancho', () => {
  const pedido: Pedido = {
    ...base,
    ediciones: 1,
    editado_at: '2026-11-25T17:05:00Z',
    notes: 'Tocar timbre dos veces, el perro no muerde',
    delivery_address: 'Avenida Libertador General San Martín 12345, piso 5',
    order_items: [
      { product_name: 'Milanesa napolitana con papas fritas y huevo frito', unit_price: 9000, quantity: 2, subtotal: 18000, notes: 'sin cebolla, bien cocida' },
      { product_name: 'Agua', unit_price: 1000, quantity: 1, subtotal: 1000 },
    ],
    total: 19000,
  };
  const t = ticketComoTexto(pedido, op(32));
  for (const l of t.split('\n')) assert.ok(l.length <= 32, `desborda (${l.length}): ${l}`);
});

test('bytes: los productos llevan doble alto y después se vuelve a tamaño normal', () => {
  const b = armarTicket(base, op());
  const nombre = Buffer.from('Alb');
  const iNombre = b.indexOf(nombre);
  assert.ok(iNombre > 0);
  const antes = b.subarray(0, iNombre);
  assert.ok(antes.lastIndexOf(GS_ALTO) > antes.lastIndexOf(GS_NORMAL), 'antes del nombre debe estar el doble alto');
  assert.ok(b.indexOf(GS_NORMAL, iNombre) > iNombre, 'después del nombre se vuelve a normal');
  // El último comando de tamaño antes del corte deja la impresora en normal.
  const corte = b.lastIndexOf(Buffer.from([0x1d, 0x56, 66, 0]));
  const previo = b.subarray(0, corte);
  const ultimo = Math.max(previo.lastIndexOf(GS_NORMAL), previo.lastIndexOf(GS_ALTO), previo.lastIndexOf(GS_DOBLE));
  assert.equal(previo.lastIndexOf(GS_NORMAL), ultimo);
  // Negrita también queda apagada.
  assert.ok(previo.lastIndexOf(Buffer.from([0x1b, 0x45, 0])) > previo.lastIndexOf(Buffer.from([0x1b, 0x45, 1])));
});
