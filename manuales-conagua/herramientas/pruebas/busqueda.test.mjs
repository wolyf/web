// Pruebas del buscador de manuales: lenguaje de búsqueda, bloques y datos al día.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { interpretar, coincidir } from "../../js/consulta.js";
import { normal } from "../../js/texto.js";
import { extraer } from "../bloques.mjs";

const hay = (q, t) => coincidir(interpretar(q), normal(t)) !== null;

test("normal() conserva la longitud y quita acentos", () => {
  const t = "Tubería de PVC, diámetro ñ";
  assert.equal(normal(t).length, t.length);
  assert.equal(normal(t), "tuberia de pvc, diametro n");
});

test("palabras por inicio, frases, opciones y exclusiones", () => {
  assert.ok(hay("tuber pvc", "Tubería de PVC"));
  assert.ok(!hay("beria", "Tubería"));
  assert.ok(hay('"golpe de ariete"', "el Golpe de Ariete en..."));
  assert.ok(!hay('"golpe ariete"', "golpe de ariete"));
  assert.ok(hay("pvc|polietileno", "tubos de polietileno"));
  assert.ok(!hay("tubo -acero", "tubo de acero"));
  assert.ok(hay("20", "son 20 l/s"));
  assert.ok(!hay("20", "son 200 l/s"));
  assert.ok(hay("0.3", "rigidez de 0.3 MPa"));
  assert.deepEqual(interpretar("libro:20,26 lodos").libros, [20, 26]);
});

test("bloques: cierres implícitos, tablas y texto suelto", () => {
  const { titulos, bloques } = extraer(
    "<html><head><title>x</title><style>p{}</style></head><body><nav>menú</nav>" +
    "<h2>1. Uno</h2><p>a<b>b</b>c<p>d &amp; e<div>suelto <i>x</i></div>" +
    "<table><tr><td>1<td>2<tr><th>3</table><ul><li>i<li>j</ul></body></html>");
  assert.deepEqual(titulos, [[2, "1. Uno", 0]]);
  assert.deepEqual(bloques.map((b) => b[1]), ["1. Uno", "abc", "d & e", "suelto x", "1 2", "3", "i", "j"]);
  assert.ok(bloques.every((b) => b[0] === 0));
});

test("los datos de búsqueda están al día con los libros", () => {
  const indice = fileURLToPath(new URL("../indice.mjs", import.meta.url));
  execFileSync(process.execPath, [indice, "--revisar"], { stdio: "pipe" });
});
