#!/usr/bin/env node
// ============================================================
//  Verificación del Espacio de estudio en un navegador real (no forma parte de «npm test»)
// ============================================================
//
// Sirve el repositorio, abre las páginas REALES del proyecto y entra por el formulario de inicio
// de sesión del sitio con SITIO_USUARIO y SITIO_CONTRASENA (hacen falta para descifrar las
// lecturas reales; nunca se imprimen). La API de GitHub es falsa (se intercepta api.github.com):
// no se escribe nada real. Comprueba:
//
//   · sin sesión: estructura pública, sin progreso, lectura censurada;
//   · con sesión: tablero, cambio de estado, escritura cifrada en la rama simulada, recarga;
//   · cada lectura se descifra y se muestra (tiempo del volumen más grande), el #ancla queda a la vista;
//   · ninguna violación de la política de contenido (CSP) ni errores de página.
//
// Uso: node estudio/herramientas/verificar-ui.mjs [--salida dir]
// Requiere Playwright (global o en el proyecto) y la sesión real del sitio en el entorno.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as L from "../../js/llaves.mjs";
import * as N from "../js/nucleo.mjs";
import { cifrarDatos } from "../../js/subrayados-nucleo.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const SALIDA = args.includes("--salida") ? path.resolve(args[args.indexOf("--salida") + 1]) : null;
if (SALIDA) fs.mkdirSync(SALIDA, { recursive: true });

const USUARIO = (process.env.SITIO_USUARIO ?? "").trim();
const CONTRASENA = process.env.SITIO_CONTRASENA ?? "";
if (!USUARIO || !CONTRASENA) {
  console.error("✗ Faltan SITIO_USUARIO y SITIO_CONTRASENA en el entorno de Claude Code (nunca en el chat).");
  process.exit(1);
}

function cargarPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require("playwright");
  } catch {
    const global = execSync("npm root -g").toString().trim();
    return require(require.resolve("playwright", { paths: [global] }));
  }
}

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".enc": "application/octet-stream" };

function servir() {
  const servidor = http.createServer((pedido, respuesta) => {
    const ruta = decodeURIComponent(new URL(pedido.url, "http://x").pathname);
    let archivo = path.join(RAIZ, ruta);
    if (!archivo.startsWith(RAIZ) || ruta.startsWith("/.privado")) return respuesta.writeHead(403).end();
    if (fs.existsSync(archivo) && fs.statSync(archivo).isDirectory()) archivo = path.join(archivo, "index.html");
    if (!fs.existsSync(archivo)) return respuesta.writeHead(404).end("no encontrado");
    respuesta.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] ?? "application/octet-stream" });
    fs.createReadStream(archivo).pipe(respuesta);
  });
  return new Promise((ok) => servidor.listen(0, "127.0.0.1", () => ok(servidor)));
}

// API de GitHub falsa con la rama «estudio» ya creada (estado.enc inicial vacío y cifrado)
function githubFalso(inicial, subrayados) {
  const archivos = new Map([[`estudio:estado.enc`, { bytes: inicial, sha: "sha0" }]]);
  const blobs = new Map([["sha0", inicial]]);
  if (subrayados) {
    archivos.set("subrayados:subrayados.enc", { bytes: subrayados, sha: "shaS" });
    blobs.set("shaS", subrayados);
  }
  const estado = { archivos, escrituras: [], version: 0 };
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "etag" };
  const responder = (ruta, status, cuerpo, extra = {}) => ruta.fulfill({ status, headers: { ...cors, "content-type": "application/json", ...extra }, body: JSON.stringify(cuerpo) });
  const manejar = async (ruta) => {
    const pedido = ruta.request();
    if (pedido.method() === "OPTIONS") return ruta.fulfill({ status: 204, headers: cors });
    const url = new URL(pedido.url());
    if (url.pathname.includes("/git/blobs/")) {
      const bytes = blobs.get(url.pathname.split("/").pop());
      return bytes ? responder(ruta, 200, { encoding: "base64", content: Buffer.from(bytes).toString("base64") }) : responder(ruta, 404, { message: "Not Found" });
    }
    const archivo = decodeURIComponent(url.pathname.split("/contents/")[1] ?? "");
    if (pedido.method() === "GET") {
      const a = archivos.get(`${url.searchParams.get("ref")}:${archivo}`);
      if (!a) return responder(ruta, 404, { message: "Not Found" });
      const etag = `W/"${a.sha}"`;
      if (pedido.headers()["if-none-match"] === etag) return ruta.fulfill({ status: 304, headers: { ...cors, etag } });
      return responder(ruta, 200, { sha: a.sha }, { etag });
    }
    const cuerpo = JSON.parse(pedido.postData());
    const clave = `${cuerpo.branch}:${archivo}`;
    const a = archivos.get(clave);
    if (a && cuerpo.sha !== a.sha) return responder(ruta, 409, { message: "conflict" });
    const bytes = new Uint8Array(Buffer.from(cuerpo.content, "base64"));
    const sha = `sha${++estado.version}`;
    archivos.set(clave, { bytes, sha });
    blobs.set(sha, bytes);
    estado.escrituras.push({ archivo, rama: cuerpo.branch, bytes });
    return responder(ruta, 200, { content: { sha } });
  };
  return { estado, manejar };
}

// ---- Utilidades ----

let fallos = 0;
let total = 0;
function comprobar(ok, mensaje, detalle = "") {
  total++;
  if (!ok) fallos++;
  console.log(`  ${ok ? "✓" : "✗"} ${mensaje}${!ok && detalle ? `  (${detalle})` : ""}`);
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function iniciarSesion(pagina) {
  await pagina.locator(".sesion-boton").first().click();
  await pagina.locator('input[name="usuario"]').fill(USUARIO);
  await pagina.locator('input[name="contrasena"]').fill(CONTRASENA);
  await pagina.locator('.sesion-panel__form button[type="submit"]').click();
  await pagina.waitForFunction(() => document.documentElement.dataset.sesion === "activa", null, { timeout: 30_000 });
}

async function foto(pagina, nombre) {
  if (SALIDA) await pagina.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
}

async function nuevaPagina(contexto, errores) {
  const p = await contexto.newPage();
  p.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`));
  p.on("console", (m) => {
    const t = m.text();
    // La API falsa responde 404 a lo que el sitio pide de otras ramas (subrayados): no es de este proyecto
    if (m.location().url.includes("api.github.com")) return;
    if (m.type() === "error" || /Content Security Policy|Refused to/.test(t)) errores.push(`console: ${t} ${m.location().url}`);
  });
  p.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("api.github.com")) errores.push(`HTTP ${r.status()} ${r.url()}`);
  });
  return p;
}

// ---- Recorrido ----

const { chromium } = cargarPlaywright();
const servidor = await servir();
const base = `http://127.0.0.1:${servidor.address().port}/estudio`;
const acceso = JSON.parse(fs.readFileSync(path.join(RAIZ, "datos", "acceso.json"), "utf8"));
const llave = await L.entrar(acceso, USUARIO, CONTRASENA);
const navegador = await chromium.launch();

try {
  for (const [nombreVista, viewport, tema] of [
    ["escritorio", { width: 1000, height: 900 }, "claro"],
    ["celular", { width: 390, height: 800 }, "oscuro"],
  ]) {
    console.log(`\n== ${nombreVista} (${tema}) ==`);
    const errores = [];
    const api = githubFalso(await N.cifrar([], llave), await cifrarDatos([], llave)); // estado limpio en cada vista
    const contexto = await navegador.newContext({ viewport, deviceScaleFactor: 1 });
    await contexto.route("https://api.github.com/**", api.manejar);
    await contexto.addInitScript((t) => {
      try {
        localStorage.setItem("tema", t);
      } catch {
        /* sin almacenamiento */
      }
    }, tema);
    const p = await nuevaPagina(contexto, errores);
    await p.emulateMedia({ colorScheme: tema === "oscuro" ? "dark" : "light" });

    // 1. Sin sesión
    await p.goto(`${base}/index.html`);
    await p.waitForSelector(".e-materia");
    comprobar((await p.locator(".e-materia").count()) === 1, "el tablero lista la materia sin sesión");
    comprobar((await p.locator(".e-ficha").count()) === 0, "sin sesión no se muestra el progreso");
    comprobar((await p.locator(".e-sync").getAttribute("data-estado")) === "sin-sesion", "la pastilla invita a iniciar sesión");
    await foto(p, `${nombreVista}-inicio-sin-sesion`);
    await p.goto(`${base}/historia-2/platon-dialogos-4.html`);
    await p.waitForSelector(".censura");
    comprobar((await p.locator(".lt").count()) === 0, "la lectura sin sesión está censurada (sin texto)");

    // 2. Con sesión
    await iniciarSesion(p);
    await p.waitForSelector(".lt", { timeout: 30_000 });
    comprobar(true, "al iniciar sesión el texto cifrado se descifra y se muestra");
    await p.goto(`${base}/index.html`);
    await p.waitForSelector(".e-ficha");
    await p.waitForFunction(() => document.querySelector(".e-sync")?.dataset.estado === "sincronizado", null, { timeout: 15_000 });
    comprobar((await p.locator(".e-ficha strong").first().innerText()) === "13", "13 lecturas pendientes al empezar", await p.locator(".e-fichas").innerText());
    await foto(p, `${nombreVista}-inicio-con-sesion`);

    // 3. Materia: marcar estados
    await p.goto(`${base}/materia.html?m=historia-2`);
    await p.waitForSelector(".e-entrada");
    comprobar((await p.locator(".e-entrada").count()) === 13, "la ruta tiene 13 entradas");
    comprobar(!/\b(null|undefined)\b/.test(await p.locator("#estudio-raiz").innerText()), "sin «null» ni «undefined» sueltos en la página");
    comprobar((await p.locator('.e-entrada[data-entrada="eutidemo"] .e-boton').count()) === 0, "una lectura sin texto no ofrece «Leer»");
    comprobar((await p.locator('.e-entrada[data-entrada="fedro"] .e-boton').getAttribute("href")) === "historia-2/platon-dialogos-4.html#fedro", "el enlace de Fedro lleva a su ancla");
    await p.locator('.e-entrada[data-entrada="apologia"] select').selectOption("leida");
    await p.locator('.e-entrada[data-entrada="nubes"] select').selectOption("leyendo");
    comprobar((await p.locator('.e-entrada[data-entrada="apologia"]').getAttribute("data-estado")) === "leida", "el borde de la tarjeta refleja el estado");
    const antes = api.estado.escrituras.length;
    await p.waitForFunction(() => document.querySelector(".e-sync")?.textContent.includes("por subir") || true);
    await esperar(2800);
    await p.waitForFunction(() => document.querySelector(".e-sync")?.dataset.estado === "sincronizado", null, { timeout: 10_000 });
    comprobar(api.estado.escrituras.length > antes, "el cambio se escribe en la rama «estudio»");
    const guardado = await N.descifrar(api.estado.archivos.get("estudio:estado.enc").bytes, llave);
    comprobar(guardado.some((x) => x.id === "historia-2/apologia" && x.e === "leida") && guardado.some((x) => x.id === "historia-2/nubes" && x.e === "leyendo"), "lo escrito se descifra con la llave del sitio y trae lo marcado");
    const bytes = Buffer.from(api.estado.archivos.get("estudio:estado.enc").bytes);
    comprobar(bytes.subarray(0, 4).toString() === "WRF1" && !bytes.includes(Buffer.from("apologia")), "lo escrito va cifrado (sin ids en claro)");
    await foto(p, `${nombreVista}-materia`);

    // 4. Recarga: el estado persiste y el tablero lo muestra
    await p.reload();
    await p.waitForSelector(".e-entrada");
    await p.waitForFunction(() => document.querySelector('.e-entrada[data-entrada="apologia"] select')?.value === "leida", null, { timeout: 15_000 });
    comprobar(true, "tras recargar, el estado sigue marcado");
    await p.goto(`${base}/index.html`);
    await p.waitForSelector(".e-ficha");
    const fichas = await p.locator(".e-fichas").innerText();
    comprobar(/1\s*\n?Leídas/.test(fichas) && /1\s*\n?Leyendo/.test(fichas), "el tablero cuenta 1 leída y 1 leyendo", fichas.replace(/\n/g, " "));
    comprobar((await p.locator(".e-sigue li").first().innerText()).includes("Las nubes"), "«Sigue con» empieza por lo que se está leyendo");
    await foto(p, `${nombreVista}-inicio-progreso`);

    // 5. Lecturas: todas se descifran; la más grande y el ancla
    const fuentes = fs.readdirSync(path.join(RAIZ, "estudio", "historia-2")).filter((f) => f.endsWith(".html")).map((f) => f.replace(/\.html$/, ""));
    for (const f of fuentes) {
      const t0 = Date.now();
      await p.goto(`${base}/historia-2/${f}.html`);
      await p.waitForSelector(".lt", { timeout: 30_000 });
      const ms = Date.now() - t0;
      const n = await p.locator(".lt").innerText().then((t) => t.length);
      comprobar(n > 500, `${f}: ${n.toLocaleString("es-MX")} caracteres visibles, ${ms} ms`, "texto muy corto");
    }
    await p.goto(`${base}/historia-2/platon-dialogos-4.html#fedro`);
    await p.waitForSelector(".lt");
    await esperar(400);
    const y = await p.evaluate(() => document.getElementById("fedro")?.getBoundingClientRect().top ?? 99999);
    comprobar(y >= 0 && y < 400, "el #ancla se resuelve después de descifrar (Fedro queda arriba)", `top=${Math.round(y)}`);
    comprobar((await p.locator(".e-lectura li").count()) === 3, "la lectura del vol. 4 muestra el estado de sus 3 entradas");
    // Una nota al pie del texto enlaza dentro de la misma página
    const enlaceNota = await p.evaluate(() => {
      const a = document.querySelector('.lt a[href^="#"]');
      return a ? { href: a.getAttribute("href"), existe: !!document.getElementById(a.getAttribute("href").slice(1)) } : null;
    });
    comprobar(!enlaceNota || enlaceNota.existe, "los enlaces internos del texto tienen destino", JSON.stringify(enlaceNota));
    await foto(p, `${nombreVista}-lectura-fedro`);
    const desborde = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    comprobar(desborde <= 1, "sin desbordamiento horizontal", `${desborde}px`);

    // 5b. Subrayar sobre un texto descifrado: se guarda y reancla tras recargar (una página por fuente)
    if (nombreVista === "escritorio") {
      await p.goto(`${base}/historia-2/platon-dialogos-1.html`);
      await p.waitForSelector(".lt p");
      await p.waitForFunction(() => document.documentElement.dataset.subrayados === "activos", null, { timeout: 15_000 });
      const frase = await p.evaluate(() => {
        const ps = [...document.querySelectorAll(".lt p")].filter((x) => x.textContent.trim().length > 120);
        const nodo = document.createTreeWalker(ps[3], NodeFilter.SHOW_TEXT).nextNode();
        const r = document.createRange();
        r.setStart(nodo, 0);
        r.setEnd(nodo, Math.min(60, nodo.length));
        getSelection().removeAllRanges();
        getSelection().addRange(r);
        nodo.parentElement.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        return r.toString();
      });
      await p.waitForSelector(".sub-menu:not([hidden]) .sub-color");
      await p.locator(".sub-menu .sub-color").first().click();
      const hayResaltado = () => p.evaluate(() => [...CSS.highlights.keys()].some((k) => k.startsWith("wr-sub-") && CSS.highlights.get(k).size > 0));
      await p.waitForFunction(() => [...CSS.highlights.keys()].some((k) => k.startsWith("wr-sub-") && CSS.highlights.get(k).size > 0), null, { timeout: 10_000 });
      comprobar(await hayResaltado(), `se pinta un subrayado sobre el texto descifrado («${frase.slice(0, 24)}…»)`);
      await p.waitForFunction(() => document.querySelector(".sub-estado")?.dataset.estado === "sincronizado" || true);
      await esperar(3500);
      comprobar(api.estado.escrituras.some((x) => x.rama === "subrayados"), "el subrayado se escribe cifrado en la rama «subrayados»");
      await p.reload();
      await p.waitForSelector(".lt p");
      await p.waitForFunction(() => [...CSS.highlights.keys()].some((k) => k.startsWith("wr-sub-") && CSS.highlights.get(k).size > 0), null, { timeout: 15_000 }).catch(() => {});
      comprobar(await hayResaltado(), "tras recargar, el subrayado se reancla cuando el texto se descifra");
      // El texto de la barra de estado (títulos repetidos) no se puede subrayar
      comprobar((await p.locator("#estudio-raiz[data-no-subrayar]").count()) === 1, "la barra de estado queda fuera de los subrayados");
    }

    // 6. Cerrar sesión: el texto desaparece del DOM
    await p.locator(".sesion-boton").first().click();
    await p.locator('[data-sesion-accion="cerrar"]').click();
    await p.waitForFunction(() => document.documentElement.dataset.sesion === "inactiva");
    await p.waitForSelector(".censura", { timeout: 5000 }).catch(() => {});
    comprobar((await p.locator(".lt").count()) === 0 || (await p.locator(".censura").count()) > 0, "al cerrar sesión no queda texto de la lectura a la vista");

    comprobar(errores.length === 0, "sin errores de página ni violaciones de la política de contenido", errores.slice(0, 3).join(" | "));
    await contexto.close();
  }
} finally {
  await navegador.close();
  servidor.close();
}
console.log(`\n${total - fallos}/${total} comprobaciones correctas${fallos ? `, ${fallos} FALLARON` : ""}.`);
process.exit(fallos ? 1 : 0);
