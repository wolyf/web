// ============================================================
//  Anki personal: sesión de estudio (núcleo puro)
// ============================================================
//
// Sin DOM ni red: toma una FOTO de las tarjetas y los repasos y devuelve lo que toca estudiar.
// La interfaz (app.mjs) vuelve a tomarla después de cada respuesta: reproducir el registro y
// armar la cola cuestan unos 6 ms con 20 000 repasos, así que no hace falta mantener estado
// incremental que pueda desfasarse del registro.

import * as M from "./modelo.mjs";
import * as S from "./scheduler.mjs";

// Sin acentos ni mayúsculas, para buscar
export const normalizar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

// ¿Alguna etiqueta es el filtro o cuelga de él? («filosofia» incluye «filosofia::logica»)
export const coincideEtiqueta = (etiquetas, filtro) => !filtro || (etiquetas ?? []).some((e) => e === filtro || e.startsWith(`${filtro}::`));

// Todas las etiquetas en uso con sus ancestros, ordenadas: a::b::c da a, a::b y a::b::c
export function etiquetasConPadres(tarjetas) {
  const todas = new Set();
  for (const t of tarjetas) {
    if (t.b) continue;
    for (const e of t.etiquetas ?? []) {
      const partes = e.split("::");
      for (let i = 1; i <= partes.length; i++) todas.add(partes.slice(0, i).join("::"));
    }
  }
  return [...todas].sort((a, b) => a.localeCompare(b, "es"));
}

// Foto de lo que hay que estudiar. Los topes diarios cuentan TODOS los repasos de hoy, también
// los de unidades fuera del filtro.
export function prepararEstudio({ tarjetas, repasos, ahora, cfg = S.CONFIG, desfaseMin = 0, filtro = "" }) {
  const vivas = tarjetas.filter((t) => !t.b && coincideEtiqueta(t.etiquetas, filtro));
  const unidades = M.unidadesDeTodas(vivas);
  const porUid = new Map(unidades.map((u) => [u.uid, u]));
  const porId = new Map(vivas.map((t) => [t.id, t]));
  const { estados, eventos } = S.reproducir(repasos, cfg);
  const cola = S.cola({ unidades: unidades.map((u) => u.uid), estados, eventos, ahora, cfg, desfaseMin });
  return {
    vivas,
    unidades,
    porUid,
    porId,
    estados,
    eventos,
    cola,
    resumen: {
      nuevas: cola.nuevas.length,
      aprendiendo: cola.aprendizaje.length,
      repaso: cola.repaso.length,
      pendientes: cola.orden.length,
    },
  };
}

// La siguiente unidad. Evita presentar seguidas dos unidades de la misma tarjeta (los huecos de
// un cloze se delatan entre sí) salvo que no quede otra.
export function elegirSiguiente(prep, evitarId = null) {
  const orden = prep.cola.orden;
  if (!orden.length) return null;
  return orden.find((uid) => prep.porUid.get(uid)?.id !== evitarId) ?? orden[0];
}

// Lo que la interfaz necesita para pintar una unidad
export function vistaUnidad(prep, uid, ahora, cfg = S.CONFIG) {
  const unidad = prep.porUid.get(uid);
  const tarjeta = unidad && prep.porId.get(unidad.id);
  if (!unidad || !tarjeta) return null;
  const estado = prep.estados.get(uid) ?? S.estadoNuevo();
  return {
    uid,
    n: unidad.n,
    tipo: unidad.tipo,
    tarjeta,
    fase: estado.fase,
    previa: S.vistaPrevia(estado, ahora, cfg),
  };
}

// Tarjetas para el explorador: filtro por etiqueta y búsqueda en frente, reverso y etiquetas
export function buscarTarjetas(tarjetas, { filtro = "", texto = "" } = {}) {
  const consulta = normalizar(texto).trim();
  return tarjetas
    .filter((t) => !t.b && coincideEtiqueta(t.etiquetas, filtro))
    .filter((t) => !consulta || normalizar(`${t.frente}\n${t.reverso ?? ""}\n${(t.etiquetas ?? []).join(" ")}`).includes(consulta))
    .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)); // las más nuevas primero
}

// Etiquetas escritas en un campo de texto (separadas por comas o espacios) → lista normalizada
export const parsearEtiquetas = (texto) => [...new Set(String(texto ?? "").split(/[,\n]+/).map(M.normalizarEtiqueta).filter(Boolean))].sort();

// Mensaje claro si la tarjeta no es válida, o "" si lo es
export function validarTarjeta({ tipo, frente, reverso }) {
  if (!String(frente ?? "").trim()) return tipo === "cloze" ? "Escribe el texto con al menos un hueco." : "Escribe el frente.";
  if (String(frente).length > M.MAX_TEXTO || String(reverso ?? "").length > M.MAX_TEXTO) return `El texto es demasiado largo (máximo ${M.MAX_TEXTO} caracteres).`;
  if (tipo === "basico") return String(reverso ?? "").trim() ? "" : "Escribe el reverso.";
  if (tipo === "cloze") {
    if (M.huecosCloze(frente).length) return "";
    return /\{\{c\d+::/.test(frente) ? "Hay un hueco sin cerrar: termínalo con }}." : "El cloze necesita al menos un hueco, por ejemplo {{c1::respuesta}}.";
  }
  return "Tipo de tarjeta desconocido.";
}
