// Pruebas de las zonas del sitio: node --test herramientas/pruebas/  (o npm test)

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zonaDe, motivoBloqueo, revisarCambio, leerRegistro, leerSitio, actualizarPortada, tarjetaProyecto, generarSitemap, GENERAL } from "../proyectos.mjs";

const proyectos = {
  calculadoras: { nombre: "Calculadoras", carpetas: ["calculadoras"] },
  catalogo: { nombre: "Catálogo", carpetas: ["catalogo", ".catalogo"] },
};
const RAIZ = path.resolve("/repo");

test("cada ruta pertenece a su proyecto o a la zona general", () => {
  assert.equal(zonaDe("calculadoras/caudal.html", proyectos), "calculadoras");
  assert.equal(zonaDe("catalogo/js/app.js", proyectos), "catalogo");
  assert.equal(zonaDe(".catalogo/fuente/config.json", proyectos), "catalogo");
  assert.equal(zonaDe("catalogo", proyectos), "catalogo");
  assert.equal(zonaDe("css/styles.css", proyectos), GENERAL);
  assert.equal(zonaDe("index.html", proyectos), GENERAL);
  // Un prefijo parecido no es la misma carpeta
  assert.equal(zonaDe("catalogos-viejos/x.html", proyectos), GENERAL);
});

test("el registro real tiene proyectos con carpetas", () => {
  const real = leerRegistro();
  assert.ok(Object.keys(real).length > 0);
  for (const p of Object.values(real)) assert.ok(p.nombre && p.carpetas.length);
  assert.ok(!Object.hasOwn(real, GENERAL));
});

test("sin WEB_PROYECTO no se bloquea nada", () => {
  assert.equal(motivoBloqueo("/repo/catalogo/js/app.js", "", proyectos, RAIZ), null);
});

test("un proyecto solo escribe en sus carpetas", () => {
  assert.equal(motivoBloqueo("/repo/calculadoras/js/caudal.js", "calculadoras", proyectos, RAIZ), null);
  assert.match(motivoBloqueo("/repo/catalogo/js/app.js", "calculadoras", proyectos, RAIZ), /proyecto «catalogo»/);
  assert.match(motivoBloqueo("/repo/css/styles.css", "calculadoras", proyectos, RAIZ), /zona general/);
  assert.equal(motivoBloqueo("/repo/.catalogo/fuente/x.json", "catalogo", proyectos, RAIZ), null);
  // Fuera del repositorio (scratchpad, /tmp) no aplica
  assert.equal(motivoBloqueo("/tmp/notas.md", "calculadoras", proyectos, RAIZ), null);
});

test("la zona general no escribe en los proyectos", () => {
  assert.equal(motivoBloqueo("/repo/index.html", GENERAL, proyectos, RAIZ), null);
  assert.equal(motivoBloqueo("/repo/.claude/settings.json", GENERAL, proyectos, RAIZ), null);
  assert.match(motivoBloqueo("/repo/catalogo/index.html", GENERAL, proyectos, RAIZ), /catalogo/);
});

test("un WEB_PROYECTO desconocido bloquea todo dentro del repo", () => {
  assert.match(motivoBloqueo("/repo/index.html", "bombas", proyectos, RAIZ), /no es "general" ni un proyecto/);
});

test("un cambio de una sola zona pasa la revisión", () => {
  const { zonas, errores } = revisarCambio(["catalogo/datos/catalogo.enc", "catalogo/datos/acceso.json"], proyectos);
  assert.deepEqual(zonas, ["catalogo"]);
  assert.deepEqual(errores, []);
});

test("un cambio que mezcla zonas falla, salvo con «varias-zonas»", () => {
  const archivos = ["calculadoras/js/caudal.js", "catalogo/js/app.js"];
  assert.ok(revisarCambio(archivos, proyectos).errores.length > 0);
  assert.deepEqual(revisarCambio(archivos, proyectos, { varias: true }).errores, []);
});

test("una rama con prefijo de zona solo toca esa zona", () => {
  assert.deepEqual(revisarCambio(["catalogo/js/app.js"], proyectos, { rama: "catalogo/arreglo" }).errores, []);
  const { errores } = revisarCambio(["css/styles.css"], proyectos, { rama: "calculadoras/estilos" });
  assert.match(errores.join("\n"), /es de «calculadoras» pero toca general/);
  // Ramas sin prefijo de zona (p. ej. claude/…) solo exigen una zona
  assert.deepEqual(revisarCambio(["css/styles.css"], proyectos, { rama: "claude/x" }).errores, []);
});

test("el entorno local solo puede cambiar su zona", () => {
  const { errores } = revisarCambio(["catalogo/js/app.js"], proyectos, { zona: "calculadoras" });
  assert.match(errores.join("\n"), /Este entorno es «calculadoras»/);
});

// ---- Portada generada desde proyectos.json ----

const RAIZ_REAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = [
  "<nav>",
  "  <!-- proyectos:menu -->",
  "  <!-- /proyectos:menu -->",
  "</nav>",
  "<span><!-- proyectos:total --><!-- /proyectos:total --></span>",
  "<div>",
  "    <!-- proyectos:tarjetas -->",
  "    <!-- /proyectos:tarjetas -->",
  "</div>",
].join("\n");

test("la portada genera menú, tarjetas y total con la sangría del marcador", () => {
  const html = actualizarPortada(BASE, proyectos, { repositorio: "https://github.com/x/web" });
  assert.match(html, /\n {2}<a href="calculadoras\/">.*Calculadoras<\/a>\n/);
  assert.match(html, /<!-- proyectos:total -->2 proyectos<!-- \/proyectos:total -->/);
  assert.match(html, /\n {4}<article class="proyecto">\n {6}<p class="proyecto__meta">/);
  assert.match(html, /href="https:\/\/github.com\/x\/web\/tree\/main\/catalogo">Código</);
  // Es idempotente
  assert.equal(actualizarPortada(html, proyectos, { repositorio: "https://github.com/x/web" }), html);
});

test("la portada respeta inicio, privado, codigo y oculto, y escapa el HTML", () => {
  const varios = {
    a: { nombre: "A <b>", carpetas: ["a"], inicio: "a/x.html", privado: true, etiquetas: ["t&t"] },
    b: { nombre: "B", carpetas: ["b"], codigo: false },
    c: { nombre: "C", carpetas: ["c"], oculto: true },
  };
  const html = actualizarPortada(BASE, varios, { repositorio: "https://r" });
  assert.match(html, /2 proyectos/);
  assert.doesNotMatch(html, /href="c\/"/);
  assert.match(html, /href="a\/x.html">A &#60;b&#62;</);
  assert.match(html, /#t&#38;t/);
  assert.match(html, /privado/);
  assert.equal(tarjetaProyecto("b", varios.b, { repositorio: "https://r" }).join("").includes("Código"), false);
});

test("sin marcadores la portada avisa en vez de escribir mal", () => {
  assert.throws(() => actualizarPortada("<html></html>", proyectos), /marcadores/);
});

test("index.html está al día con proyectos.json", () => {
  const html = fs.readFileSync(path.join(RAIZ_REAL, "index.html"), "utf8");
  assert.equal(actualizarPortada(html, leerRegistro(), leerSitio()), html, "Corre «npm run proyectos -- portada».");
});

test("el sitemap lleva la portada y los proyectos públicos y visibles", () => {
  const varios = {
    a: { nombre: "A", carpetas: ["a"], inicio: "a/x.html" },
    b: { nombre: "B", carpetas: ["b"], privado: true },
    c: { nombre: "C", carpetas: ["c"], oculto: true },
    d: { nombre: "D", carpetas: ["d"] },
  };
  const xml = generarSitemap(varios, { url: "https://x.github.io/web" });
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(urls, ["https://x.github.io/web/", "https://x.github.io/web/a/x.html", "https://x.github.io/web/d/"]);
  assert.throws(() => generarSitemap(varios, {}), /sitio.url/);
});

test("sitemap.xml está al día con proyectos.json", () => {
  const xml = fs.readFileSync(path.join(RAIZ_REAL, "sitemap.xml"), "utf8");
  assert.equal(generarSitemap(leerRegistro(), leerSitio()), xml, "Corre «npm run proyectos -- portada».");
});
