// ============================================================
//  Service worker del Anki personal
// ============================================================
//
// Alcance: anki/ (la página y sus recursos propios). Permite abrir el Anki sin red una vez visitado
// en línea; los datos NO pasan por aquí (viven cifrados en IndexedDB y se sincronizan con la API
// de GitHub, que es de otro origen y este worker no toca).
//
// Estrategia «red primero con respaldo en caché»:
//   · Con red se pide SIEMPRE lo más reciente (cache: "no-cache" revalida con ETag, casi gratis) y
//     se guarda copia. Así nunca se mezclan módulos nuevos con viejos tras un cambio del sitio.
//   · Si la red falla, o tarda más de LIMITE_RED_MS y hay copia, se usa la última copia guardada.
//   · Solo mismo origen y solo GET. Nada de api.github.com ni de los fragmentos cifrados (.enc).
// La lista PRECARGA se guarda al instalar (mejor esfuerzo) para que la primera visita ya sirva sin
// red; una prueba (anki/herramientas/pruebas/pwa.test.mjs) la mantiene al día con los archivos.

const CACHE = "wr-anki-v1";
const LIMITE_RED_MS = 4000;

const PRECARGA = [
  // propios
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/anki.css",
  "./img/icono-192.png",
  "./img/icono-512.png",
  "./img/apple-touch-icon.png",
  "./js/main.mjs",
  "./js/app.mjs",
  "./js/estudio.mjs",
  "./js/modelo.mjs",
  "./js/render.mjs",
  "./js/scheduler.mjs",
  "./js/sync.mjs",
  // comunes del sitio: estilos y fuentes
  "../css/styles.css",
  "../css/fuentes.css",
  "../css/base.css",
  "../css/ajustes.css",
  "../css/componentes.css",
  "../css/portada.css",
  "../css/calculadoras.css",
  "../css/fuentes/google-sans-code-latin-20c3fa.woff2",
  "../css/fuentes/google-sans-code-latin-ext-83a19c.woff2",
  "../css/fuentes/inter-latin-567244.woff2",
  "../css/fuentes/inter-latin-ext-395290.woff2",
  "../css/fuentes/outfit-latin-357083.woff2",
  "../css/fuentes/outfit-latin-ext-35e12d.woff2",
  // comunes del sitio: sesión, subrayados, tema y Darwin
  "../js/tema.js",
  "../js/darwin.js",
  "../js/sesion.mjs",
  "../js/llaves.mjs",
  "../js/subrayados.mjs",
  "../js/subrayados-nucleo.mjs",
  "../js/subrayados-sync.mjs",
  "../js/subrayados-coord.mjs",
  "../img/darwin-cara.svg",
  "../img/darwin.svg",
  // KaTeX
  "../js/vendor/katex/katex.min.css",
  "../js/vendor/katex/katex.min.js",
  "../js/vendor/katex/fonts/KaTeX_AMS-Regular.woff2",
  "../js/vendor/katex/fonts/KaTeX_Main-Bold.woff2",
  "../js/vendor/katex/fonts/KaTeX_Main-Italic.woff2",
  "../js/vendor/katex/fonts/KaTeX_Main-Regular.woff2",
  "../js/vendor/katex/fonts/KaTeX_Math-Italic.woff2",
  "../js/vendor/katex/fonts/KaTeX_Size1-Regular.woff2",
  "../js/vendor/katex/fonts/KaTeX_Size2-Regular.woff2",
  "../js/vendor/katex/fonts/KaTeX_Size3-Regular.woff2",
  "../js/vendor/katex/fonts/KaTeX_Size4-Regular.woff2",
  // público: el token de sincronización viaja sellado con la llave del sitio
  "../datos/acceso.json",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Mejor esfuerzo: un archivo que falle no impide instalar (se guardará al visitarlo)
      await Promise.allSettled(PRECARGA.map((url) => cache.add(new Request(url, { cache: "reload" }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      for (const nombre of await caches.keys()) if (nombre.startsWith("wr-anki-") && nombre !== CACHE) await caches.delete(nombre);
      await self.clients.claim();
    })(),
  );
});

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function redPrimero(pedido, evento) {
  const cache = await caches.open(CACHE);
  const red = fetch(pedido, { cache: "no-cache" }).then((respuesta) => {
    // Solo respuestas completas y del propio origen (basic): nada de errores ni parciales
    if (respuesta.ok && respuesta.status === 200 && respuesta.type === "basic") evento.waitUntil(cache.put(pedido, respuesta.clone()));
    return respuesta;
  });
  const buscar = () => cache.match(pedido, { ignoreSearch: pedido.mode === "navigate" });
  try {
    const rapida = await Promise.race([red, esperar(LIMITE_RED_MS).then(() => null)]);
    if (rapida) return rapida;
    // La red tarda: si hay copia se usa; si no, se espera a la red
    return (await buscar()) ?? (await red);
  } catch {
    const copia = await buscar();
    if (copia) return copia;
    // Navegación sin red y sin esa URL guardada: la página principal del Anki
    if (pedido.mode === "navigate") return (await cache.match("./index.html")) ?? Response.error();
    return Response.error();
  }
}

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return; // api.github.com y demás: directo a la red
  if (url.pathname.endsWith(".enc")) return; // fragmentos cifrados: no se guardan aquí
  evento.respondWith(redPrimero(pedido, evento));
});
