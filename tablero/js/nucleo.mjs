// ============================================================
//  Tablero de ideas y pendientes: núcleo puro (sin DOM ni red)
// ============================================================
//
// Cada elemento es una idea, un pendiente o algo ya hecho, ligado a una zona del sitio (un
// proyecto de proyectos.json o «general»). Los datos son un JSON público (datos/tablero.json):
// el repositorio es público, así que aquí no va nada privado.

export const ESTADOS = [
  { id: "idea", nombre: "Ideas", uno: "Idea" },
  { id: "pendiente", nombre: "Pendientes", uno: "Pendiente" },
  { id: "en-curso", nombre: "En curso", uno: "En curso" },
  { id: "hecho", nombre: "Hechas", uno: "Hecha" },
];
export const PRIORIDADES = ["alta", "media", "baja"];
export const GENERAL = "general";

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Solo enlaces seguros: https, http o una ruta relativa dentro del sitio (sin «..» ni «//»)
export function enlaceSeguro(url) {
  if (typeof url !== "string" || !url || /[\s"'<>\\]/.test(url)) return false;
  if (/^https?:\/\/[^/]/i.test(url)) return true;
  return /^[\w][\w./#?=&%-]*$/.test(url) && !url.split(/[/?#]/).includes("..") && !/^[a-z][a-z0-9+.-]*:/i.test(url);
}

// → lista de errores (vacía si todo está bien). `zonas` = ids válidos (proyectos + «general»)
export function validar(datos, zonas) {
  const errores = [];
  const falla = (t) => errores.push(t);
  if (!datos || !Array.isArray(datos.items)) return ["falta «items»"];
  const vistos = new Set();
  const estados = new Set(ESTADOS.map((e) => e.id));
  for (const x of datos.items) {
    const nombre = x?.id ?? JSON.stringify(x).slice(0, 40);
    if (!ID.test(x?.id ?? "")) falla(`${nombre}: id inválido (minúsculas con guiones)`);
    if (vistos.has(x.id)) falla(`${nombre}: id repetido`);
    vistos.add(x.id);
    if (!x.titulo || typeof x.titulo !== "string") falla(`${nombre}: falta el título`);
    if (!estados.has(x.estado)) falla(`${nombre}: estado inválido «${x.estado}»`);
    if (!zonas.includes(x.zona)) falla(`${nombre}: zona «${x.zona}» no existe`);
    if (x.prioridad != null && !PRIORIDADES.includes(x.prioridad)) falla(`${nombre}: prioridad inválida «${x.prioridad}»`);
    if (x.detalle != null && typeof x.detalle !== "string") falla(`${nombre}: «detalle» debe ser texto`);
    if (!FECHA.test(x.fecha ?? "")) falla(`${nombre}: «fecha» debe ser AAAA-MM-DD`);
    if (x.estado === "hecho" && !FECHA.test(x.hecho ?? "")) falla(`${nombre}: un elemento hecho lleva «hecho» (AAAA-MM-DD)`);
    if (x.hecho != null && x.estado !== "hecho") falla(`${nombre}: «hecho» solo va en elementos hechos`);
    if (x.enlace != null && !enlaceSeguro(x.enlace)) falla(`${nombre}: enlace no permitido «${x.enlace}»`);
  }
  return errores;
}

// Texto sin acentos ni mayúsculas, para buscar
export const plano = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filtrar(items, { zona = "", prioridad = "", texto = "" } = {}) {
  const palabras = plano(texto).split(/\s+/).filter(Boolean);
  return items.filter((x) => {
    if (zona && x.zona !== zona) return false;
    if (prioridad && x.prioridad !== prioridad) return false;
    const pajar = plano(`${x.titulo} ${x.detalle ?? ""} ${x.zona}`);
    return palabras.every((p) => pajar.includes(p));
  });
}

// Dentro de una columna: primero la prioridad más alta; a igual prioridad, el orden del archivo
// (quien edita el JSON decide el orden); lo hecho, lo más reciente primero.
export function ordenar(items, estado) {
  const peso = (x) => (x.prioridad ? PRIORIDADES.indexOf(x.prioridad) : PRIORIDADES.length);
  const con = items.map((x, i) => ({ x, i }));
  con.sort((a, b) => (estado === "hecho" ? (b.x.hecho ?? "").localeCompare(a.x.hecho ?? "") || a.i - b.i : peso(a.x) - peso(b.x) || a.i - b.i));
  return con.map((c) => c.x);
}

export function contar(items) {
  const porEstado = Object.fromEntries(ESTADOS.map((e) => [e.id, 0]));
  const porZona = {};
  for (const x of items) {
    porEstado[x.estado] = (porEstado[x.estado] ?? 0) + 1;
    if (x.estado !== "hecho") porZona[x.zona] = (porZona[x.zona] ?? 0) + 1;
  }
  return { porEstado, porZona, abiertos: items.filter((x) => x.estado !== "hecho").length, total: items.length };
}

export const agrupar = (items) => Object.fromEntries(ESTADOS.map((e) => [e.id, ordenar(items.filter((x) => x.estado === e.id), e.id)]));
