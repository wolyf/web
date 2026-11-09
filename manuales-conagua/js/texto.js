// Reglas de texto compartidas por el buscador (navegador) y el generador del índice (Node).
//
// Un libro se divide en «bloques»: cada párrafo, renglón de tabla, encabezado, elemento
// de lista, etc. Los bloques se numeran en el orden en que TERMINAN (recorrido en
// postorden), saltando los vacíos. El índice (herramientas/bloques.mjs) y la página del
// libro (js/libro.js, sobre el DOM) aplican las mismas reglas, así que «bloque 812»
// señala el mismo párrafo en ambos lados.

/** Elementos que forman un bloque propio. */
export const BLOQUES = new Set([
  "p", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6",
  "pre", "figcaption", "caption", "dt", "dd", "blockquote",
]);

/** Encabezados: dan contexto («sección») a los bloques que los siguen. */
export const TITULOS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/** Elementos en línea: no separan palabras ni cortan el texto suelto. */
export const EN_LINEA = new Set([
  "a", "abbr", "b", "bdi", "bdo", "cite", "code", "data", "dfn", "em", "font", "i",
  "kbd", "mark", "q", "s", "samp", "small", "span", "strong", "sub", "sup", "time",
  "u", "var", "wbr",
]);

/** Elementos cuyo contenido no se indexa (además de lo que agrega el sitio, ver IDS_IGNORADOS). */
export const IGNORADOS = new Set([
  "head", "script", "style", "noscript", "template", "nav", "svg", "math", "iframe",
  "object", "canvas", "textarea", "select", "button",
]);

/** Elementos agregados por el sitio que no son parte del libro. */
export const IDS_IGNORADOS = new Set(["darwin", "mapas-hallazgos"]);

/** Une espacios (incluido el duro) y recorta. */
export const limpiar = (t) => t.replace(/\s+/g, " ").trim();

const sinMarcas = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Minúsculas y sin acentos, CONSERVANDO la longitud: el carácter i del resultado
 * corresponde al carácter i del original (para resaltar en el texto original).
 */
export function normal(t) {
  const r = sinMarcas(t);
  if (r.length === t.length) return r;
  let s = "";
  for (let i = 0; i < t.length; i++) {
    const c = sinMarcas(t[i]);
    s += c.length === 1 ? c : (c[0] || " ");
  }
  return s;
}

/** Palabras normalizadas de un texto (letras y dígitos). */
export function palabras(t) {
  return normal(t).match(/[\p{L}\p{N}]+/gu) || [];
}

/** Separadores de palabra (para buscar al inicio de palabra). */
export const LETRA = /[\p{L}\p{N}]/u;
