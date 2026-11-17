// Contraste WCAG de la paleta (css/base.css): node --test herramientas/pruebas/
//
// Para los 2 temas y los 5 acentos exige:
//   - texto normal (1.4.3, AA): razón ≥ 4.5 de --text, --text-strong, --muted y --accent
//     sobre --bg, --surface, --surface-2 y --accent-soft (donde aparece texto en acento);
//   - texto sobre el acento (--sobre-acento sobre --accent): ≥ 4.5;
//   - borde de campos (1.4.11): --border-control ≥ 3 sobre --bg y --surface.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../../css/base.css", import.meta.url), "utf8");

// ---- Lectura mínima de las variables de base.css ----
function bloque(inicio) {
  const i = css.indexOf(inicio);
  assert.ok(i >= 0, `no se encontró «${inicio}» en base.css`);
  const abre = css.indexOf("{", i);
  let nivel = 0;
  for (let j = abre; j < css.length; j++) {
    if (css[j] === "{") nivel++;
    else if (css[j] === "}" && --nivel === 0) return css.slice(abre + 1, j);
  }
  throw new Error(`bloque sin cerrar: ${inicio}`);
}
const variables = (texto) =>
  Object.fromEntries([...texto.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2].toLowerCase()]));

const claro = variables(bloque(":root {"));
const oscuro = variables(bloque(':root[data-tema="oscuro"]'));
const acentos = {
  rosa: variables(bloque(":root {")),
  ...Object.fromEntries(
    ["azul", "verde", "lavanda", "ambar"].map((n) => [n, variables(bloque(`:root[data-acento="${n}"]`))]),
  ),
};

// ---- Contraste ----
const rgb = (h) => [16, 8, 0].map((s) => (parseInt(h.slice(1), 16) >> s) & 255);
const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = (h) => {
  const [r, g, b] = rgb(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const razon = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const mezcla = (a, b, p) =>
  "#" + rgb(a).map((v, i) => Math.round(v * p + rgb(b)[i] * (1 - p)).toString(16).padStart(2, "0")).join("");

const temas = { claro, oscuro };

test("la lectura de base.css encuentra las variables esperadas", () => {
  for (const [tema, v] of Object.entries(temas))
    for (const k of ["--bg", "--surface", "--surface-2", "--text", "--text-strong", "--muted", "--border-control", "--sobre-acento"])
      assert.ok(v[k], `${tema}: falta ${k}`);
  for (const [n, v] of Object.entries(acentos)) assert.ok(v["--acento-claro"] && v["--acento-oscuro"], `acento ${n}`);
});

for (const [tema, v] of Object.entries(temas)) {
  test(`${tema}: texto normal ≥ 4.5 sobre los fondos`, () => {
    for (const t of ["--text", "--text-strong", "--muted"])
      for (const f of ["--bg", "--surface", "--surface-2"])
        assert.ok(razon(v[t], v[f]) >= 4.5, `${t} sobre ${f}: ${razon(v[t], v[f]).toFixed(2)}`);
  });

  test(`${tema}: el borde de campos llega a 3:1 (1.4.11)`, () => {
    for (const f of ["--bg", "--surface"])
      assert.ok(razon(v["--border-control"], v[f]) >= 3, `--border-control sobre ${f}: ${razon(v["--border-control"], v[f]).toFixed(2)}`);
  });

  for (const [nombre, a] of Object.entries(acentos)) {
    test(`${tema} con acento ${nombre}: el acento como texto y bajo el texto ≥ 4.5`, () => {
      const acento = a[tema === "claro" ? "--acento-claro" : "--acento-oscuro"];
      const soft = mezcla(acento, v["--bg"], 0.12); // --accent-soft = 12 % del acento sobre --bg
      for (const [nf, f] of [["--bg", v["--bg"]], ["--surface", v["--surface"]], ["--surface-2", v["--surface-2"]], ["--accent-soft", soft]])
        assert.ok(razon(acento, f) >= 4.5, `acento ${acento} sobre ${nf}: ${razon(acento, f).toFixed(2)}`);
      assert.ok(razon(v["--sobre-acento"], acento) >= 4.5, `--sobre-acento sobre ${acento}: ${razon(v["--sobre-acento"], acento).toFixed(2)}`);
    });
  }
}
