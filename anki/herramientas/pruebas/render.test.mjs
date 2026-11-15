// Pruebas del texto de tarjeta con fórmulas (anki/js/render.mjs) y del analizador de cloze con LaTeX
import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../../js/render.mjs";
import * as M from "../../js/modelo.mjs";

const unir = (segmentos) => segmentos.map((s) => (s.t === "texto" ? s.v : `<${s.bloque ? "B" : "L"}:${s.v}>`)).join("");

test("partirMath: en línea, en bloque y los delimitadores de Anki", () => {
  assert.equal(unir(R.partirMath("Sea $x^2$ y $$\\int_0^1 f$$ listo")), "Sea <L:x^2> y <B:\\int_0^1 f> listo");
  assert.equal(unir(R.partirMath("\\(a+b\\) y \\[c\\]")), "<L:a+b> y <B:c>");
  assert.equal(unir(R.partirMath("sin fórmulas")), "sin fórmulas");
  assert.deepEqual(R.partirMath(""), []);
  assert.deepEqual(R.partirMath(null), []);
});

test("partirMath: los precios no son fórmulas", () => {
  for (const t of ["Cuesta $5 y $10.", "Entre $5 y $10 pesos", "Gané $100.", "un $ suelto", "$ 5 $", "$$"]) {
    assert.deepEqual(R.partirMath(t), [{ t: "texto", v: t }], t);
  }
  // pero una fórmula con números sí
  assert.equal(unir(R.partirMath("Si $x=5$ entonces")), "Si <L:x=5> entonces");
  assert.equal(unir(R.partirMath("$5x$ vale $10$ euros")), "<L:5x> vale <L:10> euros");
});

test("partirMath: cada regla de pandoc por separado (espacio antes del cierre, dígito después)", () => {
  // El «$» de cierre no puede ir precedido de espacio, aunque lo siga una letra o un espacio
  assert.deepEqual(R.partirMath("Pagué $5 y luego $ más"), [{ t: "texto", v: "Pagué $5 y luego $ más" }]);
  assert.deepEqual(R.partirMath("Costó $x y luego $y"), [{ t: "texto", v: "Costó $x y luego $y" }]);
  // El «$» de cierre no puede ir seguido de un dígito, aunque lo preceda una letra
  assert.deepEqual(R.partirMath("vale $a$5"), [{ t: "texto", v: "vale $a$5" }]);
  assert.equal(unir(R.partirMath("vale $a$ y 5")), "vale <L:a> y 5");
  // Y la apertura no admite espacio ni otro «$» pegado
  assert.deepEqual(R.partirMath("a $ b$ c"), [{ t: "texto", v: "a $ b$ c" }]);
});

test("partirMath: \\$ es un dólar literal y no abre fórmulas", () => {
  assert.equal(unir(R.partirMath("cuesta \\$5 y $x$")), "cuesta $5 y <L:x>");
  assert.equal(unir(R.partirMath("$a\\$b$")), "<L:a\\$b>");
});

test("partirMath: delimitadores sin cerrar o vacíos quedan como texto", () => {
  assert.equal(unir(R.partirMath("abre $sin cierre")), "abre $sin cierre");
  assert.equal(unir(R.partirMath("\\(sin cierre")), "\\(sin cierre");
  assert.equal(unir(R.partirMath("\\( \\) vacío")), "\\( \\) vacío");
  assert.equal(unir(R.partirMath("$$ $$ vacío")), "$$ $$ vacío");
});

test("partirMath: el HTML no es especial (quien pinta usa textContent)", () => {
  const segs = R.partirMath("<img src=x onerror=alert(1)> $x<y$ </script>");
  assert.equal(unir(segs), "<img src=x onerror=alert(1)> <L:x<y> </script>");
});

test("aDelimitadoresAnki: convierte a \\( \\) y \\[ \\] sin tocar precios", () => {
  assert.equal(R.aDelimitadoresAnki("Sea $x^2$ y $$y$$"), "Sea \\(x^2\\) y \\[y\\]");
  assert.equal(R.aDelimitadoresAnki("Cuesta $5 y $10 con \\$"), "Cuesta $5 y $10 con $");
  assert.equal(R.aDelimitadoresAnki("ya está en \\(a\\)"), "ya está en \\(a\\)");
  // la conversión es estable: convertir dos veces no cambia nada
  const una = R.aDelimitadoresAnki("$a$ y $$b$$ y $5 y $6");
  assert.equal(R.aDelimitadoresAnki(una), una);
});

test("aDelimitadoresAnki respeta los huecos de cloze y la fórmula dentro del hueco", () => {
  assert.equal(R.aDelimitadoresAnki("La {{c1::$x^2$}} y {{c2::$$y$$::pista}}"), "La {{c1::\\(x^2\\)}} y {{c2::\\[y\\]::pista}}");
  assert.equal(R.aDelimitadoresAnki("precio {{c1::$5}} y {{c2::$10}}"), "precio {{c1::$5}} y {{c2::$10}}");
});

// ---- Cloze con LaTeX ----

test("huecosCloze: las llaves del LaTeX no cierran el hueco antes de tiempo", () => {
  const f = "{{c1::\\frac{a}{b}}}";
  const [h] = M.huecosCloze(f);
  assert.equal(h.respuesta, "\\frac{a}{b}");
  assert.equal(h.fin, f.length);
  const g = M.huecosCloze("La razón {{c1::\\frac{a}{b^{2}}::es un cociente}} aparece.");
  assert.equal(g[0].respuesta, "\\frac{a}{b^{2}}");
  assert.equal(g[0].pista, "es un cociente");
});

test("huecosCloze: varios huecos, mismo número, llaves escapadas y huecos sin cerrar", () => {
  const f = "{{c1::a}} y {{c1::b::p}} y {{c2::$x^{2}$}}";
  assert.deepEqual(M.huecosCloze(f).map((h) => [h.n, h.respuesta, h.pista]), [[1, "a", ""], [1, "b", "p"], [2, "$x^{2}$", ""]]);
  assert.equal(M.huecosCloze("{{c1::a \\} b}}")[0].respuesta, "a \\} b");
  assert.deepEqual(M.huecosCloze("sin cerrar {{c1::abc"), []);
  assert.deepEqual(M.huecosCloze("{{c1::{ sin balancear}}"), []);
  assert.deepEqual(M.huecosCloze("no es {{c::nada}} ni {c1::nada}"), []);
});

test("cloze con LaTeX: una tarjeta válida produce una unidad por número y segmentos correctos", () => {
  const t = M.canonicoTarjeta({ id: "c", tipo: "cloze", frente: "Si $a=b$ entonces {{c1::\\frac{a}{b}}} y {{c2::$x^{2}$}}", t: 1 });
  assert.ok(t, "se acepta");
  assert.deepEqual(M.unidadesDe(t).map((u) => u.uid), ["c#c1", "c#c2"]);
  const oculto = M.segmentosCloze(t.frente, 1);
  assert.deepEqual(oculto.find((s) => s.t === "hueco"), { t: "hueco", v: "" });
  const revelado = M.segmentosCloze(t.frente, 1, true);
  assert.equal(revelado.find((s) => s.t === "respuesta").v, "\\frac{a}{b}");
  // el otro hueco se ve como texto, con su fórmula, para repartirla a partirMath
  assert.ok(oculto.some((s) => s.t === "texto" && s.v === "$x^{2}$"));
});

test("cloze: sin ningún hueco válido la tarjeta se rechaza", () => {
  assert.equal(M.canonicoTarjeta({ id: "c", tipo: "cloze", frente: "{{c1::sin cerrar", t: 1 }), null);
  assert.equal(M.canonicoTarjeta({ id: "c", tipo: "cloze", frente: "texto sin huecos", t: 1 }), null);
});
