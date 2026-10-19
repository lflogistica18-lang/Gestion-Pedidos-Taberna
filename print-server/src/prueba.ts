import { cargarConfigImpresora } from './config.js';
import { EscPos } from './escpos.js';
import { imprimir } from './impresora.js';

const cfg = cargarConfigImpresora();

const e = new EscPos(cfg.columnas, cfg.codepage);
e.alinear('centro').negrita(true).texto(cfg.nombreLocal).negrita(false);
e.doble(true).texto('PRUEBA').doble(false);
e.alinear('izq');
e.separador();
e.texto('Prueba de impresión — ñandú, pingüino, ¿café?');
e.texto('ÁÉÍÓÚ áéíóú Ññ Üü ¡Hola! 20°C');
e.fila('2 x Hamburguesa completa', '$12.500');
e.fila('TOTAL', '$25.000');
e.separador();
e.alinear('centro').linea(`Columnas: ${cfg.columnas}  Codepage: ${cfg.codepage}`);
e.linea('Si ves esto bien, la impresora funciona.');
e.feed(4).cortar();

try {
  console.log(cfg.simular ? 'Modo simulado: no se manda nada a la impresora.' : `Enviando hoja de prueba a ${cfg.ip}:${cfg.puerto}...`);
  await imprimir(e.build(), e.comoTexto(), 'prueba', cfg);
  console.log('✅ Hoja de prueba enviada.');
} catch (err) {
  console.error('❌ ' + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
}
