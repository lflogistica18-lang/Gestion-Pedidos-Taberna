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
 * Mismos caracteres en WPC1252 (ESC t 16, la tabla de la impresora USB del local).
 * En Windows-1252 las letras con tilde, ñ, ¿ y ¡ ocupan el mismo byte que en Latin-1.
 */
const MAPA_CP1252 = new Map<string, number>([
  ['á', 0xe1], ['é', 0xe9], ['í', 0xed], ['ó', 0xf3], ['ú', 0xfa],
  ['Á', 0xc1], ['É', 0xc9], ['Í', 0xcd], ['Ó', 0xd3], ['Ú', 0xda],
  ['ñ', 0xf1], ['Ñ', 0xd1], ['ü', 0xfc], ['Ü', 0xdc],
  ['¿', 0xbf], ['¡', 0xa1], ['°', 0xb0],
]);

/** ESC t n que corresponde a WPC1252 en las impresoras Epson y compatibles. */
export const CODEPAGE_WPC1252 = 16;

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

/**
 * Codifica texto (ya normalizado o no) según la tabla de caracteres de la impresora:
 * 16 = WPC1252; cualquier otra = CP850 (la que usaba el modo red).
 */
export function codificar(texto: string, codepage: number): Buffer {
  const mapa = codepage === CODEPAGE_WPC1252 ? MAPA_CP1252 : MAPA_CP850;
  const t = normalizar(texto);
  const bytes: number[] = [];
  for (const ch of t) {
    const c = ch.codePointAt(0)!;
    bytes.push(c >= 0x20 && c < 0x7f ? c : mapa.get(ch) ?? 0x3f);
  }
  return Buffer.from(bytes);
}

/** Codifica texto a bytes CP850 (se mantiene por compatibilidad). */
export function codificarCP850(texto: string): Buffer {
  return codificar(texto, 2);
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

/** Un tramo de texto con un mismo formato dentro de una línea impresa. */
export interface Segmento {
  texto: string;
  /** Doble alto (GS ! 0x01): no cambia las columnas. */
  alto: boolean;
  /** Doble ancho (GS ! 0x10): divide las columnas por 2. */
  ancho: boolean;
  negrita: boolean;
}

/** Una línea del ticket tal como sale en papel (para espejo y simulación gráfica). */
export interface LineaModelo {
  segmentos: Segmento[];
  alineacion: Alineacion;
}

export class EscPos {
  private partes: Buffer[] = [];
  private espejo: string[] = [];
  private modelo: LineaModelo[] = [];
  private alineacion: Alineacion = 'izq';
  // Formato "declarado" (el que pidió quien arma el ticket) y formato real de la impresora.
  private esAlto = false;
  private esAncho = false;
  private esNegrita = false;
  private hwTam = 0;
  private hwNeg = false;

  constructor(
    public readonly columnas: number,
    private readonly codepage: number,
  ) {
    this.partes.push(Buffer.from([ESC, 0x40])); // ESC @ : inicializar
    this.partes.push(Buffer.from([ESC, 0x74, codepage & 0xff])); // ESC t n : code page
  }

  /** Ancho útil en caracteres con el tamaño actual (el doble ancho ocupa la mitad; el doble alto no cambia nada). */
  get ancho(): number {
    return this.esAncho ? Math.floor(this.columnas / 2) : this.columnas;
  }

  alinear(a: Alineacion): this {
    this.alineacion = a;
    const n = a === 'izq' ? 0 : a === 'centro' ? 1 : 2;
    this.partes.push(Buffer.from([ESC, 0x61, n])); // ESC a n
    return this;
  }

  negrita(activa: boolean): this {
    this.esNegrita = activa;
    this.aplicar(this.esAlto, this.esAncho, activa);
    return this;
  }

  /** Doble alto y doble ancho a la vez (como siempre). */
  doble(activo: boolean): this {
    return this.tamano(activo, activo);
  }

  /** Tamaño por separado: alto (más alto, mismas columnas) y ancho (más ancho, mitad de columnas). */
  tamano(alto: boolean, ancho: boolean): this {
    this.esAlto = alto;
    this.esAncho = ancho;
    this.aplicar(alto, ancho, this.esNegrita);
    return this;
  }

  /** Doble alto solo. */
  alto(activo: boolean): this {
    return this.tamano(activo, false);
  }

  private aplicar(alto: boolean, ancho: boolean, negrita: boolean): void {
    const n = (alto ? 0x01 : 0) | (ancho ? 0x10 : 0);
    if (n !== this.hwTam) {
      this.partes.push(Buffer.from([GS, 0x21, n])); // GS ! n
      this.hwTam = n;
    }
    if (negrita !== this.hwNeg) {
      this.partes.push(Buffer.from([ESC, 0x45, negrita ? 1 : 0])); // ESC E n
      this.hwNeg = negrita;
    }
  }

  /** Una línea tal cual (sin wrap). Quien llama es responsable de que entre en el ancho. */
  linea(texto: string): this {
    return this.segmentos([{ texto, alto: this.esAlto, ancho: this.esAncho, negrita: this.esNegrita }]);
  }

  /**
   * Una línea con varios formatos (por ejemplo producto en doble alto y precio en normal).
   * Al terminar la impresora vuelve al formato declarado.
   */
  segmentos(segs: Segmento[]): this {
    const limpios = segs.map((s) => ({ ...s, texto: normalizar(s.texto) }));
    for (const s of limpios) {
      this.aplicar(s.alto, s.ancho, s.negrita);
      this.partes.push(codificar(s.texto, this.codepage));
    }
    this.partes.push(Buffer.from([LF]));
    this.aplicar(this.esAlto, this.esAncho, this.esNegrita);
    this.modelo.push({ segmentos: limpios, alineacion: this.alineacion });

    // Espejo en texto: doble ancho = espacio tras cada letra; doble alto = MAYÚSCULAS.
    const base = limpios
      .map((s) => {
        let t = s.texto;
        if (s.alto && !s.ancho) t = t.toUpperCase();
        if (s.ancho) t = [...t].map((c) => (c === ' ' ? '  ' : c + ' ')).join('');
        return t;
      })
      .join('');
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
    for (let i = 0; i < n; i++) {
      this.espejo.push('');
      this.modelo.push({ segmentos: [], alineacion: 'izq' });
    }
    return this;
  }

  cortar(): this {
    this.partes.push(Buffer.from([GS, 0x56, 66, 0])); // GS V 66 0 : feed + corte parcial
    this.espejo.push('[ ---- corte ---- ]');
    this.modelo.push({ segmentos: [{ texto: '[ ---- corte ---- ]', alto: false, ancho: false, negrita: false }], alineacion: 'centro' });
    return this;
  }

  build(): Buffer {
    return Buffer.concat(this.partes);
  }

  comoTexto(): string {
    return this.espejo.join('\n');
  }

  /** Líneas con su formato (texto, tamaño, negrita, alineación), para dibujar cómo sale en papel. */
  lineas(): LineaModelo[] {
    return this.modelo.map((l) => ({ alineacion: l.alineacion, segmentos: l.segmentos.map((s) => ({ ...s })) }));
  }
}
