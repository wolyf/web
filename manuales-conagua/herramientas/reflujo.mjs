// Reflujo automático de los libros: une renglones del PDF partidos en varios <p>.
//
// Uso:  node manuales-conagua/herramientas/reflujo.mjs [NN ...]   (sin números: todos)
//       --revisar   solo cuenta las uniones, no escribe
//
// Es deliberadamente conservador (solo arregla lo evidente; cada libro tiene su
// propio marcado, así que no se apoya en sus clases):
//   - Solo une <p> SIN atributos que sean hermanos seguidos (o separados por una
//     marca de página corta, que pasa a quedar después del párrafo unido).
//   - Une si el segundo empieza en minúscula y el primero no cierra frase, o si el
//     primero termina en guion pegado a una letra y el segundo sigue en minúscula
//     (se quita el guion: «alcan- / tarillado» → «alcantarillado»), o si el primero
//     termina en coma, en paréntesis abierto o en palabra de enlace («de», «la», «y»…)
//     y ambos renglones son largos (los rótulos de esquemas son cortos y se respetan).
//   - No cambia palabras: solo quita la separación entre renglones.
// El Libro 1 (edición de lectura, <body class="… libro">) se omite.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "libros");

const CONECTORES = new Set(`a al ante bajo cada como con contra cual cuales cuando de del desde donde e el en entre
  es esta este estos estas hacia hasta la las lo los más mediante ni o para pero por que quien se según sin sobre su
  sus tal tanto un una unos unas u y ya cuyo cuya son ser será serán debe deben puede pueden ha han no le les muy`
  .split(/\s+/).filter(Boolean));

const P = /<p>((?:(?!<\/?p[\s>])[\s\S])*?)<\/p>/g;
// Marca de página: elemento corto con clase de «página», «marca», «salto» o «folio»
const MARCA = /^\s*<(p|div|span|aside)\s+class="[^"]*(?:pag|marca|salto|folio|pagemark)[^"]*"[^>]*>[^<]{0,60}<\/\1>\s*$/i;

const texto = (h) => h.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const ultima = (t) => (t.match(/([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)\W*$/) || [, ""])[1].toLowerCase();

/** ¿El renglón b continúa la frase del renglón a? Devuelve "guion", "espacio" o null. */
export function continua(a, b) {
  const ta = texto(a), tb = texto(b);
  if (!ta || !tb) return null;
  if (/[.?!:;]["»”)]?$/.test(ta)) return null;
  if (/^(www\.|https?:)/i.test(tb)) return null;
  const minus = /^[a-záéíóúüñ]/.test(tb);
  if (/[A-Za-zÁÉÍÓÚáéíóúñ]-$/.test(ta)) return minus ? "guion" : null;
  if (minus) return "espacio";
  const largos = ta.length >= 35 && tb.length >= 35;
  const abierto = (ta.match(/\(/g) || []).length > (ta.match(/\)/g) || []).length;
  if (largos && (ta.endsWith(",") || abierto || CONECTORES.has(ultima(ta))) && /^[A-ZÁÉÍÓÚÑ0-9(«"]/.test(tb)) return "espacio";
  return null;
}

/** Aplica el reflujo a un HTML. Devuelve { html, uniones }. */
export function reflujo(html) {
  const ps = [...html.matchAll(P)];
  if (ps.length < 2) return { html, uniones: 0 };
  let out = "", desde = 0, uniones = 0;
  let actual = null; // { cuerpo, marcas }
  const cerrar = () => {
    if (!actual) return;
    out += `<p>${actual.cuerpo}</p>` + actual.marcas.map((m) => "\n" + m.trim()).join("");
    actual = null;
  };
  for (let i = 0; i < ps.length; i++) {
    const m = ps[i];
    const hueco = html.slice(desde, m.index);
    if (actual) {
      const soloEspacio = /^\s*$/.test(hueco);
      const conMarca = !soloEspacio && MARCA.test(hueco);
      const modo = (soloEspacio || conMarca) ? continua(actual.cuerpo, m[1]) : null;
      if (modo) {
        const a = actual.cuerpo.replace(/\s+$/, ""), b = m[1].replace(/^\s+/, "");
        actual.cuerpo = modo === "guion" ? a.slice(0, -1) + b : a + " " + b;
        if (conMarca) actual.marcas.push(hueco);
        uniones++;
        desde = m.index + m[0].length;
        continue;
      }
      cerrar();
    }
    out += hueco;
    actual = { cuerpo: m[1], marcas: [] };
    desde = m.index + m[0].length;
  }
  cerrar();
  out += html.slice(desde);
  return { html: out, uniones };
}

// ---- Línea de comandos ----
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const revisar = args.includes("--revisar");
  const nums = args.filter((a) => /^\d+$/.test(a)).map((n) => n.padStart(2, "0"));
  const archivos = readdirSync(DIR).filter((f) => /^libro-\d+\.html$/.test(f))
    .filter((f) => !nums.length || nums.includes(f.slice(6, 8))).sort();
  let total = 0;
  for (const f of archivos) {
    const ruta = join(DIR, f);
    const html = readFileSync(ruta, "utf8");
    if (/<body[^>]*class="[^"]*\blibro\b/.test(html)) { console.log(`${f}: edición de lectura, se omite`); continue; }
    const r = reflujo(html);
    total += r.uniones;
    console.log(`${f}: ${r.uniones} uniones`);
    if (!revisar && r.uniones) writeFileSync(ruta, r.html);
  }
  console.log(`Total: ${total} uniones${revisar ? " (sin escribir)" : ""}`);
}
