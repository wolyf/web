// Pruebas de la sincronización cifrada de Anki personal (anki/js/sync.mjs) con una API de GitHub simulada
import test from "node:test";
import assert from "node:assert/strict";
import * as Y from "../../js/sync.mjs";
import * as M from "../../js/modelo.mjs";
import * as S from "../../js/scheduler.mjs";
import * as L from "../../../js/llaves.mjs";

const SIN_TEMPORIZADOR = { setTimeout: () => 0, clearTimeout: () => {} };

// GitHub falso con varios archivos: contenidos (solo sha), blobs (bytes exactos) y PUT con conflicto
function githubFalso({ rama = true, alAntesDeEscribir } = {}) {
  const archivos = new Map(); // ruta → { bytes, sha }
  const blobs = new Map();
  const estado = { archivos, escrituras: [], llamadas: [], rama, enLinea: true };
  let version = 0;
  const res = (cuerpo, status = 200, cabeceras = {}) => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => cuerpo,
    headers: { get: (n) => cabeceras[n.toLowerCase()] ?? null },
  });
  const f = async (url, o = {}) => {
    if (!estado.enLinea) throw new TypeError("Failed to fetch");
    const metodo = o.method ?? "GET";
    const u = new URL(url);
    estado.llamadas.push({ metodo, ruta: u.pathname });
    if (metodo === "GET" && u.pathname.includes("/git/blobs/")) {
      const sha = u.pathname.split("/").pop();
      const bytes = blobs.get(sha);
      if (!bytes) return res({ message: "Not Found" }, 404);
      return res({ sha, encoding: "base64", content: Buffer.from(bytes).toString("base64") });
    }
    const ruta = decodeURIComponent(u.pathname.split("/contents/")[1]);
    if (metodo === "GET") {
      const a = archivos.get(ruta);
      if (!a) return res({ message: "Not Found" }, 404);
      const etag = `W/"${a.sha}"`;
      if (o.headers?.["If-None-Match"] === etag) return res({}, 304, { etag });
      return res({ sha: a.sha }, 200, { etag });
    }
    if (alAntesDeEscribir) await alAntesDeEscribir(estado, ruta);
    const cuerpo = JSON.parse(o.body);
    if (!estado.rama) return res({ message: "Branch not found" }, 404);
    const a = archivos.get(ruta);
    if (a && cuerpo.sha !== a.sha) return res({ message: "conflict" }, 409);
    if (!a && cuerpo.sha) return res({ message: "invalid" }, 422);
    const bytes = new Uint8Array(Buffer.from(cuerpo.content, "base64"));
    const sha = `sha${++version}`;
    archivos.set(ruta, { bytes, sha });
    blobs.set(sha, bytes);
    estado.escrituras.push({ ruta, mensaje: cuerpo.message, rama: cuerpo.branch });
    return res({ content: { sha } });
  };
  return { f, estado };
}

const basica = (id, extra = {}) => ({ id, tipo: "basico", frente: `¿${id}?`, reverso: `R-${id}`, ...extra });
const dispositivo = (llave, f, reloj, extra = {}) =>
  Y.crearAnki({ llave, token: "token-falso", fetch: f, ahora: () => reloj.t, temporizadores: SIN_TEMPORIZADOR, ...extra });
const ids = (lista) => lista.map((x) => x.id);

test("dos dispositivos convergen: tarjetas y repasos viajan cifrados por la rama anki", async () => {
  const { f, estado } = githubFalso();
  const llave = L.nuevaLlave();
  const relojA = { t: 1000 };
  const relojB = { t: 2000 };
  const A = dispositivo(llave, f, relojA);
  const B = dispositivo(llave, f, relojB);
  await Promise.all([A.iniciar(), B.iniciar()]);

  await A.guardarTarjeta(basica("a1", { frente: "SECRETO-A" }));
  await A.registrarRepaso("a1", 3);
  await A.vaciar();
  assert.equal(A.estado().estado, "sincronizado");
  assert.equal(A.estado().sucio, false);

  await B.sincronizar();
  assert.deepEqual(ids(B.tarjetas.items()), ["a1"]);
  assert.equal(B.repasos.items().length, 1);

  relojB.t = 5000;
  await B.guardarTarjeta(basica("b1"));
  await B.registrarRepaso("a1", 4);
  await B.vaciar();
  await A.sincronizar();
  assert.deepEqual(ids(A.tarjetas.items()), ["a1", "b1"]);
  assert.deepEqual(A.repasos.items().map((r) => r.g), [3, 4]);

  // Nada en claro en el remoto, mensajes y rama propios
  for (const { bytes } of estado.archivos.values()) assert.equal(Buffer.from(bytes).includes("SECRETO-A"), false);
  assert.deepEqual([...estado.archivos.keys()].sort(), ["repasos.enc", "tarjetas.enc"]);
  assert.ok(estado.escrituras.every((e) => e.rama === "anki"));
  assert.ok(estado.escrituras.some((e) => e.ruta === "tarjetas.enc" && e.mensaje === "Actualiza tarjetas"));
  assert.ok(estado.escrituras.some((e) => e.ruta === "repasos.enc" && e.mensaje === "Actualiza repasos"));
});

test("conflicto: dos equipos que estudian sin conexión no se pisan y el estado coincide", async () => {
  const { f } = githubFalso();
  const llave = L.nuevaLlave();
  const relojA = { t: 1_000_000 };
  const relojB = { t: 1_000_500 };
  const A = dispositivo(llave, f, relojA);
  const B = dispositivo(llave, f, relojB);
  await Promise.all([A.iniciar(), B.iniciar()]);
  await A.guardarTarjeta(basica("x"));
  await A.vaciar();
  await B.sincronizar();

  // Ambos repasan la misma unidad «sin conexión» y luego sincronizan en cruz
  relojA.t += S.DIA;
  relojB.t += S.DIA + 60_000;
  await A.registrarRepaso("x", 3);
  await B.registrarRepaso("x", 1);
  await A.vaciar();
  await B.vaciar(); // PUT con sha viejo: 409, relee, mezcla y reintenta
  await A.sincronizar();

  assert.equal(A.repasos.items().length, 2);
  assert.deepEqual(A.repasos.items(), B.repasos.items());
  const a = S.reproducir(A.repasos.items());
  const b = S.reproducir(B.repasos.items());
  assert.deepEqual([...a.estados], [...b.estados]);
});

test("un conflicto en mitad de la escritura se resuelve sin perder el cambio ajeno", async () => {
  let intruso;
  const { f, estado } = githubFalso({
    alAntesDeEscribir: async (st, ruta) => {
      if (intruso && ruta === "repasos.enc") {
        const hacer = intruso;
        intruso = null;
        await hacer();
      }
    },
  });
  const llave = L.nuevaLlave();
  const A = dispositivo(llave, f, { t: 10 });
  const B = dispositivo(llave, f, { t: 20 });
  await Promise.all([A.iniciar(), B.iniciar()]);
  await A.registrarRepaso("u", 3);
  await A.vaciar();
  await B.sincronizar();
  await A.registrarRepaso("v", 2);
  await B.registrarRepaso("w", 4);
  intruso = async () => {
    await B.vaciar(); // B escribe justo antes que A: el PUT de A choca
  };
  await A.vaciar();
  const remotoFinal = await M.descifrarRepasos(estado.archivos.get("repasos.enc").bytes, llave);
  assert.deepEqual(remotoFinal.map((r) => r.u).sort(), ["u", "v", "w"]);
  assert.equal(A.estado().estado, "sincronizado");
});

test("sin conexión: lo estudiado se conserva cifrado en local y sube al volver la red", async () => {
  const { f, estado } = githubFalso();
  const llave = L.nuevaLlave();
  const almacenes = { tarjetas: Y.almacenMemoria(), repasos: Y.almacenMemoria() };
  const reloj = { t: 100 };
  const A = dispositivo(llave, f, reloj, { almacenes });
  await A.iniciar();
  await A.guardarTarjeta(basica("a"));
  await A.vaciar();

  estado.enLinea = false;
  reloj.t = 200;
  await A.registrarRepaso("a", 3);
  await A.vaciar();
  assert.equal(A.estado().estado, "sin-conexion");
  assert.equal(A.estado().sucio, true);

  // La pestaña se cierra y se reabre sin red: el repaso sigue ahí
  const A2 = dispositivo(llave, f, reloj, { almacenes });
  await A2.iniciar();
  assert.equal(A2.repasos.items().length, 1);
  assert.equal(A2.estado().sucio, true);

  estado.enLinea = true;
  await A2.sincronizar();
  assert.equal(A2.estado().estado, "sincronizado");
  assert.equal(A2.estado().sucio, false);
  const remoto = await M.descifrarRepasos(estado.archivos.get("repasos.enc").bytes, llave);
  assert.equal(remoto.length, 1);
});

test("el almacén local está cifrado: otra llave lo descarta y no lo lee", async () => {
  const { f } = githubFalso();
  const almacenes = { tarjetas: Y.almacenMemoria(), repasos: Y.almacenMemoria() };
  const A = dispositivo(L.nuevaLlave(), f, { t: 1 }, { almacenes, token: null, clientes: {} });
  await A.iniciar();
  await A.guardarTarjeta(basica("a", { frente: "SECRETO-LOCAL" }));
  const guardado = await almacenes.tarjetas.leer();
  assert.equal(Buffer.from(guardado.cifrado).includes("SECRETO-LOCAL"), false);
  const otra = dispositivo(L.nuevaLlave(), f, { t: 2 }, { almacenes, token: null });
  await otra.iniciar();
  assert.deepEqual(otra.tarjetas.items(), [], "con otra llave se descarta");
  assert.equal(await almacenes.tarjetas.leer(), null);
});

test("rama inexistente: error claro con el nombre de la rama, sin perder lo local", async () => {
  const { f } = githubFalso({ rama: false });
  const A = dispositivo(L.nuevaLlave(), f, { t: 1 });
  await A.iniciar();
  await A.guardarTarjeta(basica("a"));
  await A.vaciar();
  const e = A.estado();
  assert.equal(e.estado, "error");
  assert.match(e.detalle, /anki/);
  assert.equal(e.sucio, true);
  assert.deepEqual(ids(A.tarjetas.items()), ["a"]);
});

test("una llave distinta no puede leer el remoto y no lo sobrescribe", async () => {
  const { f, estado } = githubFalso();
  const A = dispositivo(L.nuevaLlave(), f, { t: 1 });
  await A.iniciar();
  await A.guardarTarjeta(basica("a"));
  await A.vaciar();
  const antes = estado.archivos.get("tarjetas.enc").sha;
  const intruso = dispositivo(L.nuevaLlave(), f, { t: 2 });
  await intruso.iniciar();
  await intruso.guardarTarjeta(basica("z"));
  await intruso.vaciar();
  assert.equal(intruso.estado().estado, "error");
  assert.match(intruso.estado().detalle, /descifrar/);
  assert.equal(estado.archivos.get("tarjetas.enc").sha, antes, "el archivo remoto no cambió");
});

test("sin token: estado de error explícito y todo sigue funcionando en local", async () => {
  const A = Y.crearAnki({ llave: L.nuevaLlave(), ahora: () => 5, temporizadores: SIN_TEMPORIZADOR });
  await A.iniciar();
  await A.guardarTarjeta(basica("a"));
  await A.sincronizar();
  assert.equal(A.estado().estado, "error");
  assert.match(A.estado().detalle, /token/);
  assert.equal(A.tarjetas.items().length, 1);
});

test("borrar deja lápida que gana a la versión anterior en otros equipos", async () => {
  const { f } = githubFalso();
  const llave = L.nuevaLlave();
  const relojA = { t: 10 };
  const relojB = { t: 10 };
  const A = dispositivo(llave, f, relojA);
  const B = dispositivo(llave, f, relojB);
  await Promise.all([A.iniciar(), B.iniciar()]);
  await A.guardarTarjeta(basica("a"));
  await A.vaciar();
  await B.sincronizar();
  relojA.t = 50;
  await A.borrarTarjeta("a");
  await A.vaciar();
  await B.sincronizar();
  assert.equal(B.tarjetas.items()[0].b, true);
  assert.deepEqual(M.unidadesDeTodas(B.tarjetas.items()), []);
});

test("las lecturas sin cambios usan If-None-Match (304) y no bajan el blob", async () => {
  const { f, estado } = githubFalso();
  const llave = L.nuevaLlave();
  const A = dispositivo(llave, f, { t: 1 });
  await A.iniciar();
  await A.guardarTarjeta(basica("a"));
  await A.vaciar();
  await A.sincronizar();
  const blobsAntes = estado.llamadas.filter((c) => c.ruta.includes("/git/blobs/")).length;
  await A.sincronizar();
  await A.sincronizar();
  assert.equal(estado.llamadas.filter((c) => c.ruta.includes("/git/blobs/")).length, blobsAntes);
});

test("flujo completo: una tarjeta nueva entra a la cola, se repasa y sale", async () => {
  const { f } = githubFalso();
  const llave = L.nuevaLlave();
  const reloj = { t: Date.UTC(2026, 10, 15, 12) };
  const A = dispositivo(llave, f, reloj);
  await A.iniciar();
  await A.guardarTarjeta({ id: M.idNuevo(reloj.t), tipo: "cloze", frente: "La {{c1::UNAM}} se fundó en {{c2::1910}}", etiquetas: ["historia::mexico"] });
  const unidades = () => M.unidadesDeTodas(A.tarjetas.items()).map((u) => u.uid);
  const cola = () => {
    const { estados, eventos } = S.reproducir(A.repasos.items());
    return S.cola({ unidades: unidades(), estados, eventos, ahora: reloj.t });
  };
  assert.equal(cola().nuevas.length, 2);
  const primera = cola().orden[0];
  await A.registrarRepaso(primera, 3);
  reloj.t += 10 * S.MIN;
  await A.registrarRepaso(primera, 3);
  assert.equal(cola().orden.includes(primera), false, "graduada a 1 día: ya no toca hoy");
  assert.equal(cola().nuevas.length, 1);
  await A.vaciar();
  assert.equal(A.estado().estado, "sincronizado");
});

// ---- Ninguna escritura se pierde en silencio ----

test("guardar una tarjeta inválida lanza un error y no toca nada", async () => {
  const A = Y.crearAnki({ llave: L.nuevaLlave(), ahora: () => 5, temporizadores: SIN_TEMPORIZADOR });
  await A.iniciar();
  await assert.rejects(A.guardarTarjeta({ id: "x", tipo: "cloze", frente: "sin huecos" }), /inválida/);
  await assert.rejects(A.guardarTarjeta({ id: "x", tipo: "basico", frente: "solo frente" }), /inválida/);
  await assert.rejects(A.guardarTarjeta({ id: "x", tipo: "raro", frente: "a", reverso: "b" }), /inválida/);
  assert.deepEqual(A.tarjetas.items(), []);
  assert.equal(A.estado().sucio, false);
});

test("registrar un repaso inválido lanza un error", async () => {
  const A = Y.crearAnki({ llave: L.nuevaLlave(), ahora: () => 5, temporizadores: SIN_TEMPORIZADOR });
  await A.iniciar();
  await assert.rejects(A.registrarRepaso("", 3), /inválido/);
  await assert.rejects(A.registrarRepaso("u", 7), /inválido/);
  assert.deepEqual(A.repasos.items(), []);
});

test("con el reloj atrasado, editar y borrar siguen ganando a la versión anterior", async () => {
  const reloj = { t: 10_000 };
  const A = Y.crearAnki({ llave: L.nuevaLlave(), ahora: () => reloj.t, temporizadores: SIN_TEMPORIZADOR });
  await A.iniciar();
  await A.guardarTarjeta(basica("a", { reverso: "v1" }));
  reloj.t = 3_000; // el reloj retrocedió
  await A.guardarTarjeta(basica("a", { reverso: "v2" }));
  const tarjeta = A.tarjetas.items()[0];
  assert.equal(tarjeta.reverso, "v2", "la edición no se descarta por tener t menor");
  assert.ok(tarjeta.t > 10_000);
  reloj.t = 1_000;
  await A.borrarTarjeta("a");
  assert.equal(A.tarjetas.items()[0].b, true, "el borrado tampoco");
});

test("repasos con el mismo reloj o con reloj atrasado no se descartan como duplicados", async () => {
  const reloj = { t: 50_000 };
  const A = Y.crearAnki({ llave: L.nuevaLlave(), ahora: () => reloj.t, temporizadores: SIN_TEMPORIZADOR });
  await A.iniciar();
  const t1 = await A.registrarRepaso("u", 3);
  const t2 = await A.registrarRepaso("u", 3); // mismo milisegundo
  reloj.t = 10;
  const t3 = await A.registrarRepaso("u", 1); // reloj atrasado
  assert.ok(t1 < t2 && t2 < t3);
  assert.equal(A.repasos.items().length, 3);
  assert.equal((await A.registrarRepaso("otra", 2)) , 10, "otra unidad conserva su propio reloj");
});

// ---- Carreras: cambios que llegan con una escritura en vuelo ----

test("un repaso aplicado mientras otro PUT está en vuelo no pierde su marca de pendiente", async () => {
  let liberar;
  let avisarEnVuelo;
  const enVuelo = new Promise((ok) => (avisarEnVuelo = ok));
  const puerta = new Promise((ok) => (liberar = ok));
  let armada = false;
  const { f, estado } = githubFalso({
    alAntesDeEscribir: async (st, ruta) => {
      if (armada && ruta === "repasos.enc") {
        armada = false;
        avisarEnVuelo();
        await puerta;
      }
    },
  });
  const llave = L.nuevaLlave();
  const A = dispositivo(llave, f, { t: 1000 });
  await A.iniciar();
  await A.registrarRepaso("u", 3);
  await A.repasos.sincronizar(); // crea el archivo y deja el sha conocido
  await A.registrarRepaso("v", 3);
  armada = true;
  const primera = A.repasos.sincronizar(); // el PUT queda detenido en la puerta
  await enVuelo;
  await A.registrarRepaso("w", 3); // llega mientras el PUT lleva solo u y v
  liberar();
  await primera;
  assert.equal(A.repasos.estado().sucio, true, "w sigue pendiente: el PUT no lo llevaba");
  await A.vaciar();
  assert.equal(A.repasos.estado().sucio, false);
  const remoto = await M.descifrarRepasos(estado.archivos.get("repasos.enc").bytes, llave);
  assert.deepEqual(remoto.map((r) => r.u).sort(), ["u", "v", "w"], "w llegó al remoto");
});

test("las copias locales se escriben en orden: nunca queda en caché una versión vieja", async () => {
  // Un almacén cuya primera escritura es lenta y las siguientes rápidas: si las copias no se
  // encadenan, la más vieja termina de escribirse la última y se queda como caché.
  let escrituras = 0;
  const terminadas = [];
  const almacen = {
    async leer() {
      return null;
    },
    async borrar() {},
    async escribir(valor) {
      const n = ++escrituras;
      await new Promise((ok) => setTimeout(ok, n === 1 ? 30 : 1));
      terminadas.push(valor);
    },
  };
  const llave = L.nuevaLlave();
  const A = Y.crearAnki({ llave, ahora: () => 5, temporizadores: SIN_TEMPORIZADOR, almacenes: { tarjetas: Y.almacenMemoria(), repasos: almacen } });
  await A.iniciar();
  // Cambios espaciados: la copia 1 toma su foto (1 repaso) y se queda escribiendo despacio; la
  // copia 2 (2 repasos) llega después y su escritura es rápida.
  const pausa = () => new Promise((ok) => setTimeout(ok, 8));
  const p1 = A.registrarRepaso("a", 3);
  await pausa();
  const p2 = A.registrarRepaso("b", 3);
  await pausa();
  const p3 = A.registrarRepaso("c", 3);
  await Promise.all([p1, p2, p3]);
  const ultima = terminadas.at(-1);
  assert.ok(ultima, "hubo escrituras");
  const lista = await M.descifrarRepasos(ultima.cifrado, llave);
  assert.equal(lista.length, 3, "la última copia que terminó de escribirse contiene los tres repasos");
  assert.equal(terminadas.length, escrituras, "todas las escrituras terminaron");
  assert.equal(ultima.sucio, true);
});

// ---- Lotes: pocos commits por sesión de estudio ----

function relojFalso(inicio = 1_000_000) {
  const r = { t: inicio, timers: new Set(), ultimo: 0 };
  r.ahora = () => r.t;
  r.T = {
    setTimeout: (fn, ms) => {
      const x = { id: ++r.ultimo, en: r.t + ms, fn };
      r.timers.add(x);
      return x;
    },
    clearTimeout: (x) => r.timers.delete(x),
  };
  // Avanza el reloj disparando los temporizadores que vencen, y espera a que terminen las escrituras
  r.avanzar = async (ms, esperar) => {
    const fin = r.t + ms;
    for (;;) {
      const p = [...r.timers].filter((x) => x.en <= fin).sort((a, b) => a.en - b.en)[0];
      if (!p) break;
      r.timers.delete(p);
      r.t = p.en;
      await p.fn();
      await esperar();
    }
    r.t = fin;
  };
  return r;
}

const putsDe = (estado, ruta) => estado.escrituras.filter((e) => e.ruta === ruta).length;

test("50 repasos, uno cada 5 s, hacen un solo commit de repasos al terminar", async () => {
  const { f, estado } = githubFalso();
  const llave = L.nuevaLlave();
  const reloj = relojFalso();
  const A = Y.crearAnki({ llave, token: "t", fetch: f, ahora: reloj.ahora, temporizadores: reloj.T });
  await A.iniciar();
  await A.guardarTarjeta(basica("a"));
  await reloj.avanzar(3000, () => A.sincronizar());
  const antes = putsDe(estado, "repasos.enc");
  for (let i = 0; i < 50; i++) {
    await A.registrarRepaso(`u${i % 10}`, 3);
    await reloj.avanzar(5000, () => A.sincronizar());
  }
  assert.equal(putsDe(estado, "repasos.enc") - antes, 0, "durante la sesión no se escribe: cada respuesta reinicia la espera");
  await A.vaciar();
  assert.equal(putsDe(estado, "repasos.enc") - antes, 1, "al terminar, un único commit");
  const remoto = await M.descifrarRepasos(estado.archivos.get("repasos.enc").bytes, llave);
  assert.equal(remoto.length, 50);
  assert.equal(A.estado().sucio, false);
});

test("una sesión de 20 minutos escribe cada 5 minutos como máximo y no pierde ningún repaso", async () => {
  const { f, estado } = githubFalso();
  const llave = L.nuevaLlave();
  const reloj = relojFalso();
  const A = Y.crearAnki({ llave, token: "t", fetch: f, ahora: reloj.ahora, temporizadores: reloj.T });
  await A.iniciar();
  await A.guardarTarjeta(basica("a"));
  await reloj.avanzar(3000, () => A.sincronizar());
  const antes = putsDe(estado, "repasos.enc");
  for (let i = 0; i < 240; i++) {
    await A.registrarRepaso(`u${i % 30}`, 3);
    await reloj.avanzar(5000, () => A.sincronizar());
  }
  const durante = putsDe(estado, "repasos.enc") - antes;
  assert.ok(durante >= 3 && durante <= 5, `${durante} commits en 20 min (esperaba entre 3 y 5)`);
  await A.vaciar();
  const remoto = await M.descifrarRepasos(estado.archivos.get("repasos.enc").bytes, llave);
  assert.equal(remoto.length, 240, "todos los repasos llegaron");
});

test("las tarjetas se escriben a los 2 s de la última edición (no esperan lotes largos)", async () => {
  const { f, estado } = githubFalso();
  const reloj = relojFalso();
  const A = Y.crearAnki({ llave: L.nuevaLlave(), token: "t", fetch: f, ahora: reloj.ahora, temporizadores: reloj.T });
  await A.iniciar();
  await A.guardarTarjeta(basica("a"));
  await reloj.avanzar(1500, () => A.sincronizar());
  assert.equal(putsDe(estado, "tarjetas.enc"), 0);
  await reloj.avanzar(1000, () => A.sincronizar());
  assert.equal(putsDe(estado, "tarjetas.enc"), 1);
});
