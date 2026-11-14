// ============================================================
//  Subrayados sincronizados (zona general)
// ============================================================
//
// Con la sesión iniciada se puede subrayar texto en CUALQUIER página del
// sitio, de cualquier proyecto (actual o futuro), sin JavaScript propio: lo
// carga js/tema.js, igual que js/sesion.mjs.
//
//   - Al seleccionar texto sale un menú pequeño: colores, nota y (si ya
//     existe) borrar. Al tocar un subrayado se cambia color, nota o se borra.
//   - Se pintan con la CSS Custom Highlight API (CSS.highlights): el DOM no se
//     modifica. El anclaje es por cita de texto (js/subrayados-nucleo.mjs).
//   - Se guardan cifrados en la rama `subrayados` y se sincronizan entre
//     equipos (js/subrayados-sync.mjs). Sin sesión no hay subrayados ni menú.
//   - Un botón en cada `.ajustes` los apaga y prende. Apagado no se pinta ni
//     sale el menú, pero los datos se conservan y se siguen sincronizando.
//     La preferencia vive en localStorage («subrayados-activos»: «1» o «0»).
//
// Estado en <html data-subrayados="activos|apagados"> y evento «wr:subrayados»
// en document (detail: { activos, estado, huerfanos, total }).
//
// Lo que se subrayó y ya no se encuentra (una errata corregida, una cifra que cambió) se
// busca de forma aproximada; si aparece, se reubica solo. Los huérfanos se pueden reubicar
// a mano (panel de la pastilla) y todos los subrayados del sitio se listan y buscan en
// «Mis subrayados» (botón en el panel de sesión).
//
// Se excluyen .ajustes, .site-header, formularios, input, textarea,
// [contenteditable] y [data-no-subrayar] (ver SELECTOR_EXCLUIDO). El contenido
// descifrado de [data-privado] sí se puede subrayar (se repinta con «wr:privado»).
//
// Desde JavaScript: window.WRSubrayados (también exportado como `subrayados`):
//   activos(), establecer(bool), alternar(), items(), todos(), abrirLista(), estado(), alCambiar(fn)

import { sesion } from "./sesion.mjs";
import * as L from "./llaves.mjs";
import * as N from "./subrayados-nucleo.mjs";
import * as S from "./subrayados-sync.mjs";
import * as C from "./subrayados-coord.mjs";

const raiz = document.documentElement;
const URL_ACCESO = new URL("../datos/acceso.json", import.meta.url);
const BASE = new URL("../", import.meta.url).pathname;
const CLAVE_PREF = "subrayados-activos";
const COLOR_HEX = { amarillo: "#f5c400", verde: "#35b36a", azul: "#3b8eea", rosa: "#ee5c97", lavanda: "#8f63e8" };
const NOMBRE_COLOR = { amarillo: "Amarillo", verde: "Verde", azul: "Azul", rosa: "Rosa", lavanda: "Lavanda" };

const soportado = typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";

const enMarco = (() => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
})();

// ---- Preferencia ----

const leerPref = () => {
  try {
    return localStorage.getItem(CLAVE_PREF);
  } catch {
    return null;
  }
};
const guardarPref = (valor) => {
  try {
    localStorage.setItem(CLAVE_PREF, valor);
  } catch {
    /* sin almacenamiento: solo vale en esta página */
  }
};
let prefMemoria = null;
const pref = () => leerPref() ?? prefMemoria;
const activos = () => soportado && !enMarco && N.subrayadosActivos(sesion.activa(), pref());

// ---- Estado ----

let sync = null; // sincronizador de esta sesión
let generacion = 0;
let paginaItems = []; // elementos vivos de esta página
let pintados = []; // { item, rango }
let huerfanos = [];
let huerfanosVisibles = [];
let aproximados = []; // subrayados que solo se anclaron de forma aproximada (pendientes de confirmar)
let reubicando = null; // huérfano que se está reubicando a mano
let coord = null;
let flujo = null;
let nodos = [];
let sucioFlujo = true;
let ultimoActivos = null;
let ultimoEstado = "";

const pagina = () => N.rutaPagina(location.pathname, BASE);

const estadoSync = () => sync?.estado() ?? { estado: "sincronizado", detalle: "" };

function emitir() {
  const { estado } = estadoSync();
  document.dispatchEvent(
    new CustomEvent("wr:subrayados", {
      detail: { activos: activos(), estado, huerfanos: huerfanosVisibles.length, total: paginaItems.length },
    }),
  );
}

function marcar() {
  const a = activos();
  raiz.dataset.subrayados = a ? "activos" : "apagados";
  const { estado } = estadoSync();
  const clave = `${a}|${estado}`;
  if (clave !== ultimoEstado) {
    const cambioActivos = a !== ultimoActivos;
    ultimoActivos = a;
    ultimoEstado = clave;
    if (cambioActivos || sync) emitir();
  }
}

// ---- Estilos propios (la página puede no cargar css/styles.css) ----

const CSS_PROPIO = `
::highlight(wr-sub-amarillo){background-color:rgba(255,205,0,.42)}
::highlight(wr-sub-verde){background-color:rgba(60,190,105,.38)}
::highlight(wr-sub-azul){background-color:rgba(70,150,245,.36)}
::highlight(wr-sub-rosa){background-color:rgba(245,90,150,.34)}
::highlight(wr-sub-lavanda){background-color:rgba(150,105,240,.34)}
::highlight(wr-sub-nota){text-decoration:underline dotted;text-decoration-thickness:2px;text-underline-offset:3px}

.sub-boton{position:relative;display:inline-grid;place-items:center;width:32px;height:32px;margin:0;padding:0;
  color:var(--text,#28282e);background:transparent;border:0;border-radius:var(--radius,8px);cursor:pointer}
.sub-boton:hover{color:var(--text-strong,#1d1d22);background:var(--surface-2,#ece4ca)}
.sub-boton[hidden]{display:none!important}
.sub-boton svg{width:18px;height:18px}
.sub-boton[aria-pressed="false"] svg{opacity:.45}
.sub-boton__estado{position:absolute;right:5px;bottom:5px;width:8px;height:8px;border-radius:50%;
  background:var(--accent,#b12d6c);box-shadow:0 0 0 2px var(--bg,#f8f4e6)}
.sub-boton[data-estado="sincronizando"] .sub-boton__estado{background:#e0a100;animation:sub-pulso 1s ease-in-out infinite}
.sub-boton[data-estado="sin-conexion"] .sub-boton__estado{background:var(--bg,#f8f4e6);box-shadow:inset 0 0 0 1.5px var(--muted,#5a5a61),0 0 0 2px var(--bg,#f8f4e6)}
.sub-boton[data-estado="error"] .sub-boton__estado{background:#d03c3c}
@keyframes sub-pulso{50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.sub-boton[data-estado="sincronizando"] .sub-boton__estado{animation:none}}
.sub-flotante{position:fixed;top:50px;right:10px;z-index:900;background:var(--bg,#fdfcf8);border:1px solid var(--border,#ddd);border-radius:var(--radius,8px)}
.sub-flotante[hidden]{display:none}

.sub-ui{font:400 .85rem/1.4 var(--font-texto,system-ui,-apple-system,"Segoe UI",sans-serif);color:var(--text,#28282e)}
.sub-menu{position:absolute;z-index:1100;display:grid;gap:8px;padding:8px;background:var(--surface,#f1ead5);
  border:1px solid var(--border-card,#ded4b2);border-radius:var(--radius,8px);box-shadow:var(--shadow-hover,0 6px 18px rgba(0,0,0,.25));
  max-width:min(320px,calc(100vw - 16px))}
.sub-menu[hidden]{display:none}
.sub-menu__fila{display:flex;align-items:center;gap:6px}
.sub-menu button{margin:0;font:inherit}
.sub-color{width:24px;height:24px;min-height:0;padding:0;border-radius:50%;border:2px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.18)}
.sub-color[aria-pressed="true"]{border-color:var(--text-strong,#1d1d22)}
.sub-sep{width:1px;align-self:stretch;background:var(--border,#e5dcbd);margin:0 2px}
.sub-accion{display:inline-grid;place-items:center;width:28px;height:28px;min-height:0;padding:0;color:var(--text,#28282e);
  background:transparent;border:0;border-radius:6px;cursor:pointer}
.sub-accion:hover{background:var(--surface-2,#ece4ca);filter:none}
.sub-accion svg{width:16px;height:16px}
.sub-accion[hidden]{display:none}
.sub-menu__nota{display:grid;gap:6px}
.sub-menu__nota[hidden]{display:none}
.sub-menu textarea{width:min(280px,calc(100vw - 40px));min-height:64px;resize:vertical;box-sizing:border-box;padding:6px 8px;font:inherit;
  color:var(--text,#28282e);background:var(--bg,#fff);border:1px solid var(--border-strong,#c6ba93);border-radius:6px}
.sub-menu__botones{display:flex;justify-content:flex-end;gap:6px}
.sub-menu__guardar{min-height:0;padding:4px 12px;color:var(--sobre-acento,#fff);background:var(--accent,#b12d6c);border:0;border-radius:6px;cursor:pointer}
.sub-menu__aviso{margin:0;color:var(--muted,#5a5a61);font-size:.78rem}
.sub-menu__aviso[hidden]{display:none}

.sub-estado{position:fixed;right:12px;bottom:12px;z-index:900;display:flex;align-items:center;gap:8px;max-width:min(340px,calc(100vw - 24px));
  padding:6px 12px;color:var(--text,#28282e);background:var(--surface,#f1ead5);border:1px solid var(--border-card,#ded4b2);
  border-radius:999px;box-shadow:var(--shadow,0 2px 6px rgba(0,0,0,.15));font-size:.78rem;cursor:pointer}
.sub-estado[hidden]{display:none}
.sub-estado:hover{border-color:var(--border-strong,#c6ba93)}
.sub-panel{position:fixed;right:12px;bottom:52px;z-index:1100;display:grid;gap:8px;width:min(340px,calc(100vw - 24px));max-height:50vh;overflow:auto;
  padding:12px;background:var(--surface,#f1ead5);border:1px solid var(--border-card,#ded4b2);border-radius:var(--radius,8px);box-shadow:var(--shadow-hover,0 6px 18px rgba(0,0,0,.25))}
.sub-panel[hidden]{display:none}
.sub-panel h2{margin:0;font-size:.85rem}
.sub-panel p{margin:0;color:var(--muted,#5a5a61);font-size:.78rem}
.sub-panel ul{display:grid;gap:8px;margin:0;padding:0;list-style:none}
.sub-panel li{display:grid;gap:4px;padding:6px 8px;border-left:4px solid var(--c,#f5c400);background:var(--bg,#fff);border-radius:4px}
.sub-panel q{quotes:none;overflow-wrap:anywhere}
.sub-panel button{justify-self:start;min-height:0;padding:2px 10px;font:inherit;color:var(--text,#28282e);background:transparent;border:1px solid var(--border-strong,#c6ba93);border-radius:6px;cursor:pointer}
.sub-panel__acciones{display:flex;gap:6px}
.sub-menu__reubicar{display:flex;gap:6px;align-items:center}
.sub-menu__reubicar[hidden]{display:none}
.sub-menu__cancelar{min-height:0;padding:4px 10px;color:var(--text,#28282e);background:transparent;border:1px solid var(--border-strong,#c6ba93);border-radius:6px;cursor:pointer}
.sub-aviso{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:1200;max-width:min(520px,calc(100vw - 24px));padding:8px 14px;
  color:var(--sobre-acento,#fff);background:var(--accent,#b12d6c);border-radius:999px;box-shadow:var(--shadow-hover,0 6px 18px rgba(0,0,0,.25))}
.sub-aviso[hidden]{display:none}
.sub-lista{position:fixed;inset:0;z-index:1300;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.4)}
.sub-lista[hidden]{display:none}
.sub-lista__caja{display:grid;grid-template-rows:auto auto 1fr;gap:10px;width:min(720px,100%);max-height:min(80vh,720px);padding:16px;
  background:var(--surface,#f1ead5);border:1px solid var(--border-card,#ded4b2);border-radius:var(--radius,8px);box-shadow:var(--shadow-hover,0 6px 18px rgba(0,0,0,.25))}
.sub-lista__cabeza{display:flex;align-items:baseline;gap:10px}
.sub-lista__cabeza h2{margin:0;font-size:1rem;flex:1}
.sub-lista__cuenta{color:var(--muted,#5a5a61);font-size:.78rem}
.sub-lista__cerrar{min-height:0;width:28px;height:28px;padding:0;font-size:1.3rem;line-height:1;color:var(--text,#28282e);background:transparent;border:0;border-radius:6px;cursor:pointer}
.sub-lista input[type="search"]{width:100%;box-sizing:border-box;padding:8px 10px;font:inherit;color:var(--text,#28282e);background:var(--bg,#fff);border:1px solid var(--border-strong,#c6ba93);border-radius:6px}
.sub-lista__cuerpo{overflow:auto;display:grid;gap:6px;align-content:start}
.sub-lista__cuerpo h3{margin:10px 0 0;font-size:.82rem;font-weight:600;overflow-wrap:anywhere}
.sub-lista__cuerpo ul{display:grid;gap:8px;margin:0;padding:0;list-style:none}
.sub-lista__cuerpo li{display:grid;gap:4px;padding:6px 10px;border-left:4px solid var(--c,#f5c400);background:var(--bg,#fff);border-radius:4px}
.sub-lista__cuerpo li p{margin:0;color:var(--muted,#5a5a61);font-size:.8rem}
.sub-lista__cita{color:var(--text,#28282e);text-decoration:none;overflow-wrap:anywhere}
.sub-lista__cita:hover{text-decoration:underline}
.sub-lista li button{justify-self:start;min-height:0;padding:2px 10px;font:inherit;color:var(--text,#28282e);background:transparent;border:1px solid var(--border-strong,#c6ba93);border-radius:6px;cursor:pointer}
.sub-lista__vacio{margin:8px 0;color:var(--muted,#5a5a61)}
@media print{.sub-ui,.sub-boton,.sub-flotante{display:none!important}}
`;

function inyectarEstilo() {
  if (document.getElementById("sub-estilo")) return;
  const estilo = document.createElement("style");
  estilo.id = "sub-estilo";
  estilo.textContent = CSS_PROPIO;
  document.head.append(estilo);
}

// ---- Texto de la página ----

const BLOQUES = "p,div,li,h1,h2,h3,h4,h5,h6,td,th,tr,table,ul,ol,dl,dt,dd,section,article,blockquote,pre,figure,figcaption,caption,details,summary,header,footer,main,aside,body";

// Texto visible y sus nodos, en orden de documento. Los elementos excluidos
// (y todo lo que contienen) no aportan texto, así que no se pueden subrayar.
function leerFlujo() {
  const lista = [];
  const piezas = [];
  const cacheBloques = new WeakMap();
  const caminante = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
      return n.matches(N.SELECTOR_EXCLUIDO) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
    },
  });
  for (let n = caminante.nextNode(); n; n = caminante.nextNode()) {
    const padre = n.parentElement;
    let bloque = cacheBloques.get(padre);
    if (bloque === undefined) {
      bloque = padre.closest(BLOQUES);
      cacheBloques.set(padre, bloque);
    }
    lista.push(n);
    piezas.push({ texto: n.data, bloque });
  }
  nodos = lista;
  flujo = N.construirFlujo(piezas);
  sucioFlujo = false;
  return flujo;
}

const flujoActual = () => (flujo && !sucioFlujo ? flujo : leerFlujo());

// Rango del DOM para un tramo [a, b) del texto normalizado, o null
function rangoDeTramo(f, a, b) {
  const i = f.pieza[a];
  const j = f.pieza[b - 1];
  if (i === f.VIRTUAL || j === f.VIRTUAL) return null;
  const r = document.createRange();
  try {
    r.setStart(nodos[i], f.desde[a]);
    r.setEnd(nodos[j], f.desde[b - 1] + 1);
  } catch {
    return null;
  }
  return r;
}

// ---- Pintado ----

function limpiarResaltados() {
  for (const nombre of [...CSS.highlights.keys()]) if (nombre.startsWith("wr-sub-")) CSS.highlights.delete(nombre);
  pintados = [];
  huerfanos = [];
}

function pintar() {
  if (!soportado) return;
  limpiarResaltados();
  if (!activos() || !document.body) {
    pintarEstado();
    return;
  }
  const f = leerFlujo();
  const grupos = new Map();
  const notas = [];
  aproximados = [];
  for (const item of paginaItems) {
    const ancla = N.anclarTodo(f.texto, item);
    const rango = ancla && rangoDeTramo(f, ancla.a, ancla.b);
    if (!rango) {
      huerfanos.push(item);
      continue;
    }
    if (ancla.aprox) {
      const cita = N.citaDeTramo(f.texto, ancla.a, ancla.b);
      if (cita) aproximados.push({ item, cita });
    }
    pintados.push({ item, rango });
    if (!grupos.has(item.c)) grupos.set(item.c, []);
    grupos.get(item.c).push(rango);
    if (item.n) notas.push(rango);
  }
  // Un huérfano que ya se ubicó deja de mostrarse al instante (los nuevos esperan a que la página se asiente)
  if (huerfanosVisibles.length) huerfanosVisibles = huerfanosVisibles.filter((v) => huerfanos.some((h) => h.id === v.id));
  for (const [color, rangos] of grupos) CSS.highlights.set(`wr-sub-${color}`, new Highlight(...rangos));
  if (notas.length) CSS.highlights.set("wr-sub-nota", new Highlight(...notas));
  programarHuerfanos();
}

let temporizadorPintar = null;
function programarPintado(espera = 250) {
  sucioFlujo = true;
  clearTimeout(temporizadorPintar);
  temporizadorPintar = setTimeout(pintar, espera);
}

// Los huérfanos solo se muestran cuando la página se asienta (KaTeX, fragmentos
// descifrados, etc. tardan en llegar y un anclaje que falla ahora puede resolverse).
let temporizadorHuerfanos = null;
function programarHuerfanos() {
  clearTimeout(temporizadorHuerfanos);
  temporizadorHuerfanos = setTimeout(() => {
    if (document.readyState !== "complete" || document.querySelector('[data-privado-estado="cargando"]')) {
      programarHuerfanos();
      return;
    }
    huerfanosVisibles = huerfanos.slice();
    pintarEstado();
    emitir();
    confirmarAproximados();
  }, 1500);
}

// Ya con la página asentada, un anclaje aproximado se vuelve el texto exacto nuevo
// (así el siguiente repintado lo encuentra sin buscar de forma aproximada)
async function confirmarAproximados() {
  const lista = aproximados;
  aproximados = [];
  if (!sync || !activos()) return;
  for (const { item, cita } of lista) {
    const actual = paginaItems.find((x) => x.id === item.id);
    if (!actual || actual.t !== item.t) continue; // cambió mientras tanto
    await actualizar(actual, { e: cita.e, pre: cita.pre, suf: cita.suf });
  }
}

function recalcularPagina() {
  const p = pagina();
  paginaItems = (sync?.items() ?? []).filter((x) => x.p === p && !x.b);
  programarPintado(0);
}

// ---- Cambios (crear, editar, borrar) ----

const ahora = () => Date.now();

async function guardarItem(x) {
  if (!sync) return;
  await sync.aplicar(x);
}

function crear(cita, color, nota) {
  const item = {
    id: N.idNuevo(),
    p: pagina(),
    e: cita.e,
    pre: cita.pre,
    suf: cita.suf,
    c: color,
    t: ahora(),
  };
  if (nota) item.n = nota;
  return guardarItem(item);
}

function actualizar(item, cambios) {
  return guardarItem({ ...item, ...cambios, t: Math.max(ahora(), item.t + 1) });
}

function borrar(item) {
  return guardarItem(N.lapida(item, Math.max(ahora(), item.t + 1)));
}

// ---- Menú flotante ----

const SVG = {
  resaltador:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>',
  lapiz:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  basura:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
};

let menu = null;
let contexto = null; // { cita, item, color, ancla: { x, y, alto } }

function crearMenu() {
  menu = document.createElement("div");
  menu.className = "sub-ui sub-menu";
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-label", "Subrayar");
  menu.hidden = true;
  const colores = N.COLORES.map(
    (c) =>
      `<button type="button" class="sub-color" data-color="${c}" aria-pressed="false" aria-label="${NOMBRE_COLOR[c]}" title="${NOMBRE_COLOR[c]}" style="background:${COLOR_HEX[c]}"></button>`,
  ).join("");
  menu.innerHTML = `
    <div class="sub-menu__fila">${colores}<span class="sub-sep" aria-hidden="true"></span>
      <button type="button" class="sub-accion" data-accion="nota" aria-label="Nota" title="Nota">${SVG.lapiz}</button>
      <button type="button" class="sub-accion" data-accion="borrar" aria-label="Borrar subrayado" title="Borrar subrayado">${SVG.basura}</button>
    </div>
    <div class="sub-menu__nota" hidden>
      <textarea rows="3" maxlength="2000" placeholder="Nota (opcional)" aria-label="Nota"></textarea>
      <div class="sub-menu__botones"><button type="button" class="sub-menu__guardar" data-accion="guardar">Guardar</button></div>
    </div>
    <div class="sub-menu__reubicar" hidden>
      <button type="button" class="sub-menu__guardar" data-accion="reubicar">Reubicar aquí</button>
      <button type="button" class="sub-menu__cancelar" data-accion="cancelar-reubicar">Cancelar</button>
    </div>
    <p class="sub-menu__aviso" hidden></p>`;
  // No quitar la selección al tocar el menú (salvo en la nota, que necesita el foco)
  menu.addEventListener("mousedown", (e) => {
    if (!e.target.closest("textarea")) e.preventDefault();
  });
  menu.addEventListener("click", alMenu);
  menu.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && e.target.matches("textarea")) {
      e.preventDefault();
      guardarNota();
    }
  });
  document.documentElement.append(menu);
}

function notaEscrita() {
  return menu.querySelector("textarea").value.trim();
}

function pintarMenu() {
  const c = contexto;
  for (const b of menu.querySelectorAll(".sub-color")) b.setAttribute("aria-pressed", String(b.dataset.color === c.color));
  menu.querySelector('[data-accion="borrar"]').hidden = !c.item;
  menu.querySelector(".sub-menu__fila").hidden = !!c.reubicar;
  menu.querySelector(".sub-menu__reubicar").hidden = !c.reubicar;
  if (c.reubicar) menu.querySelector(".sub-menu__nota").hidden = true;
  const aviso = menu.querySelector(".sub-menu__aviso");
  aviso.hidden = !c.aviso;
  aviso.textContent = c.aviso ?? "";
  menu.querySelector(".sub-menu__fila").style.opacity = c.aviso ? ".5" : "";
}

function colocarMenu() {
  if (!menu || menu.hidden || !contexto) return;
  const { x, y, alto } = contexto.ancla;
  const ancho = menu.offsetWidth;
  const altoMenu = menu.offsetHeight;
  const tactil = window.matchMedia("(pointer: coarse)").matches;
  const margen = 8;
  const visibleArriba = y - window.scrollY - altoMenu - margen > 0;
  let arriba = !tactil && visibleArriba;
  const top = arriba ? y - altoMenu - margen : y + alto + margen + (tactil ? 24 : 0);
  const izq = Math.max(window.scrollX + margen, Math.min(x - ancho / 2, window.scrollX + window.innerWidth - ancho - margen));
  menu.style.top = `${Math.max(0, top)}px`;
  menu.style.left = `${izq}px`;
}

function abrirMenu(nuevoContexto) {
  if (!menu) crearMenu();
  contexto = nuevoContexto;
  const nota = menu.querySelector(".sub-menu__nota");
  const area = menu.querySelector("textarea");
  area.value = contexto.item?.n ?? "";
  nota.hidden = !contexto.item?.n;
  pintarMenu();
  menu.hidden = false;
  colocarMenu();
}

function cerrarMenu(limpiarSeleccion = false) {
  if (menu) menu.hidden = true;
  contexto = null;
  if (limpiarSeleccion) getSelection()?.removeAllRanges();
}

async function elegirColor(color) {
  const c = contexto;
  if (!c || c.aviso) return;
  const nota = menu.querySelector(".sub-menu__nota").hidden ? undefined : notaEscrita();
  if (c.item) {
    const cambios = { c: color };
    if (nota !== undefined) cambios.n = nota;
    cerrarMenu();
    await actualizar(c.item, cambios);
  } else {
    cerrarMenu(true);
    await crear(c.cita, color, nota);
  }
}

async function guardarNota() {
  const c = contexto;
  if (!c || c.aviso) return;
  const nota = notaEscrita();
  if (c.item) {
    cerrarMenu();
    await actualizar(c.item, { n: nota });
  } else {
    cerrarMenu(true);
    await crear(c.cita, c.color, nota);
  }
}

function alMenu(e) {
  const color = e.target.closest(".sub-color");
  if (color) {
    elegirColor(color.dataset.color);
    return;
  }
  const accion = e.target.closest("[data-accion]")?.dataset.accion;
  if (accion === "nota") {
    const caja = menu.querySelector(".sub-menu__nota");
    caja.hidden = !caja.hidden;
    colocarMenu();
    if (!caja.hidden) menu.querySelector("textarea").focus();
  } else if (accion === "guardar") {
    guardarNota();
  } else if (accion === "reubicar" && contexto?.reubicar && !contexto.aviso) {
    reubicarAqui(contexto);
  } else if (accion === "cancelar-reubicar") {
    cancelarReubicar();
  } else if (accion === "borrar" && contexto?.item) {
    const item = contexto.item;
    cerrarMenu();
    borrar(item);
  }
}

// ---- Selección y toques ----

let puntero = false;
let temporizadorSeleccion = null;

// Cita de la selección actual (o null) con su rectángulo de referencia
function citaDeSeleccion() {
  const sel = getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const foco = document.activeElement;
  if (foco?.matches?.("input,textarea,select")) return null; // lo editable en línea ya no aporta texto al flujo
  const rango = sel.getRangeAt(0);
  const f = flujoActual();
  let a = Infinity;
  let b = -1;
  for (let i = 0; i < nodos.length; i++) {
    const nodo = nodos[i];
    if (f.primero[i] < 0 || !rango.intersectsNode(nodo)) continue;
    const desde = nodo === rango.startContainer ? rango.startOffset : 0;
    const hasta = nodo === rango.endContainer ? rango.endOffset : nodo.data.length;
    if (desde >= hasta) continue;
    for (let k = f.primero[i]; k <= f.ultimo[i]; k++) {
      if (f.pieza[k] !== i) continue;
      const pos = f.desde[k];
      if (pos >= desde && pos < hasta) {
        if (k < a) a = k;
        if (k > b) b = k;
      }
    }
  }
  if (b < a) return null;
  const cita = N.citaDeTramo(f.texto, a, b + 1);
  if (!cita) return null;
  const ancla = N.anclar(f.texto, cita);
  const rect = ultimoRect(rango);
  return { cita, ambigua: !ancla || ancla.a !== cita.a, rect };
}

function ultimoRect(rango) {
  const rects = rango.getClientRects();
  const r = rects.length ? rects[rects.length - 1] : rango.getBoundingClientRect();
  return r;
}

function mostrarMenuSeleccion() {
  if (!activos()) return;
  if (menu && !menu.hidden && menu.contains(document.activeElement)) return;
  const s = citaDeSeleccion();
  if (!s) {
    if (menu && !menu.hidden && !contexto?.item) cerrarMenu();
    return;
  }
  const r = s.rect;
  abrirMenu({
    cita: s.cita,
    item: null,
    reubicar: reubicando,
    color: N.COLORES[0],
    aviso: s.ambigua ? "Ese fragmento se repite en la página: amplía la selección." : "",
    ancla: { x: r.left + r.width / 2 + window.scrollX, y: r.top + window.scrollY, alto: r.height },
  });
}

document.addEventListener("selectionchange", () => {
  if (!activos()) return;
  clearTimeout(temporizadorSeleccion);
  if (puntero) return;
  temporizadorSeleccion = setTimeout(mostrarMenuSeleccion, 300);
});
document.addEventListener("pointerdown", (e) => {
  if (e.target.closest?.(".sub-ui")) return;
  puntero = true;
  if (menu && !menu.hidden) cerrarMenu();
  if (panel && !panel.hidden && !e.target.closest(".sub-estado")) panel.hidden = true;
});
document.addEventListener("pointerup", (e) => {
  puntero = false;
  if (!activos() || e.target.closest?.(".sub-ui")) return;
  clearTimeout(temporizadorSeleccion);
  temporizadorSeleccion = setTimeout(() => {
    if (!getSelection()?.isCollapsed) mostrarMenuSeleccion();
  }, 30);
});
document.addEventListener("pointercancel", () => {
  puntero = false;
});
document.addEventListener("keyup", (e) => {
  if (!activos() || !e.shiftKey) return;
  clearTimeout(temporizadorSeleccion);
  temporizadorSeleccion = setTimeout(mostrarMenuSeleccion, 300);
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (menu && !menu.hidden) cerrarMenu();
  else if (reubicando) cancelarReubicar();
  else if (listaVista && !listaVista.hidden) listaVista.hidden = true;
});

// Tocar un subrayado existente abre su menú
document.addEventListener("click", (e) => {
  if (!activos() || !getSelection()?.isCollapsed) return;
  if (e.target.closest?.(".sub-ui, a, button, input, textarea, select, summary")) return;
  const x = e.clientX;
  const y = e.clientY;
  let golpe = null;
  for (const p of pintados) {
    const caja = p.rango.getBoundingClientRect();
    if (x < caja.left - 1 || x > caja.right + 1 || y < caja.top - 1 || y > caja.bottom + 1) continue;
    for (const r of p.rango.getClientRects()) {
      if (x >= r.left - 1 && x <= r.right + 1 && y >= r.top - 1 && y <= r.bottom + 1) {
        if (!golpe || p.item.t > golpe.t) golpe = p.item;
        break;
      }
    }
  }
  if (!golpe) return;
  abrirMenu({
    cita: null,
    item: golpe,
    color: golpe.c,
    aviso: "",
    ancla: { x: x + window.scrollX, y: y + window.scrollY - 8, alto: 16 },
  });
});

window.addEventListener("resize", colocarMenu);

// ---- Botón en .ajustes ----

let flotante = null;

function ponerBoton(lugar) {
  let boton = lugar.querySelector("[data-subrayados-accion]");
  if (!boton) {
    boton = document.createElement("button");
    boton.type = "button";
    boton.className = "ajuste sub-boton";
    boton.dataset.subrayadosAccion = "alternar";
    boton.innerHTML = `${SVG.resaltador}<span class="sub-boton__estado" aria-hidden="true"></span>`;
    boton.addEventListener("click", () => establecer(!activos()));
    const sesionBoton = lugar.querySelector(".sesion-boton");
    if (sesionBoton) sesionBoton.after(boton);
    else lugar.prepend(boton);
  }
  return boton;
}

const textoEstado = {
  sincronizado: "sincronizado",
  sincronizando: "sincronizando",
  "sin-conexion": "sin conexión",
  error: "error de sincronización",
};

function pintarBotones() {
  if (!soportado || enMarco) return;
  const lugares = [...document.querySelectorAll(".ajustes")];
  if (!lugares.length && document.body) {
    // Páginas sin .ajustes (p. ej. libros sin encabezado del sitio): un botón flotante
    if (!flotante) {
      flotante = document.createElement("div");
      flotante.className = "sub-ui sub-flotante";
      document.body.append(flotante);
    }
    lugares.push(flotante);
  }
  const { estado, detalle } = estadoSync();
  const con = sesion.activa();
  const encendido = activos();
  for (const lugar of lugares) {
    const boton = ponerBoton(lugar);
    boton.hidden = !con;
    if (lugar === flotante) lugar.hidden = !con;
    boton.setAttribute("aria-pressed", String(encendido));
    boton.dataset.estado = estado;
    const texto = `Subrayados ${encendido ? "activos" : "apagados"} (${textoEstado[estado]}${detalle && estado === "error" ? `: ${detalle}` : ""}). ${encendido ? "Apagar" : "Prender"}`;
    boton.title = texto;
    boton.setAttribute("aria-label", texto);
  }
}

function establecer(valor) {
  prefMemoria = valor ? "1" : "0";
  guardarPref(prefMemoria);
  aplicar();
}

// ---- Estado visible y huérfanos ----

let pastilla = null;
let panel = null;

function pintarEstado() {
  pintarBotones();
  const { estado, detalle } = estadoSync();
  const visible = activos() && (estado !== "sincronizado" || huerfanosVisibles.length > 0);
  if (!visible) {
    if (pastilla) pastilla.hidden = true;
    if (panel) panel.hidden = true;
    return;
  }
  if (!pastilla) {
    pastilla = document.createElement("button");
    pastilla.type = "button";
    pastilla.className = "sub-ui sub-estado";
    pastilla.addEventListener("click", () => {
      const { estado: e } = estadoSync();
      if (huerfanosVisibles.length) abrirPanel();
      else if (e === "error" || e === "sin-conexion") sync?.sincronizar();
    });
    document.body.append(pastilla);
  }
  const partes = [];
  if (estado === "sincronizando") partes.push("Sincronizando subrayados…");
  else if (estado === "sin-conexion") partes.push("Sin conexión: los subrayados se guardan en este equipo");
  else if (estado === "error") partes.push(detalle || "Error al sincronizar subrayados");
  if (huerfanosVisibles.length) {
    const n = huerfanosVisibles.length;
    partes.push(`${n} subrayado${n === 1 ? "" : "s"} sin ubicar`);
  }
  pastilla.textContent = partes.join(" · ");
  pastilla.hidden = false;
  if (panel && !panel.hidden) pintarPanel();
}

function abrirPanel() {
  if (!panel) {
    panel = document.createElement("div");
    panel.className = "sub-ui sub-panel";
    panel.hidden = true;
    panel.addEventListener("click", (e) => {
      const idR = e.target.closest("[data-reubicar]")?.dataset.reubicar;
      const aReubicar = huerfanosVisibles.find((x) => x.id === idR);
      if (aReubicar) {
        panel.hidden = true;
        iniciarReubicar(aReubicar);
        return;
      }
      const id = e.target.closest("[data-borrar]")?.dataset.borrar;
      const item = huerfanosVisibles.find((x) => x.id === id);
      if (item) {
        huerfanosVisibles = huerfanosVisibles.filter((x) => x.id !== id);
        borrar(item);
      }
    });
    document.body.append(panel);
  }
  panel.hidden = !panel.hidden;
  if (!panel.hidden) pintarPanel();
}

function pintarPanel() {
  panel.textContent = "";
  const titulo = document.createElement("h2");
  titulo.textContent = "Subrayados sin ubicar";
  const nota = document.createElement("p");
  nota.textContent = "El texto cambió o aún no carga. Se conservan; puedes borrarlos.";
  const lista = document.createElement("ul");
  for (const x of huerfanosVisibles) {
    const li = document.createElement("li");
    li.style.setProperty("--c", COLOR_HEX[x.c]);
    const cita = document.createElement("q");
    cita.textContent = x.e.length > 160 ? `${x.e.slice(0, 160)}…` : x.e;
    li.append(cita);
    if (x.n) {
      const n = document.createElement("p");
      n.textContent = x.n;
      li.append(n);
    }
    const fila = document.createElement("div");
    fila.className = "sub-panel__acciones";
    const r = document.createElement("button");
    r.type = "button";
    r.dataset.reubicar = x.id;
    r.textContent = "Reubicar";
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.borrar = x.id;
    b.textContent = "Borrar";
    fila.append(r, b);
    li.append(fila);
    lista.append(li);
  }
  panel.append(titulo, nota, lista);
  if (!huerfanosVisibles.length) panel.hidden = true;
}

// ---- Reubicar a mano ----

let aviso = null;

function iniciarReubicar(item) {
  reubicando = item;
  if (!aviso) {
    aviso = document.createElement("div");
    aviso.className = "sub-ui sub-aviso";
    aviso.setAttribute("role", "status");
    document.body.append(aviso);
  }
  const cita = item.e.length > 60 ? `${item.e.slice(0, 60)}…` : item.e;
  aviso.textContent = `Selecciona el texto nuevo para «${cita}». Esc cancela.`;
  aviso.hidden = false;
}

function cancelarReubicar() {
  reubicando = null;
  if (aviso) aviso.hidden = true;
  if (menu && !menu.hidden && contexto?.reubicar) cerrarMenu();
}

async function reubicarAqui(c) {
  const item = c.reubicar;
  const cita = c.cita;
  cancelarReubicar();
  cerrarMenu(true);
  await actualizar(item, { p: pagina(), e: cita.e, pre: cita.pre, suf: cita.suf });
}

// ---- Mis subrayados: lista y búsqueda de todo el sitio ----

let listaVista = null;

const plano = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Enlace a la página con fragmento de texto (#:~:text=), que lleva al pasaje
function enlaceDe(x) {
  const frag = x.e.trim().slice(0, 60).trim();
  const url = new URL(`${BASE}${x.p}`, location.origin);
  return `${url.origin}${url.pathname}#:~:text=${encodeURIComponent(frag).replace(/-/g, "%2D")}`;
}

function pintarLista() {
  const consulta = plano(listaVista.querySelector("input").value.trim());
  const cuerpo = listaVista.querySelector(".sub-lista__cuerpo");
  cuerpo.textContent = "";
  const todos = (sync?.items() ?? []).filter((x) => !x.b);
  const visibles = todos
    .filter((x) => !consulta || plano(`${x.e} ${x.n ?? ""} ${x.p}`).includes(consulta))
    .sort((a, b) => (a.p < b.p ? -1 : a.p > b.p ? 1 : a.t - b.t));
  listaVista.querySelector(".sub-lista__cuenta").textContent = `${visibles.length} de ${todos.length}`;
  if (!visibles.length) {
    const vacio = document.createElement("p");
    vacio.className = "sub-lista__vacio";
    vacio.textContent = todos.length ? "Nada coincide con la búsqueda." : "Aún no hay subrayados.";
    cuerpo.append(vacio);
    return;
  }
  let paginaActual = null;
  let ul = null;
  for (const x of visibles) {
    if (x.p !== paginaActual) {
      paginaActual = x.p;
      const h = document.createElement("h3");
      const a = document.createElement("a");
      a.href = new URL(`${BASE}${x.p}`, location.origin).href;
      a.textContent = x.p || "Portada";
      h.append(a);
      ul = document.createElement("ul");
      cuerpo.append(h, ul);
    }
    const li = document.createElement("li");
    li.style.setProperty("--c", COLOR_HEX[x.c]);
    const cita = document.createElement("a");
    cita.className = "sub-lista__cita";
    cita.href = enlaceDe(x);
    cita.textContent = x.e.length > 240 ? `${x.e.slice(0, 240)}…` : x.e;
    li.append(cita);
    if (x.n) {
      const n = document.createElement("p");
      n.textContent = x.n;
      li.append(n);
    }
    const borrarBoton = document.createElement("button");
    borrarBoton.type = "button";
    borrarBoton.dataset.borrar = x.id;
    borrarBoton.textContent = "Borrar";
    li.append(borrarBoton);
    ul.append(li);
  }
}

function abrirLista() {
  if (!activos()) return;
  if (!listaVista) {
    listaVista = document.createElement("div");
    listaVista.className = "sub-ui sub-lista";
    listaVista.setAttribute("role", "dialog");
    listaVista.setAttribute("aria-label", "Mis subrayados");
    listaVista.hidden = true;
    listaVista.innerHTML = `
      <div class="sub-lista__caja">
        <div class="sub-lista__cabeza">
          <h2>Mis subrayados</h2>
          <span class="sub-lista__cuenta"></span>
          <button type="button" class="sub-lista__cerrar" data-cerrar aria-label="Cerrar">&times;</button>
        </div>
        <input type="search" placeholder="Buscar en textos, notas y páginas" aria-label="Buscar subrayados" autocomplete="off">
        <div class="sub-lista__cuerpo"></div>
      </div>`;
    listaVista.addEventListener("click", (e) => {
      if (e.target === listaVista || e.target.closest("[data-cerrar]")) {
        listaVista.hidden = true;
        return;
      }
      const id = e.target.closest("[data-borrar]")?.dataset.borrar;
      const item = sync?.items().find((x) => x.id === id);
      if (item) borrar(item).then(pintarLista);
    });
    listaVista.querySelector("input").addEventListener("input", pintarLista);
    document.documentElement.append(listaVista);
  }
  listaVista.hidden = false;
  pintarLista();
  listaVista.querySelector("input").focus();
}

// «Mis subrayados» en el panel de sesión (sesion.mjs emite el evento al pintarlo)
document.addEventListener("wr:panel-sesion", (e) => {
  if (!soportado || enMarco || !sesion.activa()) return;
  const panelSesion = e.detail.panel;
  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = "Mis subrayados";
  boton.addEventListener("click", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); // cierra el panel de sesión
    abrirLista();
  });
  panelSesion.querySelector(".sesion-panel__salir")?.before(boton);
});

// ---- Sincronización ----

async function conectar() {
  const mia = ++generacion;
  const llave = sesion.llave();
  if (!llave) return;
  let token = null;
  try {
    const r = await fetch(URL_ACCESO, { cache: "no-cache" });
    if (r.ok) {
      const acceso = await r.json();
      if (acceso.token) token = await L.abrirSecreto(acceso.token, llave);
    }
  } catch {
    /* sin red o token ilegible: se trabaja en local */
  }
  if (mia !== generacion) return;
  coord?.cerrar();
  coord = C.crearCoordinador();
  const nuevo = S.crearSincronizador({
    llave,
    token,
    coordinador: coord,
    almacen: S.almacenIndexedDB(),
    alCambiar: (tipo) => {
      if (mia !== generacion) return;
      if (tipo === "datos") {
        recalcularPagina();
        if (listaVista && !listaVista.hidden) pintarLista();
      }
      aplicarEstado();
    },
  });
  await nuevo.iniciar();
  if (mia !== generacion) return;
  sync = nuevo;
  recalcularPagina();
  sync.arrancar();
  aplicarEstado();
}

function desconectar() {
  generacion++;
  sync?.detener();
  sync = null;
  coord?.cerrar();
  coord = null;
  cancelarReubicar();
  if (listaVista) listaVista.hidden = true;
  paginaItems = [];
  huerfanosVisibles = [];
}

function aplicarEstado() {
  marcar();
  pintarEstado();
}

// Estado general: se llama al cambiar la sesión o la preferencia
function aplicar() {
  marcar();
  if (!activos()) {
    cerrarMenu();
    limpiarResaltados();
    huerfanosVisibles = [];
  } else {
    programarPintado(0);
  }
  pintarEstado();
}

// ---- Arranque ----

function observar() {
  const observador = new MutationObserver((registros) => {
    for (const r of registros) {
      const el = r.target.nodeType === Node.ELEMENT_NODE ? r.target : r.target.parentElement;
      if (el && !el.closest(N.SELECTOR_EXCLUIDO)) {
        programarPintado(300);
        return;
      }
    }
  });
  observador.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function iniciar() {
  if (!soportado || enMarco) {
    raiz.dataset.subrayados = "apagados";
    return;
  }
  inyectarEstilo();
  observar();
  document.addEventListener("wr:privado", () => programarPintado(50));
  window.addEventListener("storage", (e) => {
    if (e.key === CLAVE_PREF || e.key === null) aplicar();
  });
  window.addEventListener("online", () => {
    // Si faltó el token por falta de red, se vuelve a pedir al volver
    if (sesion.activa() && sync && !sync.conectado()) conectar();
  });
  sesion.alCambiar(({ activa }) => {
    if (activa) conectar();
    else desconectar();
    aplicar();
  });
  aplicar();
  if (sesion.activa()) conectar();
}

export const subrayados = {
  activos,
  establecer,
  alternar: () => establecer(!activos()),
  items: () => paginaItems.slice(),
  todos: () => (sync?.items() ?? []).filter((x) => !x.b),
  abrirLista,
  estado: () => estadoSync().estado,
  alCambiar(fn) {
    const oyente = (e) => fn(e.detail);
    document.addEventListener("wr:subrayados", oyente);
    return () => document.removeEventListener("wr:subrayados", oyente);
  },
};

window.WRSubrayados = subrayados;

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
else iniciar();
