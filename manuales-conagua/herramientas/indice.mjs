#!/usr/bin/env node
// Índice de búsqueda de los libros MAPAS.
//
// Lee cada libros/libro-NN.html y escribe en datos/:
//   - datos/libros/libro-NN.json: el texto del libro en bloques (párrafos,
//     renglones de tabla, encabezados...) con el encabezado al que pertenece cada uno.
//   - datos/vocabulario.json: cada palabra (normalizada) y en qué libros aparece,
//     para saber qué libros descargar antes de buscar dentro de ellos.
//
// Uso: node manuales-conagua/herramientas/indice.mjs [--revisar]
//   --revisar: no escribe; falla si los datos no están al día.
//
// El número de bloque es el mismo que calcula js/libro.js en el navegador
// (mismas reglas, ver bloques.mjs), así los resultados enlazan al párrafo exacto.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extraer, palabras } from "./bloques.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIBROS = join(RAIZ, "libros");
const DATOS = join(RAIZ, "datos");

/** Genera el contenido de todos los archivos de datos: { ruta relativa: texto }. */
export function generar() {
  const archivos = {};
  const libros = readdirSync(LIBROS).filter((f) => /^libro-\d{2}\.html$/.test(f)).sort();
  const vocab = new Map(); // palabra -> Set de números de libro
  const lista = [];
  for (const f of libros) {
    const num = Number(f.match(/\d+/)[0]);
    const { titulos, bloques } = extraer(readFileSync(join(LIBROS, f), "utf8"));
    lista.push(num);
    // Formato compacto: t = encabezados [nivel, texto, bloque]; b = [índice de encabezado, texto]
    archivos[`libros/libro-${String(num).padStart(2, "0")}.json`] =
      JSON.stringify({ libro: num, t: titulos, b: bloques }) + "\n";
    for (const [, texto] of bloques) {
      for (const p of palabras(texto)) {
        let s = vocab.get(p);
        if (!s) vocab.set(p, (s = new Set()));
        s.add(num);
      }
    }
  }
  // Vocabulario ordenado; cada palabra lleva la lista de libros como máscara en base 36
  // (bit i = i-ésimo libro de «libros»). Se omiten números largos para ahorrar espacio.
  const pos = new Map(lista.map((n, i) => [n, i]));
  const entradas = [...vocab.keys()].sort().map((p) => {
    let m = 0n;
    for (const n of vocab.get(p)) m |= 1n << BigInt(pos.get(n));
    return `${p} ${m.toString(36)}`;
  });
  archivos["vocabulario.json"] = JSON.stringify({ libros: lista, p: entradas.join("\n") }) + "\n";
  return archivos;
}

function principal() {
  const revisar = process.argv.includes("--revisar");
  const archivos = generar();
  let viejos = 0;
  for (const [ruta, texto] of Object.entries(archivos)) {
    const destino = join(DATOS, ruta);
    const actual = existsSync(destino) ? readFileSync(destino, "utf8") : null;
    if (actual === texto) continue;
    viejos++;
    if (revisar) console.error(`Desactualizado: datos/${ruta}`);
    else {
      mkdirSync(dirname(destino), { recursive: true });
      writeFileSync(destino, texto);
    }
  }
  const total = Object.values(archivos).reduce((s, t) => s + Buffer.byteLength(t), 0);
  if (revisar && viejos) {
    console.error("Corre: node manuales-conagua/herramientas/indice.mjs");
    process.exit(1);
  }
  console.log(`${Object.keys(archivos).length} archivos, ${(total / 1e6).toFixed(1)} MB` + (revisar ? ", al día" : `, ${viejos} actualizados`));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) principal();
