// Pruebas del modelo de datos de Anki personal (anki/js/modelo.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../../js/modelo.mjs";
import * as L from "../../../js/llaves.mjs";

// Generador pseudoaleatorio con semilla: las pruebas son reproducibles
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

const basica = (id, t = 1, extra = {}) => ({ id, tipo: "basico", frente: `¿${id}?`, reverso: `R-${id}`, t, ...extra });

// ---- Tarjetas ----

test("canonicoTarjeta: básica válida con etiquetas normalizadas y origen", () => {
  const x = M.canonicoTarjeta({
    id: "a1",
    tipo: "basico",
    frente: " ¿Qué es $x$? ",
    reverso: "Una variable",
    etiquetas: ["Filosofia :: Logica", "filosofia::logica", "  ", "a b"],
    origen: { tipo: "subrayado", id: "s1", p: "notas/logica.html", e: "una variable", basura: 1 },
    t: 5.9,
  });
  assert.deepEqual(Object.keys(x), ["id", "tipo", "frente", "reverso", "etiquetas", "origen", "t"]);
  assert.deepEqual(x.etiquetas, ["Filosofia::Logica", "a_b", "filosofia::logica"]);
  assert.deepEqual(x.origen, { tipo: "subrayado", id: "s1", p: "notas/logica.html", e: "una variable" });
  assert.equal(x.t, 5);
});

test("canonicoTarjeta: rechaza lo inválido", () => {
  assert.equal(M.canonicoTarjeta(null), null);
  assert.equal(M.canonicoTarjeta({ tipo: "basico", frente: "a", reverso: "b", t: 1 }), null, "sin id");
  assert.equal(M.canonicoTarjeta({ id: "x", tipo: "basico", frente: "a", reverso: "b", t: "no" }), null, "t no numérico");
  assert.equal(M.canonicoTarjeta({ id: "x", tipo: "raro", frente: "a", reverso: "b", t: 1 }), null, "tipo desconocido");
  assert.equal(M.canonicoTarjeta({ id: "x", tipo: "basico", frente: "  ", reverso: "b", t: 1 }), null, "frente vacío");
  assert.equal(M.canonicoTarjeta({ id: "x", tipo: "basico", frente: "a", reverso: "", t: 1 }), null, "básica sin reverso");
  assert.equal(M.canonicoTarjeta({ id: "x", tipo: "cloze", frente: "sin huecos", t: 1 }), null, "cloze sin huecos");
  assert.equal(M.canonicoTarjeta({ id: "x", tipo: "basico", frente: "a".repeat(M.MAX_TEXTO + 1), reverso: "b", t: 1 }), null, "demasiado largo");
});

test("canonicoTarjeta: origen inválido se omite, url solo http(s), lápida mínima", () => {
  assert.equal(M.canonicoTarjeta(basica("a", 1, { origen: { tipo: "subrayado" } })).origen, undefined);
  assert.equal(M.canonicoTarjeta(basica("a", 1, { origen: { tipo: "externo", fuente: "  " } })).origen, undefined);
  const ext = M.canonicoTarjeta(basica("a", 1, { origen: { tipo: "externo", fuente: "Clase 3", url: "javascript:alert(1)" } }));
  assert.deepEqual(ext.origen, { tipo: "externo", fuente: "Clase 3" });
  const ok = M.canonicoTarjeta(basica("a", 1, { origen: { tipo: "externo", fuente: "Libro", url: "https://ejemplo.org/x" } }));
  assert.equal(ok.origen.url, "https://ejemplo.org/x");
  assert.deepEqual(M.canonicoTarjeta({ id: "a", t: 9, b: true, frente: "se ignora" }), { id: "a", t: 9, b: true });
});

test("mezclarTarjetas: gana el mayor t, con empate decide el JSON; lápidas incluidas", () => {
  const v1 = basica("a", 1);
  const v2 = { ...basica("a", 2), reverso: "nuevo" };
  assert.equal(M.mezclarTarjetas([v1], [v2])[0].reverso, "nuevo");
  assert.equal(M.mezclarTarjetas([v2], [v1])[0].reverso, "nuevo");
  const borrada = M.lapidaTarjeta(v2, 3);
  assert.equal(M.mezclarTarjetas([v2], [borrada])[0].b, true);
  assert.equal(M.mezclarTarjetas([borrada], [{ ...v2, t: 4, reverso: "revivida" }])[0].reverso, "revivida", "una edición posterior revive");
  const empate1 = { ...basica("e", 7), reverso: "uno" };
  const empate2 = { ...basica("e", 7), reverso: "dos" };
  assert.deepEqual(M.mezclarTarjetas([empate1], [empate2]), M.mezclarTarjetas([empate2], [empate1]));
});

test("mezclarTarjetas es conmutativa, asociativa e idempotente (aleatorio)", () => {
  const azar = prng(7);
  const todas = [];
  for (let i = 0; i < 60; i++) {
    const id = `id${Math.floor(azar() * 15)}`;
    todas.push(azar() < 0.15 ? { id, t: Math.floor(azar() * 10), b: true } : basica(id, Math.floor(azar() * 10), { reverso: `v${i}` }));
  }
  const referencia = M.mezclarTarjetas(todas);
  for (let k = 0; k < 20; k++) {
    const mezcladas = barajar(todas, azar);
    const corte = Math.floor(azar() * mezcladas.length);
    const a = mezcladas.slice(0, corte);
    const b = mezcladas.slice(corte);
    assert.deepEqual(M.mezclarTarjetas(a, b), referencia, "conmutativa");
    assert.deepEqual(M.mezclarTarjetas(M.mezclarTarjetas(b), M.mezclarTarjetas(a)), referencia, "por mitades");
    assert.deepEqual(M.mezclarTarjetas(referencia, a, b, referencia), referencia, "idempotente");
  }
  assert.ok(M.igualesTarjetas(todas, barajar(todas, azar)));
});

// ---- Cloze y unidades ----

test("huecosCloze y segmentosCloze: pista, varios números y respaldo en texto", () => {
  const f = "La {{c1::mitocondria::organelo}} produce {{c2::ATP}}; {{c1::otra vez}}.";
  assert.deepEqual(M.numerosCloze(f), [1, 2]);
  const ocultoC1 = M.segmentosCloze(f, 1);
  assert.deepEqual(ocultoC1, [
    { t: "texto", v: "La " },
    { t: "hueco", v: "organelo" },
    { t: "texto", v: " produce " },
    { t: "texto", v: "ATP" },
    { t: "texto", v: "; " },
    { t: "hueco", v: "" },
    { t: "texto", v: "." },
  ]);
  const reveladoC2 = M.segmentosCloze(f, 2, true);
  assert.ok(reveladoC2.some((s) => s.t === "respuesta" && s.v === "ATP"));
  assert.ok(reveladoC2.every((s) => s.t !== "hueco"));
  assert.equal(M.huecosCloze("{{c1::a::b}}")[0].pista, "b");
});

test("unidadesDe: una por básica, una por número en cloze, ninguna en lápida", () => {
  assert.deepEqual(M.unidadesDe(M.canonicoTarjeta(basica("a"))).map((u) => u.uid), ["a"]);
  const cl = M.canonicoTarjeta({ id: "c", tipo: "cloze", frente: "{{c2::x}} {{c1::y}} {{c2::z}}", t: 1 });
  assert.deepEqual(M.unidadesDe(cl).map((u) => u.uid), ["c#c1", "c#c2"]);
  assert.deepEqual(M.unidadesDe({ id: "c", t: 2, b: true }), []);
});

// ---- Identificadores ----

test("idNuevo: ordenar por id es ordenar por creación", () => {
  const ids = [3, 1_000, 1_800_000_000_000, 2_000_000_000_000].map((t) => M.idNuevo(t));
  assert.deepEqual([...ids].sort(), ids);
  assert.ok(ids.every((i) => /^[0-9a-f]{18}$/.test(i)));
  assert.notEqual(M.idNuevo(5), M.idNuevo(5), "la parte aleatoria distingue");
});

// ---- Repasos ----

test("canonicoRepaso: valida g y tiempos, recorta la duración", () => {
  assert.deepEqual(M.canonicoRepaso({ u: "a", t: 10.7, g: 3 }), { u: "a", t: 10, g: 3 });
  assert.equal(M.canonicoRepaso({ u: "a", t: 10, g: 5 }), null);
  assert.equal(M.canonicoRepaso({ u: "a", t: 10, g: 0 }), null);
  assert.equal(M.canonicoRepaso({ u: "", t: 10, g: 3 }), null);
  assert.equal(M.canonicoRepaso({ u: "a", t: -1, g: 3 }), null);
  assert.equal(M.canonicoRepaso({ u: "a", t: 1, g: 3, d: 99_999_999 }).d, M.MAX_DURACION);
  assert.equal("d" in M.canonicoRepaso({ u: "a", t: 1, g: 3, d: "x" }), false);
});

test("mezclarRepasos: unión por (u, t), ordenada por tiempo; conmutativa e idempotente", () => {
  const azar = prng(11);
  const todos = [];
  for (let i = 0; i < 80; i++) todos.push({ u: `u${Math.floor(azar() * 6)}`, t: Math.floor(azar() * 30), g: 1 + Math.floor(azar() * 4) });
  const ref = M.mezclarRepasos(todos);
  for (let i = 1; i < ref.length; i++) assert.ok(ref[i - 1].t <= ref[i].t, "ordenados por t");
  assert.equal(new Set(ref.map((r) => `${r.u}|${r.t}`)).size, ref.length, "sin claves repetidas");
  for (let k = 0; k < 20; k++) {
    const m = barajar(todos, azar);
    const corte = Math.floor(azar() * m.length);
    assert.deepEqual(M.mezclarRepasos(m.slice(0, corte), m.slice(corte)), ref);
    assert.deepEqual(M.mezclarRepasos(ref, m.slice(0, corte), ref), ref);
  }
  assert.ok(M.igualesRepasos(todos, barajar(todos, azar)));
});

test("mezclarRepasos: dos equipos que estudian sin conexión no pierden repasos", () => {
  const a = [{ u: "x", t: 100, g: 3 }, { u: "x", t: 5000, g: 4 }];
  const b = [{ u: "y", t: 200, g: 1 }, { u: "x", t: 100, g: 3 }];
  const m = M.mezclarRepasos(a, b);
  assert.equal(m.length, 3);
});

// ---- Cifrado ----

test("tarjetas y repasos: ida y vuelta, formato WRF1, nada en claro", async () => {
  const llave = L.nuevaLlave();
  const tarjetas = [M.canonicoTarjeta(basica("a1", 4, { frente: "SECRETO-FRENTE" }))];
  const bytes = await M.cifrarTarjetas(tarjetas, llave);
  assert.ok(L.esFragmento(bytes));
  assert.equal(Buffer.from(bytes).includes("SECRETO-FRENTE"), false, "no debe haber texto en claro");
  assert.deepEqual(await M.descifrarTarjetas(bytes, llave), tarjetas);

  const repasos = [{ u: "a1", t: 9, g: 3 }];
  const bytesR = await M.cifrarRepasos(repasos, llave);
  assert.deepEqual(await M.descifrarRepasos(bytesR, llave), repasos);
});

test("cifrado: otra llave o el archivo de otra colección no descifra", async () => {
  const llave = L.nuevaLlave();
  const bytes = await M.cifrarTarjetas([M.canonicoTarjeta(basica("a"))], llave);
  await assert.rejects(M.descifrarTarjetas(bytes, L.nuevaLlave()));
  await assert.rejects(M.descifrarRepasos(bytes, llave), "la llave derivada es distinta por colección");
  const alterado = Uint8Array.from(bytes);
  alterado[alterado.length - 1] ^= 1;
  await assert.rejects(M.descifrarTarjetas(alterado, llave), "AES-GCM detecta la alteración");
});

test("descifrado ignora elementos inválidos y rechaza versiones desconocidas", async () => {
  const llave = L.nuevaLlave();
  const mal = await L.cifrarFragmento(JSON.stringify({ v: 1, tarjetas: [basica("ok"), { id: "mala" }, null] }), llave, M.INFO_TARJETAS);
  assert.deepEqual((await M.descifrarTarjetas(mal, llave)).map((x) => x.id), ["ok"]);
  const futura = await L.cifrarFragmento(JSON.stringify({ v: 2, tarjetas: [] }), llave, M.INFO_TARJETAS);
  await assert.rejects(M.descifrarTarjetas(futura, llave), /desconocido/);
});

test("agregarRepasos da exactamente lo mismo que mezclarRepasos y no copia si no hay nada nuevo", () => {
  const azar = prng(5);
  const crear = () => ({ u: `u${Math.floor(azar() * 8)}`, t: Math.floor(azar() * 400), g: 1 + Math.floor(azar() * 4) });
  for (let k = 0; k < 60; k++) {
    const base = M.mezclarRepasos(Array.from({ length: Math.floor(azar() * 60) }, crear));
    const nuevos = Array.from({ length: Math.floor(azar() * 6) }, crear);
    if (azar() < 0.3 && base.length) nuevos.push(base[Math.floor(azar() * base.length)]); // un duplicado exacto
    if (azar() < 0.2 && base.length) nuevos.push({ ...base[0], g: base[0].g === 4 ? 1 : base[0].g + 1 }); // misma clave, otro contenido
    nuevos.push({ u: "inválido", t: -5, g: 9 }); // se descarta
    const { lista, cambio } = M.agregarRepasos(base, nuevos);
    const esperado = M.mezclarRepasos(base, nuevos);
    assert.deepEqual(lista, esperado, `caso ${k}`);
    assert.equal(cambio, JSON.stringify(esperado) !== JSON.stringify(base), `cambio en el caso ${k}`);
  }
  const base = M.mezclarRepasos([{ u: "a", t: 5, g: 3 }]);
  assert.equal(M.agregarRepasos(base, [{ u: "a", t: 5, g: 3 }]).lista, base, "devuelve la misma lista");
  assert.equal(M.agregarRepasos(base, []).cambio, false);
  assert.equal(M.agregarRepasos(base, [{ u: "b", t: 1, g: 3 }]).lista[0].u, "b", "inserta en orden por t aunque llegue antes");
});
