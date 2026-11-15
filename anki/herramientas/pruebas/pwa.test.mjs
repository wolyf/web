// Pruebas de la PWA del Anki: manifiesto, iconos, lista de precarga del service worker y registro
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ANKI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RAIZ = path.resolve(ANKI, "..");
const leer = (ruta) => fs.readFileSync(path.join(ANKI, ruta), "utf8");
const manifiesto = JSON.parse(leer("manifest.webmanifest"));
const sw = leer("sw.js");
const precarga = [...sw.match(/const PRECARGA = \[([\s\S]*?)\n\];/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith("//"));
const resolver = (url) => path.normalize(path.join(ANKI, url.replace(/^\.\/$/, "./index.html")));

function dimensionesPNG(ruta) {
  const b = fs.readFileSync(ruta);
  assert.equal(b.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${ruta} no es PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test("el manifiesto declara lo necesario para instalarse y apunta a iconos reales del tamaño correcto", () => {
  for (const campo of ["name", "short_name", "start_url", "scope", "display", "icons", "background_color", "theme_color", "lang"]) assert.ok(manifiesto[campo], `falta ${campo}`);
  assert.equal(manifiesto.display, "standalone");
  assert.equal(manifiesto.scope, "./", "el alcance es la carpeta del Anki");
  const propositos = manifiesto.icons.map((i) => `${i.sizes}:${i.purpose}`);
  for (const necesario of ["192x192:any", "512x512:any", "512x512:maskable"]) assert.ok(propositos.includes(necesario), `falta el icono ${necesario}`);
  for (const icono of manifiesto.icons) {
    const [ancho, alto] = dimensionesPNG(path.join(ANKI, icono.src));
    assert.equal(`${ancho}x${alto}`, icono.sizes, `${icono.src} no mide lo que declara`);
  }
  assert.equal(dimensionesPNG(path.join(ANKI, "img/apple-touch-icon.png")).join("x"), "180x180");
});

test("el manifiesto, el icono de iOS y el color del tema están enlazados desde la página", () => {
  const html = leer("index.html");
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  assert.match(html, /<link rel="apple-touch-icon" href="img\/apple-touch-icon\.png">/);
  assert.match(html, /<meta name="theme-color" content="#f8f4e6">/);
  assert.match(html, /<meta name="mobile-web-app-capable" content="yes">/);
});

test("la política de contenido de la página no se tocó para la PWA", () => {
  const politica = leer("index.html").match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.equal(politica, "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'none'; form-action 'none'");
});

test("todo lo que lista PRECARGA existe y no hay duplicados", () => {
  assert.ok(precarga.length > 40, `la lista parece vacía (${precarga.length})`);
  assert.equal(new Set(precarga).size, precarga.length, "hay archivos repetidos");
  for (const url of precarga) assert.ok(fs.existsSync(resolver(url)), `PRECARGA lista un archivo inexistente: ${url}`);
});

test("PRECARGA cubre los módulos del Anki, los estilos, las fuentes y KaTeX que usa la página", () => {
  const enLista = (url) => assert.ok(precarga.includes(url), `falta en PRECARGA: ${url}`);
  for (const f of fs.readdirSync(path.join(ANKI, "js"))) enLista(`./js/${f}`);
  enLista("./css/anki.css");
  enLista("./manifest.webmanifest");
  for (const m of fs.readFileSync(path.join(RAIZ, "css/styles.css"), "utf8").matchAll(/@import url\("([^"]+)"\)/g)) enLista(`../css/${m[1]}`);
  enLista("../css/styles.css");
  for (const f of fs.readdirSync(path.join(RAIZ, "css/fuentes"))) if (f.endsWith(".woff2")) enLista(`../css/fuentes/${f}`);
  const css = fs.readFileSync(path.join(RAIZ, "js/vendor/katex/katex.min.css"), "utf8");
  for (const m of css.matchAll(/url\(fonts\/([^)]+\.woff2)\)/g)) enLista(`../js/vendor/katex/fonts/${m[1]}`);
  enLista("../js/vendor/katex/katex.min.js");
  enLista("../js/vendor/katex/katex.min.css");
  // lo que carga la propia página y sus dependencias directas
  for (const f of ["tema.js", "darwin.js", "sesion.mjs", "llaves.mjs", "subrayados.mjs", "subrayados-nucleo.mjs", "subrayados-sync.mjs", "subrayados-coord.mjs"]) enLista(`../js/${f}`);
  enLista("../datos/acceso.json");
});

test("PRECARGA no guarda nada cifrado privado ni de otros orígenes", () => {
  for (const url of precarga) {
    assert.ok(!url.endsWith(".enc"), `no se precargan fragmentos cifrados: ${url}`);
    assert.ok(!/^https?:/.test(url), `solo recursos del propio origen: ${url}`);
  }
});

test("el service worker solo atiende GET del mismo origen y deja pasar la API y los .enc", () => {
  assert.match(sw, /pedido\.method !== "GET"\) return/);
  assert.match(sw, /url\.origin !== self\.location\.origin\) return/);
  assert.match(sw, /endsWith\("\.enc"\)\) return/);
  const codigo = sw.split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n"); // sin comentarios (el worker no usa «//» en cadenas)
  assert.ok(!codigo.includes("api.github.com"), "el código del worker no debe nombrar la API de GitHub");
  assert.match(sw, /cache: "no-cache"/, "con red debe revalidar para no mezclar versiones");
  assert.match(sw, /respuesta\.type === "basic"/, "solo se guardan respuestas del propio origen");
  assert.match(sw, /startsWith\("wr-anki-"\) && nombre !== CACHE/, "al actualizar se borran las cachés viejas del Anki");
});

test("main.mjs registra el worker solo en contextos seguros y sin romper si falla", () => {
  const main = leer("js/main.mjs");
  assert.match(main, /serviceWorker\.register\("sw\.js", \{ scope: "\.\/" \}\)/);
  assert.match(main, /https:/);
  assert.match(main, /localhost/);
  assert.match(main, /\.catch\(/);
});
