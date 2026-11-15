// ============================================================
//  Espacio de estudio: núcleo puro (sin DOM ni red)
// ============================================================
//
// Estado de lectura. Cada entrada de la ruta de una materia tiene un estado:
//
//   pendiente → leyendo → leida → apuntada
//
// y, si se quiere, una nota breve. Se guarda como una lista de registros
//
//   { id, e, n?, t }     id = "<materia>/<entrada>", e = estado, n = nota, t = marca de tiempo (ms)
//
// que se mezcla igual que los subrayados: unión por `id`, gana el mayor `t` (con `t` igual, el
// contenido mayor, para que la mezcla sea conmutativa, asociativa e idempotente). No hay
// lápidas: volver a «pendiente» es un estado más. Una entrada sin registro está pendiente.
//
// Formato cifrado: "WRF1" ‖ iv ‖ AES-256-GCM(HKDF(K, "wr-estudio-estado"), gzip(JSON)),
// con JSON = { v: 1, items: [...] }.

import { cifrarFragmento, descifrarFragmento } from "../../js/llaves.mjs";

export const ESTADOS = ["pendiente", "leyendo", "leida", "apuntada"];
export const ETIQUETAS = { pendiente: "Pendiente", leyendo: "Leyendo", leida: "Leída", apuntada: "Apuntada" };
export const INFO = "wr-estudio-estado";
export const MAX_NOTA = 600;
export const MAX_ID = 200;

export const esEstado = (e) => ESTADOS.includes(e);
export const hechas = new Set(["leida", "apuntada"]);

// Registro canónico o null si no es válido. Quita lo que sobre (así dos registros iguales
// siempre se serializan igual).
export function canonico(x) {
  if (!x || typeof x !== "object") return null;
  const { id, e, n, t } = x;
  if (typeof id !== "string" || !id || id.length > MAX_ID) return null;
  if (!esEstado(e)) return null;
  if (!Number.isFinite(t) || t < 0) return null;
  const salida = { id, e, t: Math.trunc(t) };
  if (typeof n === "string" && n.trim()) salida.n = n.trim().slice(0, MAX_NOTA);
  return salida;
}

const clave = (x) => `${x.e}\u0000${x.n ?? ""}`;

// ¿Gana a sobre b? Mayor t; con t igual, el contenido mayor.
function gana(a, b) {
  if (a.t !== b.t) return a.t > b.t;
  return clave(a) > clave(b);
}

export function mezclar(...listas) {
  const mapa = new Map();
  for (const lista of listas) {
    for (const crudo of lista ?? []) {
      const x = canonico(crudo);
      if (!x) continue;
      const previo = mapa.get(x.id);
      if (!previo || gana(x, previo)) mapa.set(x.id, x);
    }
  }
  return [...mapa.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function iguales(a, b) {
  if (a.length !== b.length) return false;
  const m = new Map(a.map((x) => [x.id, x]));
  return b.every((y) => {
    const x = m.get(y.id);
    return x && x.e === y.e && x.t === y.t && (x.n ?? "") === (y.n ?? "");
  });
}

export async function cifrar(items, llave) {
  return cifrarFragmento(JSON.stringify({ v: 1, items: mezclar(items) }), llave, INFO);
}

export async function descifrar(bytes, llave) {
  const datos = JSON.parse(await descifrarFragmento(bytes, llave, INFO));
  if (datos?.v !== 1 || !Array.isArray(datos.items)) throw new Error("Formato de estado desconocido");
  return mezclar(datos.items);
}

// ---- Consultas ----

export const idEstado = (materia, entrada) => `${materia}/${entrada}`;

export function estadoDe(items, id) {
  return items.find((x) => x.id === id)?.e ?? "pendiente";
}
export const notaDe = (items, id) => items.find((x) => x.id === id)?.n ?? "";

// Registro nuevo (o actualizado) con un t que SIEMPRE gana al previo, aunque el reloj vaya atrasado
export function registro(items, id, e, { n, ahora = Date.now() } = {}) {
  if (!esEstado(e)) throw new Error(`Estado inválido: ${e}`);
  const previo = items.find((x) => x.id === id);
  const t = Math.max(ahora, previo ? previo.t + 1 : 0);
  const nota = n === undefined ? previo?.n : n;
  return canonico({ id, e, t, ...(nota ? { n: nota } : {}) });
}

// Cuenta de estados de una lista de ids
export function contar(ids, items) {
  const cuenta = { pendiente: 0, leyendo: 0, leida: 0, apuntada: 0 };
  const m = new Map(items.map((x) => [x.id, x.e]));
  for (const id of ids) cuenta[m.get(id) ?? "pendiente"]++;
  return { ...cuenta, total: ids.length, hechas: cuenta.leida + cuenta.apuntada, fraccion: ids.length ? (cuenta.leida + cuenta.apuntada) / ids.length : 0 };
}

export const idsDeMateria = (id, materia) => materia.ruta.map((e) => idEstado(id, e.id));

// «Sigue con»: primero lo que se está leyendo (lo más reciente antes) y luego, de cada materia,
// la primera entrada pendiente de su ruta (en el orden de la ruta).
export function siguientes(materias, items, cuantos = 4) {
  const m = new Map(items.map((x) => [x.id, x]));
  const leyendo = [];
  const pendientes = [];
  for (const [mid, materia] of Object.entries(materias)) {
    let primera = null;
    for (const entrada of materia.ruta) {
      const reg = m.get(idEstado(mid, entrada.id));
      if (reg?.e === "leyendo") leyendo.push({ materia: mid, entrada, t: reg.t });
      else if (!reg || reg.e === "pendiente") primera ??= { materia: mid, entrada, t: 0 };
    }
    if (primera) pendientes.push(primera);
  }
  leyendo.sort((a, b) => b.t - a.t);
  return [...leyendo, ...pendientes].slice(0, cuantos);
}

// ---- Rutas ----

// Página de lectura de una fuente: <materia>/<fuente>.html (con ancla opcional)
export function rutaLectura(materia, fuente, ancla) {
  return `${materia}/${fuente}.html${ancla ? `#${ancla}` : ""}`;
}

// ---- Validación de un manifiesto de materia (la usa la prueba) ----

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ROLES = new Set(["principal", "apoyo"]);

export function validarMateria(id, m, areas = {}) {
  const errores = [];
  const falla = (t) => errores.push(`${id}: ${t}`);
  if (!ID.test(id)) falla("el id debe ser minúsculas con guiones");
  if (!m.nombre) falla("falta «nombre»");
  if (!(m.area in areas)) falla(`área «${m.area}» no declarada`);
  const secciones = new Set();
  for (const s of m.secciones ?? []) {
    if (!ID.test(s.id) || !s.nombre) falla(`sección inválida: ${JSON.stringify(s)}`);
    if (secciones.has(s.id)) falla(`sección repetida: ${s.id}`);
    secciones.add(s.id);
  }
  const fuentes = m.fuentes ?? {};
  for (const [fid, f] of Object.entries(fuentes)) {
    if (!ID.test(fid)) falla(`fuente con id inválido: ${fid}`);
    if (!f.titulo) falla(`fuente ${fid} sin título`);
    if (typeof f.texto !== "boolean") falla(`fuente ${fid}: «texto» debe ser verdadero o falso`);
  }
  const vistas = new Set();
  for (const e of m.ruta ?? []) {
    if (!ID.test(e.id)) falla(`entrada con id inválido: ${e.id}`);
    if (vistas.has(e.id)) falla(`entrada repetida: ${e.id}`);
    vistas.add(e.id);
    if (!e.titulo) falla(`entrada ${e.id} sin título`);
    if (!ROLES.has(e.rol)) falla(`entrada ${e.id}: rol inválido «${e.rol}»`);
    if (e.seccion && !secciones.has(e.seccion)) falla(`entrada ${e.id}: sección «${e.seccion}» no declarada`);
    if (e.fuente && !fuentes[e.fuente]) falla(`entrada ${e.id}: fuente «${e.fuente}» no declarada`);
    for (const c of e.complementos ?? []) if (!fuentes[c]) falla(`entrada ${e.id}: complemento «${c}» no declarado`);
    if (e.ancla && !/^[\w-]+$/.test(e.ancla)) falla(`entrada ${e.id}: ancla inválida`);
    if (`${id}/${e.id}`.length > MAX_ID) falla(`entrada ${e.id}: id demasiado largo`);
  }
  for (const a of m.apuntes ?? []) {
    if (!ID.test(a.id) || !a.titulo || !a.ruta) falla(`apunte inválido: ${JSON.stringify(a)}`);
  }
  return errores;
}
