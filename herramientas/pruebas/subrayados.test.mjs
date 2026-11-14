// Pruebas de los subrayados sincronizados (js/subrayados-*.mjs y herramientas/sesion.mjs)

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as L from "../../js/llaves.mjs";
import * as N from "../../js/subrayados-nucleo.mjs";
import * as S from "../../js/subrayados-sync.mjs";
import { crearRama } from "../sesion.mjs";

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
      // La API de contenidos puede deformar los binarios: su `content` no debe usarse
      return res({ sha: estado.sha, encoding: "base64", size: estado.bytes.length, content: Buffer.from("contenido deformado").toString("base64") });
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
  const antes = estado.llamadas.length;
  await a.sincronizar();
  const nuevas = estado.llamadas.slice(antes);
  assert.equal(nuevas.length, 1, "solo consulta el sha");
  assert.equal(nuevas[0].metodo, "GET");
  // Un cambio local pendiente se escribe sin releer el blob
  await a.aplicar(item("dos", 20));
  const antes2 = estado.llamadas.length;
  await a.sincronizar();
  const nuevas2 = estado.llamadas.slice(antes2).map((l) => l.metodo + (l.url.includes("blobs") ? ":blob" : ""));
  assert.deepEqual(nuevas2, ["GET", "PUT"]);
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
  for (const r of ["js/subrayados.mjs", "js/subrayados-sync.mjs", "js/subrayados-nucleo.mjs"]) {
    assert.ok(!fs.readFileSync(new URL(r, RAIZ), "utf8").includes("\u2014"), `${r} tiene el guion largo`);
  }
});
