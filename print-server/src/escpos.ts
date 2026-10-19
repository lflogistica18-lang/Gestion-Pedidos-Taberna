/**
 * Encoder ESC/POS mínimo, sin librerías.
 * Además de generar los bytes para la impresora, mantiene un "espejo" en texto
 * legible (para el modo simulado), así el ticket se arma una sola vez.
 */

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** Caracteres no ASCII soportados -> byte en CP850. */
const MAPA_CP850 = new Map<string, number>([
  ['á', 0xa0], ['é', 0x82], ['í', 0xa1], ['ó', 0xa2], ['ú', 0xa3],
  ['Á', 0xb5], ['É', 0x90], ['Í', 0xd6], ['Ó', 0xe0], ['Ú', 0xe9],
  ['ñ', 0xa4], ['Ñ', 0xa5], ['ü', 0x81], ['Ü', 0x9a],
  ['¿', 0xa8], ['¡', 0xad], ['°', 0xf8],
]);

/**
 * Deja el texto listo para imprimir: sin emojis, sin saltos de línea,
 * y con '?' en lo que la impresora no puede dibujar. Cada carácter resultante = 1 byte.
 */
export function normalizar(texto: string): string {
  const t = texto
    .normalize('NFC')
    .replace(/[\p{Extended_Pictographic}️‍⃣]/gu, '')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[\r\n\t]+/g, ' ');
  let salida = '';
  for (const ch of t) {
    const c = ch.codePointAt(0)!;
    salida += (c >= 0x20 && c < 0x7f) || MAPA_CP850.has(ch) ? ch : '?';
  }
  return salida;
}

/** Codifica texto (ya normalizado o no) a bytes CP850. */
export function codificarCP850(texto: string): Buffer {
  const t = normalizar(texto);
  const bytes: number[] = [];
  for (const ch of t) {
    const c = ch.codePointAt(0)!;
    bytes.push(c >= 0x20 && c < 0x7f ? c : MAPA_CP850.get(ch) ?? 0x3f);
  }
  return Buffer.from(bytes);
}

/** Parte un texto en líneas de hasta `ancho` caracteres (por palabras; corta las palabras muy largas). */
export function envolver(texto: string, ancho: number): string[] {
  const max = Math.max(1, ancho);
  const resultado: string[] = [];
  for (const parrafo of texto.split(/\r?\n/)) {
    const t = normalizar(parrafo).trim();
    if (!t) continue;
    let linea = '';
    for (const palabra of t.split(/\s+/)) {
      let p = palabra;
      while (p.length > max) {
        if (linea) {
          resultado.push(linea);
          linea = '';
        }
        resultado.push(p.slice(0, max));
        p = p.slice(max);
      }
      if (!linea) linea = p;
      else if (linea.length + 1 + p.length <= max) linea += ' ' + p;
      else {
        resultado.push(linea);
        linea = p;
      }
    }
    if (linea) resultado.push(linea);
  }
  return resultado.length > 0 ? resultado : [''];
}

export type Alineacion = 'izq' | 'centro' | 'der';

export class EscPos {
  private partes: Buffer[] = [];
  private espejo: string[] = [];
  private alineacion: Alineacion = 'izq';
  private esDoble = false;

  constructor(
    public readonly columnas: number,
    codepage: number,
  ) {
    this.partes.push(Buffer.from([ESC, 0x40])); // ESC @ : inicializar
    this.partes.push(Buffer.from([ESC, 0x74, codepage & 0xff])); // ESC t n : code page
  }

  /** Ancho útil en caracteres con el tamaño actual (el doble tamaño ocupa la mitad). */
  get ancho(): number {
    return this.esDoble ? Math.floor(this.columnas / 2) : this.columnas;
  }

  alinear(a: Alineacion): this {
    this.alineacion = a;
    const n = a === 'izq' ? 0 : a === 'centro' ? 1 : 2;
    this.partes.push(Buffer.from([ESC, 0x61, n])); // ESC a n
    return this;
  }

  negrita(activa: boolean): this {
    this.partes.push(Buffer.from([ESC, 0x45, activa ? 1 : 0])); // ESC E n
    return this;
  }

  doble(activo: boolean): this {
    this.esDoble = activo;
    this.partes.push(Buffer.from([GS, 0x21, activo ? 0x11 : 0x00])); // GS ! n
    return this;
  }

  /** Una línea tal cual (sin wrap). Quien llama es responsable de que entre en el ancho. */
  linea(texto: string): this {
    const t = normalizar(texto);
    this.partes.push(codificarCP850(t), Buffer.from([LF]));
    // En el espejo, el doble ancho se representa con un espacio tras cada carácter.
    const base = this.esDoble ? [...t].map((c) => (c === ' ' ? '  ' : c + ' ')).join('') : t;
    const w = this.columnas;
    let visible = base;
    if (this.alineacion === 'centro') visible = ' '.repeat(Math.max(0, Math.floor((w - base.length) / 2))) + base;
    else if (this.alineacion === 'der') visible = ' '.repeat(Math.max(0, w - base.length)) + base;
    else visible = base.trimEnd();
    this.espejo.push(visible);
    return this;
  }

  /** Texto con wrap automático al ancho actual. */
  texto(texto: string): this {
    for (const l of envolver(texto, this.ancho)) this.linea(l);
    return this;
  }

  separador(): this {
    return this.linea('-'.repeat(this.ancho));
  }

  /** "izquierda ......... derecha" rellenando hasta `ancho`; si la izquierda no entra, la parte en varias líneas. */
  fila(izq: string, der: string, ancho: number = this.ancho): this {
    const d = normalizar(der).trim();
    const lugarIzq = ancho - d.length - 1;
    if (lugarIzq < 1) {
      // El monto ocupa casi todo: izquierda arriba, derecha abajo alineada a la derecha.
      for (const l of envolver(izq, ancho)) this.linea(l);
      return this.linea(' '.repeat(Math.max(0, ancho - d.length)) + d);
    }
    const partes = envolver(izq, lugarIzq);
    partes.forEach((p, i) => {
      if (i === 0) this.linea(p + ' '.repeat(ancho - p.length - d.length) + d);
      else this.linea(p);
    });
    return this;
  }

  feed(n: number): this {
    this.partes.push(Buffer.from([ESC, 0x64, n & 0xff])); // ESC d n
    for (let i = 0; i < n; i++) this.espejo.push('');
    return this;
  }

  cortar(): this {
    this.partes.push(Buffer.from([GS, 0x56, 66, 0])); // GS V 66 0 : feed + corte parcial
    this.espejo.push('[ ---- corte ---- ]');
    return this;
  }

  build(): Buffer {
    return Buffer.concat(this.partes);
  }

  comoTexto(): string {
    return this.espejo.join('\n');
  }
}
