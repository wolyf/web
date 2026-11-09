// Pruebas de los subrayados y notas (js/notas.js): node --test herramientas/pruebas/

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const RAIZ = new URL("../../", import.meta.url);
const codigo = fs.readFileSync(new URL("js/notas.js", RAIZ), "utf8");
const contexto = {};
vm.createContext(contexto);
vm.runInContext(codigo, contexto);
const N = contexto.NotasPruebas;

const TEXTO = "El gasto medio diario es el caudal. Luego, el gasto máximo diario se obtiene con el gasto medio diario por un coeficiente.";

test("anclar: la posición guardada gana si la cita sigue ahí", () => {
  const i = TEXTO.indexOf("gasto medio diario");
  const m = N.citar(TEXTO, i, i + 18);
  assert.deepEqual([...N.anclar(TEXTO, m)], [i, i + 18]);
});

test("anclar: si el texto se movió, el contexto elige la aparición correcta", () => {
  const segunda = TEXTO.lastIndexOf("gasto medio diario");
  const m = N.citar(TEXTO, segunda, segunda + 18);
  const cambiado = "Nota agregada al principio. " + TEXTO;
  const esperado = segunda + "Nota agregada al principio. ".length;
  assert.deepEqual([...N.anclar(cambiado, m)], [esperado, esperado + 18]);
  // Sin posición útil, también la encuentra por contexto
  assert.deepEqual([...N.anclar(cambiado, { ...m, inicio: 0 })], [esperado, esperado + 18]);
});

test("anclar: null si la cita ya no existe", () => {
  assert.equal(N.anclar(TEXTO, { exacto: "no está", inicio: 3 }), null);
  assert.equal(N.anclar(TEXTO, { exacto: "" }), null);
});

test("rutaDePagina da la ruta del archivo en el repositorio", () => {
  assert.equal(N.rutaDePagina("/web/", "/web/"), "index.html");
  assert.equal(N.rutaDePagina("/web/manuales-conagua/", "/web/"), "manuales-conagua/index.html");
  assert.equal(N.rutaDePagina("/web/manuales-conagua/libros/libro-01.html", "/web/"), "manuales-conagua/libros/libro-01.html");
  assert.equal(N.rutaDePagina("/web/calculadoras/caudal.html", "/web/"), "calculadoras/caudal.html");
  assert.equal(N.rutaDePagina("/home/yo/web/index.html", "/home/yo/web/"), "index.html");
});

test("zonaDe usa las carpetas de proyectos.json", () => {
  const { proyectos } = JSON.parse(fs.readFileSync(new URL("proyectos.json", RAIZ), "utf8"));
  assert.equal(N.zonaDe("manuales-conagua/libros/libro-01.html", proyectos), "manuales-conagua");
  assert.equal(N.zonaDe("calculadoras/caudal.html", proyectos), "calculadoras");
  assert.equal(N.zonaDe("index.html", proyectos), "general");
  assert.equal(proyectos.catalogo.notas, false, "el catálogo (datos privados) no lleva notas");
});

test("aMarkdown agrupa por zona y página, con cita, contexto y nota", () => {
  const i = TEXTO.indexOf("coeficiente");
  const marcas = [
    { id: "a", pagina: "manuales-conagua/libros/libro-01.html", titulo: "Libro 1", ...N.citar(TEXTO, i, i + 11), seccion: "2.3 Gastos", ancla: "pdf-12", color: "verde", nota: "Revisar valor\ncon el libro 4", creada: 0, editada: 0 },
    { id: "b", pagina: "index.html", titulo: "Inicio", exacto: "Darwin", prefijo: "", sufijo: "", inicio: 0, color: "amarillo", nota: "", creada: 0, editada: 0 },
  ];
  const md = N.aMarkdown(marcas, {
    sitio: { nombre: "Wolfgang Reséndiz", url: "https://wolyf.github.io/web/" },
    proyectos: { "manuales-conagua": { nombre: "Manuales", carpetas: ["manuales-conagua"] } },
    ahora: Date.UTC(2026, 10, 9, 12),
  });
  assert.match(md, /## Zona `general`/);
  assert.match(md, /## Zona `manuales-conagua` · Manuales/);
  assert.match(md, /### `manuales-conagua\/libros\/libro-01\.html`/);
  assert.match(md, /https:\/\/wolyf\.github\.io\/web\/manuales-conagua\/libros\/libro-01\.html/);
  assert.match(md, /#### 1\. Nota · 2\.3 Gastos `#pdf-12`/);
  assert.match(md, /> coeficiente/);
  assert.match(md, /\*\*coeficiente\*\*\./);
  assert.match(md, /- Nota: Revisar valor\n {2}con el libro 4/);
  assert.match(md, /#### 1\. Subrayado/);
  assert.ok(!md.includes(String.fromCharCode(0x2014)), "sin guion largo");
});

test("validar y fusionar respaldos", () => {
  const v = N.validar({ marcas: [{ id: "x", pagina: "index.html", exacto: "hola", color: "morado", editada: 5 }, { pagina: 3 }] });
  assert.equal(v.length, 1);
  assert.equal(v[0].color, "amarillo");
  const { marcas, agregadas } = N.fusionar(v, [{ ...v[0], nota: "nueva", editada: 9 }, { ...v[0], id: "y" }]);
  assert.equal(agregadas, 1);
  assert.equal(marcas.find((m) => m.id === "x").nota, "nueva");
  assert.throws(() => N.validar({}), /no tiene marcas/);
});
