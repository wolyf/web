// Pruebas de la sesión de estudio (anki/js/estudio.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../../js/estudio.mjs";
import * as M from "../../js/modelo.mjs";
import * as S from "../../js/scheduler.mjs";

const T0 = Date.UTC(2026, 10, 15, 12, 0, 0);
const basica = (id, etiquetas = [], t = 1) => M.canonicoTarjeta({ id, tipo: "basico", frente: `¿${id}?`, reverso: `R-${id}`, etiquetas, t });
const cloze = (id, etiquetas = []) => M.canonicoTarjeta({ id, tipo: "cloze", frente: "{{c1::a}} y {{c2::b}}", etiquetas, t: 1 });
const prep = (tarjetas, repasos = [], extra = {}) => E.prepararEstudio({ tarjetas, repasos, ahora: T0, ...extra });

test("normalizar y coincideEtiqueta: sin acentos y con jerarquía", () => {
  assert.equal(E.normalizar("Lógica ÁÉÍ"), "logica aei");
  assert.equal(E.coincideEtiqueta(["filosofia::logica"], "filosofia"), true);
  assert.equal(E.coincideEtiqueta(["filosofia::logica"], "filosofia::logica"), true);
  assert.equal(E.coincideEtiqueta(["filosofia"], "filosofia::logica"), false);
  assert.equal(E.coincideEtiqueta(["filosofiax"], "filosofia"), false, "no basta con ser prefijo del texto");
  assert.equal(E.coincideEtiqueta([], ""), true);
  assert.equal(E.coincideEtiqueta([], "a"), false);
});

test("etiquetasConPadres incluye los ancestros y omite lápidas", () => {
  const lista = E.etiquetasConPadres([basica("a", ["fis::mec::cinematica"]), basica("b", ["fis::ondas"]), { id: "c", t: 1, b: true }]);
  assert.deepEqual(lista, ["fis", "fis::mec", "fis::mec::cinematica", "fis::ondas"]);
});

test("prepararEstudio: nuevas por creación, resumen y filtro", () => {
  const p = prep([basica("b2", ["x"]), basica("a1", ["y"]), cloze("c3", ["x"])]);
  assert.deepEqual(p.cola.nuevas, ["a1", "b2", "c3#c1", "c3#c2"]);
  assert.deepEqual(p.resumen, { nuevas: 4, aprendiendo: 0, repaso: 0, pendientes: 4 });
  const q = prep([basica("b2", ["x"]), basica("a1", ["y"]), cloze("c3", ["x"])], [], { filtro: "x" });
  assert.deepEqual(q.cola.nuevas, ["b2", "c3#c1", "c3#c2"]);
});

test("prepararEstudio ignora lápidas y respeta el tope de nuevas con los repasos de hoy", () => {
  const tarjetas = ["a", "b", "c", "d"].map((id) => basica(id));
  const cfg = { ...S.CONFIG, nuevasPorDia: 2 };
  const hoy = [{ u: "a", t: T0 - 60_000, g: 3 }];
  const p = prep([...tarjetas, { id: "e", t: 5, b: true }], hoy, { cfg });
  assert.equal(p.unidades.length, 4);
  assert.equal(p.cola.nuevas.length, 1, "ya se introdujo una de las dos de hoy");
  // el tope cuenta lo hecho aunque esa unidad quede fuera del filtro
  const q = prep([basica("a", ["x"]), basica("b", ["y"]), basica("c", ["y"])], hoy, { cfg, filtro: "y" });
  assert.equal(q.cola.nuevas.length, 1);
});

test("elegirSiguiente evita dos unidades seguidas de la misma tarjeta si hay otra", () => {
  const p = prep([cloze("c1"), basica("z")]);
  assert.deepEqual(p.cola.orden, ["c1#c1", "c1#c2", "z"]);
  assert.equal(E.elegirSiguiente(p, null), "c1#c1");
  assert.equal(E.elegirSiguiente(p, "c1"), "z", "tras una unidad de c1 sale otra tarjeta");
  const solo = prep([cloze("c1")]);
  assert.equal(E.elegirSiguiente(solo, "c1"), "c1#c1", "si no queda otra se presenta igual");
  assert.equal(E.elegirSiguiente(prep([]), null), null);
});

test("elegirSiguiente: tras responder, la unidad sale de la cola y la lista se agota", () => {
  let repasos = [];
  const tarjetas = [basica("a"), basica("b")];
  const vistos = [];
  let t = T0;
  for (let paso = 0; paso < 10; paso++) {
    const p = E.prepararEstudio({ tarjetas, repasos, ahora: t });
    const uid = E.elegirSiguiente(p, null);
    if (!uid) break;
    vistos.push(uid);
    repasos = M.mezclarRepasos(repasos, [{ u: uid, t, g: 4 }]); // Fácil: se gradúa a 4 días
    t += 5000;
  }
  assert.deepEqual(vistos, ["a", "b"]);
});

test("vistaUnidad: unidad nueva con cuatro esperas y fase; null si la tarjeta ya no existe", () => {
  const p = prep([basica("a"), cloze("c")]);
  const v = E.vistaUnidad(p, "a", T0);
  assert.equal(v.fase, "nueva");
  assert.equal(v.previa.length, 4);
  assert.equal(v.tarjeta.id, "a");
  const c = E.vistaUnidad(p, "c#c2", T0);
  assert.equal(c.n, 2);
  assert.equal(c.tipo, "cloze");
  assert.equal(E.vistaUnidad(p, "no-existe", T0), null);
});

test("buscarTarjetas: texto sin acentos, filtro por etiqueta y las más nuevas primero", () => {
  const a = M.canonicoTarjeta({ id: "0a", tipo: "basico", frente: "Definición de lógica", reverso: "x", etiquetas: ["fil"], t: 1 });
  const b = M.canonicoTarjeta({ id: "0b", tipo: "basico", frente: "Otra cosa", reverso: "Tabla de LÓGICA binaria", etiquetas: ["mat"], t: 1 });
  const c = M.canonicoTarjeta({ id: "0c", tipo: "basico", frente: "Nada", reverso: "y", etiquetas: ["fil::sub"], t: 1 });
  const todas = [a, b, c, { id: "0d", t: 1, b: true }];
  assert.deepEqual(E.buscarTarjetas(todas, {}).map((t) => t.id), ["0c", "0b", "0a"]);
  assert.deepEqual(E.buscarTarjetas(todas, { texto: "LOGICA" }).map((t) => t.id), ["0b", "0a"]);
  assert.deepEqual(E.buscarTarjetas(todas, { filtro: "fil" }).map((t) => t.id), ["0c", "0a"]);
  assert.deepEqual(E.buscarTarjetas(todas, { filtro: "fil", texto: "nada" }).map((t) => t.id), ["0c"]);
  assert.deepEqual(E.buscarTarjetas(todas, { texto: "mat" }).map((t) => t.id), ["0b"], "también busca en las etiquetas");
});

test("parsearEtiquetas separa por comas y saltos de línea y normaliza", () => {
  assert.deepEqual(E.parsearEtiquetas("Filosofía :: Lógica, mat , , filosofía::lógica"), ["Filosofía::Lógica", "filosofía::lógica", "mat"]);
  assert.deepEqual(E.parsearEtiquetas(""), []);
  assert.deepEqual(E.parsearEtiquetas("a b, c"), ["a_b", "c"]);
});

test("validarTarjeta da un mensaje claro para cada error", () => {
  assert.equal(E.validarTarjeta({ tipo: "basico", frente: "a", reverso: "b" }), "");
  assert.match(E.validarTarjeta({ tipo: "basico", frente: " ", reverso: "b" }), /frente/);
  assert.match(E.validarTarjeta({ tipo: "basico", frente: "a", reverso: " " }), /reverso/);
  assert.equal(E.validarTarjeta({ tipo: "cloze", frente: "{{c1::a}}" }), "");
  assert.match(E.validarTarjeta({ tipo: "cloze", frente: "sin huecos" }), /al menos un hueco/);
  assert.match(E.validarTarjeta({ tipo: "cloze", frente: "{{c1::sin cerrar" }), /sin cerrar/);
  assert.match(E.validarTarjeta({ tipo: "cloze", frente: "" }), /hueco/);
  assert.match(E.validarTarjeta({ tipo: "basico", frente: "a".repeat(M.MAX_TEXTO + 1), reverso: "b" }), /largo/);
  assert.match(E.validarTarjeta({ tipo: "raro", frente: "a" }), /desconocido/);
  // todo lo que validarTarjeta acepta lo acepta también el modelo
  for (const x of [{ tipo: "basico", frente: "a", reverso: "b" }, { tipo: "cloze", frente: "{{c1::\\frac{a}{b}}}" }]) {
    assert.equal(E.validarTarjeta(x), "");
    assert.ok(M.canonicoTarjeta({ id: "x", t: 1, ...x }));
  }
});
