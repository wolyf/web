#!/usr/bin/env node
// Verificación del tablero en un navegador real (no forma parte de «npm test»).
// El tablero es privado: sirve el repositorio, comprueba que SIN sesión no se ve nada de su contenido
// y, tras iniciar sesión con SITIO_USUARIO y SITIO_CONTRASENA (nunca impresas), comprueba resumen,
// columnas, filtros y la CSP. La API de GitHub se responde con 404 (no se toca la real).
// Uso: node tablero/herramientas/verificar-ui.mjs [--salida dir]   (requiere Playwright y la sesión del sitio en el entorno)

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as L from "../../js/llaves.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const SALIDA = args.includes("--salida") ? path.resolve(args[args.indexOf("--salida") + 1]) : null;
if (SALIDA) fs.mkdirSync(SALIDA, { recursive: true });

function cargarPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require("playwright");
  } catch {
    const global = execSync("npm root -g").toString().trim();
    return require(require.resolve("playwright", { paths: [global] }));
  }
}
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const servidor = await new Promise((ok) => {
  const s = http.createServer((q, r) => {
    const ruta = decodeURIComponent(new URL(q.url, "http://x").pathname);
    let f = path.join(RAIZ, ruta);
    if (!f.startsWith(RAIZ)) return r.writeHead(403).end();
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    if (!fs.existsSync(f)) return r.writeHead(404).end();
    r.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] ?? "application/octet-stream" });
    fs.createReadStream(f).pipe(r);
  });
  s.listen(0, "127.0.0.1", () => ok(s));
});
const base = `http://127.0.0.1:${servidor.address().port}/tablero/index.html`;
const USUARIO = (process.env.SITIO_USUARIO ?? "").trim();
const CONTRASENA = process.env.SITIO_CONTRASENA ?? "";
if (!USUARIO || !CONTRASENA) {
  console.error("✗ Faltan SITIO_USUARIO y SITIO_CONTRASENA en el entorno de Claude Code (nunca en el chat).");
  process.exit(1);
}
// Lo esperado: el tablero descifrado aquí, en Node, con la llave del sitio
const llaveSitio = await L.entrar(JSON.parse(fs.readFileSync(path.join(RAIZ, "datos", "acceso.json"), "utf8")), USUARIO, CONTRASENA);
const datos = JSON.parse(await L.descifrarFragmento(fs.readFileSync(path.join(RAIZ, "tablero", "datos", "tablero.enc")), llaveSitio));

let fallos = 0;
let total = 0;
const comprobar = (ok, m, d = "") => {
  total++;
  if (!ok) fallos++;
  console.log(`  ${ok ? "✓" : "✗"} ${m}${!ok && d ? `  (${d})` : ""}`);
};

const { chromium } = cargarPlaywright();
const navegador = await chromium.launch();
try {
  for (const [nombre, viewport, tema] of [["escritorio", { width: 1000, height: 900 }, "claro"], ["celular", { width: 390, height: 800 }, "oscuro"]]) {
    console.log(`\n== ${nombre} (${tema}) ==`);
    const errores = [];
    const ctx = await navegador.newContext({ viewport });
    await ctx.route("https://api.github.com/**", (r) => r.fulfill({ status: 404, headers: { "access-control-allow-origin": "*" }, body: "{}" }));
    const p = await ctx.newPage();
    await p.emulateMedia({ colorScheme: tema === "oscuro" ? "dark" : "light" });
    p.on("pageerror", (e) => errores.push(e.message));
    p.on("console", (m) => (m.type() === "error" || /Content Security Policy|Refused to/.test(m.text())) && !m.location().url.includes("api.github.com") && errores.push(`${m.text()} ${m.location().url}`));
    p.on("response", (r) => r.status() >= 400 && !r.url().includes("api.github.com") && errores.push(`HTTP ${r.status()} ${r.url()}`));
    await p.goto(base);
    // 1. Sin sesión: el tablero es privado
    await p.waitForSelector(".t-privado");
    const visible = await p.locator("body").innerText();
    comprobar((await p.locator(".t-item").count()) === 0, "sin sesión no se pinta ningún elemento");
    comprobar(!datos.items.some((x) => visible.includes(x.titulo)), "sin sesión no se ve el título de ningún elemento");
    const crudo = await (await fetch(base.replace("index.html", "datos/tablero.enc"))).arrayBuffer();
    comprobar(Buffer.from(crudo).subarray(0, 4).toString() === "WRF1" && !Buffer.from(crudo).includes(Buffer.from(datos.items[0].titulo)), "lo que se descarga es el archivo cifrado (sin texto en claro)");
    if (SALIDA) await p.screenshot({ path: path.join(SALIDA, `tablero-${nombre}-sin-sesion.png`) });
    // 2. Con sesión
    await p.locator(".t-boton").click();
    await p.locator('input[name="usuario"]').fill(USUARIO);
    await p.locator('input[name="contrasena"]').fill(CONTRASENA);
    await p.locator('.sesion-panel__form button[type="submit"]').click();
    await p.waitForSelector(".t-item", { timeout: 30_000 });
    comprobar(true, "al iniciar sesión se descifra y se pinta el tablero");
    const por = (e) => datos.items.filter((x) => x.estado === e).length;
    comprobar((await p.locator(".t-item").count()) === datos.items.length, `se pintan los ${datos.items.length} elementos`);
    comprobar((await p.locator('.t-ficha[data-estado="pendiente"] strong').innerText()) === String(por("pendiente")), "el resumen cuenta los pendientes");
    comprobar(!/\b(null|undefined)\b/.test(await p.locator("#tablero-raiz").innerText()), "sin «null» ni «undefined» sueltos");
    const nombresZona = await p.locator(".t-select").first().locator("option").allInnerTexts();
    comprobar(nombresZona.includes("Anki") && nombresZona.includes("Estudio") && nombresZona.includes("General"), "el filtro de proyecto sale de proyectos.json", nombresZona.join(", "));
    await p.locator(".t-select").first().selectOption("anki");
    const nAnki = datos.items.filter((x) => x.zona === "anki").length;
    comprobar((await p.locator(".t-item").count()) === nAnki, `filtrar por Anki deja ${nAnki}`);
    comprobar((await p.locator("#tablero-raiz .t-nota").innerText()).includes(`${nAnki} de ${datos.items.length}`), "el aviso dice cuántos hay del total");
    await p.locator(".t-select").first().selectOption("");
    await p.locator(".t-buscar").fill("IPHONE");
    comprobar((await p.locator(".t-item").count()) >= 1 && (await p.locator(".t-item").first().innerText()).toLowerCase().includes("iphone"), "buscar «IPHONE» encuentra sin importar mayúsculas");
    await p.locator(".t-buscar").fill("zzzz-no-existe");
    comprobar((await p.locator(".t-item").count()) === 0 && (await p.locator(".t-vacio").count()) === 4, "sin resultados cada columna dice «Nada por aquí»");
    await p.locator(".t-buscar").fill("");
    const altas = await p.locator('.t-columna[data-estado="pendiente"] .t-item').evaluateAll((els) => els.map((e) => e.dataset.prioridad));
    const orden = ["alta", "media", "baja", ""];
    comprobar(altas.every((x, i) => i === 0 || orden.indexOf(altas[i - 1]) <= orden.indexOf(x)), "dentro de Pendientes la prioridad alta va primero", altas.join(","));
    const enlace = await p.locator(".t-item a").first().getAttribute("href");
    comprobar(/^https?:\/\//.test(enlace ?? "") || enlace == null, "los enlaces son https");
    comprobar((await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, "sin desbordamiento horizontal");
    if (SALIDA) await p.screenshot({ path: path.join(SALIDA, `tablero-${nombre}.png`), fullPage: false });
    await p.goto(`${base}?zona=estudio&q=guion`);
    await p.waitForSelector(".t-item", { timeout: 30_000 });
    const esperados = datos.items.filter((x) => x.zona === "estudio" && /guion/i.test(`${x.titulo} ${x.detalle ?? ""}`)).length;
    comprobar((await p.locator(".t-item").count()) === esperados && esperados >= 1, "?zona= y ?q= preseleccionan los filtros", `esperados ${esperados}`);
    // 3. Cerrar sesión: el contenido se va de la página
    await p.locator(".sesion-boton").first().click();
    await p.locator('[data-sesion-accion="cerrar"]').click();
    await p.waitForSelector(".t-privado", { timeout: 5000 });
    comprobar((await p.locator(".t-item").count()) === 0, "al cerrar sesión desaparece el contenido del tablero");
    comprobar(errores.length === 0, "sin errores de página ni violaciones de la política de contenido", errores.slice(0, 3).join(" | "));
    await ctx.close();
  }
} finally {
  await navegador.close();
  servidor.close();
}
console.log(`\n${total - fallos}/${total} comprobaciones correctas${fallos ? `, ${fallos} FALLARON` : ""}.`);
process.exit(fallos ? 1 : 0);
