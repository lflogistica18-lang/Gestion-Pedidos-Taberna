// Verificación rápida (NO se usa en producción): npx tsx src/demo.ts
import { ticketComoTexto, type Pedido } from './ticket.js';

const pedido: Pedido = {
  order_number: 123,
  type: 'delivery',
  payment_method: 'transferencia',
  total: 48750.5,
  notes: 'Tocar timbre dos veces, el perro no muerde. Sin cubiertos descartables por favor.',
  customer_name: 'María Peñaloza',
  delivery_address: 'Av. Libertador 1234, 5° B, entre Güemes y San Martín',
  created_at: '2026-10-19T17:32:00Z',
  order_items: [
    { product_name: 'Hamburguesa doble con cheddar, panceta crocante y salsa especial de la casa', unit_price: 9500, quantity: 1, subtotal: 9500, notes: 'Sin cebolla, bien cocida' },
    { product_name: 'Papas fritas', unit_price: 4250.5, quantity: 3, subtotal: 12751.5 },
    { product_name: 'Ñoquis de papa', unit_price: 8000, quantity: 2, subtotal: 16000, notes: 'Salsa fileto con muchísimo queso rallado extra por encima ¿se puede?' },
  ],
};

for (const columnas of [48, 32]) {
  console.log(`\n===== COLUMNAS ${columnas} =====`);
  console.log(ticketComoTexto(pedido, { nombreLocal: 'La Taberna', columnas, codepage: 2 }));
}
