// ============================================================
//  Registro de accesos (zona general)
// ============================================================
//
// Cada inicio de sesión (evento «wr:inicio-sesion» de js/sesion.mjs) guarda una
// entrada cifrada en `accesos.enc` (rama `subrayados`, con el mismo token de
// GitHub que usan los subrayados). Si no hay red, queda en cola cifrada en
// IndexedDB y se envía al recuperar la conexión.
//
// La interfaz («Registro de accesos», en el panel de sesión) solo aparece para
// el dueño (wolfgang). Lo carga js/tema.js en todas las páginas.

import { sesion } from "./sesion.mjs";
import * as L from "./llaves.mjs";
import * as S from "./subrayados-sync.mjs";
import {
  RUTA_ACCESOS,
  esDueno,
  resumirDispositivo,
  crearRegistro,
  mezclarRegistros,
  cifrarRegistros,
  descifrarRegistros,
  sincronizarAccesos,
} from "./accesos-nucleo.mjs";

const URL_ACCESO = new URL("../datos/acceso.json", import.meta.url);
const BASE = new URL("../", import.meta.url).pathname;

const enMarco = (() => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
})();

// ---- Estilos propios (la página puede no cargar css/styles.css) ----

const CSS_PROPIO = `
.acc-ui{font:400 .85rem/1.4 var(--font-texto,system-ui,-apple-system,"Segoe UI",sans-serif);color:var(--text,#28282e)}
.acc-lista{position:fixed;inset:0;z-index:1300;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.4)}
.acc-lista[hidden]{display:none}
.acc-lista__caja{display:grid;grid-template-rows:auto auto auto 1fr;gap:10px;width:min(720px,100%);max-height:min(80vh,720px);padding:16px;
  background:var(--surface,#f1ead5);border:1px solid var(--border-card,#ded4b2);border-radius:var(--radius,8px);box-shadow:var(--shadow-hover,0 6px 18px rgba(0,0,0,.25))}
.acc-lista__cabeza{display:flex;align-items:center;gap:8px}
.acc-lista__cabeza h2{margin:0;font-size:1rem;flex:1}
.acc-lista__cuenta{color:var(--muted,#5a5a61);font-size:.78rem}
.acc-lista__accion{min-height:0;padding:4px 10px;font:inherit;font-size:.78rem;color:var(--text,#28282e);background:transparent;
  border:1px solid var(--border-strong,#c6ba93);border-radius:6px;cursor:pointer}
.acc-lista__accion:hover{background:var(--surface-2,#ece4ca)}
.acc-lista__accion:disabled{opacity:.55;cursor:default}
.acc-lista__cerrar{min-height:0;width:28px;height:28px;padding:0;font-size:1.3rem;line-height:1;color:var(--text,#28282e);background:transparent;border:0;border-radius:6px;cursor:pointer}
.acc-lista input[type="search"]{width:100%;box-sizing:border-box;padding:8px 10px;font:inherit;color:var(--text,#28282e);background:var(--bg,#fff);
  border:1px solid var(--border-strong,#c6ba93);border-radius:6px}
.acc-lista__aviso{margin:0;color:var(--muted,#5a5a61);font-size:.8rem}
.acc-lista__aviso[hidden]{display:none}
.acc-lista__cuerpo{overflow:auto;display:grid;gap:8px;align-content:start}
.acc-lista__cuerpo ul{display:grid;gap:8px;margin:0;padding:0;list-style:none}
.acc-lista__cuerpo li{display:grid;gap:4px;padding:8px 10px;border-left:4px solid var(--accent,#b12d6c);background:var(--bg,#fff);border-radius:4px}
.acc-lista__fila{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 12px}
.acc-lista__usuario{font-weight:600;color:var(--text-strong,#1d1d22)}
.acc-lista__fecha{font-family:var(--font-mono,ui-monospace,monospace);font-size:.76rem;color:var(--muted,#5a5a61)}
.acc-lista__meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:.78rem;color:var(--muted,#5a5a61)}
.acc-lista__pagina{color:var(--text,#28282e);text-decoration:none;overflow-wrap:anywhere}
.acc-lista__pagina:hover{text-decoration:underline}
.acc-lista__marca{padding:1px 6px;font-size:.72rem;border:1px solid var(--border-strong,#c6ba93);border-radius:999px;color:var(--muted,#5a5a61)}
.acc-lista__vacio{margin:8px 0;color:var(--muted,#5a5a61)}
@media print{.acc-ui{display:none!important}}
`;

function inyectarEstilo() {
  if (document.getElementById("acc-estilo")) return;
  const estilo = document.createElement("style");
  estilo.id = "acc-estilo";
  estilo.textContent = CSS_PROPIO;
  document.head.append(estilo);
}

// ---- Almacén local cifrado y sincronización ----

const almacen = S.almacenIndexedDB("wr-accesos");
let tokenMemoria = null;
let llaveToken = null;
let cola = Promise.resolve();
let registrosCache = [];
let listaVista = null;

function encolar(fn) {
  const tarea = cola.then(fn, fn);
  cola = tarea.catch(() => {});
  return tarea;
}

async function obtenerToken(llave) {
  if (!llave) return null;
  if (tokenMemoria && llaveToken === llave) return tokenMemoria;
  try {
    const r = await fetch(URL_ACCESO, { cache: "no-cache" });
    if (!r.ok) return null;
    const acceso = await r.json();
    if (!acceso.token) return null;
    tokenMemoria = await L.abrirSecreto(acceso.token, llave);
    llaveToken = llave;
    return tokenMemoria;
  } catch {
    return null;
  }
}

async function leerPendientes(llave) {
  try {
    const g = await almacen.leer();
    if (!g?.cifrado) return [];
    return await descifrarRegistros(g.cifrado, llave);
  } catch {
    await almacen.borrar();
    return [];
  }
}

async function guardarPendientes(lista, llave) {
  try {
    if (!lista.length) {
      await almacen.borrar();
      return;
    }
    await almacen.escribir({ cifrado: await cifrarRegistros(lista, llave) });
  } catch {
    /* sin IndexedDB: el registro se intenta directo en red */
  }
}

function clientePara(token) {
  return S.clienteGitHub({ token, ruta: RUTA_ACCESOS, mensaje: "Registra acceso" });
}

// Sube los registros pendientes (y opcionalmente agrega uno nuevo)
function subirPendientes(nuevo = null) {
  return encolar(async () => {
    const llave = sesion.llave();
    if (!llave) return null;
    const actuales = await leerPendientes(llave);
    const pendientes = nuevo ? mezclarRegistros(actuales, [nuevo]) : actuales;
    if (nuevo) await guardarPendientes(pendientes, llave);
    if (!pendientes.length) return null;

    const token = await obtenerToken(llave);
    if (!token) return null;
    try {
      const { registros } = await sincronizarAccesos({ cliente: clientePara(token), llave, nuevos: pendientes });
      registrosCache = registros;
      const enviados = new Set(pendientes.map((x) => x.id));
      const restantes = (await leerPendientes(llave)).filter((x) => !enviados.has(x.id));
      await guardarPendientes(restantes, llave);
      if (listaVista && !listaVista.hidden) pintarLista();
      return registros;
    } catch {
      /* sin red o error temporal: quedan guardados cifrados en IndexedDB */
      return null;
    }
  });
}

// ---- Interfaz: solo visible para el dueño (wolfgang) ----

const plano = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const formatoFecha = (() => {
  try {
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return null;
  }
})();

function formatearFecha(ms) {
  const fecha = new Date(ms);
  return formatoFecha ? formatoFecha.format(fecha) : fecha.toLocaleString();
}

function pintarAviso(texto = "") {
  if (!listaVista) return;
  const el = listaVista.querySelector(".acc-lista__aviso");
  el.textContent = texto;
  el.hidden = !texto;
}

function pintarLista() {
  if (!listaVista) return;
  const consulta = plano(listaVista.querySelector("input").value.trim());
  const cuerpo = listaVista.querySelector(".acc-lista__cuerpo");
  cuerpo.textContent = "";

  const visibles = registrosCache.filter(
    (x) => !consulta || plano(`${x.u} ${x.p || "portada"} ${x.d}`).includes(consulta),
  );
  listaVista.querySelector(".acc-lista__cuenta").textContent = `${visibles.length} de ${registrosCache.length}`;

  if (!visibles.length) {
    const vacio = document.createElement("p");
    vacio.className = "acc-lista__vacio";
    vacio.textContent = registrosCache.length ? "Nada coincide con la búsqueda." : "Aún no hay inicios de sesión registrados.";
    cuerpo.append(vacio);
    return;
  }

  const ul = document.createElement("ul");
  for (const x of visibles) {
    const li = document.createElement("li");

    const fila = document.createElement("div");
    fila.className = "acc-lista__fila";
    const usuario = document.createElement("span");
    usuario.className = "acc-lista__usuario";
    usuario.textContent = x.u;
    const fecha = document.createElement("span");
    fecha.className = "acc-lista__fecha";
    fecha.textContent = formatearFecha(x.t);
    fecha.title = new Date(x.t).toISOString();
    fila.append(usuario, fecha);

    const meta = document.createElement("div");
    meta.className = "acc-lista__meta";
    const pagina = document.createElement("a");
    pagina.className = "acc-lista__pagina";
    pagina.href = new URL(`${BASE}${x.p}`, location.origin).href;
    pagina.textContent = x.p || "Portada";
    meta.append(pagina);

    if (x.d) {
      const disp = document.createElement("span");
      disp.textContent = x.d;
      meta.append(disp);
    }
    if (x.r) {
      const marca = document.createElement("span");
      marca.className = "acc-lista__marca";
      marca.textContent = "Recordado";
      meta.append(marca);
    }

    li.append(fila, meta);
    ul.append(li);
  }
  cuerpo.append(ul);
}

async function cargarLista() {
  if (!esDueno(sesion.usuario())) return;
  const llave = sesion.llave();
  if (!llave) return;
  const boton = listaVista?.querySelector("[data-actualizar]");
  if (boton) boton.disabled = true;
  pintarAviso("Cargando registro…");

  try {
    await subirPendientes();
    const pendientes = await leerPendientes(llave);
    const token = await obtenerToken(llave);
    if (!token) {
      registrosCache = pendientes;
      pintarAviso("No hay token de GitHub disponible para leer el registro remoto.");
      pintarLista();
      return;
    }
    const { registros } = await sincronizarAccesos({ cliente: clientePara(token), llave });
    registrosCache = mezclarRegistros(registros, pendientes);
    pintarAviso(pendientes.length ? "Hay registros locales pendientes de sincronizar." : "");
    pintarLista();
  } catch (err) {
    const pendientes = await leerPendientes(llave);
    registrosCache = mezclarRegistros(registrosCache, pendientes);
    pintarAviso(err?.message || "No se pudo leer el registro de accesos.");
    pintarLista();
  } finally {
    if (boton) boton.disabled = false;
  }
}

function abrirLista() {
  if (enMarco || !sesion.activa() || !esDueno(sesion.usuario())) return;
  inyectarEstilo();
  if (!listaVista) {
    listaVista = document.createElement("div");
    listaVista.className = "acc-ui acc-lista";
    listaVista.setAttribute("role", "dialog");
    listaVista.setAttribute("aria-label", "Registro de accesos");
    listaVista.hidden = true;
    listaVista.innerHTML = `
      <div class="acc-lista__caja">
        <div class="acc-lista__cabeza">
          <h2>Registro de accesos</h2>
          <span class="acc-lista__cuenta"></span>
          <button type="button" class="acc-lista__accion" data-actualizar>Actualizar</button>
          <button type="button" class="acc-lista__cerrar" data-cerrar aria-label="Cerrar">&times;</button>
        </div>
        <input type="search" placeholder="Buscar por usuario, página o dispositivo" aria-label="Buscar accesos" autocomplete="off">
        <p class="acc-lista__aviso" hidden></p>
        <div class="acc-lista__cuerpo"></div>
      </div>`;
    listaVista.addEventListener("click", (e) => {
      if (e.target === listaVista || e.target.closest("[data-cerrar]")) {
        listaVista.hidden = true;
        return;
      }
      if (e.target.closest("[data-actualizar]")) cargarLista();
    });
    listaVista.querySelector("input").addEventListener("input", pintarLista);
    document.documentElement.append(listaVista);
  }
  listaVista.hidden = false;
  pintarLista();
  listaVista.querySelector("input").focus();
  cargarLista();
}

function agregarBotonEnPanel(panelSesion) {
  if (enMarco || !sesion.activa() || !esDueno(sesion.usuario())) return;
  if (!panelSesion || panelSesion.querySelector("[data-accesos-abrir]")) return;
  const boton = document.createElement("button");
  boton.type = "button";
  boton.dataset.accesosAbrir = "";
  boton.textContent = "Registro de accesos";
  boton.addEventListener("click", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    abrirLista();
  });
  panelSesion.querySelector(".sesion-panel__salir")?.before(boton);
}

// ---- Eventos y arranque ----

document.addEventListener("wr:inicio-sesion", (e) => {
  if (enMarco || !sesion.activa()) return;
  const registro = crearRegistro({
    usuario: e.detail?.usuario ?? sesion.usuario(),
    pagina: location.pathname,
    base: BASE,
    recordar: !!e.detail?.recordar,
    dispositivo: resumirDispositivo(navigator.userAgent),
  });
  subirPendientes(registro);
});

document.addEventListener("wr:panel-sesion", (e) => {
  agregarBotonEnPanel(e.detail?.panel);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && listaVista && !listaVista.hidden) listaVista.hidden = true;
});

window.addEventListener("online", () => {
  if (sesion.activa()) subirPendientes();
});

sesion.alCambiar(({ activa }) => {
  if (!activa) {
    tokenMemoria = null;
    llaveToken = null;
    registrosCache = [];
    if (listaVista) listaVista.hidden = true;
  } else {
    subirPendientes();
  }
});

function iniciar() {
  const panelAbierto = document.querySelector(".sesion-panel:not([hidden])");
  if (panelAbierto) agregarBotonEnPanel(panelAbierto);
  if (sesion.activa()) subirPendientes();
}

export const accesos = {
  abrir: abrirLista,
};

window.WRAccesos = accesos;

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
else iniciar();
