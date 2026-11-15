// ============================================================
//  Anki personal: programación de repasos (núcleo puro)
// ============================================================
//
// Sin DOM ni red. La interfaz que usa el resto del proyecto es estable:
//
//   siguiente(estado, g, ahora, config) → estado nuevo      (g: 1 Otra vez … 4 Fácil)
//
// El estado de una unidad NUNCA se guarda: se DERIVA reproduciendo su registro de
// repasos en orden (reproducir). Por eso la unión de repasos de varios equipos da
// siempre el mismo estado, y cambiar de algoritmo (p. ej. FSRS) no toca los datos.
//
// Algoritmo actual: SM-2 al estilo del planificador v2 de Anki, determinista (sin
// «fuzz»: la reproducción debe dar siempre lo mismo).
//
//   nueva / aprendiendo / reaprendiendo   pasos en minutos (config.pasos, pasosRe)
//   repaso                                 intervalos en días
//
// Con I el intervalo, F la facilidad (‰) y R los días de retraso (≥ 0):
//   Difícil   I' = max(I, ⌊(I + R/4)·mDificil⌉)                F ← F − 150
//   Bien      I' = max(I_dificil + 1, ⌊(I + R/2)·F/1000⌉)
//   Fácil     I' = max(I_bien + 1, ⌊(I + R)·F/1000·bonoFacil⌉)  F ← F + 150
//   Otra vez  I' = max(1, ⌊I·mLapso⌉),  F ← F − 200, a reaprender
// (los tres intervalos usan la F anterior; F ≥ facilidadMin; I ≤ intervaloMax).
//
// Repasos duplicados: un repaso de una unidad en repaso, distinto de «Otra vez», hecho más
// de `margenAdelanto` (1 día) antes de que venza no mueve la programación (ver siguiente()).

export const MIN = 60_000;
export const HORA = 3_600_000;
export const DIA = 86_400_000;
export const ALGORITMO = "sm2";

export const CONFIG = Object.freeze({
  pasos: Object.freeze([1, 10]), // minutos
  pasosRe: Object.freeze([10]),
  intervaloGraduacion: 1, // días, al graduar con Bien
  intervaloFacil: 4, // días, al graduar con Fácil
  facilidadInicial: 2500,
  facilidadMin: 1300,
  bonoFacil: 1.3,
  multDificil: 1.2,
  multLapso: 0,
  intervaloMax: 36_500,
  nuevasPorDia: 20,
  repasosPorDia: 200,
  horaCorte: 4, // el «día» de estudio cambia a las 4:00 locales
  adelanto: 20 * MIN, // se muestran las de aprendizaje que vencen en menos de esto si no hay otra cosa
  margenAdelanto: DIA, // ver «Repasos duplicados» en siguiente()
});

export const FASES = ["nueva", "aprendiendo", "repaso", "reaprendiendo"];

export const estadoNuevo = () => ({ alg: ALGORITMO, fase: "nueva", paso: 0, intervalo: 0, facilidad: 0, vence: 0, reps: 0, lapsos: 0, ultimo: 0 });

const redondear = Math.round;

// ---- Un paso ----

export function siguiente(e, g, ahora, cfg = CONFIG) {
  if (![1, 2, 3, 4].includes(g)) throw new RangeError(`Calificación inválida: ${g}`);
  const base = { ...e, alg: ALGORITMO, reps: e.reps + 1, ultimo: ahora };
  switch (e.fase) {
    case "nueva":
    case "aprendiendo":
      return aprender(base, g, ahora, cfg, cfg.pasos, false);
    case "reaprendiendo":
      return aprender(base, g, ahora, cfg, cfg.pasosRe, true);
    case "repaso":
      // Repasos duplicados: dos equipos que estudian sin conexión la misma unidad vencida
      // producen dos repasos con minutos de diferencia. Aplicar ambos multiplicaría el
      // intervalo dos veces. El segundo llega con la unidad ya reprogramada a más de un
      // día de distancia, así que un repaso que no es «Otra vez» hecho más de
      // `margenAdelanto` (1 día) antes de que venza cuenta en el registro pero no mueve la
      // programación. «Otra vez» siempre se aplica: olvidar es información que no debe
      // ignorarse.
      //
      // Invariante (probada): la cola solo presenta unidades con vence < fin del día de
      // estudio ≤ ahora + 1 día, y esta regla solo ignora si ahora ≤ vence − 1 día; nunca
      // coinciden, así que responder a una unidad presentada SIEMPRE la reprograma.
      // Costo asumido: con intervalos de 1 día un duplicado sí se aplica (1 → 3 días).
      if (g !== 1 && ahora <= e.vence - cfg.margenAdelanto) return { ...e, alg: ALGORITMO, reps: e.reps + 1 };
      return repasar(base, g, ahora, cfg);
    default:
      throw new Error(`Fase desconocida: ${e.fase}`);
  }
}

function graduar(base, facil, ahora, cfg, reaprendiendo) {
  const intervalo = reaprendiendo
    ? Math.min(cfg.intervaloMax, facil ? base.intervalo + 1 : base.intervalo)
    : facil
      ? cfg.intervaloFacil
      : cfg.intervaloGraduacion;
  return {
    ...base,
    fase: "repaso",
    paso: 0,
    intervalo,
    facilidad: reaprendiendo ? base.facilidad : cfg.facilidadInicial,
    vence: ahora + intervalo * DIA,
  };
}

function aprender(base, g, ahora, cfg, pasos, reaprendiendo) {
  const fase = reaprendiendo ? "reaprendiendo" : "aprendiendo";
  if (!pasos.length) return graduar(base, g === 4, ahora, cfg, reaprendiendo);
  const en = (paso, minutos) => ({ ...base, fase, paso, vence: ahora + redondear(minutos * MIN) });
  const paso = Math.min(base.paso, pasos.length - 1);
  if (g === 1) return en(0, pasos[0]);
  if (g === 2) return en(paso, paso === 0 && pasos.length > 1 ? (pasos[0] + pasos[1]) / 2 : pasos[paso]);
  if (g === 3) return paso + 1 >= pasos.length ? graduar(base, false, ahora, cfg, reaprendiendo) : en(paso + 1, pasos[paso + 1]);
  return graduar(base, true, ahora, cfg, reaprendiendo);
}

function repasar(base, g, ahora, cfg) {
  const I = base.intervalo;
  const F = base.facilidad;
  const R = Math.max(0, Math.floor((ahora - base.vence) / DIA));
  const tope = (x) => Math.min(cfg.intervaloMax, x);
  const dificil = tope(Math.max(I, redondear((I + R / 4) * cfg.multDificil)));
  const bien = tope(Math.max(dificil + 1, redondear(((I + R / 2) * F) / 1000)));
  const facil = tope(Math.max(bien + 1, redondear(((I + R) * F * cfg.bonoFacil) / 1000)));
  const fijar = (intervalo, facilidad) => ({
    ...base,
    fase: "repaso",
    paso: 0,
    intervalo,
    facilidad: Math.max(cfg.facilidadMin, facilidad),
    vence: ahora + intervalo * DIA,
  });
  if (g === 2) return fijar(dificil, F - 150);
  if (g === 3) return fijar(bien, F);
  if (g === 4) return fijar(facil, F + 150);
  // Otra vez: lapso
  const intervalo = tope(Math.max(1, redondear(I * cfg.multLapso)));
  const lapso = { ...fijar(intervalo, F - 200), lapsos: base.lapsos + 1 };
  if (!cfg.pasosRe.length) return lapso;
  return { ...lapso, fase: "reaprendiendo", paso: 0, vence: ahora + redondear(cfg.pasosRe[0] * MIN) };
}

// Espera (ms) que daría cada botón: [Otra vez, Difícil, Bien, Fácil]
export const vistaPrevia = (e, ahora, cfg = CONFIG) => [1, 2, 3, 4].map((g) => siguiente(e, g, ahora, cfg).vence - ahora);

// «10 min», «3 h», «5 d», «2,5 meses», «1,3 años»
export function etiquetaIntervalo(ms) {
  const n = (x) => (Math.round(x * 10) / 10).toString().replace(".", ",");
  if (ms < HORA) return `${Math.max(1, Math.round(ms / MIN))} min`;
  if (ms < DIA) return `${n(ms / HORA)} h`;
  const dias = ms / DIA;
  if (dias < 30) return `${n(dias)} d`;
  if (dias < 365) return `${n(dias / 30)} ${dias / 30 < 1.95 ? "mes" : "meses"}`;
  return `${n(dias / 365)} ${dias / 365 < 1.95 ? "año" : "años"}`;
}

// ---- Reproducción del registro ----

const ordenRepasos = (a, b) => a.t - b.t || (a.u < b.u ? -1 : a.u > b.u ? 1 : 0) || a.g - b.g;

// → { estados: Map uid → estado, eventos: [{ u, t, g, antes }] } (antes = fase previa)
export function reproducir(repasos, cfg = CONFIG) {
  const estados = new Map();
  const eventos = [];
  for (const r of [...repasos].sort(ordenRepasos)) {
    const previo = estados.get(r.u) ?? estadoNuevo();
    eventos.push({ u: r.u, t: r.t, g: r.g, antes: previo.fase });
    estados.set(r.u, siguiente(previo, r.g, r.t, cfg));
  }
  return { estados, eventos };
}

// ---- Día de estudio ----

// Fin (ms) del día de estudio que contiene `ahora`. `desfaseMin` son los minutos de la
// zona horaria al este de UTC (en el navegador: -new Date().getTimezoneOffset()).
export function finDelDia(ahora, desfaseMin = 0, horaCorte = CONFIG.horaCorte) {
  const local = ahora + desfaseMin * MIN;
  const indice = Math.floor((local - horaCorte * HORA) / DIA);
  return (indice + 1) * DIA + horaCorte * HORA - desfaseMin * MIN;
}

// Cuántas nuevas y repasos van hoy, para respetar los topes diarios
export function cuentasDelDia(eventos, ahora, cfg = CONFIG, desfaseMin = 0) {
  const fin = finDelDia(ahora, desfaseMin, cfg.horaCorte);
  const inicio = fin - DIA;
  let nuevas = 0;
  let repasos = 0;
  for (const ev of eventos) {
    if (ev.t < inicio || ev.t >= fin) continue;
    if (ev.antes === "nueva") nuevas++;
    else if (ev.antes === "repaso") repasos++;
  }
  return { nuevas, repasos };
}

// ---- Cola de estudio ----

// Orden: aprendizaje vencido, repasos del día, nuevas (por creación) y, si no queda
// nada más, el aprendizaje que vence dentro del margen `adelanto`.
export function cola({ unidades, estados, eventos = [], ahora, cfg = CONFIG, desfaseMin = 0 }) {
  const fin = finDelDia(ahora, desfaseMin, cfg.horaCorte);
  const hoy = cuentasDelDia(eventos, ahora, cfg, desfaseMin);
  const aprendizaje = [];
  const adelantadas = [];
  const repaso = [];
  const nuevas = [];
  for (const uid of unidades) {
    const e = estados.get(uid);
    if (!e || e.fase === "nueva") nuevas.push(uid);
    else if (e.fase === "repaso") {
      if (e.vence < fin) repaso.push([e.vence, uid]);
    } else if (e.vence <= ahora) aprendizaje.push([e.vence, uid]);
    else if (e.vence <= ahora + cfg.adelanto) adelantadas.push([e.vence, uid]);
  }
  const porVence = (a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1);
  const uids = (pares) => pares.sort(porVence).map((p) => p[1]);
  const resultado = {
    aprendizaje: uids(aprendizaje),
    repaso: uids(repaso).slice(0, Math.max(0, cfg.repasosPorDia - hoy.repasos)),
    nuevas: nuevas.sort().slice(0, Math.max(0, cfg.nuevasPorDia - hoy.nuevas)),
    adelantadas: uids(adelantadas),
  };
  resultado.orden = [...resultado.aprendizaje, ...resultado.repaso, ...resultado.nuevas];
  if (!resultado.orden.length) resultado.orden = resultado.adelantadas;
  return resultado;
}
