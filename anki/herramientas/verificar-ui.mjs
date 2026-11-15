#!/usr/bin/env node
// ============================================================
//  Verificación del Anki en un navegador real (no forma parte de «npm test»)
// ============================================================
//
// Sirve el repositorio, abre el anki/index.html REAL, entra por el formulario de inicio de sesión
// del sitio con un acceso desechable (se intercepta datos/acceso.json) y una API de GitHub falsa
// (se intercepta api.github.com). Recorre: crear, estudiar, recargar, sincronizar, sin conexión,
// otra pestaña, buscar, editar, borrar y cerrar sesión; en ancho de celular y de escritorio, y
// comprueba que no haya violaciones de la política de contenido (CSP) ni errores de la página.
//
// Uso: node anki/herramientas/verificar-ui.mjs [--salida dir]   (ANKI_SOLO=celular|escritorio|rama, ANKI_OSCURO=1)
// Requiere Playwright (global o en el proyecto). No usa credenciales reales ni la red.

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

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".png": "image/png" };

function servir() {
  const servidor = http.createServer((pedido, respuesta) => {
    const ruta = decodeURIComponent(new URL(pedido.url, "http://x").pathname);
    let archivo = path.join(RAIZ, ruta);
    if (!archivo.startsWith(RAIZ)) return respuesta.writeHead(403).end();
    if (fs.existsSync(archivo) && fs.statSync(archivo).isDirectory()) archivo = path.join(archivo, "index.html");
    if (!fs.existsSync(archivo)) return respuesta.writeHead(404).end("no encontrado");
    respuesta.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] ?? "application/octet-stream" });
    fs.createReadStream(archivo).pipe(respuesta);
  });
  return new Promise((ok) => servidor.listen(0, "127.0.0.1", () => ok(servidor)));
}

// ---- Acceso desechable y API de GitHub falsa ----

const USUARIO = "prueba";
const CONTRASENA = "secreto-de-prueba";
const TOKEN = "token-falso";

async function accesoDesechable() {
  const llave = L.nuevaLlave();
  const { id, entrada } = await L.entradaUsuario(llave, USUARIO, CONTRASENA, 1000);
  return {
    formato: L.FORMATO,
    version: 1,
    descripcion: "Acceso desechable de la verificación en navegador",
    kdf: { algoritmo: "PBKDF2-SHA256", iteraciones: 1000 },
    huella: await L.huella(llave),
    usuarios: { [id]: entrada },
    token: await L.sellarSecreto(TOKEN, llave),
  };
}

function githubFalso({ rama = true } = {}) {
  const archivos = new Map(); // "rama:ruta" → { bytes, sha }
  const blobs = new Map();
  const estado = { archivos, escrituras: [], lecturas: 0, autorizaciones: new Set(), rama, version: 0, enLinea: true };
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "etag" };
  const responder = (ruta, status, cuerpo, extra = {}) => ruta.fulfill({ status, headers: { ...cors, "content-type": "application/json", ...extra }, body: JSON.stringify(cuerpo) });
  const manejar = async (ruta) => {
    // Playwright no aplica setOffline a lo que se responde con route.fulfill: la caída se simula aquí
    if (!estado.enLinea) return ruta.abort("internetdisconnected");
    const pedido = ruta.request();
    if (pedido.method() === "OPTIONS") return ruta.fulfill({ status: 204, headers: cors });
    const url = new URL(pedido.url());
    const auth = pedido.headers().authorization;
    if (auth) estado.autorizaciones.add(auth);
    if (url.pathname.includes("/git/blobs/")) {
      const bytes = blobs.get(url.pathname.split("/").pop());
      return bytes ? responder(ruta, 200, { encoding: "base64", content: Buffer.from(bytes).toString("base64") }) : responder(ruta, 404, { message: "Not Found" });
    }
    const archivo = decodeURIComponent(url.pathname.split("/contents/")[1] ?? "");
    if (pedido.method() === "GET") {
      estado.lecturas++;
      const a = archivos.get(`${url.searchParams.get("ref")}:${archivo}`);
      if (!a) return responder(ruta, 404, { message: "Not Found" });
      const etag = `W/"${a.sha}"`;
      if (pedido.headers()["if-none-match"] === etag) return ruta.fulfill({ status: 304, headers: { ...cors, etag } });
      return responder(ruta, 200, { sha: a.sha }, { etag });
    }
    const cuerpo = JSON.parse(pedido.postData());
    if (!estado.rama) return responder(ruta, 404, { message: "Branch not found" });
    const clave = `${cuerpo.branch}:${archivo}`;
    const a = archivos.get(clave);
    if (a && cuerpo.sha !== a.sha) return responder(ruta, 409, { message: "conflict" });
    if (!a && cuerpo.sha) return responder(ruta, 422, { message: "invalid" });
    const bytes = new Uint8Array(Buffer.from(cuerpo.content, "base64"));
    const sha = `sha${++estado.version}`;
    archivos.set(clave, { bytes, sha });
    blobs.set(sha, bytes);
    estado.escrituras.push({ archivo, rama: cuerpo.branch, mensaje: cuerpo.message, bytes });
    if (process.env.ANKI_DEPURAR) console.log(`      [PUT ${((Date.now() - T_INICIO) / 1000).toFixed(1)} s] ${archivo} ${bytes.length} B (sha previo: ${cuerpo.sha ?? "ninguno"})`);
    return responder(ruta, 200, { content: { sha } });
  };
  return { estado, manejar };
}

// ---- Utilidades de verificación ----

const T_INICIO = Date.now();
const resultados = [];
let abortado = false; // tras un fallo, el resto del escenario depende de él: se omite
async function paso(nombre, fn, { siempre = false } = {}) {
  if (abortado && !siempre) {
    console.log(`  - ${nombre} (omitido)`);
    return;
  }
  try {
    await fn();
    resultados.push({ nombre, ok: true });
    console.log(`  ✓ ${nombre}`);
  } catch (e) {
    resultados.push({ nombre, ok: false, error: e });
    abortado = true;
    console.log(`  ✗ ${nombre}\n      ${String(e.message).split("\n").slice(0, 4).join("\n      ")}`);
  }
}
const afirmar = (condicion, mensaje) => {
  if (!condicion) throw new Error(mensaje);
};
const igual = (real, esperado, mensaje) => afirmar(JSON.stringify(real) === JSON.stringify(esperado), `${mensaje}: esperaba ${JSON.stringify(esperado)} y fue ${JSON.stringify(real)}`);

async function abrirPagina(contexto, base, vigilancia) {
  const pagina = await contexto.newPage();
  await pagina.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  pagina.on("pageerror", (e) => vigilancia.errores.push(`pageerror: ${e.message}`));
  pagina.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|net::ERR_|subrayados/.test(m.text())) vigilancia.errores.push(`console: ${m.text()}`);
    if (/Content Security Policy/i.test(m.text())) vigilancia.csp.push(m.text());
  });
  await pagina.goto(`${base}/anki/index.html`);
  return pagina;
}

// Ninguna vista debe mostrar «null», «undefined» o «NaN» (replaceChildren(null), un campo vacío…)
const sinBasura = async (pagina, donde) => {
  const visible = await pagina.locator("#anki-raiz").innerText();
  const m = visible.match(/\b(null|undefined|NaN)\b/);
  if (m) throw new Error(`«${m[0]}» en pantalla (${donde}): ${visible.slice(0, 160).replace(/\n/g, " | ")}`);
};
const texto = (pagina, selector) => pagina.locator(selector).first().innerText();
const cuenta = (pagina, clave) => pagina.locator(`.anki-cuenta[data-cuenta="${clave}"] strong`).innerText().then(Number);

async function iniciarSesion(pagina, { recordar = false } = {}) {
  await pagina.locator(".anki-primario", { hasText: "Iniciar sesión" }).click();
  await pagina.locator('input[name="usuario"]').fill(USUARIO);
  await pagina.locator('input[name="contrasena"]').fill(CONTRASENA);
  if (recordar) await pagina.locator('input[name="recordar"]').check();
  await pagina.locator('.sesion-panel__form button[type="submit"]').click();
  await pagina.locator('html[data-sesion="activa"]').waitFor();
  await pagina.locator('.anki-vista[data-vista="inicio"]').waitFor();
}

async function nuevaTarjeta(pagina, { tipo = "basico", frente, reverso = "", etiquetas = "" }) {
  await pagina.locator("button", { hasText: "Nueva tarjeta" }).click();
  await pagina.locator("#anki-tipo").selectOption(tipo);
  await pagina.locator("#anki-frente").fill(frente);
  await pagina.locator("#anki-reverso").fill(reverso);
  await pagina.locator("#anki-etiquetas").fill(etiquetas);
  await pagina.locator('.anki-formulario button[type="submit"]').click();
  await pagina.locator('.anki-vista[data-vista="inicio"]').waitFor();
}

async function escenario(chromium, base, nombre, ventana, acceso) {
  console.log(`\n=== ${nombre} (${ventana.width}×${ventana.height}) ===`);
  abortado = false;
  const vigilancia = { errores: [], csp: [] };
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: ventana, locale: "es-MX", timezoneId: "America/Mexico_City", colorScheme: process.env.ANKI_OSCURO ? "dark" : "light" });
  contexto.setDefaultTimeout(8000);
  const api = githubFalso();
  await contexto.route("**/datos/acceso.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(acceso) }));
  await contexto.route("https://api.github.com/**", api.manejar);
  const guardar = async (pagina, archivo) => SALIDA && (await pagina.screenshot({ path: path.join(SALIDA, `${nombre}-${archivo}.png`), fullPage: true }));

  const p = await abrirPagina(contexto, base, vigilancia);

  await paso("sin sesión se ofrece iniciar sesión y no se ve ningún dato", async () => {
    afirmar((await texto(p, ".anki-vista")).includes("Iniciar sesión"), "falta el botón");
    afirmar((await p.locator("[data-no-subrayar]#anki-raiz").count()) === 1, "falta data-no-subrayar en la raíz");
  });

  await paso("iniciar sesión por el formulario real del sitio abre el inicio vacío", async () => {
    await iniciarSesion(p, { recordar: true });
    igual(await cuenta(p, "nuevas"), 0, "nuevas");
    afirmar(await p.locator("button.anki-primario", { hasText: "Sin tarjetas todavía" }).isDisabled(), "Estudiar debería estar desactivado");
    await sinBasura(p, "inicio vacío");
    await guardar(p, "01-inicio-vacio");
  });

  await paso("el editor valida con mensajes claros", async () => {
    await p.locator("button", { hasText: "Nueva tarjeta" }).click();
    await p.locator('.anki-formulario button[type="submit"]').click();
    afirmar((await texto(p, ".anki-error")).includes("frente"), "falta aviso de frente vacío");
    await p.locator("#anki-frente").fill("algo");
    await p.locator('.anki-formulario button[type="submit"]').click();
    afirmar((await texto(p, ".anki-error")).includes("reverso"), "falta aviso de reverso vacío");
    await p.locator("#anki-tipo").selectOption("cloze");
    await p.locator("#anki-frente").fill("sin huecos");
    await p.locator('.anki-formulario button[type="submit"]').click();
    afirmar((await texto(p, ".anki-error")).includes("hueco"), "falta aviso de hueco");
    await p.locator("#anki-frente").fill("{{c1::sin cerrar");
    await p.locator('.anki-formulario button[type="submit"]').click();
    afirmar((await texto(p, ".anki-error")).includes("sin cerrar"), "falta aviso de hueco sin cerrar");
  });

  await paso("la vista previa pinta fórmulas con KaTeX y huecos de cloze, y el HTML no se interpreta", async () => {
    await p.locator("#anki-frente").fill("La {{c1::$\\frac{a}{b}$}} razón y {{c2::pendiente::pista}} <img src=x onerror=window.__xss=1>");
    await p.locator(".anki-previa .anki-hueco").first().waitFor();
    afirmar((await p.locator(".anki-previa .katex").count()) >= 1, "KaTeX no pintó la fórmula de la respuesta");
    afirmar((await p.locator(".anki-previa img").count()) === 0, "se interpretó HTML");
    await sinBasura(p, "editor");
    afirmar((await p.evaluate(() => window.__xss)) === undefined, "se ejecutó un manejador del texto");
    afirmar((await texto(p, ".anki-previa")).includes("<img src=x"), "el HTML debe verse como texto");
    await guardar(p, "02-editor-cloze");
    await p.locator("#anki-frente").fill("La {{c1::$\\frac{a}{b}$}} razón y {{c2::pendiente::pista}}");
    await p.locator("#anki-etiquetas").fill("mate::algebra");
    await p.locator('.anki-formulario button[type="submit"]').click();
    await p.locator('.anki-vista[data-vista="inicio"]').waitFor();
  });

  await paso("una tarjeta básica con fórmula en el frente se guarda (el cloze se creó primero)", async () => {
    await nuevaTarjeta(p, { frente: "¿Qué es $x^2$? Cuesta $5 y $10", reverso: "Una **potencia**", etiquetas: "mate::algebra, examen" });
    igual(await cuenta(p, "nuevas"), 3, "nuevas = 1 básica + 2 huecos");
    afirmar((await texto(p, ".anki-aviso")).includes("guardada"), "falta el aviso de guardado");
    await sinBasura(p, "inicio con tarjetas");
    await guardar(p, "05-inicio-con-tarjetas");
  });

  let repasosAntes = 0; // commits de repasos.enc antes de estudiar (incluye la creación inicial del archivo vacío)
  await paso("estudiar: no salen seguidas dos unidades de la misma tarjeta cloze", async () => {
    repasosAntes = api.estado.escrituras.filter((e) => e.archivo === "repasos.enc").length;
    await p.locator("button.anki-primario", { hasText: "Estudiar" }).click();
    const vistos = [];
    const t0 = Date.now();
    for (let i = 0; i < 3; i++) {
      await p.locator(".anki-tarjeta").waitFor();
      vistos.push(await p.locator(".anki-tarjeta").getAttribute("data-uid"));
      await p.locator(".anki-mostrar").click();
      await p.locator(".anki-notas").waitFor();
      if (i === 0) {
        const esperas = await p.locator(".anki-nota-espera").allInnerTexts();
        igual(esperas, ["1 min", "6 min", "10 min", "4 d"], "esperas de una tarjeta nueva");
        afirmar((await p.locator(".anki-respuesta, .anki-reverso").count()) >= 1, "la respuesta debe verse");
        await sinBasura(p, "estudio con respuesta");
        await guardar(p, "03-estudio-respuesta");
      }
      await p.locator(`.anki-g4`).click(); // Fácil: se gradúa de una vez
    }
    const ids = vistos.map((u) => u.split("#")[0]);
    afirmar(vistos[0].includes("#c1") && !ids.slice(1, 2).includes(ids[0]), `dos unidades de la misma tarjeta seguidas: ${vistos}`);
    afirmar(new Set(vistos).size === 3, `unidades repetidas: ${vistos}`);
    afirmar(Date.now() - t0 < 15_000, "estudiar tardó demasiado");
  });

  await paso("al terminar: pantalla final y un único commit de repasos", async () => {
    await p.locator('.anki-vista[data-vista="terminado"]').waitFor();
    afirmar((await texto(p, ".anki-vista")).includes("Repasaste 3"), "falta el recuento");
    await sinBasura(p, "terminado");
    await p.waitForFunction(() => document.querySelector(".anki-estado")?.dataset.estado === "sincronizado" && !/pendientes/.test(document.querySelector(".anki-estado").textContent));
    const repasos = api.estado.escrituras.filter((e) => e.archivo === "repasos.enc");
    igual(repasos.length - repasosAntes, 1, "commits de repasos durante una sesión de 3 respuestas");
    // (el módulo de subrayados del sitio también corre en la página y escribe en SU rama)
    const delAnki = api.estado.escrituras.filter((e) => ["tarjetas.enc", "repasos.enc"].includes(e.archivo));
    afirmar(delAnki.length >= 3 && delAnki.every((e) => e.rama === "anki"), "el Anki debe escribir solo en la rama anki");
    afirmar([...api.estado.autorizaciones].every((a) => a === `Bearer ${TOKEN}`), "token inesperado");
    afirmar(api.estado.escrituras.every((e) => !Buffer.from(e.bytes).includes("potencia") && !Buffer.from(e.bytes).includes("mitocondria")), "texto en claro en el remoto");
    await guardar(p, "04-terminado");
  });

  await paso("responder es rápido: la siguiente tarjeta aparece sin esperar al guardado", async () => {
    await p.locator("button", { hasText: "Volver al inicio" }).click();
    await nuevaTarjeta(p, { frente: "uno", reverso: "1" });
    await nuevaTarjeta(p, { frente: "dos", reverso: "2" });
    await p.locator("button.anki-primario", { hasText: "Estudiar" }).click();
    const medidas = await p.evaluate(async () => {
      const esperarCambio = (antes) => new Promise((ok) => { const t0 = performance.now(); const id = setInterval(() => { const u = document.querySelector(".anki-tarjeta")?.dataset.uid; if (!u || u !== antes) { clearInterval(id); ok(performance.now() - t0); } else if (performance.now() - t0 > 3000) { clearInterval(id); ok(Infinity); } }, 1); });
      const tiempos = [];
      for (let i = 0; i < 2; i++) {
        document.querySelector(".anki-mostrar").click();
        const antes = document.querySelector(".anki-tarjeta").dataset.uid;
        const espera = esperarCambio(antes);
        document.querySelector(".anki-g4").click();
        tiempos.push(await espera);
      }
      return tiempos;
    });
    afirmar(medidas.every((m) => m < 150), `respuesta lenta: ${medidas.map((m) => m.toFixed(0))} ms`);
  });

  await paso("recargar conserva todo (copia local cifrada) y la sesión recordada sigue", async () => {
    await p.locator('.anki-vista[data-vista="terminado"]').waitFor();
    await p.reload();
    await p.locator('.anki-vista[data-vista="inicio"]').waitFor();
    afirmar((await texto(p, ".anki-acciones")).includes("Tarjetas (4)"), `esperaba 4 tarjetas: ${await texto(p, ".anki-acciones")}`);
  });

  await paso("un segundo aviso de sesión activa no deja la pestaña bloqueada por sí misma", async () => {
    // sesion.entrar() avisa siempre: la interfaz recibe «activa» de nuevo estando ya conectada
    await p.evaluate(([u, c]) => window.WRSesion.entrar(u, c, true), [USUARIO, CONTRASENA]);
    await p.waitForTimeout(600);
    igual(await p.locator(".anki-vista").getAttribute("data-vista"), "inicio", "vista tras un segundo «activa»");
    afirmar((await texto(p, ".anki-acciones")).includes("Tarjetas (4)"), "las tarjetas deben seguir visibles");
  });

  await paso("un equipo nuevo recibe lo sincronizado desde la API", async () => {
    await p.locator("button", { hasText: "Sincronizar" }).click();
    await p.waitForFunction(() => document.querySelector(".anki-estado")?.dataset.estado === "sincronizado");
    const contexto2 = await navegador.newContext({ viewport: ventana });
    await contexto2.route("**/datos/acceso.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(acceso) }));
    await contexto2.route("https://api.github.com/**", api.manejar);
    const q = await abrirPagina(contexto2, base, vigilancia);
    await iniciarSesion(q);
    await q.locator("button", { hasText: /^Tarjetas \(/ }).waitFor();
    afirmar((await texto(q, ".anki-acciones")).includes("Tarjetas (4)"), "el equipo nuevo no recibió las 4 tarjetas");
    await contexto2.close();
  });

  await paso("sin conexión: se crea una tarjeta, aparece el estado y sube al volver la red", async () => {
    api.estado.enLinea = false;
    await nuevaTarjeta(p, { frente: "offline", reverso: "sí" });
    await p.locator('.anki-estado[data-estado="sin-conexion"]').waitFor({ timeout: 8000 });
    api.estado.enLinea = true;
    await p.evaluate(() => window.dispatchEvent(new Event("online")));
    await p.waitForFunction(() => document.querySelector(".anki-estado")?.dataset.estado === "sincronizado" && !/pendientes/.test(document.querySelector(".anki-estado").textContent), null, { timeout: 15000 });
  });

  await paso("editar: el tipo queda fijo y quitar un hueco con historial pide confirmación", async () => {
    await p.locator("button", { hasText: /^Tarjetas \(/ }).click();
    await p.locator("#anki-buscador").fill("razón");
    await p.waitForFunction(() => document.querySelectorAll(".anki-fila").length === 1);
    await guardar(p, "06-lista");
    await p.locator(".anki-fila-boton").first().click();
    afirmar(await p.locator("#anki-tipo").isDisabled(), "el tipo debe estar fijo al editar");
    await p.locator("#anki-frente").fill("La {{c1::$\\frac{a}{b}$}} razón");
    await p.locator('.anki-formulario button[type="submit"]').click();
    afirmar((await texto(p, ".anki-error")).includes("historial"), "falta el aviso al quitar el hueco c2");
    igual(await p.locator(".anki-vista").getAttribute("data-vista"), "editor", "sigue en el editor hasta confirmar");
    await p.locator('.anki-formulario button[type="submit"]').click();
    await p.locator('.anki-vista[data-vista="tarjetas"]').waitFor();
    await p.locator("#anki-buscador").fill("");
    await p.waitForFunction(() => document.querySelectorAll(".anki-fila").length === 5);
  });

  await paso("buscar sin acentos, editar y eliminar con confirmación", async () => {
    const filas = (n) => p.waitForFunction((esperadas) => document.querySelectorAll(".anki-fila").length === esperadas, n);
    await filas(5); // cloze, básica, uno, dos y la creada sin conexión
    await p.locator("#anki-buscador").fill("POTENCIA");
    await filas(1); // sin acentos ni mayúsculas, tras el retardo de la búsqueda
    await p.locator(".anki-fila-boton").first().click();
    await p.locator("#anki-reverso").fill("Una potencia editada");
    await p.locator('.anki-formulario button[type="submit"]').click();
    await p.locator('.anki-vista[data-vista="tarjetas"]').waitFor();
    await p.locator("#anki-buscador").fill("editada");
    await filas(1);
    await p.locator(".anki-fila-boton").first().click();
    await p.locator("button.anki-peligro").click();
    afirmar((await texto(p, "button.anki-peligro")).includes("Confirmar"), "falta la segunda confirmación");
    await p.locator("button.anki-peligro").click();
    await p.locator('.anki-vista[data-vista="tarjetas"]').waitFor();
    await p.locator("#anki-buscador").fill("");
    await filas(4); // era 5: la eliminada ya no aparece
  });

  await paso("una sola pestaña activa: no se bloquea sola, la segunda avisa, toma el control y se recupera", async () => {
    await p.locator("button", { hasText: "Volver" }).first().click();
    const vistaDe = (pagina) => pagina.locator(".anki-vista").getAttribute("data-vista");
    const q = await abrirPagina(contexto, base, vigilancia);
    await q.locator('.anki-vista[data-vista="bloqueada"]').waitFor({ timeout: 10_000 });
    await guardar(q, "07-bloqueada");
    igual(await vistaDe(p), "inicio", "la pestaña activa no debe bloquearse al abrir otra");
    // otra página del sitio con la sesión recordada: tampoco debe afectarle
    const portada = await contexto.newPage();
    await portada.goto(`${base}/index.html`);
    await portada.locator('html[data-sesion="activa"]').waitFor();
    await portada.waitForTimeout(500);
    igual(await vistaDe(p), "inicio", "abrir la portada con sesión no debe bloquear la pestaña activa");
    await portada.close();
    // q toma el control; p queda bloqueada
    await q.locator("button", { hasText: "Usar aquí" }).click();
    await q.locator('.anki-vista[data-vista="inicio"]').waitFor({ timeout: 10_000 });
    await p.locator('.anki-vista[data-vista="bloqueada"]').waitFor({ timeout: 10_000 });
    // y p lo recupera
    await p.locator("button", { hasText: "Usar aquí" }).click();
    await p.locator('.anki-vista[data-vista="inicio"]').waitFor({ timeout: 10_000 });
    await q.locator('.anki-vista[data-vista="bloqueada"]').waitFor({ timeout: 10_000 });
    await q.close();
  });

  await paso("sin desbordes horizontales ni errores en la consola", async () => {
    const desborde = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    afirmar(desborde <= 1, `la página se desborda ${desborde}px`);
  });

  await paso("cerrar sesión borra los datos de pantalla", async () => {
    const r = await abrirPagina(contexto, base, vigilancia);
    await r.locator('.anki-vista[data-vista="inicio"], .anki-vista[data-vista="bloqueada"]').first().waitFor();
    if ((await r.locator('.anki-vista[data-vista="bloqueada"]').count()) === 1) await r.locator("button", { hasText: "Usar aquí" }).click();
    await r.locator('.anki-vista[data-vista="inicio"]').waitFor();
    await r.evaluate(() => window.WRSesion.cerrar());
    await r.locator('.anki-vista[data-vista="sin-sesion"]').waitFor();
    const contenido = await r.locator("#anki-raiz").innerText();
    afirmar(!/potencia|uno|dos|offline/i.test(contenido), "quedaron datos en pantalla tras cerrar sesión");
    await r.close();
  });

  await paso("cero violaciones de la política de contenido (CSP) y cero errores de página", async () => {
    const enPagina = await p.evaluate(() => window.__csp);
    igual([...enPagina, ...vigilancia.csp], [], "violaciones de CSP");
    igual(vigilancia.errores, [], "errores de la página o de la consola");
  }, { siempre: true });

  await navegador.close();
}

async function ramaAusente(chromium, base, acceso) {
  console.log("\n=== sin rama «anki» en GitHub ===");
  abortado = false;
  const vigilancia = { errores: [], csp: [] };
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  contexto.setDefaultTimeout(8000);
  const api = githubFalso({ rama: false });
  await contexto.route("**/datos/acceso.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(acceso) }));
  await contexto.route("https://api.github.com/**", api.manejar);
  const p = await abrirPagina(contexto, base, vigilancia);
  await paso("todo funciona en local y el estado lo dice con claridad", async () => {
    await iniciarSesion(p);
    await nuevaTarjeta(p, { frente: "local", reverso: "sí" });
    await p.locator("button", { hasText: "Sincronizar" }).click();
    await p.locator('.anki-estado[data-estado="error"]').waitFor({ timeout: 10_000 });
    const detalle = await texto(p, ".anki-detalle");
    afirmar(/anki/.test(detalle) && /este equipo/.test(detalle), `mensaje poco claro: ${detalle}`);
    afirmar((await texto(p, ".anki-acciones")).includes("Tarjetas (1)"), "la tarjeta local debe seguir ahí");
    await p.locator("button.anki-primario", { hasText: "Estudiar" }).click();
    await p.locator(".anki-mostrar").click();
    await p.locator(".anki-g4").click();
    await p.locator('.anki-vista[data-vista="terminado"]').waitFor();
  });
  await paso("sin violaciones de CSP ni errores", async () => {
    igual([...(await p.evaluate(() => window.__csp)), ...vigilancia.csp], [], "CSP");
    igual(vigilancia.errores, [], "errores");
  });
  await navegador.close();
}

const { chromium } = cargarPlaywright();
const servidor = await servir();
const base = `http://127.0.0.1:${servidor.address().port}`;
const acceso = await accesoDesechable();
try {
  // ANKI_SOLO=celular|escritorio|rama limita la corrida; ANKI_OSCURO=1 usa el tema oscuro del sistema
  const solo = process.env.ANKI_SOLO;
  if (!solo || solo === "celular") await escenario(chromium, base, "celular", { width: 390, height: 844 }, acceso);
  if (!solo || solo === "escritorio") await escenario(chromium, base, "escritorio", { width: 1100, height: 800 }, acceso);
  if (!solo || solo === "rama") await ramaAusente(chromium, base, acceso);
} finally {
  servidor.close();
}
const fallos = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallos.length} de ${resultados.length} comprobaciones correctas`);
process.exit(fallos.length ? 1 : 0);
