// ============================================================
//  Registro de accesos: núcleo puro y cifrado (zona general)
// ============================================================
//
// Cada vez que alguien inicia sesión en el sitio se registra una entrada
// cifrada en `accesos.enc` (rama `subrayados`), con el mismo formato WRF1
// que los subrayados pero con su propia llave derivada:
//
//   K_a = HKDF-SHA256(K, info = "wr-accesos")
//
// Este módulo no toca el DOM ni la red directamente, para poder probarlo
// en Node. La interfaz (js/accesos.mjs) solo muestra el registro al dueño.

import * as L from "./llaves.mjs";
import { rutaPagina } from "./subrayados-nucleo.mjs";

export const INFO_ACCESOS = "wr-accesos";
export const RUTA_ACCESOS = "accesos.enc";
export const DUENO = "wolfgang";
export const VERSION = 1;
export const MAX_REGISTROS = 500;

const MAX_REINTENTOS = 5;

export const esDueno = (usuario) => L.normalizarUsuario(usuario) === DUENO;

// Resumen breve de navegador y sistema a partir del User-Agent
export function resumirDispositivo(ua = "") {
  const texto = String(ua || "");
  if (!texto) return "Desconocido";

  let nav = "Navegador";
  if (/Edg\//i.test(texto)) nav = "Edge";
  else if (/OPR\/|Opera/i.test(texto)) nav = "Opera";
  else if (/Firefox\/|FxiOS\//i.test(texto)) nav = "Firefox";
  else if (/CriOS\/|Chrome\//i.test(texto)) nav = "Chrome";
  else if (/Safari\//i.test(texto)) nav = "Safari";

  let so = "";
  if (/iPhone/i.test(texto)) so = "iPhone";
  else if (/iPad/i.test(texto)) so = "iPad";
  else if (/Android/i.test(texto)) so = "Android";
  else if (/Windows/i.test(texto)) so = "Windows";
  else if (/Macintosh|Mac OS X/i.test(texto)) so = "macOS";
  else if (/CrOS/i.test(texto)) so = "ChromeOS";
  else if (/Linux/i.test(texto)) so = "Linux";

  return so ? `${nav} · ${so}` : nav;
}

function limpiarRegistro(r) {
  if (!r || typeof r !== "object") return null;
  if (typeof r.id !== "string" || !r.id) return null;
  if (typeof r.u !== "string" || !r.u) return null;
  if (typeof r.t !== "number" || !Number.isFinite(r.t)) return null;
  return {
    id: r.id,
    u: r.u.slice(0, 80),
    t: Math.trunc(r.t),
    p: typeof r.p === "string" ? r.p.slice(0, 200) : "",
    r: !!r.r,
    d: typeof r.d === "string" ? r.d.slice(0, 80) : "",
  };
}

export function crearRegistro({ usuario, pagina = "", base = "/", recordar = false, dispositivo = "", ahora = () => Date.now(), id = null }) {
  return {
    id: id ?? L.aHex(L.aleatorio(8)),
    u: String(usuario ?? "").trim().slice(0, 80),
    t: Math.trunc(ahora()),
    p: rutaPagina(pagina, base).slice(0, 200),
    r: !!recordar,
    d: String(dispositivo ?? "").slice(0, 80),
  };
}

// Unión por `id`, ordenada de lo más reciente a lo más antiguo y acotada a MAX_REGISTROS
export function mezclarRegistros(...listas) {
  const mapa = new Map();
  for (const lista of listas) {
    if (!Array.isArray(lista)) continue;
    for (const bruto of lista) {
      const r = limpiarRegistro(bruto);
      if (!r) continue;
      const previo = mapa.get(r.id);
      if (!previo || r.t > previo.t) mapa.set(r.id, r);
    }
  }
  return [...mapa.values()]
    .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, MAX_REGISTROS);
}

export async function cifrarRegistros(registros, llave) {
  const carga = { v: VERSION, registros: mezclarRegistros(registros) };
  return L.cifrarFragmento(JSON.stringify(carga), llave, INFO_ACCESOS);
}

export async function descifrarRegistros(bytes, llave) {
  const texto = await L.descifrarFragmento(bytes, llave, INFO_ACCESOS);
  const datos = JSON.parse(texto);
  if (!datos || typeof datos !== "object" || !Array.isArray(datos.registros)) {
    throw new Error("Formato de registro de accesos no válido");
  }
  return mezclarRegistros(datos.registros);
}

// Lee `accesos.enc` y, si hay registros nuevos, los mezcla y escribe con reintento ante 409/422.
export async function sincronizarAccesos({ cliente, llave, nuevos = [], maxReintentos = MAX_REINTENTOS }) {
  const porAgregar = mezclarRegistros(nuevos);
  for (let intento = 0; intento < maxReintentos; intento++) {
    const { sha, bytes } = await cliente.leer();
    const remotos = bytes ? await descifrarRegistros(bytes, llave) : [];
    if (!porAgregar.length) return { registros: remotos, sha };

    const mezclados = mezclarRegistros(remotos, porAgregar);
    const cifrado = await cifrarRegistros(mezclados, llave);
    const res = await cliente.escribir(cifrado, sha);
    if (!res.conflicto) return { registros: mezclados, sha: res.sha };
  }
  throw new Error("Demasiados conflictos al guardar el registro de accesos");
}
