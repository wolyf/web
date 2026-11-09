// Lenguaje de búsqueda de los manuales, compartido por el índice y las páginas de libro.
//
//   palabras sueltas     todas deben aparecer en el mismo bloque (párrafo, renglón, título)
//                        y cuentan desde el inicio de palabra: «tuber» encuentra «tubería»
//   "frase exacta"       palabras completas y seguidas
//   tubo|tuberia         cualquiera de las opciones
//   -palabra, -"frase"   excluye los bloques que la contienen
//   libro:20  libro:26,27  limita a esos libros (también «l:20»)
//
// Todo sin acentos ni mayúsculas (ver normal() en texto.js). Los números van completos:
// «20» no encuentra «200».

import { normal, palabras } from "./texto.js";

const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ANTES = "(?<![\\p{L}\\p{N}])";
const DESPUES = "(?![\\p{L}\\p{N}])";

/** Expresión de una opción: frase (palabras completas) o término (inicio de palabra). */
function patron(texto, frase) {
  const n = normal(texto).trim();
  if (frase) {
    const ps = palabras(n);
    if (!ps.length) return null;
    return { re: ANTES + ps.map(escapar).join("[^\\p{L}\\p{N}]+") + DESPUES, palabras: ps, exactas: true };
  }
  const ps = palabras(n);
  if (!ps.length) return null;
  // Se respeta la puntuación interna («0.3», «h/d»); un número se busca completo.
  const cuerpo = escapar(n.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}*]+$/gu, ""));
  const comodin = cuerpo.endsWith("\\*");
  const base = comodin ? cuerpo.slice(0, -2) : cuerpo;
  const numero = /^[\d.,]+$/.test(base.replace(/\\/g, ""));
  return { re: ANTES + base + (numero && !comodin ? DESPUES : ""), palabras: ps, exactas: false, numero };
}

/**
 * Interpreta el texto de búsqueda.
 * @returns {{grupos: object[], excluir: object[], libros: number[]|null, texto: string, vacia: boolean}}
 *   grupos: cada uno es una lista de opciones (OR); todos los grupos deben cumplirse (AND).
 */
export function interpretar(texto) {
  const grupos = [];
  const excluir = [];
  let libros = null;
  const re = /(-?)(?:(\p{L}+):)?(?:"([^"]*)"?|(\S+))/gu;
  let m;
  while ((m = re.exec(texto))) {
    const [, menos, campo, frase, suelta] = m;
    if (campo && /^(libro|libros|l)$/i.test(campo) && suelta) {
      const nums = suelta.split(/[,;]/).map(Number).filter((n) => Number.isInteger(n) && n > 0);
      if (nums.length) libros = [...(libros || []), ...nums];
      continue;
    }
    const crudo = campo ? `${campo}:${frase ?? suelta}` : (frase ?? suelta);
    const esFrase = frase !== undefined;
    const opciones = (esFrase ? [crudo] : crudo.split("|"))
      .map((o) => patron(o, esFrase))
      .filter(Boolean);
    if (!opciones.length) continue;
    const grupo = {
      opciones,
      re: new RegExp(opciones.map((o) => o.re).join("|"), "gu"),
      texto: esFrase ? `"${crudo}"` : crudo,
    };
    (menos ? excluir : grupos).push(grupo);
  }
  return { grupos, excluir, libros, texto: texto.trim(), vacia: !grupos.length };
}

/**
 * Coincidencias de la consulta en un texto ya normalizado.
 * @returns {null | {rangos: [inicio, fin][], cuenta: number[]}} null si no cumple la consulta.
 */
export function coincidir(c, n) {
  if (c.vacia) return null;
  for (const g of c.excluir) {
    g.re.lastIndex = 0;
    if (g.re.test(n)) return null;
  }
  const rangos = [];
  const cuenta = [];
  for (const g of c.grupos) {
    g.re.lastIndex = 0;
    let k = 0;
    let m;
    while ((m = g.re.exec(n))) {
      if (!m[0].length) { g.re.lastIndex++; continue; }
      rangos.push([m.index, m.index + m[0].length]);
      k++;
    }
    if (!k) return null;
    cuenta.push(k);
  }
  rangos.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  // Une rangos encimados
  const unidos = [];
  for (const r of rangos) {
    const u = unidos[unidos.length - 1];
    if (u && r[0] <= u[1]) u[1] = Math.max(u[1], r[1]);
    else unidos.push([...r]);
  }
  return { rangos: unidos, cuenta };
}

/** ¿Cumple la consulta un texto (sin normalizar)? Útil para títulos. */
export const cumple = (c, texto) => coincidir(c, normal(texto)) !== null;

/** Arma la dirección de un resultado: libro, consulta y bloque. */
export function enlace(base, num, consulta, bloque) {
  const p = new URLSearchParams({ q: consulta });
  if (bloque !== undefined) p.set("b", String(bloque));
  return `${base}libro-${String(num).padStart(2, "0")}.html?${p}`;
}
