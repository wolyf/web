#!/usr/bin/env node
// ============================================================
//  Importar una lectura (zona estudio)
// ============================================================
//
//   node estudio/herramientas/importar.mjs <archivo.html> <materia> <fuente>
//
// Toma un HTML suelto (con su propio <style>, banners y scripts) y deja en
// .privado/estudio/<materia>/<fuente>.html (ignorado por git) un FRAGMENTO listo para
// sellar con «npm run sesion -- sellar estudio»:
//
//   <style>… CSS original, aislado bajo .lt--<fuente> y con colores en variables del sitio …</style>
//   <div class="lt lt--<fuente>"> … cuerpo de la lectura … </div>
//
// Qué hace con el original:
//   · quita <head>, <script>, los manejadores on…="…", banners y barras del paquete offline
//     («Escuchar» incluido) y los enlaces de vuelta al índice viejo;
//   · cambia <main> por <div class="lt-main"> (el fragmento va dentro del <main> de la página);
//   · prefija cada selector con .lt--<fuente>; html, body y :root pasan a ser el propio contenedor
//     y se les quitan fuente, color, fondo y márgenes (los pone css/lectura.css);
//   · convierte los colores del CSS a variables del sitio (fondos claros a --surface/--surface-2,
//     textos oscuros a --text, matices a color-mix con --text-strong) para que se lean en tema
//     claro y oscuro. Un fondo oscuro del original se respeta tal cual.
//
// El cuerpo de la lectura NO se toca (fidelidad al texto). Solo CSS y HTML, sin dependencias.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ---------- Colores ----------

function aRGB(hex) {
  if (!/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex)) return null;
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Luminancia relativa (WCAG) y saturación HSV
export function luminancia([r, g, b]) {
  const f = (v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const saturacion = ([r, g, b]) => {
  const mx = Math.max(r, g, b);
  return mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
};

// ctx: "fondo" | "texto" | "borde". Devuelve la expresión CSS que reemplaza al color.
export function mapearColor(hex, ctx) {
  const rgb = aRGB(hex);
  if (!rgb) return hex;
  const L = luminancia(rgb);
  const S = saturacion(rgb);
  const mezcla = (pct, con) => `color-mix(in srgb, ${hex} ${pct}%, ${con})`;
  if (ctx === "fondo") {
    if (L >= 0.9 && S < 0.06) return "var(--surface)";
    if (L >= 0.7) return S < 0.14 ? "var(--surface-2)" : mezcla(45, "var(--surface)");
    return hex; // fondo oscuro o intermedio (insignias, cabeceras): se respeta
  }
  if (ctx === "borde") return L >= 0.6 ? "var(--border)" : mezcla(65, "var(--border)");
  // texto
  if (L < 0.07 && S < 0.25) return "var(--text)";
  if (L < 0.72 && S < 0.25) return "var(--muted)";
  if (L < 0.72) return mezcla(70, "var(--text-strong)");
  return hex; // texto claro sobre fondo oscuro
}

const REGEX_HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

function contextoDe(prop) {
  if (/^background(-color)?$/.test(prop)) return "fondo";
  if (/^(border(-top|-right|-bottom|-left)?(-color)?|outline(-color)?|column-rule(-color)?)$/.test(prop)) return "borde";
  if (/^(color|text-decoration-color|fill|stroke)$/.test(prop)) return "texto";
  return null;
}

function contextoVariable(nombre, valor) {
  if (/line|border|rule|borde|raya/i.test(nombre)) return "borde";
  if (/bg|fondo|paper|papel|box|caja|claro|soft|fill/i.test(nombre)) return "fondo";
  const rgb = aRGB(valor.match(REGEX_HEX)?.[0] ?? "");
  return rgb && luminancia(rgb) >= 0.85 ? "fondo" : "texto";
}

export function mapearDeclaracion(prop, valor) {
  if (/gradient|url\(/i.test(valor)) return valor;
  let ctx = null;
  if (prop.startsWith("--")) ctx = contextoVariable(prop, valor);
  else ctx = contextoDe(prop);
  if (!ctx) return valor;
  if (ctx === "fondo" && /^(white|#fff|#ffffff)$/i.test(valor.trim())) return "var(--surface)";
  return valor.replace(REGEX_HEX, (h) => mapearColor(h, ctx));
}

// ---------- CSS ----------

const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// Parte `texto` en el separador `sep` ignorando lo que va entre paréntesis, corchetes o comillas
function partir(texto, sep) {
  const partes = [];
  let nivel = 0;
  let comilla = "";
  let actual = "";
  for (const c of texto) {
    if (comilla) {
      if (c === comilla) comilla = "";
    } else if (c === '"' || c === "'") comilla = c;
    else if (c === "(" || c === "[") nivel++;
    else if (c === ")" || c === "]") nivel--;
    if (c === sep && nivel === 0 && !comilla) {
      partes.push(actual);
      actual = "";
    } else actual += c;
  }
  if (actual.trim()) partes.push(actual);
  return partes;
}

// Lista de { preludio, cuerpo } de primer nivel
function bloques(css) {
  const lista = [];
  let nivel = 0;
  let comilla = "";
  let preludio = "";
  let cuerpo = "";
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (comilla) {
      if (c === comilla) comilla = "";
    } else if (c === '"' || c === "'") comilla = c;
    if (!comilla && c === "{") {
      if (nivel++ === 0) continue;
    } else if (!comilla && c === "}") {
      if (--nivel === 0) {
        lista.push({ preludio: preludio.trim(), cuerpo });
        preludio = "";
        cuerpo = "";
        continue;
      }
    } else if (!comilla && c === ";" && nivel === 0) {
      preludio = ""; // @import, @charset
      continue;
    }
    if (nivel === 0) preludio += c;
    else cuerpo += c;
  }
  return lista;
}

const QUITAR_RAIZ = /^(margin(-\w+)?|padding(-\w+)?|font-family|font-size|line-height|color|background(-\w+)?|min-height|max-width|width)$/;
const QUITAR_CONTENEDOR = /^(margin(-\w+)?|padding(-\w+)?|max-width|width|background(-\w+)?|box-shadow|border(-\w+)?)$/;
const CONTENEDORES = new Set(["main", ".wrap", ".page", ".pagina", ".contenedor"]);

function selectorAislado(sel, alcance) {
  const s = sel.trim().replace(/\s+/g, " ");
  if (/^(html|body|:root)$/.test(s)) return { sel: alcance, tipo: "raiz" };
  const m = s.match(/^(?:html|body)\s+(.*)$/);
  const resto = m ? m[1] : s;
  // <main> pasa a .lt-main (se cambia también en el HTML)
  const conMain = resto.replace(/(^|[\s>+~])main(?![\w-])/g, "$1.lt-main");
  const tipo = CONTENEDORES.has(s) || s === ".lt-main" ? "contenedor" : "normal";
  if (/^\*/.test(conMain)) return { sel: `${alcance} ${conMain}`, tipo };
  return { sel: `${alcance} ${conMain}`, tipo };
}

function declaraciones(cuerpo, quitar) {
  const salida = [];
  for (const d of partir(cuerpo, ";")) {
    const i = d.indexOf(":");
    if (i < 0) continue;
    const prop = d.slice(0, i).trim().toLowerCase();
    const valor = d.slice(i + 1).trim();
    if (!prop || !valor) continue;
    if (quitar?.test(prop)) continue;
    if (/^position$/.test(prop) && /fixed|sticky/.test(valor)) continue;
    salida.push(`${prop}:${mapearDeclaracion(prop, valor)}`);
  }
  return salida.join(";");
}

// Las variables propias de la lectura (--ink, --accent, --muted…) se renombran a --lt-… para no pisar
// las del sitio (--accent, --muted, --border…) dentro del contenedor.
export function renombrarVariables(css) {
  const definidas = new Set([...sinComentarios(css).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  let salida = css;
  for (const nombre of definidas) salida = salida.replace(new RegExp(`${nombre.replace(/[-]/g, "\\-")}(?![\\w-])`, "g"), `--lt-${nombre.slice(2)}`);
  return salida;
}

export function aislarCSS(css, alcance) {
  const salida = [];
  for (const { preludio, cuerpo } of bloques(sinComentarios(css))) {
    if (!preludio) continue;
    if (/^@(media|supports)\b/.test(preludio)) {
      const dentro = aislarCSS(cuerpo, alcance);
      if (dentro) salida.push(`${preludio}{${dentro}}`);
      continue;
    }
    if (/^@keyframes\b/.test(preludio)) {
      salida.push(`${preludio}{${cuerpo}}`);
      continue;
    }
    if (preludio.startsWith("@")) continue; // @font-face, @page…
    const sels = partir(preludio, ",").map((s) => selectorAislado(s, alcance));
    const todosRaiz = sels.every((s) => s.tipo === "raiz");
    const todosContenedor = sels.every((s) => s.tipo === "contenedor");
    const quitar = todosRaiz ? QUITAR_RAIZ : todosContenedor ? QUITAR_CONTENEDOR : null;
    const decl = declaraciones(cuerpo, quitar);
    if (decl) salida.push(`${[...new Set(sels.map((s) => s.sel))].join(",")}{${decl}}`);
  }
  return salida.join("\n");
}

// ---------- HTML ----------

// Quita un elemento con `etiqueta` que cumpla `abre` (regex sobre la etiqueta de apertura),
// contando anidados de la misma etiqueta.
function quitarElementos(html, etiqueta, abre) {
  const apertura = new RegExp(`<${etiqueta}\\b[^>]*>`, "gi");
  let salida = "";
  let pos = 0;
  let m;
  while ((m = apertura.exec(html))) {
    if (!abre.test(m[0])) continue;
    let nivel = 1;
    const todo = new RegExp(`<(/?)${etiqueta}\\b[^>]*>`, "gi");
    todo.lastIndex = m.index + m[0].length;
    let t;
    while (nivel > 0 && (t = todo.exec(html))) nivel += t[1] ? -1 : 1;
    if (nivel > 0) break;
    salida += html.slice(pos, m.index);
    pos = todo.lastIndex;
    apertura.lastIndex = pos;
  }
  return salida + html.slice(pos);
}

export function normalizarLectura(html, fuente) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fuente)) throw new Error(`Fuente inválida: «${fuente}»`);
  const alcance = `.lt--${fuente}`;
  const estilos = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).filter((c) => !/h2offline/.test(c));
  const cuerpoOriginal = html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)?.[1];
  if (cuerpoOriginal == null) throw new Error("No se encontró <body>");

  let cuerpo = cuerpoOriginal
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
  cuerpo = quitarElementos(cuerpo, "div", /class="[^"]*\bh2offline-banner\b/);
  cuerpo = quitarElementos(cuerpo, "div", /id="h2offline-bar"/);
  cuerpo = quitarElementos(cuerpo, "div", /class="toolbar"/);
  cuerpo = cuerpo.replace(/\son\w+="[^"]*"/gi, "");
  // Enlaces de vuelta al índice del paquete offline: el párrafo que solo los contiene se va; si no, se queda el texto
  cuerpo = cuerpo.replace(/<p>\s*<a href="\.\.\/index\.html">[\s\S]*?<\/a>\s*<\/p>/gi, "");
  cuerpo = cuerpo.replace(/<a href="\.\.\/index\.html">([\s\S]*?)<\/a>/gi, "$1");
  cuerpo = cuerpo.replace(/<main\b([^>]*)>/gi, (_, a) => `<div class="lt-main"${a.replace(/\sclass="[^"]*"/i, (c) => c.replace(/^ class="/, ' data-clase="'))}>`).replace(/<\/main>/gi, "</div>");
  cuerpo = cuerpo.trim();

  const css = aislarCSS(renombrarVariables(estilos.join("\n")), alcance);
  return `<style>\n${css}\n</style>\n<div class="lt lt--${fuente}">\n${cuerpo}\n</div>\n`;
}

// ---------- Línea de comandos ----------

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [archivo, materia, fuente] = process.argv.slice(2);
  if (!archivo || !materia || !fuente) {
    console.error("Uso: node estudio/herramientas/importar.mjs <archivo.html> <materia> <fuente>");
    process.exit(2);
  }
  const salida = path.join(RAIZ, ".privado", "estudio", materia, `${fuente}.html`);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, normalizarLectura(fs.readFileSync(archivo, "utf8"), fuente));
  console.log(`✓ ${path.relative(RAIZ, salida)} (no se sube al repositorio). Siguiente: npm run sesion -- sellar estudio`);
}
