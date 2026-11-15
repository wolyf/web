// Pruebas del tablero de ideas y pendientes

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as N from "../../js/nucleo.mjs";

const RAIZ = new URL("../../../", import.meta.url);
const leerJSON = (r) => JSON.parse(fs.readFileSync(new URL(r, RAIZ), "utf8"));
const zonasReales = () => [N.GENERAL, ...Object.keys(leerJSON("proyectos.json").proyectos)];

test("los datos reales del tablero son válidos (estados, zonas, fechas y enlaces)", () => {
  assert.deepEqual(N.validar(leerJSON("tablero/datos/tablero.json"), zonasReales()), []);
});

test("validar detecta los errores típicos", () => {
  const base = { id: "a", titulo: "A", estado: "idea", zona: "general", fecha: "2026-01-01" };
  const zonas = ["general", "anki"];
  const con = (cambio) => N.validar({ items: [{ ...base, ...cambio }] }, zonas);
  assert.deepEqual(con({}), []);
  assert.ok(con({ id: "A b" }).length, "id inválido");
  assert.ok(con({ titulo: "" }).length, "sin título");
  assert.ok(con({ estado: "listo" }).length, "estado inválido");
  assert.ok(con({ zona: "otra" }).length, "zona inexistente");
  assert.ok(con({ prioridad: "urgente" }).length, "prioridad inválida");
  assert.ok(con({ fecha: "15/11/2026" }).length, "fecha inválida");
  assert.ok(con({ estado: "hecho" }).length, "hecho sin fecha de cierre");
  assert.ok(con({ hecho: "2026-01-02" }).length, "«hecho» en algo no hecho");
  assert.deepEqual(con({ estado: "hecho", hecho: "2026-01-02" }), []);
  assert.ok(con({ enlace: "javascript:alert(1)" }).length, "enlace peligroso");
  assert.ok(N.validar({ items: [base, base] }, zonas).some((e) => /repetido/.test(e)));
  assert.ok(N.validar({}, zonas).length);
});

test("enlaceSeguro acepta https, http y rutas del sitio, y rechaza lo demás", () => {
  for (const ok of ["https://github.com/wolyf/web/pull/37", "http://localhost:8000/x", "anki/index.html", "estudio/materia.html?m=historia-2#a"]) assert.equal(N.enlaceSeguro(ok), true, ok);
  for (const mal of ["javascript:alert(1)", "data:text/html,x", "//evil.com/x", "../secreto", "a/../../b", "https://", "", " https://x.com", "https://x.com/a b", 'x"y', "vbscript:x", null, 3]) assert.equal(N.enlaceSeguro(mal), false, String(mal));
});

const ITEMS = [
  { id: "a", titulo: "Escuchar en voz alta", detalle: "Lectura con acentos: él", estado: "idea", zona: "general", fecha: "2026-01-01" },
  { id: "b", titulo: "Probar en iPhone", estado: "pendiente", zona: "anki", prioridad: "alta", fecha: "2026-01-02" },
  { id: "c", titulo: "Compactar repasos", estado: "pendiente", zona: "anki", prioridad: "media", fecha: "2026-01-03" },
  { id: "d", titulo: "Mostrar estudio", estado: "pendiente", zona: "estudio", fecha: "2026-01-04" },
  { id: "e", titulo: "Hecho viejo", estado: "hecho", zona: "general", fecha: "2025-12-01", hecho: "2026-01-05" },
  { id: "f", titulo: "Hecho nuevo", estado: "hecho", zona: "general", fecha: "2025-12-02", hecho: "2026-01-09" },
];

test("filtrar por zona, prioridad y texto (sin acentos ni mayúsculas, todas las palabras)", () => {
  assert.deepEqual(N.filtrar(ITEMS, { zona: "anki" }).map((x) => x.id), ["b", "c"]);
  assert.deepEqual(N.filtrar(ITEMS, { prioridad: "alta" }).map((x) => x.id), ["b"]);
  assert.deepEqual(N.filtrar(ITEMS, { texto: "EL acentos" }).map((x) => x.id), ["a"], "busca en el detalle sin acentos");
  assert.deepEqual(N.filtrar(ITEMS, { texto: "probar iphone" }).map((x) => x.id), ["b"]);
  assert.deepEqual(N.filtrar(ITEMS, { texto: "anki" }).map((x) => x.id), ["b", "c"], "también busca en la zona");
  assert.equal(N.filtrar(ITEMS, {}).length, ITEMS.length);
  assert.deepEqual(N.filtrar(ITEMS, { zona: "anki", texto: "estudio" }), []);
});

test("ordenar: prioridad primero y luego el orden del archivo; lo hecho, lo más reciente antes", () => {
  const pend = ITEMS.filter((x) => x.estado === "pendiente");
  assert.deepEqual(N.ordenar([pend[2], pend[1], pend[0]], "pendiente").map((x) => x.id), ["b", "c", "d"]);
  assert.deepEqual(N.ordenar(ITEMS.filter((x) => x.estado === "hecho"), "hecho").map((x) => x.id), ["f", "e"]);
});

test("contar y agrupar", () => {
  const c = N.contar(ITEMS);
  assert.deepEqual(c.porEstado, { idea: 1, pendiente: 3, "en-curso": 0, hecho: 2 });
  assert.equal(c.abiertos, 4);
  assert.equal(c.porZona.anki, 2);
  assert.equal(c.porZona.general, 1, "lo hecho no cuenta como abierto en la zona");
  const g = N.agrupar(ITEMS);
  assert.deepEqual(Object.keys(g), ["idea", "pendiente", "en-curso", "hecho"]);
  assert.equal(g.pendiente[0].id, "b");
});

test("el tablero no usa el guion largo en sus archivos", () => {
  const raya = String.fromCharCode(0x2014);
  const revisar = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = new URL(e.name + (e.isDirectory() ? "/" : ""), dir);
      if (e.isDirectory()) revisar(ruta);
      else if (/\.(html|css|mjs|js|json|md)$/.test(e.name)) assert.ok(!fs.readFileSync(ruta, "utf8").includes(raya), `${ruta.pathname} tiene un guion largo`);
    }
  };
  revisar(new URL("tablero/", RAIZ));
});
