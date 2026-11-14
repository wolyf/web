// ============================================================
//  Sesión del sitio (zona general)
// ============================================================
//
// Inicio de sesión discreto en el encabezado de cada página y partes
// privadas («censuradas») que solo se ven con la sesión iniciada.
//
// Lo carga js/tema.js en todas las páginas: los proyectos no tienen que
// agregar nada. El botón aparece al principio de cada `.ajustes` (junto a
// los de tema y acento), o donde haya un [data-sesion-lugar], con un punto
// de estado:
//   ○ sin sesión          ● sesión iniciada (color de acento)
//
// Partes privadas en el HTML de cualquier página:
//
//   <div data-privado="privado/notas.enc" data-lineas="4"></div>
//       Fragmento cifrado (lo genera «npm run sesion -- sellar»). Sin
//       sesión se ve tachado; con sesión se descifra y se inserta aquí.
//       Al insertarlo se dispara el evento «wr:privado» en el elemento.
//
//   <p data-solo-sesion>…</p>   solo con sesión     (cosmético: el texto
//   <p data-sin-sesion>…</p>    solo sin sesión      sigue en el HTML)
//
// Desde el JavaScript de un proyecto:
//
//   import { sesion } from "../js/sesion.mjs";
//   sesion.activa()               ¿hay sesión?
//   sesion.usuario()              nombre con el que se entró
//   await sesion.llaveProyecto(id) llave propia del proyecto (o null)
//   await sesion.descifrar(bytes)  texto de un fragmento .enc
//   sesion.llave()                 CryptoKey HKDF no extraíble de la llave del sitio (para módulos
//                                  del sitio, como js/subrayados.mjs; null sin sesión)
//   sesion.alCambiar(fn)           avisa al entrar o salir; devuelve cómo dejar de escuchar
//   sesion.abrir()                 muestra el formulario de inicio de sesión
//
// También queda en window.WRSesion y se emite «wr:sesion» en document. Con la sesión
// iniciada, al pintar el panel se emite «wr:panel-sesion» (detail.panel) para que otros
// módulos del sitio agreguen botones.

import * as L from "./llaves.mjs";

const URL_ACCESO = new URL("../datos/acceso.json", import.meta.url);
const raiz = document.documentElement;

// ---- Estado guardado ----
//
// La llave del sitio K se guarda como CryptoKey HKDF **no extraíble** en
// IndexedDB (no como texto en localStorage ni sessionStorage): un script de la
// página puede pedirle derivaciones, pero no leer sus bytes.
//   - Sin «Recordarme»: el registro pertenece a esta pestaña (un identificador
//     en sessionStorage) y se pierde al cerrarla.
//   - Con «Recordarme»: registro persistente de este navegador.
// En localStorage o sessionStorage solo queda una marca sin secretos
// (CLAVE_MARCA) para que js/tema.js sepa el estado antes de pintar.

const CLAVE_MARCA = "wr-sesion-activa";
const CLAVE_PESTANA = "wr-pestana";
const BD = "wr-sesion";
const ALMACEN = "llaves";
const REGISTRO_PERSISTENTE = "persistente";

const almacenWeb = (nombre) => {
  try {
    return window[nombre] ?? null;
  } catch {
    return null; // almacenamiento bloqueado
  }
};

function idPestana() {
  const s = almacenWeb("sessionStorage");
  try {
    let id = s?.getItem(CLAVE_PESTANA);
    if (!id) {
      id = L.aHex(L.aleatorio(16));
      s?.setItem(CLAVE_PESTANA, id);
    }
    return id;
  } catch {
    return null;
  }
}

function abrirBD() {
  return new Promise((ok, mal) => {
    if (!window.indexedDB) return mal(new Error("Sin IndexedDB"));
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ALMACEN);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}

// Ejecuta fn(almacén) en una transacción y devuelve su resultado
async function enBD(modo, fn) {
  const bd = await abrirBD();
  try {
    return await new Promise((ok, mal) => {
      const t = bd.transaction(ALMACEN, modo);
      const peticion = fn(t.objectStore(ALMACEN));
      t.oncomplete = () => ok(peticion?.result);
      t.onerror = t.onabort = () => mal(t.error);
    });
  } finally {
    bd.close();
  }
}

const clavePestana = () => {
  const id = idPestana();
  return id ? `pestana:${id}` : null;
};

async function leerGuardada() {
  const claves = [clavePestana(), REGISTRO_PERSISTENTE].filter(Boolean);
  for (const clave of claves) {
    try {
      const s = await enBD("readonly", (a) => a.get(clave));
      if (s?.llave && s?.usuario) return { usuario: s.usuario, llave: s.llave, huella: s.huella, recordar: clave === REGISTRO_PERSISTENTE };
    } catch {
      /* sin registro o sin IndexedDB */
    }
  }
  return null;
}

async function guardar(s, recordar) {
  await borrarGuardada();
  const marca = almacenWeb(recordar ? "localStorage" : "sessionStorage");
  try {
    marca?.setItem(CLAVE_MARCA, "1");
  } catch {
    /* sin almacenamiento */
  }
  const clave = recordar ? REGISTRO_PERSISTENTE : clavePestana();
  if (!clave) return;
  try {
    await enBD("readwrite", (a) => a.put({ usuario: s.usuario, llave: s.llave, huella: s.huella }, clave));
  } catch {
    /* sin IndexedDB: la sesión dura lo que dure la página */
  }
}

async function borrarGuardada() {
  for (const nombre of ["sessionStorage", "localStorage"]) {
    try {
      almacenWeb(nombre)?.removeItem(CLAVE_MARCA);
      almacenWeb(nombre)?.removeItem("wr-sesion"); // formato anterior, con la llave en texto
    } catch {
      /* nada que borrar */
    }
  }
  try {
    const pestana = clavePestana();
    await enBD("readwrite", (a) => {
      a.delete(REGISTRO_PERSISTENTE);
      if (pestana) a.delete(pestana);
    });
  } catch {
    /* nada que borrar */
  }
}

let actual = await leerGuardada();
const oyentes = new Set();

function avisar() {
  raiz.dataset.sesion = actual ? "activa" : "inactiva";
  pintarBotones();
  pintarPanel();
  procesarPrivados();
  const detalle = { activa: !!actual, usuario: actual?.usuario ?? null };
  for (const fn of oyentes) {
    try {
      fn(detalle);
    } catch (error) {
      console.error(error);
    }
  }
  document.dispatchEvent(new CustomEvent("wr:sesion", { detail: detalle }));
}

// ---- acceso.json ----

let accesoPromesa = null;
function acceso() {
  accesoPromesa ??= fetch(URL_ACCESO, { cache: "no-cache" }).then((r) => {
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`acceso.json: ${r.status}`);
    return r.json();
  });
  return accesoPromesa;
}

// Si la llave del sitio cambió, la sesión guardada ya no sirve
async function revisarVigencia() {
  if (!actual) return;
  try {
    const a = await acceso();
    if (!a || (a.huella && a.huella !== actual.huella)) cerrar();
  } catch {
    /* sin red: se conserva la sesión */
  }
}

// ---- API ----

async function entrar(usuario, contrasena, recordar = false) {
  const a = await acceso();
  if (!a || !Object.keys(a.usuarios ?? {}).length) throw new Error("Aún no hay usuarios en este sitio.");
  const bytes = await L.entrar(a, usuario, contrasena);
  actual = { usuario: String(usuario).trim(), llave: await L.llaveHKDF(bytes), huella: await L.huella(bytes) };
  bytes.fill(0);
  await guardar(actual, recordar);
  avisar();
}

function cerrar() {
  const habia = !!actual;
  actual = null;
  borrarGuardada();
  if (habia) avisar();
}

export const sesion = {
  activa: () => !!actual,
  usuario: () => actual?.usuario ?? null,
  llave: () => actual?.llave ?? null,
  llaveProyecto: async (id) => (actual ? L.llaveProyecto(actual.llave, id) : null),
  async descifrar(bytes) {
    if (!actual) throw new Error("Sin sesión");
    return L.descifrarFragmento(bytes, actual.llave);
  },
  alCambiar(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
  },
  entrar,
  cerrar,
  abrir: () => abrirPanel(),
};

window.WRSesion = sesion;

// Cambios desde otra pestaña (solo la marca de localStorage avisa)
window.addEventListener("storage", async (e) => {
  if (e.key !== CLAVE_MARCA && e.key !== null) return;
  const nueva = await leerGuardada();
  if (!!nueva === !!actual && nueva?.huella === actual?.huella) return;
  actual = nueva;
  avisar();
});

// ---- Interfaz: botón y panel ----

const SVG_PERSONA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';

let panel = null;
let botonAbierto = null;

const escapar = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Dentro de un marco (iframe) de otro sitio no se ofrece el inicio de sesión
const enMarco = (() => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
})();

function crearBoton(conTexto) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = conTexto ? "sesion-boton sesion-boton--texto" : "ajuste sesion-boton";
  boton.setAttribute("aria-haspopup", "dialog");
  boton.setAttribute("aria-expanded", "false");
  boton.innerHTML = conTexto
    ? '<span class="sesion-boton__estado" aria-hidden="true"></span><span class="sesion-boton__texto"></span>'
    : `${SVG_PERSONA}<span class="sesion-boton__estado" aria-hidden="true"></span>`;
  boton.addEventListener("click", () => (panel && !panel.hidden ? cerrarPanel() : abrirPanel(boton)));
  return boton;
}

// Un botón al principio de cada .ajustes y, con texto de estado, en cada
// [data-sesion-lugar] (la portada lo usa en escritorio)
function pintarBotones() {
  if (enMarco) return;
  const lugares = [
    ...[...document.querySelectorAll(".ajustes")].map((el) => [el, false]),
    ...[...document.querySelectorAll("[data-sesion-lugar]")].map((el) => [el, true]),
  ];
  for (const [lugar, conTexto] of lugares) {
    let boton = lugar.querySelector(".sesion-boton");
    if (!boton) {
      boton = crearBoton(conTexto);
      lugar.prepend(boton);
    }
    const texto = actual ? `Sesión iniciada como ${actual.usuario}` : "Sin sesión. Iniciar sesión";
    boton.title = texto;
    boton.setAttribute("aria-label", texto);
    const etiqueta = boton.querySelector(".sesion-boton__texto");
    if (etiqueta) etiqueta.textContent = actual ? actual.usuario : "Iniciar sesión";
  }
}

function pintarPanel() {
  if (!panel) return;
  if (actual) {
    panel.setAttribute("aria-label", "Sesión");
    panel.innerHTML = `
      <p class="sesion-panel__titulo"><span class="sesion-panel__punto" aria-hidden="true"></span>Sesión iniciada</p>
      <p class="sesion-panel__nota">Entraste como <strong>${escapar(actual.usuario)}</strong>. Ves las partes privadas del sitio.</p>
      <button type="button" class="sesion-panel__salir" data-sesion-accion="cerrar">Cerrar sesión</button>`;
    // Los módulos del sitio pueden agregar sus acciones (p. ej. «Mis subrayados»)
    document.dispatchEvent(new CustomEvent("wr:panel-sesion", { detail: { panel } }));
    return;
  }
  panel.setAttribute("aria-label", "Iniciar sesión");
  panel.innerHTML = `
    <form class="sesion-panel__form" novalidate>
      <p class="sesion-panel__titulo"><span class="sesion-panel__punto" aria-hidden="true"></span>Sin sesión</p>
      <p class="sesion-panel__nota">Entra para ver las partes privadas del sitio.</p>
      <label>Usuario<input name="usuario" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
      <label>Contraseña<input name="contrasena" type="password" autocomplete="current-password" required></label>
      <label class="sesion-panel__recordar"><input name="recordar" type="checkbox"> Recordarme en este navegador (no en equipos compartidos)</label>
      <p class="sesion-panel__error" role="alert"></p>
      <button type="submit">Entrar</button>
    </form>`;
  const form = panel.querySelector("form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const error = form.querySelector(".sesion-panel__error");
    const enviar = form.querySelector('button[type="submit"]');
    if (!form.usuario.value.trim() || !form.contrasena.value) {
      error.textContent = "Escribe usuario y contraseña.";
      return;
    }
    error.textContent = "";
    enviar.disabled = true;
    enviar.textContent = "Entrando…";
    try {
      await entrar(form.usuario.value, form.contrasena.value, form.recordar.checked);
      cerrarPanel();
    } catch (err) {
      error.textContent = err instanceof L.ErrorAcceso ? "Usuario o contraseña incorrectos." : err.message;
      enviar.disabled = false;
      enviar.textContent = "Entrar";
      form.contrasena.select();
    }
  });
}

function colocarPanel() {
  if (!panel || panel.hidden) return;
  const ancho = Math.min(280, window.innerWidth - 24);
  panel.style.width = `${ancho}px`;
  const ref = botonAbierto?.isConnected ? botonAbierto.getBoundingClientRect() : null;
  if (!ref || (!ref.width && !ref.height)) {
    panel.style.top = "12px";
    panel.style.left = `${window.innerWidth - ancho - 12}px`;
    return;
  }
  const izquierda = Math.max(12, Math.min(ref.right - ancho, window.innerWidth - ancho - 12));
  panel.style.top = `${ref.bottom + 8}px`;
  panel.style.left = `${izquierda}px`;
}

function abrirPanel(boton) {
  if (enMarco) return;
  if (!panel) {
    panel = document.createElement("div");
    panel.className = "sesion-panel";
    panel.setAttribute("role", "dialog");
    panel.hidden = true;
    panel.addEventListener("click", (e) => {
      if (e.target.closest('[data-sesion-accion="cerrar"]')) {
        cerrar();
        cerrarPanel();
      }
    });
    document.body.append(panel);
  }
  botonAbierto = boton ?? [...document.querySelectorAll(".sesion-boton")].find((b) => b.offsetParent) ?? null;
  pintarPanel();
  panel.hidden = false;
  botonAbierto?.setAttribute("aria-expanded", "true");
  colocarPanel();
  (panel.querySelector("input") ?? panel.querySelector("button"))?.focus();
}

function cerrarPanel() {
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  botonAbierto?.setAttribute("aria-expanded", "false");
  if (panel.contains(document.activeElement)) botonAbierto?.focus();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") cerrarPanel();
});
document.addEventListener("pointerdown", (e) => {
  if (panel && !panel.hidden && !panel.contains(e.target) && !e.target.closest(".sesion-boton")) cerrarPanel();
});
window.addEventListener("resize", colocarPanel);
window.addEventListener("scroll", colocarPanel, { passive: true });

// ---- Partes privadas ----

const ANCHOS = [96, 88, 92, 64, 84, 72];

function censurar(el) {
  const lineas = Math.max(1, Math.min(12, parseInt(el.dataset.lineas, 10) || 3));
  const barras = Array.from(
    { length: lineas },
    (_, i) => `<span class="censura__linea" style="width:${i === lineas - 1 ? 48 : ANCHOS[i % ANCHOS.length]}%"></span>`,
  ).join("");
  el.innerHTML = `
    <div class="censura">
      <div class="censura__lineas" aria-hidden="true">${barras}</div>
      <button type="button" class="censura__boton" data-sesion-accion="abrir">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
        Contenido privado · Inicia sesión para verlo
      </button>
    </div>`;
  el.dataset.privadoEstado = "censurado";
}

async function revelar(el) {
  el.dataset.privadoEstado = "cargando";
  const llave = actual.llave;
  try {
    const respuesta = await fetch(new URL(el.dataset.privado, document.baseURI), { cache: "no-cache" });
    if (!respuesta.ok) throw new Error(`${respuesta.status}`);
    const html = await L.descifrarFragmento(await respuesta.arrayBuffer(), llave);
    if (actual?.llave !== llave) return; // la sesión cambió mientras tanto
    el.innerHTML = html;
    el.dataset.privadoEstado = "visible";
    el.dispatchEvent(new CustomEvent("wr:privado", { bubbles: true }));
  } catch (error) {
    console.warn("No se pudo descifrar", el.dataset.privado, error);
    el.innerHTML = '<p class="censura__falla">No se pudo abrir este contenido privado.</p>';
    el.dataset.privadoEstado = "error";
  }
}

function procesarPrivados() {
  for (const el of document.querySelectorAll("[data-privado]")) {
    const estado = el.dataset.privadoEstado;
    if (actual && estado !== "visible" && estado !== "cargando") revelar(el);
    else if (!actual && estado !== "censurado") censurar(el);
  }
}

document.addEventListener("click", (e) => {
  const boton = e.target.closest?.('[data-sesion-accion="abrir"]');
  if (boton) abrirPanel();
});

// ---- Arranque ----

function iniciar() {
  avisar();
  revisarVigencia();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
else iniciar();
