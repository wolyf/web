// Pruebas del motor de unidades y del cálculo de caudal (calculadoras/js/).
// Los scripts son clásicos (IIFE y window) para funcionar también con file://,
// así que aquí se ejecutan en un contexto con un `window` mínimo.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const RAIZ = new URL("../../", import.meta.url);

function cargar(...archivos) {
  const window = {};
  const memoria = new Map();
  const contexto = vm.createContext({
    window,
    Math,
    JSON,
    Number,
    String,
    localStorage: { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v) },
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] },
    console,
  });
  for (const a of archivos) vm.runInContext(fs.readFileSync(new URL(a, RAIZ), "utf8"), contexto, { filename: a });
  return window;
}

const { UNIDADES } = cargar("js/units.js");
const { MAGNITUDES, aBase, desdeBase } = UNIDADES;

test("las conversiones a la unidad base y de regreso son inversas", () => {
  for (const [magnitud, { unidades }] of Object.entries(MAGNITUDES)) {
    for (const unidad of Object.keys(unidades)) {
      const x = 12.345;
      assert.ok(Math.abs(desdeBase(aBase(x, magnitud, unidad), magnitud, unidad) - x) < 1e-9, `${magnitud} ${unidad}`);
    }
  }
});

test("factores conocidos", () => {
  assert.equal(aBase(100, "longitud", "mm"), 0.1);
  assert.ok(Math.abs(aBase(1, "longitud", "in") - 0.0254) < 1e-12);
  assert.ok(Math.abs(aBase(36, "velocidad", "km/h") - 10) < 1e-12);
  assert.ok(Math.abs(aBase(1, "caudal", "m³/h") - 1 / 3600) < 1e-15);
  assert.equal(desdeBase(0.001, "caudal", "L/s"), 1);
});

test("cada magnitud declara una unidad base con factor 1", () => {
  for (const [nombre, { base, unidades }] of Object.entries(MAGNITUDES)) {
    assert.equal(unidades[base], 1, `${nombre}: la base «${base}» debe valer 1`);
  }
});

test("el cálculo de caudal: d = 100 mm y v = 1 m/s dan Q ≈ 7,85 L/s", () => {
  let definicion;
  const w = cargar("js/units.js");
  w.crearCalculadora = (d) => (definicion = d);
  // caudal.js declara la calculadora con crearCalculadora (global de units.js)
  const contexto = vm.createContext({ window: w, crearCalculadora: w.crearCalculadora, document: { querySelector: () => null } });
  vm.runInContext(fs.readFileSync(new URL("js/caudal.js", RAIZ), "utf8"), contexto);
  const d = aBase(100, "longitud", "mm");
  const v = aBase(1, "velocidad", "m/s");
  const { caudal } = definicion.calcular({ diametro: d, velocidad: v });
  assert.ok(Math.abs(desdeBase(caudal, "caudal", "L/s") - 7.854) < 1e-3);
});

test("el código de las calculadoras no usa el guion largo", () => {
  for (const a of ["js/units.js", "js/caudal.js", "js/grafica-caudal.js"]) {
    assert.ok(!fs.readFileSync(new URL(a, RAIZ), "utf8").includes("—"), a);
  }
});
