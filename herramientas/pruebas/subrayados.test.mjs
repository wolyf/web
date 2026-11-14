// Pruebas de los subrayados sincronizados (js/subrayados-*.mjs y herramientas/sesion.mjs)

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as L from "../../js/llaves.mjs";
import * as N from "../../js/subrayados-nucleo.mjs";
import * as S from "../../js/subrayados-sync.mjs";
import { crearCoordinador } from "../../js/subrayados-coord.mjs";
import { crearRama, migrarRutas } from "../sesion.mjs";

const RAIZ = new URL("../../", import.meta.url);

const item = (id, t, extra = {}) => ({ id, p: "calculadoras/caudal.html", e: `texto ${id}`, pre: "", suf: "", c: "amarillo", t, ...extra });

// ---- Cifrado ----

test("los subrayados se cifran y descifran con la llave del sitio", async () => {
  const llave = L.nuevaLlave();
  const items = [item("a", 10, { n: "una nota con ñ" }), item("b", 20, { c: "azul" })];
  const cifrado = await N.cifrarDatos(items, llave);
  assert.ok(L.esFragmento(cifrado), "usa el formato WRF1");
  assert.ok(!Buffer.from(cifrado).toString("latin1").includes("texto a"));
  assert.deepEqual(await N.descifrarDatos(cifrado, llave), items.map(N.canonico));
  await assert.rejects(N.descifrarDatos(cifrado, L.nuevaLlave()));
});

test("la llave de subrayados no abre fragmentos privados ni al revés", async () => {
  const llave = L.nuevaLlave();
  const subrayados = await N.cifrarDatos([item("a", 1)], llave);
  await assert.rejects(L.descifrarFragmento(subrayados, llave)); // info distinta: wr-fragmentos
  const fragmento = await L.cifrarFragmento("<p>privado</p>", llave);
  await assert.rejects(N.descifrarDatos(fragmento, llave));
});

test("el token se sella con HKDF(K, «wr-token») y solo se abre con la llave", async () => {
  const llave = L.nuevaLlave();
  const sobre = await L.sellarSecreto("github_pat_ejemplo_no_real", llave);
  assert.ok(!JSON.stringify(sobre).includes("github_pat"));
  assert.equal(await L.abrirSecreto(sobre, llave), "github_pat_ejemplo_no_real");
  await assert.rejects(L.abrirSecreto(sobre, L.nuevaLlave()));
  await assert.rejects(L.abrirSecreto(sobre, llave, "wr-fragmentos"));
});

// ---- Mezcla ----

test("mezclar: unión por id, gana el mayor t", () => {
  const a = [item("x", 5, { n: "vieja" }), item("y", 1)];
  const b = [item("x", 9, { n: "nueva" }), item("z", 3)];
  const m = N.mezclar(a, b);
  assert.deepEqual(m.map((i) => i.id), ["x", "y", "z"]);
  assert.equal(m.find((i) => i.id === "x").n, "nueva");
});

test("mezclar es conmutativa, asociativa e idempotente", () => {
  const a = [item("x", 5, { c: "verde" }), item("y", 1)];
  const b = [item("x", 5, { c: "rosa" }), item("z", 3)]; // mismo t: desempata el contenido
  const c = [item("y", 7, { b: true }), item("w", 2)];
  assert.deepEqual(N.mezclar(a, b), N.mezclar(b, a));
  assert.deepEqual(N.mezclar(N.mezclar(a, b), c), N.mezclar(a, N.mezclar(b, c)));
  assert.deepEqual(N.mezclar(a, a), N.mezclar(a));
  const m = N.mezclar(a, b, c);
  assert.deepEqual(N.mezclar(m, a, b, c), m);
});

test("borrar crea lápida: gana a la versión vieja y no se resucita", () => {
  const viva = item("x", 5);
  const lapida = N.lapida(viva, 6);
  assert.equal(lapida.b, true);
  assert.equal(lapida.e, "", "la lápida no conserva el texto");
  const m = N.mezclar([viva], [lapida]);
  assert.equal(m.length, 1);
  assert.equal(m[0].b, true);
  // Un dispositivo atrasado que aún tiene la versión viva no la resucita
  assert.equal(N.mezclar(m, [viva])[0].b, true);
  // Pero una edición posterior sí
  assert.equal(N.mezclar(m, [item("x", 7)])[0].b, undefined);
});

test("canonico descarta elementos inválidos y normaliza colores", () => {
  assert.equal(N.canonico({ id: "", t: 1, e: "a" }), null);
  assert.equal(N.canonico({ id: "a", t: "no", e: "a" }), null);
  assert.equal(N.canonico({ id: "a", t: 1, e: "" }), null);
  assert.equal(N.canonico({ id: "a", t: 1, e: "x", c: "negro" }).c, "amarillo");
  assert.deepEqual(N.mezclar([{ id: "a", t: 1 }, null, 3]), []);
});

// ---- Rutas ----

test("rutaPagina: relativa a la base, sin index.html, hash ni query", () => {
  assert.equal(N.rutaPagina("/web/calculadoras/caudal.html", "/web/"), "calculadoras/caudal.html");
  assert.equal(N.rutaPagina("/web/manuales-conagua/index.html", "/web/"), "manuales-conagua/");
  assert.equal(N.rutaPagina("/web/", "/web/"), "");
  assert.equal(N.rutaPagina("/web/index.html?x=1#y", "/web/"), "");
  assert.equal(N.rutaPagina("/calculadoras/caudal.html", "/"), "calculadoras/caudal.html");
  assert.equal(N.rutaPagina("/web/a%20b/c.html", "/web/"), "a b/c.html");
});

// ---- Texto y anclaje ----

const flujoDe = (...bloques) => N.construirFlujo(bloques.map((t, i) => ({ texto: t, bloque: i })));

test("el flujo colapsa espacios y separa los bloques", () => {
  const f = flujoDe("  Hola   mundo.\n", "Segundo\tpárrafo  ");
  assert.equal(f.texto, "Hola mundo. Segundo párrafo");
  // Mismo bloque: sin espacio virtual entre piezas
  const mismo = N.construirFlujo([
    { texto: "Ener", bloque: "p" },
    { texto: "gía", bloque: "p" },
  ]);
  assert.equal(mismo.texto, "Energía");
});

test("el flujo mapea cada carácter a su pieza y posición", () => {
  const f = flujoDe("ab  cd", "ef");
  const i = f.texto.indexOf("cd");
  assert.equal(f.pieza[i], 0);
  assert.equal(f.desde[i], 4); // «c» está en la posición 4 del texto original
  const j = f.texto.indexOf("ef");
  assert.equal(f.pieza[j], 1);
  assert.equal(f.primero[1], j);
  assert.equal(f.ultimo[1], f.texto.length - 1);
});

test("citaDeTramo recorta bordes y toma contexto de hasta 32 caracteres", () => {
  const texto = "a".repeat(50) + " objetivo central " + "b".repeat(50);
  const a = texto.indexOf(" objetivo");
  const c = N.citaDeTramo(texto, a, texto.indexOf(" b") + 1);
  assert.equal(c.e, "objetivo central");
  assert.equal(c.pre.length, N.CONTEXTO);
  assert.equal(c.suf.length, N.CONTEXTO);
  assert.equal(N.citaDeTramo("   ", 0, 3), null);
});

test("anclar: una sola coincidencia", () => {
  const texto = "El caudal medio diario se calcula con la dotación.";
  const a = N.anclar(texto, { e: "caudal medio", pre: "", suf: "" });
  assert.equal(texto.slice(a.a, a.b), "caudal medio");
});

test("anclar: coincidencias repetidas se desempatan con pre y suf", () => {
  const texto = "Primero el gasto de diseño aplica aquí. Luego el gasto de diseño aplica allá. Al final el gasto de diseño aplica más.";
  for (const [pre, suf, esperado] of [
    ["Primero el ", " aplica aquí.", 0],
    ["Luego el ", " aplica allá.", 1],
    ["Al final el ", " aplica más.", 2],
  ]) {
    const x = { e: "gasto de diseño", pre, suf };
    const a = N.anclar(texto, x);
    const todas = [...texto.matchAll(/gasto de diseño/g)].map((m) => m.index);
    assert.equal(a.a, todas[esperado]);
  }
});

test("anclar: el texto movido de lugar se sigue encontrando", () => {
  const original = "Introducción. La pérdida de carga unitaria depende del diámetro. Fin.";
  const c = N.citaDeTramo(original, original.indexOf("La pérdida"), original.indexOf(" Fin."));
  const movido = "Anexo nuevo con otro contenido. Fin. Introducción. Otro texto antes. La pérdida de carga unitaria depende del diámetro.";
  const a = N.anclar(movido, c);
  assert.equal(movido.slice(a.a, a.b), c.e);
});

test("anclar: huérfano si el texto desapareció, cambió o no hay contexto que desempate", () => {
  const x = { e: "una frase única", pre: "antes ", suf: " después" };
  assert.equal(N.anclar("nada que ver aquí", x), null);
  assert.equal(N.anclar("una frase unica con otra ortografía", x), null);
  // Dos coincidencias y el contexto original ya no existe: no se adivina
  assert.equal(N.anclar("X una frase única Y. Z una frase única W.", x), null);
  // Idénticas con contexto idéntico: tampoco
  assert.equal(N.anclar("p una frase única q. p una frase única q.", { e: "una frase única", pre: "p ", suf: " q." }), null);
});

test("anclar tolera cambios de espacios entre guardar y leer", () => {
  const x = { e: "caudal   medio\n diario", pre: "el  ", suf: "" };
  const a = N.anclar("Se llama el caudal medio diario del sistema", x);
  assert.ok(a);
});

// ---- Interruptor ----

test("interruptor: activos solo con sesión y preferencia distinta de «0»", () => {
  assert.equal(N.subrayadosActivos(false, null), false, "sin sesión no hay subrayados");
  assert.equal(N.subrayadosActivos(false, "1"), false);
  assert.equal(N.subrayadosActivos(true, null), true, "por defecto activos con sesión");
  assert.equal(N.subrayadosActivos(true, "1"), true);
  assert.equal(N.subrayadosActivos(true, "0"), false);
});

// ---- Exclusiones ----

test("el selector de exclusión cubre lo pedido", () => {
  for (const pieza of [".ajustes", ".site-header", "form", "input", "textarea", "[contenteditable", "[data-no-subrayar]", ".katex-mathml"]) {
    assert.ok(N.SELECTOR_EXCLUIDO.includes(pieza), `falta ${pieza}`);
  }
});

// ---- Sincronización con una API de GitHub simulada ----

function githubFalso({ existe = true, alAntesDeEscribir } = {}) {
  const estado = { bytes: null, sha: null, version: 0, llamadas: [], rama: existe };
  const f = async (url, opciones = {}) => {
    const metodo = opciones.method ?? "GET";
    estado.llamadas.push({ metodo, url, cabeceras: opciones.headers });
    const res = (cuerpo, status = 200) => ({
      status,
      ok: status >= 200 && status < 300,
      json: async () => cuerpo,
      arrayBuffer: async () => estado.bytes,
    });
    if (metodo === "GET" && url.includes("/git/blobs/")) {
      if (!estado.bytes || !url.endsWith(estado.sha)) return res({ message: "Not Found" }, 404);
      return res({ sha: estado.sha, encoding: "base64", size: estado.bytes.length, content: Buffer.from(estado.bytes).toString("base64") });
    }
    if (metodo === "GET") {
      if (!estado.bytes) return res({ message: "Not Found" }, 404);
      const etag = `W/"${estado.sha}"`;
      if (opciones.headers?.["If-None-Match"] === etag) return { status: 304, ok: false, headers: { get: () => etag }, json: async () => ({}) };
      // La API de contenidos puede deformar los binarios: su `content` no debe usarse
      const r = res({ sha: estado.sha, encoding: "base64", size: estado.bytes.length, content: Buffer.from("contenido deformado").toString("base64") });
      r.headers = { get: (n) => (n === "etag" ? etag : null) };
      return r;
    }
    if (alAntesDeEscribir) await alAntesDeEscribir(estado);
    const cuerpo = JSON.parse(opciones.body);
    if (!estado.rama) return res({ message: "Branch not found" }, 404);
    if (estado.sha && cuerpo.sha !== estado.sha) return res({ message: "conflict" }, 409);
    if (!estado.sha && cuerpo.sha) return res({ message: "invalid" }, 422);
    estado.bytes = new Uint8Array(Buffer.from(cuerpo.content, "base64"));
    estado.version++;
    estado.sha = `sha${estado.version}`;
    return res({ content: { sha: estado.sha } }, 200);
  };
  return { f, estado };
}

const crearSinc = (llave, f, extra = {}) =>
  S.crearSincronizador({
    llave,
    token: "token-falso",
    cliente: S.clienteGitHub({ token: "token-falso", fetch: f }),
    almacen: S.almacenMemoria(),
    temporizadores: { setTimeout: () => 0, clearTimeout: () => {} },
    ...extra,
  });

test("sincronizar escribe lo local en el remoto cifrado y lo lee desde otro equipo", async () => {
  const llave = L.nuevaLlave();
  const { f, estado } = githubFalso();
  const a = crearSinc(llave, f);
  await a.iniciar();
  await a.aplicar(item("uno", 10));
  await a.sincronizar();
  assert.equal(a.estado().estado, "sincronizado");
  assert.ok(L.esFragmento(estado.bytes));
  assert.ok(!Buffer.from(estado.bytes).toString("latin1").includes("texto uno"));

  const b = crearSinc(llave, f);
  await b.iniciar();
  await b.sincronizar();
  assert.deepEqual(b.items().map((i) => i.id), ["uno"]);
  assert.ok(estado.llamadas.some((l) => l.url.includes("/git/blobs/")), "el contenido se lee del blob, no de contents");
});

test("sin cambios remotos no se vuelve a bajar el blob ni se escribe", async () => {
  const llave = L.nuevaLlave();
  const { f, estado } = githubFalso();
  const a = crearSinc(llave, f);
  await a.iniciar();
  await a.aplicar(item("uno", 10));
  await a.sincronizar();
  await a.sincronizar(); // tras escribir no hay ETag aún: esta lectura lo obtiene
  const antes = estado.llamadas.length;
  await a.sincronizar();
  const nuevas = estado.llamadas.slice(antes);
  assert.equal(nuevas.length, 1, "solo consulta el sha");
  assert.equal(nuevas[0].metodo, "GET");
  assert.ok(nuevas[0].cabeceras["If-None-Match"], "la consulta es condicional (ETag)");
  // Un cambio local pendiente se escribe directo con el sha conocido, sin leer antes
  await a.aplicar(item("dos", 20));
  const antes2 = estado.llamadas.length;
  await a.sincronizar();
  const nuevas2 = estado.llamadas.slice(antes2).map((l) => l.metodo + (l.url.includes("blobs") ? ":blob" : ""));
  assert.deepEqual(nuevas2, ["PUT"], "escritura optimista: una sola petición");
  assert.deepEqual((await N.descifrarDatos(estado.bytes, llave)).map((i) => i.id).sort(), ["dos", "uno"]);
});

test("las peticiones llevan el token, la rama y usan la API (no raw.githubusercontent.com)", async () => {
  const llave = L.nuevaLlave();
  const { f, estado } = githubFalso();
  const a = crearSinc(llave, f);
  await a.iniciar();
  await a.aplicar(item("uno", 10));
  await a.sincronizar();
  for (const { url, cabeceras } of estado.llamadas) {
    assert.ok(url.startsWith("https://api.github.com/repos/wolyf/web/contents/subrayados.enc") || url.startsWith("https://api.github.com/repos/wolyf/web/git/blobs/"), url);
    assert.equal(cabeceras.Authorization, "Bearer token-falso");
  }
  assert.ok(estado.llamadas[0].url.includes("ref=subrayados"));
});

test("un 409 al escribir relee, mezcla y reintenta sin perder cambios de nadie", async () => {
  const llave = L.nuevaLlave();
  let inyectado = false;
  const { f, estado } = githubFalso({
    async alAntesDeEscribir(est) {
      if (inyectado) return;
      inyectado = true;
      // Otro equipo escribe justo antes que nosotros
      est.bytes = await N.cifrarDatos([item("ajeno", 50)], llave);
      est.version++;
      est.sha = `sha${est.version}`;
    },
  });
  const a = crearSinc(llave, f);
  await a.iniciar();
  await a.aplicar(item("mio", 40));
  await a.sincronizar();
  assert.equal(a.estado().estado, "sincronizado");
  const remoto = await N.descifrarDatos(estado.bytes, llave);
  assert.deepEqual(remoto.map((i) => i.id).sort(), ["ajeno", "mio"]);
  assert.deepEqual(a.items().map((i) => i.id).sort(), ["ajeno", "mio"]);
});

test("un 422 (archivo creado por otro) también se reintenta", async () => {
  const llave = L.nuevaLlave();
  let n = 0;
  const base = githubFalso({ existe: false });
  base.estado.rama = true;
  const f = async (url, o = {}) => {
    if (o.method === "PUT" && n++ === 0) {
      // Entre la lectura (404) y la escritura, otro equipo crea el archivo
      base.estado.bytes = await N.cifrarDatos([item("otro", 5)], llave);
      base.estado.sha = "shaX";
    }
    return base.f(url, o);
  };
  const a = crearSinc(llave, f);
  await a.iniciar();
  await a.aplicar(item("mio", 9));
  await a.sincronizar();
  assert.equal(a.estado().estado, "sincronizado");
  assert.deepEqual((await N.descifrarDatos(base.estado.bytes, llave)).map((i) => i.id).sort(), ["mio", "otro"]);
});

test("sin red: se guarda en local, queda «sin-conexion» y se sincroniza al volver", async () => {
  const llave = L.nuevaLlave();
  const { f, estado } = githubFalso();
  let enLinea = false;
  const almacen = S.almacenMemoria();
  const mk = () =>
    S.crearSincronizador({
      llave,
      token: "t",
      cliente: S.clienteGitHub({
        token: "t",
        fetch: (...args) => (enLinea ? f(...args) : Promise.reject(new TypeError("Failed to fetch"))),
      }),
      almacen,
      temporizadores: { setTimeout: () => 0, clearTimeout: () => {} },
    });
  const a = mk();
  await a.iniciar();
  await a.aplicar(item("offline", 10));
  await a.sincronizar();
  assert.equal(a.estado().estado, "sin-conexion");
  assert.equal(estado.bytes, null);

  // «Se cierra la pestaña»: otra instancia recupera lo pendiente de la caché cifrada
  const b = mk();
  await b.iniciar();
  assert.deepEqual(b.items().map((i) => i.id), ["offline"]);
  assert.equal(b.estado().sucio, true);
  enLinea = true;
  await b.sincronizar();
  assert.equal(b.estado().estado, "sincronizado");
  assert.deepEqual((await N.descifrarDatos(estado.bytes, llave)).map((i) => i.id), ["offline"]);
});

test("la caché local está cifrada y otra llave no la lee", async () => {
  const llave = L.nuevaLlave();
  const almacen = S.almacenMemoria();
  const a = S.crearSincronizador({ llave, almacen, temporizadores: { setTimeout: () => 0, clearTimeout: () => {} } });
  await a.aplicar(item("secreto", 1, { e: "texto muy privado" }));
  const guardado = await almacen.leer();
  assert.ok(!Buffer.from(guardado.cifrado).toString("latin1").includes("muy privado"));
  const otra = S.crearSincronizador({ llave: L.nuevaLlave(), almacen });
  await otra.iniciar();
  assert.deepEqual(otra.items(), []);
});

test("errores de GitHub se reportan como «error» y sin token también", async () => {
  const llave = L.nuevaLlave();
  const f = async () => ({ status: 401, ok: false, json: async () => ({}) });
  const a = crearSinc(llave, f);
  await a.iniciar();
  await a.aplicar(item("x", 1));
  await a.sincronizar();
  assert.equal(a.estado().estado, "error");
  assert.match(a.estado().detalle, /token/i);
  // Lo local se conserva
  assert.deepEqual(a.items().map((i) => i.id), ["x"]);

  const sinToken = S.crearSincronizador({ llave, temporizadores: { setTimeout: () => 0, clearTimeout: () => {} } });
  assert.equal(sinToken.estado().estado, "error");
  assert.equal(sinToken.conectado(), false);
});

test("una rama o un archivo ausentes no tumban la sincronización: falla con un mensaje claro", async () => {
  const llave = L.nuevaLlave();
  const { f } = githubFalso({ existe: false });
  const a = crearSinc(llave, f);
  await a.iniciar();
  await a.aplicar(item("x", 1));
  await a.sincronizar();
  assert.equal(a.estado().estado, "error");
  assert.match(a.estado().detalle, /rama/);
});

// ---- Anclaje aproximado ----

test("anclarAprox: una errata corregida dentro del subrayado se reancla", () => {
  const antes = "El caudal medio diaro se calcula con la dotación de proyecto, según el manual.";
  const c = N.citaDeTramo(antes, antes.indexOf("caudal"), antes.indexOf(", según"));
  const despues = "Capítulo nuevo. El caudal medio diario se calcula con la dotación de proyecto, según el manual.";
  assert.equal(N.anclar(despues, c), null, "la cita exacta ya no existe");
  const a = N.anclarTodo(despues, c);
  assert.equal(a.aprox, true);
  assert.equal(despues.slice(a.a, a.b), "caudal medio diario se calcula con la dotación de proyecto");
});

test("anclarAprox: una cifra que cambia dentro de una frase larga se sigue encontrando", () => {
  const antes = "La dotación media es de 150 litros por habitante y por día en climas cálidos.";
  const c = N.citaDeTramo(antes, antes.indexOf("La dotación"), antes.length - 1);
  const despues = "Notas. La dotación media es de 170 litros por habitante y por día en climas cálidos.";
  const a = N.anclarTodo(despues, c);
  assert.ok(a?.aprox);
  assert.match(despues.slice(a.a, a.b), /^La dotación media es de 170 litros/);
});

test("anclarAprox: demasiado distinto, o cita muy corta, queda huérfano", () => {
  const x = { e: "una explicación completamente distinta del tema", pre: "antes ", suf: " después" };
  assert.equal(N.anclarTodo("antes algo no relacionado en absoluto después", x), null);
  const corta = { e: "caudal", pre: "el ", suf: " medio" };
  assert.equal(N.anclarTodo("el caudl medio", corta), null, "menos de 12 caracteres no se busca de forma aproximada");
});

test("anclarTodo: lo exacto manda y lo ambiguo no se adivina con la búsqueda aproximada", () => {
  const exacto = N.anclarTodo("hola mundo cruel y duro", { e: "mundo cruel", pre: "", suf: "" });
  assert.equal(exacto.aprox, false);
  const x = { e: "una frase repetida igual", pre: "zzz ", suf: " zzz" };
  assert.equal(N.anclarTodo("aaa una frase repetida igual bbb. ccc una frase repetida igual ddd.", x), null);
});

test("mejorSubcadena devuelve la distancia de edición y el tramo", () => {
  assert.deepEqual(N.mejorSubcadena("abcdef", "xx abcdef yy"), { dist: 0, inicio: 3, fin: 9 });
  const r = N.mejorSubcadena("abcdef", "xx abXdef yy");
  assert.equal(r.dist, 1);
  assert.equal("xx abXdef yy".slice(r.inicio, r.fin), "abXdef");
});

// ---- Poda de lápidas y equipos estancados ----

test("podar quita solo las lápidas con más de 90 días", () => {
  const ahora = 200 * N.MS_DIA;
  const lista = [item("viva", 1), N.lapida(item("vieja", 1), 1), N.lapida(item("reciente", 1), ahora - 10 * N.MS_DIA)];
  assert.deepEqual(N.podar(lista, ahora).map((i) => i.id).sort(), ["reciente", "viva"]);
});

test("sinBorradosPodados: un equipo estancado descarta lo que el remoto ya no tiene, salvo lo nuevo", () => {
  const ahora = 500 * N.MS_DIA;
  const ultima = 100 * N.MS_DIA;
  const locales = [item("conocido", 50 * N.MS_DIA), item("nuevo", 300 * N.MS_DIA), item("enRemoto", 10)];
  const remotos = [item("enRemoto", 10)];
  assert.deepEqual(N.sinBorradosPodados(locales, remotos, ultima, ahora).map((i) => i.id).sort(), ["enRemoto", "nuevo"]);
  // Sincronizado hace poco: no se toca nada (la lápida aún existe en el remoto)
  assert.equal(N.sinBorradosPodados(locales, remotos, ahora - 5 * N.MS_DIA, ahora), locales);
  assert.equal(N.sinBorradosPodados(locales, remotos, null, ahora), locales);
});

test("la sincronización poda lápidas viejas del remoto y no resucita lo borrado", async () => {
  const llave = L.nuevaLlave();
  const { f, estado } = githubFalso();
  const dia = N.MS_DIA;
  const T = 1000 * dia;
  const vieja = N.lapida(item("borrado", 1), T - 120 * dia);
  estado.bytes = await N.cifrarDatos([vieja, item("vivo", T - dia)], llave);
  estado.sha = "shaInicial";
  estado.version = 1;
  const a = crearSinc(llave, f, { ahora: () => T });
  await a.iniciar();
  // Un equipo atrasado aún tiene la versión viva (t anterior a la lápida)
  await a.aplicar(item("borrado", 0));
  await a.sincronizar();
  const remoto = await N.descifrarDatos(estado.bytes, llave);
  assert.deepEqual(remoto.map((i) => i.id), ["vivo"], "la lápida vieja se podó y no quedó la versión viva");
});

test("un equipo estancado (más de 60 días) descarta lo que el remoto ya no tiene", async () => {
  const llave = L.nuevaLlave();
  const { f, estado } = githubFalso();
  const almacen = S.almacenMemoria();
  const dia = N.MS_DIA;
  const T0 = 1000 * dia;
  const a = crearSinc(llave, f, { almacen, ahora: () => T0 });
  await a.iniciar();
  await a.aplicar(item("antiguo", T0 - 5), item("otro", T0 - 4));
  await a.sincronizar();
  // Pasa el tiempo: el remoto podó la lápida de «antiguo» y ya no lo tiene
  estado.bytes = await N.cifrarDatos([item("otro", T0 - 4)], llave);
  estado.version++;
  estado.sha = `sha${estado.version}`;
  const b = crearSinc(llave, f, { almacen, ahora: () => T0 + 70 * dia });
  await b.iniciar();
  await b.aplicar(item("creado-sin-red", T0 + 69 * dia));
  await b.sincronizar();
  assert.deepEqual(b.items().map((i) => i.id).sort(), ["creado-sin-red", "otro"]);
});

// ---- Escritura optimista ----

test("si la escritura directa da 409 se relee, se mezcla y no se pierde nada", async () => {
  const llave = L.nuevaLlave();
  const { f, estado } = githubFalso();
  const a = crearSinc(llave, f);
  await a.iniciar();
  await a.aplicar(item("uno", 10));
  await a.sincronizar();
  // Otro equipo escribe; nuestro sha ya es viejo
  estado.bytes = await N.cifrarDatos([item("uno", 10), item("ajeno", 99)], llave);
  estado.version++;
  estado.sha = `sha${estado.version}`;
  await a.aplicar(item("dos", 20));
  await a.sincronizar();
  assert.equal(a.estado().estado, "sincronizado");
  assert.deepEqual((await N.descifrarDatos(estado.bytes, llave)).map((i) => i.id).sort(), ["ajeno", "dos", "uno"]);
});

// ---- Rutas ----

test("renombrarRutas: ruta exacta o carpeta, y los cambiados ganan la mezcla", () => {
  const lista = [item("a", 5, { p: "viejo/pag.html" }), item("b", 5, { p: "viejo/sub/otra.html" }), item("c", 5, { p: "otro/x.html" })];
  const exacta = N.renombrarRutas(lista, "viejo/pag.html", "nuevo/pag.html", 100);
  assert.deepEqual(exacta.map((i) => [i.id, i.p]), [["a", "nuevo/pag.html"]]);
  const carpeta = N.renombrarRutas(lista, "viejo/", "nuevo/", 100);
  assert.deepEqual(carpeta.map((i) => i.p).sort(), ["nuevo/pag.html", "nuevo/sub/otra.html"]);
  const m = N.mezclar(lista, carpeta);
  assert.equal(m.find((i) => i.id === "a").p, "nuevo/pag.html");
  assert.equal(m.find((i) => i.id === "c").p, "otro/x.html");
});

test("migrarRutas mueve los subrayados de una página y de una carpeta en el remoto", async () => {
  const llave = L.nuevaLlave();
  const { f, estado } = githubFalso();
  estado.bytes = await N.cifrarDatos([item("a", 5, { p: "viejo/pag.html" }), item("b", 5, { p: "viejo/sub/x.html" }), item("c", 5, { p: "otro/y.html" })], llave);
  estado.sha = "sha0";
  estado.version = 1;
  assert.equal(await migrarRutas({ token: "t", llave, desde: "viejo/", hasta: "nuevo/", fetch: f, ahora: () => 100 }), 2);
  const remoto = await N.descifrarDatos(estado.bytes, llave);
  assert.deepEqual(remoto.map((i) => [i.id, i.p]), [["a", "nuevo/pag.html"], ["b", "nuevo/sub/x.html"], ["c", "otro/y.html"]]);
  assert.equal(await migrarRutas({ token: "t", llave, desde: "otro/y.html", hasta: "nuevo/z.html", fetch: f }), 1);
  assert.equal(await migrarRutas({ token: "t", llave, desde: "nada/", hasta: "nuevo2/", fetch: f }), 0);
  await assert.rejects(migrarRutas({ token: "t", llave, desde: "a/", hasta: "b", fetch: f }));
});

// ---- Varias pestañas ----

// Web Locks mínimo: exclusivo por nombre, en cola
function locksFalsos() {
  const colas = new Map();
  return {
    async request(nombre, opciones, fn) {
      const previo = colas.get(nombre) ?? Promise.resolve();
      const mio = previo.then(() => fn());
      colas.set(nombre, mio.catch(() => {}));
      return mio;
    },
  };
}

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
const docFalso = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };

test("con varias pestañas solo la líder consulta y los cambios viajan por el canal", async () => {
  const llave = L.nuevaLlave();
  const { f, estado } = githubFalso();
  const locks = locksFalsos();
  const nombre = `wr-prueba-${Math.random()}`;
  const contar = () => estado.llamadas.filter((l) => l.metodo === "GET").length;
  const mk = () => {
    const coordinador = crearCoordinador({ nombre, locks });
    const s = crearSinc(llave, f, { coordinador, periodo: 25, latido: 10_000, espera: 15, temporizadores: { setTimeout, clearTimeout } });
    return { s, coordinador };
  };
  const A = mk();
  await esperar(5);
  const B = mk();
  try {
    assert.equal(A.coordinador.esLider(), true);
    assert.equal(B.coordinador.esLider(), false);
    await A.s.iniciar();
    await B.s.iniciar();
    A.s.arrancar(docFalso, null);
    B.s.arrancar(docFalso, null);
    await esperar(200);
    const consultasA = contar();
    assert.ok(consultasA >= 3, `la líder consulta periódicamente (${consultasA})`);

    // Un cambio en la pestaña B llega a A por el canal sin esperar a GitHub
    await B.s.aplicar(item("desdeB", 10));
    await esperar(30);
    assert.ok(A.s.items().some((i) => i.id === "desdeB"));
    await esperar(150);
    assert.deepEqual((await N.descifrarDatos(estado.bytes, llave)).map((i) => i.id), ["desdeB"]);

    // Se cierra la líder: la otra pestaña toma el relevo y sigue consultando
    A.s.detener();
    A.coordinador.cerrar();
    await esperar(20);
    assert.equal(B.coordinador.esLider(), true);
    const antes = contar();
    await esperar(150);
    assert.ok(contar() > antes, "la nueva líder consulta");

  } finally {
    A.s.detener();
    A.coordinador.cerrar();
    B.s.detener();
    B.coordinador.cerrar();
  }
});

test("la pestaña no líder no consulta por su cuenta", async () => {
  const llave = L.nuevaLlave();
  const { f, estado } = githubFalso();
  const locks = locksFalsos();
  const nombre = `wr-prueba-${Math.random()}`;
  const lider = crearCoordinador({ nombre, locks });
  await esperar(5);
  const seguidora = crearCoordinador({ nombre, locks });
  const s = crearSinc(llave, f, { coordinador: seguidora, periodo: 20, latido: 10_000 });
  await s.iniciar();
  s.arrancar(docFalso, null);
  await esperar(120);
  assert.equal(estado.llamadas.length, 0);
  s.detener();
  seguidora.cerrar();
  lider.cerrar();
});

test("sin Web Locks la pestaña es líder y todo funciona como antes", () => {
  const c = crearCoordinador({ nombre: `wr-prueba-${Math.random()}`, locks: null });
  assert.equal(c.esLider(), true);
  c.cerrar();
});

// ---- Rama «subrayados» (herramientas/sesion.mjs) ----

test("crearRama: sin rama crea un commit huérfano con subrayados.enc cifrado", async () => {
  const llave = L.nuevaLlave();
  const llamadas = [];
  const f = async (url, o = {}) => {
    const ruta = url.replace("https://api.github.com/repos/wolyf/web/", "");
    const cuerpo = o.body ? JSON.parse(o.body) : null;
    llamadas.push({ metodo: o.method, ruta, cuerpo });
    const res = (json, status) => ({ status, json: async () => json });
    if (ruta.startsWith("branches/")) return res({}, 404);
    if (ruta === "git/blobs") return res({ sha: "blob1" }, 201);
    if (ruta === "git/trees") return res({ sha: "arbol1" }, 201);
    if (ruta === "git/commits") return res({ sha: "commit1" }, 201);
    if (ruta === "git/refs") return res({}, 201);
    throw new Error(`ruta inesperada ${ruta}`);
  };
  assert.equal(await crearRama({ token: "t", llave, fetch: f }), "creada");
  const commit = llamadas.find((l) => l.ruta === "git/commits").cuerpo;
  assert.deepEqual(commit.parents, [], "la rama nace sin historial de main");
  assert.equal(llamadas.find((l) => l.ruta === "git/refs").cuerpo.ref, "refs/heads/subrayados");
  const blob = llamadas.find((l) => l.ruta === "git/blobs").cuerpo;
  assert.deepEqual(await N.descifrarDatos(Buffer.from(blob.content, "base64"), llave), []);
});

test("crearRama: si la rama y el archivo existen no hace nada", async () => {
  const f = async (url) => ({ status: 200, json: async () => ({}) });
  assert.equal(await crearRama({ token: "t", llave: L.nuevaLlave(), fetch: f }), "existe");
});

// ---- datos/acceso.json y el repositorio ----

test("el token de acceso.json (si hay) es retrocompatible y no está en claro", () => {
  const acceso = JSON.parse(fs.readFileSync(new URL("datos/acceso.json", RAIZ), "utf8"));
  assert.ok(acceso.usuarios && acceso.huella, "los campos anteriores siguen");
  if (acceso.token) {
    assert.ok(acceso.token.iv && acceso.token.dato);
    assert.doesNotMatch(JSON.stringify(acceso), /github_pat_|ghp_/);
  }
});

test("main no lleva subrayados.enc (vive en la rama «subrayados»)", () => {
  assert.ok(!fs.existsSync(new URL("subrayados.enc", RAIZ)));
});

test("el módulo de subrayados no escribe el token en almacenamiento web ni lo registra", () => {
  const sinComentarios = (t) => t.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  const fuente = ["js/subrayados.mjs", "js/subrayados-sync.mjs"].map((r) => sinComentarios(fs.readFileSync(new URL(r, RAIZ), "utf8"))).join("\n");
  assert.doesNotMatch(fuente, /(?:local|session)Storage\.setItem\([^)]*token/i);
  assert.doesNotMatch(fuente, /console\.\w+\([^)]*token/i);
  assert.doesNotMatch(fuente, /raw\.githubusercontent\.com/);
  for (const r of ["js/subrayados.mjs", "js/subrayados-sync.mjs", "js/subrayados-nucleo.mjs", "js/subrayados-coord.mjs"]) {
    assert.ok(!fs.readFileSync(new URL(r, RAIZ), "utf8").includes("\u2014"), `${r} tiene el guion largo`);
  }
});
