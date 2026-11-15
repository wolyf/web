// Pruebas del scheduler de Anki personal (anki/js/scheduler.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import * as S from "../../js/scheduler.mjs";
import * as M from "../../js/modelo.mjs";

const { MIN, HORA, DIA } = S;
const T0 = Date.UTC(2026, 10, 15, 12, 0, 0);

function prng(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const barajar = (lista, azar) => {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Lleva una unidad nueva a repaso con Bien, Bien
const graduada = (t = T0) => S.siguiente(S.siguiente(S.estadoNuevo(), 3, t), 3, t + 10 * MIN);

// Estado de repaso coherente: el último repaso fue `intervalo` días antes de que venza
// (salvo que se indique `ultimo`), para no confundirlo con un repaso duplicado.
const enRepaso = ({ ultimo, ...o }) => ({ ...graduada(), ...o, ultimo: ultimo ?? o.vence - o.intervalo * DIA });

// ---- Aprendizaje ----

test("nueva: Bien, Bien gradúa a 1 día con la facilidad inicial", () => {
  const a = S.siguiente(S.estadoNuevo(), 3, T0);
  assert.equal(a.fase, "aprendiendo");
  assert.equal(a.paso, 1);
  assert.equal(a.vence, T0 + 10 * MIN);
  const b = S.siguiente(a, 3, T0 + 10 * MIN);
  assert.equal(b.fase, "repaso");
  assert.equal(b.intervalo, 1);
  assert.equal(b.facilidad, 2500);
  assert.equal(b.vence, T0 + 10 * MIN + DIA);
  assert.equal(b.reps, 2);
});

test("nueva: Fácil gradúa directo a 4 días; Otra vez vuelve al primer paso; Difícil promedia pasos", () => {
  const facil = S.siguiente(S.estadoNuevo(), 4, T0);
  assert.equal(facil.fase, "repaso");
  assert.equal(facil.intervalo, 4);
  const otra = S.siguiente(S.siguiente(S.estadoNuevo(), 3, T0), 1, T0 + MIN);
  assert.equal(otra.paso, 0);
  assert.equal(otra.vence, T0 + MIN + 1 * MIN);
  const dificil = S.siguiente(S.estadoNuevo(), 2, T0);
  assert.equal(dificil.fase, "aprendiendo");
  assert.equal(dificil.paso, 0);
  assert.equal(dificil.vence, T0 + Math.round(5.5 * MIN), "promedio de 1 y 10 min");
});

test("sin pasos de aprendizaje se gradúa de inmediato", () => {
  const cfg = { ...S.CONFIG, pasos: [] };
  assert.equal(S.siguiente(S.estadoNuevo(), 3, T0, cfg).intervalo, 1);
  assert.equal(S.siguiente(S.estadoNuevo(), 4, T0, cfg).intervalo, 4);
});

test("calificación inválida lanza RangeError y el estado de entrada no se muta", () => {
  const e = S.estadoNuevo();
  const copia = structuredClone(e);
  assert.throws(() => S.siguiente(e, 5, T0), RangeError);
  assert.throws(() => S.siguiente(e, 0, T0), RangeError);
  S.siguiente(e, 3, T0);
  assert.deepEqual(e, copia);
});

// ---- Repaso ----

test("repaso a tiempo: Difícil ≤ Bien < Fácil con las fórmulas documentadas", () => {
  const e = enRepaso({ intervalo: 10, facilidad: 2500, vence: T0  });
  const d = S.siguiente(e, 2, T0);
  const b = S.siguiente(e, 3, T0);
  const f = S.siguiente(e, 4, T0);
  assert.equal(d.intervalo, 12);
  assert.equal(d.facilidad, 2350);
  assert.equal(b.intervalo, 25);
  assert.equal(b.facilidad, 2500);
  assert.equal(f.intervalo, 33);
  assert.equal(f.facilidad, 2650);
  assert.equal(b.vence, T0 + 25 * DIA);
  assert.ok(d.intervalo < b.intervalo && b.intervalo < f.intervalo);
});

test("el retraso suma bonificación; adelantarse no resta", () => {
  const e = enRepaso({ intervalo: 10, facilidad: 2500, vence: T0  });
  const tarde = S.siguiente(e, 3, T0 + 4 * DIA);
  assert.equal(tarde.intervalo, Math.round(((10 + 2) * 2500) / 1000));
  const temprano = S.siguiente(e, 3, T0 - 12 * HORA);
  assert.equal(temprano.intervalo, 25, "adelantarse menos de un día no resta: sin retraso negativo");
  const muyTemprano = S.siguiente(e, 3, T0 - 3 * DIA);
  assert.equal(muyTemprano.intervalo, 10, "más de un día antes no mueve la programación (ver «Repasos duplicados»)");
  assert.equal(muyTemprano.vence, e.vence);
});

test("monotonía: para cualquier estado de repaso, Difícil ≤ Bien < Fácil y respeta el tope", () => {
  const azar = prng(3);
  for (let i = 0; i < 300; i++) {
    const e = enRepaso({ intervalo: 1 + Math.floor(azar() * 400), facilidad: 1300 + Math.floor(azar() * 2000), vence: T0 + Math.floor(azar() * 20 - 5) * DIA  });
    const ahora = Math.max(T0 + Math.floor(azar() * 30) * DIA, e.vence - S.CONFIG.margenAdelanto + MIN);
    const [d, b, f] = [2, 3, 4].map((g) => S.siguiente(e, g, ahora).intervalo);
    const tope = S.CONFIG.intervaloMax;
    assert.ok(f <= tope);
    assert.ok(d >= e.intervalo, "Difícil nunca acorta");
    // Estrictamente crecientes mientras no se llegue al tope
    assert.ok(d < b || b === tope, `Difícil ${d} < Bien ${b}`);
    assert.ok(b < f || f === tope, `Bien ${b} < Fácil ${f}`);
  }
});

test("intervalos pequeños: cada botón da al menos un día más que el anterior", () => {
  // Con I = 1 y la facilidad mínima, las fórmulas crudas darían 1, 1 y 2
  const e = enRepaso({ intervalo: 1, facilidad: 1300, vence: T0  });
  const [d, b, f] = [2, 3, 4].map((g) => S.siguiente(e, g, T0).intervalo);
  assert.deepEqual([d, b, f], [1, 2, 3]);
});

test("lapso: cuenta, baja la facilidad, reaprende y vuelve con intervalo mínimo 1", () => {
  const e = enRepaso({ intervalo: 30, facilidad: 2500, vence: T0  });
  const l = S.siguiente(e, 1, T0);
  assert.equal(l.fase, "reaprendiendo");
  assert.equal(l.lapsos, 1);
  assert.equal(l.facilidad, 2300);
  assert.equal(l.intervalo, 1);
  assert.equal(l.vence, T0 + 10 * MIN);
  const vuelta = S.siguiente(l, 3, T0 + 10 * MIN);
  assert.equal(vuelta.fase, "repaso");
  assert.equal(vuelta.intervalo, 1);
  assert.equal(vuelta.facilidad, 2300);
  const facilVuelta = S.siguiente(l, 4, T0 + 10 * MIN);
  assert.equal(facilVuelta.intervalo, 2);
  const conMultiplicador = S.siguiente(e, 1, T0, { ...S.CONFIG, multLapso: 0.5 });
  assert.equal(conMultiplicador.intervalo, 15);
});

test("la facilidad nunca baja del mínimo", () => {
  let e = enRepaso({ intervalo: 5, facilidad: 1350, vence: T0  });
  for (let i = 0; i < 5; i++) e = S.siguiente(e, 1, e.vence + DIA);
  assert.equal(e.facilidad, S.CONFIG.facilidadMin);
});

test("sin pasos de reaprendizaje el lapso vuelve a repaso directo", () => {
  const e = enRepaso({ intervalo: 20, facilidad: 2500, vence: T0  });
  const l = S.siguiente(e, 1, T0, { ...S.CONFIG, pasosRe: [] });
  assert.equal(l.fase, "repaso");
  assert.equal(l.vence, T0 + DIA);
});

// ---- Vista previa y etiquetas ----

test("vistaPrevia: una espera por botón, creciente en repaso", () => {
  const nueva = S.vistaPrevia(S.estadoNuevo(), T0);
  assert.deepEqual(nueva, [1 * MIN, Math.round(5.5 * MIN), 10 * MIN, 4 * DIA]);
  const e = enRepaso({ intervalo: 10, vence: T0  });
  const v = S.vistaPrevia(e, T0);
  assert.equal(v.length, 4);
  assert.ok(v[0] < v[1] && v[1] < v[2] && v[2] < v[3]);
});

test("etiquetaIntervalo", () => {
  assert.equal(S.etiquetaIntervalo(30_000), "1 min");
  assert.equal(S.etiquetaIntervalo(10 * MIN), "10 min");
  assert.equal(S.etiquetaIntervalo(90 * MIN), "1,5 h");
  assert.equal(S.etiquetaIntervalo(4 * DIA), "4 d");
  assert.equal(S.etiquetaIntervalo(45 * DIA), "1,5 mes");
  assert.equal(S.etiquetaIntervalo(90 * DIA), "3 meses");
  assert.equal(S.etiquetaIntervalo(800 * DIA), "2,2 años");
});

// ---- Reproducción: el estado se deriva del registro ----

test("reproducir: el estado depende solo del conjunto de repasos, no del orden de llegada", () => {
  const azar = prng(21);
  const repasos = [];
  for (const u of ["a", "b", "c"]) {
    let t = T0;
    for (let i = 0; i < 25; i++) {
      t += Math.floor(azar() * 3 * DIA) + MIN;
      repasos.push({ u, t, g: 1 + Math.floor(azar() * 4) });
    }
  }
  const referencia = S.reproducir(M.mezclarRepasos(repasos));
  for (let k = 0; k < 15; k++) {
    const m = barajar(repasos, azar);
    const corte = Math.floor(azar() * m.length);
    const union = M.mezclarRepasos(m.slice(0, corte), m.slice(corte));
    const r = S.reproducir(union);
    assert.deepEqual([...r.estados], [...referencia.estados]);
    assert.deepEqual(r.eventos, referencia.eventos);
  }
  // incluso sin mezclar antes, reproducir ordena por sí mismo
  assert.deepEqual([...S.reproducir(barajar(repasos, azar)).estados], [...referencia.estados]);
});

test("reproducir: registra la fase previa de cada repaso", () => {
  const { estados, eventos } = S.reproducir([
    { u: "a", t: T0, g: 3 },
    { u: "a", t: T0 + 10 * MIN, g: 3 },
    { u: "a", t: T0 + DIA + 10 * MIN, g: 1 },
  ]);
  assert.deepEqual(eventos.map((e) => e.antes), ["nueva", "aprendiendo", "repaso"]);
  assert.equal(estados.get("a").fase, "reaprendiendo");
  assert.equal(estados.get("a").lapsos, 1);
});

// ---- Día de estudio y cola ----

test("finDelDia: corte a las 4:00 locales, con zona horaria", () => {
  // 2026-11-15 12:00 UTC en UTC-6 son las 06:00 locales: el día termina el 16 a las 04:00 locales
  const fin = S.finDelDia(Date.UTC(2026, 10, 15, 12, 0), -360);
  assert.equal(fin, Date.UTC(2026, 10, 16, 10, 0));
  // a las 03:59 locales todavía es «ayer»; a las 04:00 empieza el día nuevo
  assert.equal(S.finDelDia(Date.UTC(2026, 10, 15, 9, 59), -360), Date.UTC(2026, 10, 15, 10, 0));
  assert.equal(S.finDelDia(Date.UTC(2026, 10, 15, 10, 0), -360), Date.UTC(2026, 10, 16, 10, 0));
  assert.equal(S.finDelDia(T0, 0) - S.finDelDia(T0 - DIA, 0), DIA);
});

test("cola: aprendizaje vencido, repasos del día por vencimiento y nuevas por creación", () => {
  const ids = ["n2", "n1", "r1", "r2", "futuro", "ap"];
  const estados = new Map([
    ["r1", { ...graduada(), fase: "repaso", vence: T0 - 2 * DIA }],
    ["r2", { ...graduada(), fase: "repaso", vence: T0 - 5 * DIA }],
    ["futuro", { ...graduada(), fase: "repaso", vence: T0 + 3 * DIA }],
    ["ap", { ...graduada(), fase: "aprendiendo", vence: T0 - MIN }],
  ]);
  const c = S.cola({ unidades: ids, estados, ahora: T0 });
  assert.deepEqual(c.orden, ["ap", "r2", "r1", "n1", "n2"]);
});

test("cola: respeta los topes diarios usando lo ya hecho hoy", () => {
  const cfg = { ...S.CONFIG, nuevasPorDia: 3, repasosPorDia: 2 };
  const nuevas = ["a", "b", "c", "d", "e"];
  const hecho = [
    { u: "x", t: T0 - MIN, g: 3 },
    { u: "y", t: T0 - 2 * MIN, g: 3 },
  ];
  const { estados, eventos } = S.reproducir(hecho, cfg);
  const c = S.cola({ unidades: [...nuevas, "x", "y"], estados, eventos, ahora: T0, cfg });
  assert.equal(c.nuevas.length, 1, "ya se introdujeron 2 de 3 hoy");
  // los repasos con límite 2 y ninguno hecho: se cortan
  const muchos = new Map(["p", "q", "r"].map((u, i) => [u, { ...graduada(), fase: "repaso", vence: T0 - (i + 1) * DIA }]));
  assert.equal(S.cola({ unidades: ["p", "q", "r"], estados: muchos, ahora: T0, cfg }).repaso.length, 2);
});

test("cola: el aprendizaje próximo solo aparece cuando no hay nada más", () => {
  const estados = new Map([["a", { ...graduada(), fase: "aprendiendo", vence: T0 + 5 * MIN }]]);
  assert.deepEqual(S.cola({ unidades: ["a"], estados, ahora: T0 }).orden, ["a"], "con la cola vacía se adelanta");
  assert.deepEqual(S.cola({ unidades: ["a", "nueva"], estados, ahora: T0 }).orden, ["nueva"], "con otras cosas, espera");
  const lejos = new Map([["a", { ...graduada(), fase: "aprendiendo", vence: T0 + 60 * MIN }]]);
  assert.deepEqual(S.cola({ unidades: ["a"], estados: lejos, ahora: T0 }).orden, []);
});

test("cola: una tarjeta cloze aporta una unidad por hueco y un repaso no afecta a las demás", () => {
  const cloze = M.canonicoTarjeta({ id: "c", tipo: "cloze", frente: "{{c1::a}} y {{c2::b}}", t: 1 });
  const unidades = M.unidadesDe(cloze).map((u) => u.uid);
  const { estados, eventos } = S.reproducir([{ u: "c#c1", t: T0, g: 3 }]);
  const c = S.cola({ unidades, estados, eventos, ahora: T0 + MIN });
  assert.deepEqual(c.nuevas, ["c#c2"]);
});

// ---- Repasos duplicados entre equipos ----

test("dos «Bien» con un minuto de diferencia (dos equipos sin conexión) no duplican el intervalo", () => {
  // Intervalo largo: una unidad de 10 días vencida; el celular y el escritorio la repasan sin conexión
  const preparar = [
    { u: "a", t: T0 - 30 * DIA, g: 3 },
    { u: "a", t: T0 - 30 * DIA + 10 * MIN, g: 3 },
  ];
  const base = S.reproducir(preparar).estados.get("a");
  const venceBase = base.vence;
  const ya = { u: "a", t: venceBase + MIN, g: 3 };
  const solo = S.reproducir([...preparar, ya]).estados.get("a");
  const doble = S.reproducir([...preparar, ya, { u: "a", t: venceBase + 2 * MIN, g: 3 }]).estados.get("a");
  // el primer «Bien» saca la unidad del intervalo de 1 día: el segundo llega a más de un día de vencer
  assert.ok(solo.intervalo >= 3);
  assert.equal(doble.intervalo, solo.intervalo, "el repaso duplicado no vuelve a multiplicar");
  assert.equal(doble.vence, solo.vence);
  assert.equal(doble.facilidad, solo.facilidad);
  assert.equal(doble.reps, solo.reps + 1, "pero queda contado");
});

test("el duplicado no acorta ni alarga con Difícil o Fácil, pero «Otra vez» siempre se aplica", () => {
  // Acaba de repasarse: vence dentro de 20 días; otro equipo la repasa 30 min después
  const e = enRepaso({ intervalo: 20, facilidad: 2500, vence: T0 + 20 * DIA, ultimo: T0 });
  for (const g of [2, 3, 4]) {
    const r = S.siguiente(e, g, T0 + 30 * MIN, S.CONFIG);
    assert.equal(r.intervalo, 20, `g=${g} muy antes de vencer no cambia el intervalo`);
    assert.equal(r.vence, e.vence);
    assert.equal(r.ultimo, e.ultimo);
  }
  const lapso = S.siguiente(e, 1, T0 + 30 * MIN);
  assert.equal(lapso.fase, "reaprendiendo");
  assert.equal(lapso.lapsos, 1);
  // a menos de un día de vencer se aplica con normalidad
  assert.equal(S.siguiente(e, 3, e.vence - DIA + MIN).intervalo, 50);
});

test("la regla no afecta al aprendizaje por pasos ni a las unidades que vencen", () => {
  const a = S.siguiente(S.estadoNuevo(), 3, T0);
  const b = S.siguiente(a, 3, T0 + MIN);
  assert.equal(b.fase, "repaso", "dos Bien seguidos en aprendizaje siguen graduando");
  const c = S.siguiente(enRepaso({ intervalo: 10, facilidad: 2500, vence: T0 }), 3, T0);
  assert.equal(c.intervalo, 25);
});

// ---- Invariante: responder a lo que la cola presenta siempre reprograma ----

test("la tarjeta graduada por la tarde y presentada de madrugada no se queda atascada", () => {
  // Caso real: zona UTC-6, se gradúa a las 20:10 y el día siguiente la cola la presenta desde las 04:00
  const desfase = -360;
  const local = (d, h, m = 0) => Date.UTC(2026, 10, d, h, m) - desfase * MIN;
  const repasos = [
    { u: "a", t: local(14, 20, 0), g: 3 },
    { u: "a", t: local(14, 20, 10), g: 3 },
  ];
  const { estados, eventos } = S.reproducir(repasos);
  const ahora = local(15, 5, 0);
  assert.deepEqual(S.cola({ unidades: ["a"], estados, eventos, ahora, desfaseMin: desfase }).repaso, ["a"]);
  const respondida = S.reproducir([...repasos, { u: "a", t: ahora, g: 3 }]);
  assert.notEqual(respondida.estados.get("a").vence, estados.get("a").vence, "Bien debe mover el vencimiento");
  const despues = S.cola({ unidades: ["a"], estados: respondida.estados, eventos: respondida.eventos, ahora: ahora + MIN, desfaseMin: desfase });
  assert.deepEqual(despues.repaso, [], "ya no vuelve a salir hoy");
});

test("propiedad: toda unidad que la cola presenta, al responder 2, 3 o 4, sale de la cola de hoy", () => {
  const azar = prng(99);
  let probadas = 0;
  for (const desfase of [-420, -360, 0, 60, 330, 540]) {
    for (let caso = 0; caso < 60; caso++) {
      // Historia aleatoria: 2 a 6 repasos de una unidad, a cualquier hora del día
      const repasos = [];
      let t = Date.UTC(2026, 10, 1) + Math.floor(azar() * DIA);
      for (let i = 0, n = 2 + Math.floor(azar() * 5); i < n; i++) {
        repasos.push({ u: "u", t, g: 1 + Math.floor(azar() * 4) });
        t += Math.floor(azar() * 6 * DIA) + 10 * MIN;
      }
      const { estados, eventos } = S.reproducir(repasos);
      const e = estados.get("u");
      // Se mira a distintas horas alrededor del vencimiento, incluida la madrugada
      for (let delta = -2; delta <= 2; delta++) {
        for (const hora of [0, 3, 4, 5, 8, 12, 17, 22]) {
          const base = Math.floor((e.vence + delta * DIA) / DIA) * DIA + hora * HORA - desfase * MIN;
          if (base <= repasos.at(-1).t) continue;
          const c = S.cola({ unidades: ["u"], estados, eventos, ahora: base, desfaseMin: desfase });
          if (!c.repaso.includes("u")) continue;
          for (const g of [2, 3, 4]) {
            const r = S.reproducir([...repasos, { u: "u", t: base, g }]);
            const fin = S.finDelDia(base, desfase);
            assert.ok(r.estados.get("u").vence >= fin, `g=${g} desfase=${desfase}: sigue en la cola de hoy`);
            assert.notEqual(r.estados.get("u").vence, e.vence, `g=${g} no movió el vencimiento`);
            const otra = S.cola({ unidades: ["u"], estados: r.estados, eventos: r.eventos, ahora: base + MIN, desfaseMin: desfase });
            assert.ok(!otra.repaso.includes("u"), `g=${g} reaparece`);
            probadas++;
          }
        }
      }
    }
  }
  assert.ok(probadas > 200, `la propiedad se probó solo ${probadas} veces`);
});
