// Pruebas de las herramientas del estudio: páginas generadas, rama «estudio» e importador de lecturas

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as L from "../../../js/llaves.mjs";
import * as N from "../../js/nucleo.mjs";
import { paginasGeneradas, crearRama, leerRama } from "../estudio.mjs";
import { aislarCSS, mapearColor, mapearDeclaracion, normalizarLectura, renombrarVariables } from "../importar.mjs";

const RAIZ = new URL("../../../", import.meta.url);

test("las páginas del estudio están al día con estudio/datos/ (corre «estudio.mjs paginas»)", () => {
  for (const [ruta, contenido] of Object.entries(paginasGeneradas())) {
    assert.equal(fs.readFileSync(new URL(`estudio/${ruta}`, RAIZ), "utf8"), contenido, `estudio/${ruta} desactualizada`);
  }
});

test("las páginas generadas llevan la política de contenido exacta, tema.js y ningún script en línea", () => {
  const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'none'; form-action 'none'";
  for (const [ruta, html] of Object.entries(paginasGeneradas())) {
    assert.ok(html.includes(`content="${csp}"`), `${ruta}: política de contenido`);
    assert.ok(/<script src="(\.\.\/)+js\/tema\.js"><\/script>/.test(html), `${ruta}: tema.js`);
    assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>/.test(html), `${ruta}: script en línea`);
    assert.ok(!/\son\w+="/.test(html), `${ruta}: manejador en línea`);
  }
});

test("cada página de lectura apunta a su .enc y lleva noindex", () => {
  for (const [ruta, html] of Object.entries(paginasGeneradas())) {
    const m = ruta.match(/^([\w-]+)\/([\w-]+)\.html$/);
    if (!m) continue;
    assert.ok(html.includes(`data-privado="${m[2]}.enc"`), `${ruta}: data-privado`);
    assert.ok(html.includes('name="robots" content="noindex"'), `${ruta}: noindex`);
    assert.ok(html.includes(`data-fuente="${m[2]}"`) && html.includes(`data-materia="${m[1]}"`));
  }
});

// ---- Rama «estudio» con una API de GitHub simulada ----

function apiSimulada({ existe = false, archivo = false } = {}) {
  const estado = { ramaExiste: existe, archivo, llamadas: [], commits: [] };
  const f = async (url, { method = "GET", body } = {}) => {
    const ruta = new URL(url).pathname.replace(/^\/repos\/[^/]+\/[^/]+\//, "");
    estado.llamadas.push(`${method} ${ruta}`);
    const r = (status, json) => ({ status, json: async () => json, headers: { get: () => null } });
    if (ruta.startsWith("branches/")) return estado.ramaExiste ? r(200, {}) : r(404, {});
    if (ruta.startsWith("contents/") && method === "GET") return estado.archivo ? r(200, { sha: "x" }) : r(404, {});
    if (ruta.startsWith("contents/") && method === "PUT") {
      estado.archivo = true;
      return r(201, {});
    }
    if (ruta === "git/blobs") return r(201, { sha: "b1" });
    if (ruta === "git/trees") return r(201, { sha: "t1" });
    if (ruta === "git/commits") {
      estado.commits.push(JSON.parse(body));
      return r(201, { sha: "c1" });
    }
    if (ruta === "git/refs") {
      estado.ramaExiste = true;
      return r(201, {});
    }
    return r(500, {});
  };
  return { estado, f };
}

test("crearRama crea la rama sin padres; si existe no sobrescribe; si falta el archivo lo agrega", async () => {
  const llave = L.nuevaLlave();
  const a = apiSimulada();
  assert.equal(await crearRama({ token: "t", llave, fetch: a.f }), "creada");
  assert.deepEqual(a.estado.commits[0].parents, []);
  assert.ok(a.estado.llamadas.includes("git/refs".replace(/^/, "POST ")));
  const b = apiSimulada({ existe: true, archivo: true });
  assert.equal(await crearRama({ token: "t", llave, fetch: b.f }), "existe");
  assert.ok(!b.estado.llamadas.some((l) => l.startsWith("PUT") || l.startsWith("POST")), "no debe escribir nada");
  const c = apiSimulada({ existe: true, archivo: false });
  assert.equal(await crearRama({ token: "t", llave, fetch: c.f }), "archivos");
});

test("crearRama explica los errores de permisos sin imprimir el token", async () => {
  const f = async () => ({ status: 403, json: async () => ({}) });
  await assert.rejects(crearRama({ token: "token-secreto", llave: L.nuevaLlave(), fetch: f }), (e) => /403/.test(e.message) && /Contents/.test(e.message) && !e.message.includes("token-secreto"));
});

test("leerRama descifra lo que hay y devuelve null si no hay archivo", async () => {
  const llave = L.nuevaLlave();
  const bytes = await N.cifrar([{ id: "m/a", e: "leida", t: 1 }], llave);
  const f = async (url) => {
    if (url.includes("/git/blobs/")) return { status: 200, ok: true, json: async () => ({ encoding: "base64", content: Buffer.from(bytes).toString("base64") }), headers: { get: () => null } };
    return { status: 200, ok: true, json: async () => ({ sha: "s1" }), headers: { get: () => null } };
  };
  assert.deepEqual(await leerRama({ token: "t", llave, fetch: f }), [{ id: "m/a", e: "leida", t: 1 }]);
  const f404 = async () => ({ status: 404, ok: false, json: async () => ({}), headers: { get: () => null } });
  assert.equal(await leerRama({ token: "t", llave, fetch: f404 }), null);
});

// ---- Importador de lecturas (con HTML de ejemplo, sin texto con derechos) ----

test("mapearColor convierte a variables del sitio según el uso", () => {
  assert.equal(mapearColor("#fbf8f1", "fondo"), "var(--surface)");
  assert.equal(mapearColor("#f4f1ea", "fondo"), "var(--surface-2)");
  assert.equal(mapearColor("#ffffff", "fondo"), "var(--surface)");
  assert.equal(mapearColor("#221f1a", "texto"), "var(--text)");
  assert.match(mapearColor("#24305e", "texto"), /^color-mix\(in srgb, #24305e 70%, var\(--text-strong\)\)$/);
  assert.equal(mapearColor("#ddd6c4", "borde"), "var(--border)");
  assert.equal(mapearColor("#2e2a26", "fondo"), "#2e2a26", "un fondo oscuro se respeta");
  assert.equal(mapearColor("#f5efe4", "texto"), "#f5efe4", "el texto claro (sobre fondo oscuro) se respeta");
  assert.equal(mapearColor("zzz", "texto"), "zzz");
});

test("mapearDeclaracion solo toca colores y respeta degradados y url()", () => {
  assert.equal(mapearDeclaracion("border-left", "4px solid #b8860b"), "4px solid color-mix(in srgb, #b8860b 65%, var(--border))");
  assert.equal(mapearDeclaracion("margin", "0 #fff"), "0 #fff");
  assert.equal(mapearDeclaracion("background", "url(data:image/png;base64,AAA#fff)"), "url(data:image/png;base64,AAA#fff)");
  assert.equal(mapearDeclaracion("background", "#fff"), "var(--surface)");
});

test("aislarCSS prefija cada selector, convierte body, quita lo del contenedor y conserva @media", () => {
  const css = `/* c */ :root{--ink:#111} body{font-family:Georgia;color:#221f1a;background:#fbf8f1;margin:0}
    main{max-width:700px;margin:0 auto;padding:20px} h1,h2{color:#24305e} p{margin:0 0 1em}
    @media (max-width:560px){body{font-size:18px} .x{columns:1}} @font-face{font-family:X;src:url(x.woff)} @import url(y.css);`;
  const salida = aislarCSS(renombrarVariables(css), ".lt--t");
  assert.match(salida, /\.lt--t\{--lt-ink:/);
  assert.ok(!/font-family:Georgia/.test(salida) && !/margin:0;?\}/.test(salida.split("\n")[1] ?? ""), "se quitan fuente, fondo y márgenes de body");
  assert.ok(!/max-width:700px/.test(salida), "se quita el ancho del contenedor");
  assert.match(salida, /\.lt--t h1,\.lt--t h2\{color:color-mix/);
  assert.match(salida, /@media \(max-width:560px\)\{[^}]*\.lt--t \.x\{columns:1\}\}/);
  assert.ok(!/@font-face|@import/.test(salida));
  for (const linea of salida.split("\n")) assert.ok(/^(@media|\.lt--t)/.test(linea), `selector sin aislar: ${linea}`);
});

test("normalizarLectura quita banner, barra, scripts y estilos del paquete, y conserva el cuerpo tal cual", () => {
  const html = `<!doctype html><html><head><title>x</title><style>body{color:#222} .c{color:#a44a24}</style></head><body>
<div class="h2offline-banner"><a href="../index.html">← Índice</a></div>
<main class="page"><h1>Título</h1><p class="c" onclick="x()">Texto A<sup><a href="#n1">1</a></sup></p>
<p><a href="../index.html">← Volver</a></p><div class="toolbar"><button onclick="a()">A+</button></div><p id="n1">Nota</p></main>
<style>#h2offline-bar{position:fixed}</style><div id="h2offline-bar"><button id="h2offline-play">▶</button></div>
<script>alert(1)</script></body></html>`;
  const salida = normalizarLectura(html, "prueba");
  assert.ok(salida.startsWith("<style>") && salida.includes('<div class="lt lt--prueba">'));
  for (const resto of ["h2offline", "<script", "onclick", "toolbar", "Volver", "../index.html", "<main", "alert(1)"]) assert.ok(!salida.includes(resto), `quedó «${resto}»`);
  assert.ok(salida.includes('<h1>Título</h1>') && salida.includes('<sup><a href="#n1">1</a></sup>') && salida.includes('<p id="n1">Nota</p>'), "el cuerpo no cambia");
  assert.ok(salida.includes('class="lt-main"'));
  assert.throws(() => normalizarLectura(html, "Mala Fuente"));
  assert.throws(() => normalizarLectura("<p>sin body</p>", "x"));
});
