// ============================================================
//  Subrayados: núcleo puro (zona general)
// ============================================================
//
// Lógica sin DOM ni red, para el navegador y Node ≥ 20 (se prueba en
// herramientas/pruebas/subrayados.test.mjs). La usan js/subrayados.mjs
// (interfaz) y js/subrayados-sync.mjs (sincronización).
//
// Un subrayado es:
//   { id, p, e, pre, suf, c, n, t, b }
//     id   identificador (hex aleatorio)
//     p    ruta de la página relativa a la base del sitio (sin hash ni query)
//     e    texto exacto subrayado (espacios colapsados)
//     pre  hasta 32 caracteres de contexto antes;  suf  los de después
//     c    color     n  nota     t  marca de tiempo (ms)
//     b    true si es lápida (borrado)
//
// Archivo cifrado: "WRF1" ‖ iv ‖ AES-256-GCM(HKDF(K, "wr-subrayados"), gzip(JSON)),
// con el JSON { v: 1, items: [...] } (formato de fragmentos de js/llaves.mjs).

import * as L from "./llaves.mjs";

export const INFO_SUBRAYADOS = "wr-subrayados";
export const COLORES = ["amarillo", "verde", "azul", "rosa", "lavanda"];
export const CONTEXTO = 32;
export const MAX_CITA = 4000;

// ---- Formato cifrado ----

export async function cifrarDatos(items, llave) {
  return L.cifrarFragmento(JSON.stringify({ v: 1, items: items.map(canonico) }), llave, INFO_SUBRAYADOS);
}

export async function descifrarDatos(bytes, llave) {
  const json = JSON.parse(await L.descifrarFragmento(bytes, llave, INFO_SUBRAYADOS));
  if (!json || json.v !== 1 || !Array.isArray(json.items)) throw new Error("Formato de subrayados desconocido");
  return json.items.map(canonico).filter(Boolean);
}

// ---- Elementos ----

// Forma canónica (orden de claves fijo; n y b solo si valen algo). Devuelve
// null si el elemento no es válido.
export function canonico(x) {
  if (!x || typeof x !== "object" || typeof x.id !== "string" || !x.id) return null;
  const t = Number(x.t);
  if (!Number.isFinite(t)) return null;
  const b = x.b === true;
  const salida = {
    id: x.id,
    p: String(x.p ?? ""),
    e: b ? "" : String(x.e ?? ""),
    pre: b ? "" : String(x.pre ?? ""),
    suf: b ? "" : String(x.suf ?? ""),
    c: COLORES.includes(x.c) ? x.c : COLORES[0],
    t,
  };
  if (!b && x.n) salida.n = String(x.n);
  if (b) salida.b = true;
  if (!b && !salida.e) return null;
  return salida;
}

export const idNuevo = () => L.aHex(L.aleatorio(8));

// Lápida de un elemento: conserva id y página, con marca de tiempo mayor
export function lapida(x, t) {
  return canonico({ id: x.id, p: x.p, c: x.c, t, b: true });
}

// ---- Mezcla ----
//
// Unión por id; gana el mayor t. Con t igual gana la versión de mayor
// JSON, para que el resultado no dependa del orden (conmutativa, asociativa
// e idempotente). Salida ordenada por id.

const clave = (x) => JSON.stringify(x);

function gana(a, b) {
  if (a.t !== b.t) return a.t > b.t ? a : b;
  return clave(a) >= clave(b) ? a : b;
}

export function mezclar(...listas) {
  const mapa = new Map();
  for (const lista of listas) {
    for (const crudo of lista ?? []) {
      const x = canonico(crudo);
      if (!x) continue;
      const previo = mapa.get(x.id);
      mapa.set(x.id, previo ? gana(previo, x) : x);
    }
  }
  return [...mapa.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export const iguales = (a, b) => clave(mezclar(a)) === clave(mezclar(b));

// ---- Rutas de página ----

// Ruta relativa a la base del sitio: sin base, sin index.html, sin hash ni query.
//   rutaPagina("/web/calculadoras/caudal.html", "/web/") → "calculadoras/caudal.html"
//   rutaPagina("/web/manuales-conagua/index.html", "/web/") → "manuales-conagua/"
//   rutaPagina("/web/", "/web/") → ""
export function rutaPagina(pathname, base = "/") {
  let ruta = String(pathname).split(/[?#]/)[0];
  try {
    ruta = decodeURIComponent(ruta);
  } catch {
    /* se deja tal cual */
  }
  if (!base.endsWith("/")) base += "/";
  if (ruta.startsWith(base)) ruta = ruta.slice(base.length);
  else ruta = ruta.replace(/^\/+/, "");
  return ruta.replace(/(^|\/)index\.html$/, "$1");
}

// ---- Texto normalizado ----
//
// El texto visible de la página se normaliza colapsando espacios. Se trabaja
// sobre un «flujo»: piezas { texto, bloque } en orden de documento. Entre
// piezas de bloques distintos va un espacio virtual, de modo que «fin.» de un
// párrafo y «Inicio» del siguiente nunca se pegan.

const ESPACIO = /\s/;

// Elementos que nunca se subrayan (ni aportan texto al flujo): los controles
// del sitio, formularios, campos editables y lo que pida data-no-subrayar. El
// texto de .katex-mathml (duplicado de las fórmulas) tampoco cuenta.
export const SELECTOR_EXCLUIDO = [
  ".ajustes",
  ".site-header",
  "form",
  "input",
  "textarea",
  "select",
  "option",
  "button",
  '[contenteditable]:not([contenteditable="false"])',
  "[data-no-subrayar]",
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "canvas",
  "iframe",
  "nav",
  ".katex-mathml",
  ".sub-ui",
  ".sesion-panel",
  ".censura",
].join(",");

export const normalizar = (texto) => String(texto).replace(/\s+/g, " ").trim();

// piezas: [{ texto, bloque }]. Devuelve:
//   texto  cadena normalizada
//   pieza  Uint32Array: índice de pieza de cada carácter (virtuales: -1 = 0xFFFFFFFF)
//   desde  Uint32Array: posición del carácter dentro del texto original de su pieza
//   primero, ultimo  Int32Array por pieza: primer y último índice de texto que le toca (-1 si ninguno)
export function construirFlujo(piezas) {
  let total = 0;
  for (const p of piezas) total += p.texto.length + 1;
  const pieza = new Uint32Array(total);
  const desde = new Uint32Array(total);
  const VIRTUAL = 0xffffffff;
  let salida = "";
  let n = 0;
  let ultimoEspacio = true; // al inicio no se admite espacio
  let bloqueAnterior;
  const primero = new Int32Array(piezas.length).fill(-1);
  const ultimo = new Int32Array(piezas.length).fill(-1);
  piezas.forEach((p, i) => {
    if (n > 0 && p.bloque !== bloqueAnterior && !ultimoEspacio) {
      salida += " ";
      pieza[n] = VIRTUAL;
      desde[n] = 0;
      n++;
      ultimoEspacio = true;
    }
    const texto = p.texto;
    for (let k = 0; k < texto.length; k++) {
      const espacio = ESPACIO.test(texto[k]);
      if (espacio && ultimoEspacio) continue;
      salida += espacio ? " " : texto[k];
      pieza[n] = i;
      desde[n] = k;
      if (primero[i] < 0) primero[i] = n;
      ultimo[i] = n;
      n++;
      ultimoEspacio = espacio;
    }
    bloqueAnterior = p.bloque;
  });
  // Un espacio final no cuenta
  if (n > 0 && ultimoEspacio) {
    salida = salida.slice(0, -1);
    n--;
    for (let i = 0; i < ultimo.length; i++) if (ultimo[i] >= n) ultimo[i] = primero[i] >= n ? (primero[i] = -1) : n - 1;
  }
  return { texto: salida, pieza: pieza.subarray(0, n), desde: desde.subarray(0, n), primero, ultimo, VIRTUAL };
}

// ---- Citas ----

// Cita de un tramo [a, b) del texto normalizado: recorta espacios en los
// bordes y toma el contexto. Devuelve null si no queda texto.
export function citaDeTramo(texto, a, b) {
  while (a < b && texto[a] === " ") a++;
  while (b > a && texto[b - 1] === " ") b--;
  if (b <= a) return null;
  if (b - a > MAX_CITA) b = a + MAX_CITA;
  return {
    a,
    b,
    e: texto.slice(a, b),
    pre: texto.slice(Math.max(0, a - CONTEXTO), a),
    suf: texto.slice(b, b + CONTEXTO),
  };
}

function prefijoComun(x, y) {
  const n = Math.min(x.length, y.length);
  let i = 0;
  while (i < n && x[i] === y[i]) i++;
  return i;
}

function sufijoComun(x, y) {
  const n = Math.min(x.length, y.length);
  let i = 0;
  while (i < n && x[x.length - 1 - i] === y[y.length - 1 - i]) i++;
  return i;
}

// Ancla un elemento en el texto normalizado. Devuelve { a, b } o null
// (huérfano): sin coincidencias, o varias sin contexto que las distinga.
export function anclar(texto, x) {
  const e = normalizar(x.e);
  if (!e) return null;
  const pre = String(x.pre ?? "").replace(/\s+/g, " ");
  const suf = String(x.suf ?? "").replace(/\s+/g, " ");
  const posiciones = [];
  for (let i = texto.indexOf(e); i !== -1; i = texto.indexOf(e, i + 1)) posiciones.push(i);
  if (!posiciones.length) return null;
  if (posiciones.length === 1) return { a: posiciones[0], b: posiciones[0] + e.length };
  let mejor = null;
  let puntaje = -1;
  let empate = false;
  for (const i of posiciones) {
    const antes = texto.slice(Math.max(0, i - pre.length), i);
    const despues = texto.slice(i + e.length, i + e.length + suf.length);
    const s = sufijoComun(pre, antes) + prefijoComun(suf, despues);
    if (s > puntaje) {
      puntaje = s;
      mejor = i;
      empate = false;
    } else if (s === puntaje) empate = true;
  }
  // Sin contexto que desempate (o puntaje nulo) es más seguro no adivinar
  if (puntaje <= 0 || empate) return null;
  return { a: mejor, b: mejor + e.length };
}

// ---- Interruptor ----

// Con sesión y la preferencia en «1» (o sin preferencia) los subrayados
// están activos. La preferencia viene de localStorage («1», «0» o null).
export const subrayadosActivos = (sesionActiva, preferencia) => !!sesionActiva && preferencia !== "0";

// ---- Anclaje aproximado ----
//
// Si la cita exacta ya no está (una errata corregida dentro del subrayado,
// una cifra que cambió), se busca la mejor coincidencia APROXIMADA cerca de
// donde estaban el contexto o los extremos del texto: distancia de edición
// (Sellers, con inicio y fin) de a lo más 25 % de la longitud de la cita.
// Citas de menos de MIN_APROX caracteres no se buscan así (demasiado ambiguo).

export const MIN_APROX = 12;
const SEMILLA = 10;
const MAX_VENTANAS = 12;
const MAX_CITA_APROX = 1500; // la búsqueda es O(|e| · |ventana|) por ventana

export const distanciaMaxima = (n) => Math.max(2, Math.floor(n * 0.25));

// Mejor subcadena de `v` parecida a `e`: { dist, inicio, fin } (fin exclusivo)
export function mejorSubcadena(e, v) {
  const m = e.length;
  const n = v.length;
  let dAnt = new Uint16Array(n + 1); // D[0][j] = 0: la coincidencia puede empezar donde sea
  let sAnt = new Int32Array(n + 1);
  for (let j = 0; j <= n; j++) sAnt[j] = j;
  let dAct = new Uint16Array(n + 1);
  let sAct = new Int32Array(n + 1);
  for (let i = 1; i <= m; i++) {
    dAct[0] = i;
    sAct[0] = 0;
    const c = e.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      let d = dAnt[j - 1] + (c === v.charCodeAt(j - 1) ? 0 : 1);
      let s = sAnt[j - 1];
      const borrar = dAnt[j] + 1; // falta un carácter de e en v
      if (borrar < d) {
        d = borrar;
        s = sAnt[j];
      }
      const insertar = dAct[j - 1] + 1; // sobra un carácter de v
      if (insertar < d) {
        d = insertar;
        s = sAct[j - 1];
      }
      dAct[j] = d;
      sAct[j] = s;
    }
    [dAnt, dAct] = [dAct, dAnt];
    [sAnt, sAct] = [sAct, sAnt];
  }
  let mejor = 0;
  for (let j = 1; j <= n; j++) if (dAnt[j] < dAnt[mejor]) mejor = j;
  return { dist: dAnt[mejor], inicio: sAnt[mejor], fin: mejor };
}

function apariciones(texto, aguja, tope = 20) {
  const lista = [];
  if (!aguja) return lista;
  for (let i = texto.indexOf(aguja); i !== -1 && lista.length < tope; i = texto.indexOf(aguja, i + 1)) lista.push(i);
  return lista;
}

// → { a, b } (tramo del texto normalizado) o null. No usa la cita exacta.
export function anclarAprox(texto, x) {
  const e = normalizar(x.e);
  const m = e.length;
  if (m < MIN_APROX || m > MAX_CITA_APROX) return null;
  const pre = String(x.pre ?? "").replace(/\s+/g, " ");
  const suf = String(x.suf ?? "").replace(/\s+/g, " ");
  const largo = Math.ceil(m * 1.3) + 8;
  const ventanas = [];
  const agregar = (desde) => {
    const a = Math.max(0, desde);
    if (ventanas.some((v) => Math.abs(v - a) < 6) || ventanas.length >= MAX_VENTANAS) return;
    ventanas.push(a);
  };
  for (const i of apariciones(texto, e.slice(0, SEMILLA))) agregar(i - 8);
  for (const i of apariciones(texto, e.slice(-SEMILLA))) agregar(i + SEMILLA - largo + 8);
  const colaPre = pre.slice(-Math.min(12, pre.length));
  if (colaPre.length >= 6) for (const i of apariciones(texto, colaPre)) agregar(i + colaPre.length - 4);
  const cabezaSuf = suf.slice(0, Math.min(12, suf.length));
  if (cabezaSuf.length >= 6) for (const i of apariciones(texto, cabezaSuf)) agregar(i - largo + 4);

  const maximo = distanciaMaxima(m);
  const candidatos = [];
  for (const desde of ventanas) {
    const ventana = texto.slice(desde, desde + largo);
    const r = mejorSubcadena(e, ventana);
    if (r.dist > maximo) continue;
    let a = desde + r.inicio;
    let b = desde + r.fin;
    while (a < b && texto[a] === " ") a++;
    while (b > a && texto[b - 1] === " ") b--;
    if (b - a < m / 2) continue;
    const contexto = sufijoComun(pre, texto.slice(Math.max(0, a - pre.length), a)) + prefijoComun(suf, texto.slice(b, b + suf.length));
    candidatos.push({ a, b, dist: r.dist, contexto });
  }
  if (!candidatos.length) return null;
  candidatos.sort((p, q) => p.dist - q.dist || q.contexto - p.contexto);
  const [primero, ...resto] = candidatos;
  // Si otra coincidencia distinta empata en distancia y contexto, no se adivina
  if (resto.some((c) => c.dist === primero.dist && c.contexto === primero.contexto && Math.abs(c.a - primero.a) > m / 2)) return null;
  return { a: primero.a, b: primero.b };
}

// Ancla con la cita exacta y, solo si esa cita ya no existe, de forma aproximada.
// → { a, b, aprox } o null. Con citas exactas ambiguas no se recurre a lo aproximado.
export function anclarTodo(texto, x) {
  const exacto = anclar(texto, x);
  if (exacto) return { ...exacto, aprox: false };
  if (texto.includes(normalizar(x.e))) return null; // existe pero no se distingue
  const aprox = anclarAprox(texto, x);
  return aprox ? { ...aprox, aprox: true } : null;
}

// ---- Poda de lápidas y rutas ----

export const DIAS_LAPIDA = 90;
export const DIAS_ESTANCADO = 60; // un equipo sin sincronizar más tiempo que esto ya no se fía de su caché
export const MS_DIA = 86_400_000;

// Quita las lápidas con más de `dias` días (el borrado ya llegó a todos los equipos activos)
export const podar = (items, ahora, dias = DIAS_LAPIDA) => items.filter((x) => !(x.b && ahora - x.t > dias * MS_DIA));

// Un equipo estancado (última sincronización de hace más de DIAS_ESTANCADO días) pudo
// perderse la lápida de algo ya podado: lo que conocía en esa sincronización y el
// remoto ya no tiene se da por borrado. Lo creado después (t mayor) se conserva.
export function sinBorradosPodados(locales, remotos, ultimaSync, ahora) {
  if (!ultimaSync || ahora - ultimaSync <= DIAS_ESTANCADO * MS_DIA) return locales;
  const ids = new Set(remotos.map((x) => x.id));
  return locales.filter((x) => ids.has(x.id) || x.t > ultimaSync);
}

// Cambia la ruta `p` de los elementos: `desde` exacta, o con prefijo si termina en «/»
// (carpeta). Devuelve la lista nueva (los cambiados llevan t mayor para ganar la mezcla).
export function renombrarRutas(items, desde, hasta, ahora) {
  const salida = [];
  for (const x of items) {
    const coincide = desde.endsWith("/") ? x.p.startsWith(desde) : x.p === desde;
    if (!coincide) continue;
    const nueva = desde.endsWith("/") ? hasta + x.p.slice(desde.length) : hasta;
    salida.push({ ...x, p: nueva, t: Math.max(ahora, x.t + 1) });
  }
  return salida;
}
