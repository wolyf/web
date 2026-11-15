// Pruebas de los datos para buscadores de los manuales (herramientas/seo.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { esperado, leerLibros, actualizarLibro, baseDelSitio } from "../seo.mjs";

const PROYECTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = baseDelSitio();
const libros = leerLibros(fs.readFileSync(path.join(PROYECTO, "index.html"), "utf8"));
const contar = (html, re) => (html.match(re) || []).length;

test("la lista de index.html da los 54 libros, cada uno con su archivo y grupo", () => {
  assert.equal(libros.length, 54);
  for (const l of libros) {
    assert.ok(fs.existsSync(path.join(PROYECTO, "libros", l.archivo)), l.archivo);
    assert.ok(l.nombre && l.grupo, `${l.archivo}: falta nombre o grupo`);
  }
});

test("los libros y sitemap.xml están al día (node manuales-conagua/herramientas/seo.mjs)", () => {
  for (const [ruta, contenido] of esperado()) {
    assert.ok(fs.existsSync(ruta) && fs.readFileSync(ruta, "utf8") === contenido, `${path.relative(PROYECTO, ruta)}: corre «node manuales-conagua/herramientas/seo.mjs».`);
  }
});

test("cada libro tiene un título, una descripción, su canonical y JSON-LD válido dentro del <head>", () => {
  for (const l of libros) {
    const html = fs.readFileSync(path.join(PROYECTO, "libros", l.archivo), "utf8");
    const head = html.slice(0, html.indexOf("</head>"));
    assert.equal(contar(html, /<title>/g), 1, `${l.archivo}: <title>`);
    assert.equal(contar(head, /<meta name="description"/g), 1, `${l.archivo}: descripción`);
    const canon = head.match(/<link rel="canonical" href="([^"]+)">/g) || [];
    assert.deepEqual(canon, [`<link rel="canonical" href="${base}manuales-conagua/libros/${l.archivo}">`], `${l.archivo}: canonical`);
    const ld = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(ld, `${l.archivo}: falta JSON-LD`);
    const datos = JSON.parse(ld[1]);
    assert.equal(datos["@graph"][0]["@type"], "Book");
    assert.equal(datos["@graph"][0].editor["@id"], `${base}#persona`);
  }
});

test("es idempotente y no toca el cuerpo del libro", () => {
  const l = { num: 99, archivo: "libro-99.html", nombre: "Prueba <x>", grupo: "G" };
  const html = `<html><head>\n<title>Viejo</title>\n</head>\n<body><nav class="ajustes-barra"><span><a href="../../">Wolfgang Resendiz</a></span></nav><p>Wolfgang Resendiz</p></body></html>`;
  const una = actualizarLibro(html, l, base);
  assert.equal(actualizarLibro(una, l, base), una);
  assert.match(una, /<title>Libro 99 · Prueba &#60;x&#62; \(MAPAS, Conagua\)<\/title>/);
  assert.match(una, /<a href="..\/..\/">Wolfgang Reséndiz<\/a>/);
  assert.equal(una.slice(una.indexOf("</nav>")), html.slice(html.indexOf("</nav>")));
});
