// Divide el HTML de un libro en bloques de texto, con las reglas de js/texto.js.
//
// Es un lector de HTML mínimo (sin dependencias) que imita lo que hace el navegador
// con estos archivos: etiquetas vacías, cierres implícitos de <p>, <li>, <tr>, <td>...
// La prueba de bloques compara su resultado con el DOM real cuando hay navegador.

import { BLOQUES, TITULOS, EN_LINEA, IGNORADOS, IDS_IGNORADOS, limpiar } from "../js/texto.js";

export { palabras } from "../js/texto.js";

const VACIOS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const TEXTO_CRUDO = new Set(["script", "style", "textarea", "title"]);

// Abrir uno de estos cierra un <p> abierto (como hace el navegador).
const CIERRAN_P = new Set([
  "address", "article", "aside", "blockquote", "details", "div", "dl", "fieldset", "figcaption",
  "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "main", "menu",
  "nav", "ol", "p", "pre", "section", "table", "ul",
]);

// Cierres implícitos: al abrir la llave, se cierran los de la lista si están abiertos
// antes de llegar a alguno de los «límites».
const IMPLICITOS = {
  li: { cierra: ["li"], limite: ["ul", "ol", "menu"] },
  dt: { cierra: ["dt", "dd"], limite: ["dl"] },
  dd: { cierra: ["dt", "dd"], limite: ["dl"] },
  tr: { cierra: ["tr", "td", "th"], limite: ["table", "thead", "tbody", "tfoot"] },
  td: { cierra: ["td", "th"], limite: ["tr", "table"] },
  th: { cierra: ["td", "th"], limite: ["tr", "table"] },
  thead: { cierra: ["thead", "tbody", "tfoot", "tr", "td", "th"], limite: ["table"] },
  tbody: { cierra: ["thead", "tbody", "tfoot", "tr", "td", "th"], limite: ["table"] },
  tfoot: { cierra: ["thead", "tbody", "tfoot", "tr", "td", "th"], limite: ["table"] },
};

const ENTIDADES = {
  nbsp: " ", lt: "<", gt: ">", quot: '"', amp: "&", apos: "'", middot: "·",
  minus: "−", part: "∂", times: "×", divide: "÷", plusmn: "±",
  deg: "°", micro: "µ", radic: "√", infin: "∞", sum: "∑", int: "∫",
  le: "≤", ge: "≥", ne: "≠", asymp: "≈", sup2: "²", sup3: "³",
  frac12: "½", frac14: "¼", frac34: "¾", ndash: "–", mdash: "\u2014",
  hellip: "…", laquo: "«", raquo: "»", ldquo: "“", rdquo: "”",
  lsquo: "‘", rsquo: "’", bull: "•", copy: "©", reg: "®", sect: "§",
  para: "¶", rarr: "→", larr: "←", uarr: "↑", darr: "↓", harr: "↔",
  rArr: "⇒", hArr: "⇔", prime: "′", Prime: "″", permil: "‰", ordm: "º",
  ordf: "ª", iexcl: "¡", iquest: "¿", shy: "­", thinsp: " ", ensp: " ",
  emsp: " ", zwj: "‍", zwnj: "‌", cdot: "·", sdot: "⋅", prop: "∝",
  nabla: "∇", isin: "∈", forall: "∀", exist: "∃", empty: "∅", cap: "∩",
  cup: "∪", sim: "∼", cong: "≅", equiv: "≡", euro: "€", cent: "¢",
};
// Letras acentuadas y griegas por nombre (áéíóúñü..., alpha...omega).
const ACENTOS = { acute: "́", grave: "̀", circ: "̂", uml: "̈", tilde: "̃", ring: "̊", cedil: "̧" };
for (const [suf, marca] of Object.entries(ACENTOS)) {
  for (const l of "aeiouyAEIOUYnNcC") ENTIDADES[l + suf] = (l + marca).normalize("NFC");
}
const GRIEGO = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigmaf sigma tau upsilon phi chi psi omega".split(" ");
GRIEGO.forEach((n, i) => {
  // minúsculas: alpha = U+03B1 ...; sigmaf (final) = U+03C2
  const cp = 0x3b1 + i;
  ENTIDADES[n] = String.fromCodePoint(cp);
  if (n !== "sigmaf") ENTIDADES[n[0].toUpperCase() + n.slice(1)] = String.fromCodePoint(cp - 0x20);
});
ENTIDADES.Sigma = "Σ";
ENTIDADES.thetasym = "ϑ";
ENTIDADES.piv = "ϖ";

function decodificar(t) {
  return t.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);?/gi, (m, e) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!cp || cp > 0x10ffff) return "�";
      return String.fromCodePoint(cp);
    }
    const c = ENTIDADES[e];
    return c !== undefined && (m.endsWith(";") || e in ENTIDADES) ? c : m;
  });
}

/**
 * Bloques de un libro.
 * @returns {{titulos: [nivel:number, texto:string, bloque:number][], bloques: [titulo:number, texto:string][]}}
 *   titulos: encabezados h1 a h6; bloques: índice del encabezado vigente (-1 si ninguno) y texto.
 */
export function extraer(html) {
  const titulos = [];
  const bloques = [];
  // Pila de elementos abiertos: { tag, bloque: string[] | null, ignorado: bool }
  const pila = [{ tag: "#raiz", partes: null, ignorado: false }];
  let suelto = []; // texto fuera de todo bloque (corrido)
  let ignorado = 0;

  const bloqueAbierto = () => {
    for (let i = pila.length - 1; i >= 0; i--) if (pila[i].partes) return pila[i];
    return null;
  };
  const emitir = (tag, partes) => {
    const texto = limpiar(partes.join(""));
    if (!texto) return;
    if (TITULOS.has(tag)) titulos.push([Number(tag[1]), texto, bloques.length]);
    bloques.push([titulos.length - 1, texto]);
  };
  const soltar = () => {
    if (suelto.length) emitir("#suelto", suelto);
    suelto = [];
  };
  // Límite de un elemento que no es en línea: separa palabras y corta el texto suelto.
  const limite = () => {
    const b = bloqueAbierto();
    if (b) b.partes.push(" ");
    else soltar();
  };
  const cerrarTope = () => {
    const e = pila.pop();
    if (e.ignorado) ignorado--;
    if (ignorado) return;
    if (EN_LINEA.has(e.tag)) return;
    if (e.partes) {
      soltar(); // (no debería haber texto suelto dentro de un bloque)
      emitir(e.tag, e.partes);
      const b = bloqueAbierto();
      if (b) b.partes.push(" ");
    } else limite();
  };
  const abierto = (tags, limites) => {
    for (let i = pila.length - 1; i > 0; i--) {
      if (tags.includes(pila[i].tag)) return i;
      if (limites.includes(pila[i].tag)) return -1;
    }
    return -1;
  };
  const cerrarHasta = (i) => {
    while (pila.length > i) cerrarTope();
  };

  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+|</g;
  let m;
  while ((m = re.exec(html))) {
    const tok = m[0];
    if (tok[0] !== "<" || tok === "<") {
      // Texto
      if (ignorado) continue;
      const t = decodificar(tok);
      const b = bloqueAbierto();
      if (b) b.partes.push(t);
      else if (/\S/.test(t) || suelto.length) suelto.push(t);
      continue;
    }
    if (!m[1]) continue; // comentario, doctype
    const tag = m[1].toLowerCase();
    if (tok[1] === "/") {
      // Cierre
      if (tag === "p" && abierto(["p"], ["button"]) < 0) {
        // </p> sin abrir: el navegador crea un <p> vacío; no aporta texto.
        continue;
      }
      if (tag === "br") { if (!ignorado) limite(); continue; }
      for (let i = pila.length - 1; i > 0; i--) {
        if (pila[i].tag === tag) { cerrarHasta(i); break; }
      }
      continue;
    }
    // Apertura
    const attrs = m[2] || "";
    if (CIERRAN_P.has(tag)) {
      const i = abierto(["p"], ["button", "table", "td", "th", "li", "dd", "dt", "caption", "figcaption"]);
      if (i > 0) cerrarHasta(i);
    }
    const imp = IMPLICITOS[tag];
    if (imp) {
      // Se cierra hasta el más externo de los abiertos antes del límite (un <tr> nuevo
      // cierra el <td> y también el <tr> anterior).
      let i = -1;
      for (let k = pila.length - 1; k > 0; k--) {
        if (imp.limite.includes(pila[k].tag)) break;
        if (imp.cierra.includes(pila[k].tag)) i = k;
      }
      if (i > 0) cerrarHasta(i);
    }
    if (/^h[1-6]$/.test(tag)) {
      // Un encabezado no puede ir dentro de otro.
      const i = abierto(["h1", "h2", "h3", "h4", "h5", "h6"], []);
      if (i > 0) cerrarHasta(i);
    }
    if (VACIOS.has(tag)) {
      if (!ignorado && !EN_LINEA.has(tag)) {
        if (tag === "img" || tag === "wbr") continue;
        limite();
      }
      continue;
    }
    const id = (attrs.match(/\sid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i) || [])[1];
    const ign = IGNORADOS.has(tag) || (id && IDS_IGNORADOS.has(id)) || /\sdata-latex(?:\s|=|$)/i.test(attrs);
    if (ign) ignorado++;
    if (!ignorado && !EN_LINEA.has(tag)) {
      // Abrir un bloque o un contenedor también es un límite.
      limite();
    }
    pila.push({ tag, partes: !ignorado && BLOQUES.has(tag) ? [] : null, ignorado: ign });
    if (TEXTO_CRUDO.has(tag)) {
      // Saltar el contenido crudo hasta su cierre.
      const fin = html.toLowerCase().indexOf(`</${tag}`, re.lastIndex);
      const texto = html.slice(re.lastIndex, fin < 0 ? html.length : fin);
      if (!ignorado && tag === "textarea") {
        const b = bloqueAbierto();
        if (b) b.partes.push(decodificar(texto));
      }
      re.lastIndex = fin < 0 ? html.length : fin;
    }
  }
  cerrarHasta(1);
  soltar();
  return { titulos, bloques };
}
