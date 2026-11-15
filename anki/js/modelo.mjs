// ============================================================
//  Anki personal: modelo de datos (núcleo puro)
// ============================================================
//
// Sin DOM ni red: se usa en el navegador y en Node ≥ 20 (se prueba en
// anki/herramientas/pruebas/). Cifrado con el formato de fragmentos del sitio
// (js/llaves.mjs): "WRF1" ‖ iv ‖ AES-256-GCM(HKDF(K, info), gzip(JSON)).
//
// Tres colecciones, cada una en su archivo cifrado de la rama `anki`:
//
//   tarjetas.enc   Tarjeta (nota): lo que escribes. Cambia poco.
//   repasos.enc    Repaso: registro de SOLO AGREGADO. Es la fuente de verdad del estado.
//   propuestas.enc (fase 1) Tarjetas propuestas por la IA, pendientes de aprobar.
//
// Tarjeta:
//   { id, tipo, frente, reverso?, etiquetas?, origen?, t }   o lápida { id, t, b: true }
//     id         hexadecimal; los nuevos empiezan con la fecha (ms) para que
//                ordenar por id sea ordenar por creación
//     tipo       "basico" (frente y reverso) o "cloze" (frente con {{c1::respuesta::pista}};
//                reverso = texto extra opcional)
//     etiquetas  jerárquicas con «::» (p. ej. «filosofia::logica»)
//     origen     { tipo: "subrayado", id, p, e } | { tipo: "externo", fuente, url? };
//                sin origen = manual
//     t          última modificación (ms)
//
// Unidad de estudio (lo que se repasa; Anki le llama «card»):
//   basico → una, con uid = id.   cloze → una por cada número cN, con uid = «id#cN».
//
// Repaso: { u, t, g, d? }   u uid de la unidad, t marca de tiempo (ms), g calificación
//   1 Otra vez, 2 Difícil, 3 Bien, 4 Fácil; d milisegundos que tardaste (opcional).
//   La clave es (u, t): la unión de repasos es conmutativa, asociativa e idempotente,
//   así que estudiar sin conexión en dos equipos no pierde nada.

import * as L from "../../js/llaves.mjs";

export const INFO_TARJETAS = "wr-anki-tarjetas";
export const INFO_REPASOS = "wr-anki-repasos";
export const TIPOS = ["basico", "cloze"];
export const GRADOS = [1, 2, 3, 4];
export const MAX_TEXTO = 20_000;
export const MAX_ETIQUETA = 80;
export const MAX_ETIQUETAS = 32;
export const MAX_DURACION = 3_600_000; // 1 h: más es que dejaste la pestaña abierta

// ---- Identificadores ----

// 12 hex de la fecha (ms) + 6 hex aleatorios: ordenar por id es ordenar por creación.
export const idNuevo = (ahora = Date.now()) => Math.max(0, Math.trunc(ahora)).toString(16).padStart(12, "0") + L.aHex(L.aleatorio(3));

// ---- Texto ----

const texto = (x) => (typeof x === "string" ? x.normalize("NFC") : "");

export function normalizarEtiqueta(e) {
  return texto(String(e ?? ""))
    .trim()
    .replace(/\s*::\s*/g, "::")
    .replace(/\s+/g, "_")
    .replace(/^:+|:+$/g, "")
    .slice(0, MAX_ETIQUETA);
}

const etiquetasCanonicas = (lista) =>
  [...new Set((Array.isArray(lista) ? lista : []).map(normalizarEtiqueta).filter(Boolean))].sort().slice(0, MAX_ETIQUETAS);

function origenCanonico(o) {
  if (!o || typeof o !== "object") return null;
  if (o.tipo === "subrayado" && typeof o.id === "string" && o.id) {
    return { tipo: "subrayado", id: o.id, p: texto(o.p), e: texto(o.e).slice(0, 4000) };
  }
  if (o.tipo === "externo" && typeof o.fuente === "string" && o.fuente.trim()) {
    const salida = { tipo: "externo", fuente: texto(o.fuente).trim().slice(0, 500) };
    if (typeof o.url === "string" && /^https?:\/\//i.test(o.url)) salida.url = o.url.slice(0, 2000);
    return salida;
  }
  return null;
}

// ---- Tarjetas ----

// Forma canónica (orden de claves fijo). Devuelve null si no es válida.
export function canonicoTarjeta(x) {
  if (!x || typeof x !== "object" || typeof x.id !== "string" || !x.id) return null;
  const t = Number(x.t);
  if (!Number.isFinite(t)) return null;
  if (x.b === true) return { id: x.id, t: Math.trunc(t), b: true };
  if (!TIPOS.includes(x.tipo)) return null;
  const frente = texto(x.frente);
  const reverso = texto(x.reverso);
  if (!frente.trim() || frente.length > MAX_TEXTO || reverso.length > MAX_TEXTO) return null;
  if (x.tipo === "basico" && !reverso.trim()) return null;
  if (x.tipo === "cloze" && !huecosCloze(frente).length) return null;
  const salida = { id: x.id, tipo: x.tipo, frente };
  if (reverso.trim()) salida.reverso = reverso;
  const etiquetas = etiquetasCanonicas(x.etiquetas);
  if (etiquetas.length) salida.etiquetas = etiquetas;
  const origen = origenCanonico(x.origen);
  if (origen) salida.origen = origen;
  salida.t = Math.trunc(t);
  return salida;
}

export const lapidaTarjeta = (x, t) => canonicoTarjeta({ id: x.id, t, b: true });

const clave = (x) => JSON.stringify(x);

// Con t igual gana la versión de mayor JSON: el resultado no depende del orden.
function gana(a, b) {
  if (a.t !== b.t) return a.t > b.t ? a : b;
  return clave(a) >= clave(b) ? a : b;
}

// Unión por id; gana el mayor t. Salida ordenada por id (= por creación).
export function mezclarTarjetas(...listas) {
  const mapa = new Map();
  for (const lista of listas) {
    for (const crudo of lista ?? []) {
      const x = canonicoTarjeta(crudo);
      if (!x) continue;
      const previo = mapa.get(x.id);
      mapa.set(x.id, previo ? gana(previo, x) : x);
    }
  }
  return [...mapa.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export const igualesTarjetas = (a, b) => clave(mezclarTarjetas(a)) === clave(mezclarTarjetas(b));

// ---- Cloze ----

// Cuerpo de un hueco que empieza en `i` (justo después de «{{cN::»). Cuenta llaves para que
// el LaTeX de la respuesta (\frac{a}{b^{2}}) no cierre el hueco antes de tiempo: el hueco
// termina en el primer «}}» con profundidad 0. «\» salta el carácter siguiente (\{, \}), y
// el primer «::» con profundidad 0 separa la respuesta de la pista. null si no cierra.
function leerHueco(texto, i) {
  let profundidad = 0;
  let separador = -1;
  for (let j = i; j < texto.length; j++) {
    const c = texto[j];
    if (c === "\\") j++;
    else if (c === "{") profundidad++;
    else if (c === "}") {
      if (profundidad > 0) profundidad--;
      else if (texto[j + 1] === "}") {
        const finRespuesta = separador < 0 ? j : separador;
        return { fin: j + 2, respuesta: texto.slice(i, finRespuesta), pista: separador < 0 ? "" : texto.slice(separador + 2, j) };
      }
    } else if (c === ":" && profundidad === 0 && separador < 0 && texto[j + 1] === ":") {
      separador = j;
      j++;
    }
  }
  return null;
}

// Huecos de un texto: [{ n, inicio, fin, respuesta, pista }] (sin anidar huecos).
// Un hueco sin cerrar se deja como texto normal.
export function huecosCloze(frente) {
  const texto = String(frente);
  const huecos = [];
  const abre = /\{\{c(\d+)::/g;
  let m;
  while ((m = abre.exec(texto))) {
    const cuerpo = leerHueco(texto, m.index + m[0].length);
    if (!cuerpo) continue;
    huecos.push({ n: Number(m[1]), inicio: m.index, fin: cuerpo.fin, respuesta: cuerpo.respuesta, pista: cuerpo.pista });
    abre.lastIndex = cuerpo.fin;
  }
  return huecos;
}

export const numerosCloze = (frente) => [...new Set(huecosCloze(frente).map((h) => h.n))].sort((a, b) => a - b);

// Segmentos para pintar la unidad `n`. Los demás huecos se muestran como texto normal.
//   { t: "texto", v } | { t: "hueco", v: pista | "" } | { t: "respuesta", v }
// Con `revelar`, el hueco activo sale como respuesta. Quien pinta debe ESCAPAR `v`.
export function segmentosCloze(frente, n, revelar = false) {
  const salida = [];
  let cursor = 0;
  const poner = (t, v) => v && salida.push({ t, v });
  for (const h of huecosCloze(frente)) {
    poner("texto", frente.slice(cursor, h.inicio));
    if (h.n !== n) poner("texto", h.respuesta);
    else if (revelar) salida.push({ t: "respuesta", v: h.respuesta });
    else salida.push({ t: "hueco", v: h.pista });
    cursor = h.fin;
  }
  poner("texto", frente.slice(cursor));
  return salida;
}

// ---- Unidades de estudio ----

export const uidDe = (id, n = null) => (n == null ? id : `${id}#c${n}`);

// → [{ uid, id, tipo, n }] de una tarjeta (vacío para lápidas)
export function unidadesDe(tarjeta) {
  if (!tarjeta || tarjeta.b) return [];
  if (tarjeta.tipo === "cloze") return numerosCloze(tarjeta.frente).map((n) => ({ uid: uidDe(tarjeta.id, n), id: tarjeta.id, tipo: "cloze", n }));
  return [{ uid: tarjeta.id, id: tarjeta.id, tipo: "basico", n: null }];
}

export const unidadesDeTodas = (tarjetas) => tarjetas.flatMap(unidadesDe);

// ---- Repasos ----

export function canonicoRepaso(x) {
  if (!x || typeof x !== "object" || typeof x.u !== "string" || !x.u) return null;
  const t = Math.trunc(Number(x.t));
  const g = Number(x.g);
  if (!Number.isFinite(t) || t < 0 || !GRADOS.includes(g)) return null;
  const salida = { u: x.u, t, g };
  const d = Math.trunc(Number(x.d));
  if (x.d != null && Number.isFinite(d) && d >= 0) salida.d = Math.min(d, MAX_DURACION);
  return salida;
}

const ordenRepasos = (a, b) => a.t - b.t || (a.u < b.u ? -1 : a.u > b.u ? 1 : 0);

// Unión por (u, t). Una colisión (casi imposible) la decide el mayor JSON.
export function mezclarRepasos(...listas) {
  const mapa = new Map();
  for (const lista of listas) {
    for (const crudo of lista ?? []) {
      const x = canonicoRepaso(crudo);
      if (!x) continue;
      const k = `${x.u}\u0000${x.t}`;
      const previo = mapa.get(k);
      mapa.set(k, previo && clave(previo) >= clave(x) ? previo : x);
    }
  }
  return [...mapa.values()].sort(ordenRepasos);
}

// Vía rápida para añadir pocos repasos a una lista que ya es canónica y está ordenada (la que
// devuelve mezclarRepasos): solo canoniza los nuevos y busca duplicados por clave, sin volver a
// mezclar los miles que ya están. Da exactamente lo mismo que mezclarRepasos(lista, nuevos).
// → { lista, cambio }; si no hay nada nuevo devuelve la MISMA lista.
export function agregarRepasos(lista, nuevos) {
  const candidatos = mezclarRepasos(nuevos);
  if (!candidatos.length) return { lista, cambio: false };
  const claves = new Map();
  for (const r of lista) claves.set(`${r.u}\u0000${r.t}`, r);
  const aAgregar = [];
  for (const r of candidatos) {
    const previo = claves.get(`${r.u}\u0000${r.t}`);
    if (!previo) aAgregar.push(r);
    else if (clave(previo) !== clave(r)) {
      // Misma clave (u, t) con otro contenido: casi imposible; lo decide la mezcla completa
      const completa = mezclarRepasos(lista, candidatos);
      return { lista: completa, cambio: clave(completa) !== clave(lista) };
    }
  }
  if (!aAgregar.length) return { lista, cambio: false };
  return { lista: [...lista, ...aAgregar].sort(ordenRepasos), cambio: true };
}

export const igualesRepasos = (a, b) => clave(mezclarRepasos(a)) === clave(mezclarRepasos(b));

// ---- Formato cifrado ----

export async function cifrarTarjetas(lista, llave) {
  const tarjetas = lista.map(canonicoTarjeta).filter(Boolean);
  return L.cifrarFragmento(JSON.stringify({ v: 1, tarjetas }), llave, INFO_TARJETAS);
}

export async function descifrarTarjetas(bytes, llave) {
  const json = JSON.parse(await L.descifrarFragmento(bytes, llave, INFO_TARJETAS));
  if (!json || json.v !== 1 || !Array.isArray(json.tarjetas)) throw new Error("Formato de tarjetas desconocido");
  return json.tarjetas.map(canonicoTarjeta).filter(Boolean);
}

export async function cifrarRepasos(lista, llave) {
  const repasos = lista.map(canonicoRepaso).filter(Boolean);
  return L.cifrarFragmento(JSON.stringify({ v: 1, repasos }), llave, INFO_REPASOS);
}

export async function descifrarRepasos(bytes, llave) {
  const json = JSON.parse(await L.descifrarFragmento(bytes, llave, INFO_REPASOS));
  if (!json || json.v !== 1 || !Array.isArray(json.repasos)) throw new Error("Formato de repasos desconocido");
  return json.repasos.map(canonicoRepaso).filter(Boolean);
}
