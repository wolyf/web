// Pruebas del núcleo y la sincronización del Espacio de estudio (sin red: cliente simulado)

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as L from "../../../js/llaves.mjs";
import * as N from "../../js/nucleo.mjs";
import { crearEstado, ErrorSync } from "../../js/sync.mjs";

const RAIZ = new URL("../../../", import.meta.url);
const leerJSON = (ruta) => JSON.parse(fs.readFileSync(new URL(ruta, RAIZ), "utf8"));
const LLAVE = L.nuevaLlave();

const r = (id, e, t, n) => ({ id, e, t, ...(n ? { n } : {}) });

// ---- Mezcla ----

test("mezclar: gana el mayor t y con t igual el contenido mayor", () => {
  const a = [r("m/x", "leyendo", 5)];
  const b = [r("m/x", "leida", 9)];
  assert.equal(N.mezclar(a, b)[0].e, "leida");
  assert.equal(N.mezclar(b, a)[0].e, "leida");
  const c = [r("m/x", "leida", 5)];
  assert.deepEqual(N.mezclar(a, c), N.mezclar(c, a));
});

test("mezclar es conmutativa, asociativa e idempotente (propiedad con datos al azar)", () => {
  const azar = (() => {
    let s = 12345;
    return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  })();
  const lista = () =>
    Array.from({ length: 12 }, () => r(`m/${Math.floor(azar() * 5)}`, N.ESTADOS[Math.floor(azar() * 4)], Math.floor(azar() * 6), azar() < 0.4 ? "nota" + Math.floor(azar() * 3) : undefined));
  for (let i = 0; i < 200; i++) {
    const [x, y, z] = [lista(), lista(), lista()];
    assert.deepEqual(N.mezclar(x, y), N.mezclar(y, x));
    assert.deepEqual(N.mezclar(N.mezclar(x, y), z), N.mezclar(x, N.mezclar(y, z)));
    assert.deepEqual(N.mezclar(x, x), N.mezclar(x));
  }
});

test("canonico descarta registros inválidos y recorta la nota", () => {
  assert.equal(N.canonico({ id: "", e: "leida", t: 1 }), null);
  assert.equal(N.canonico({ id: "a", e: "terminada", t: 1 }), null);
  assert.equal(N.canonico({ id: "a", e: "leida", t: -1 }), null);
  assert.equal(N.canonico({ id: "a", e: "leida", t: NaN }), null);
  assert.equal(N.canonico({ id: "a", e: "leida", t: 1, n: "x".repeat(900) }).n.length, N.MAX_NOTA);
  assert.equal("n" in N.canonico({ id: "a", e: "leida", t: 1, n: "   " }), false);
  assert.deepEqual(N.mezclar([{ id: "a", e: "x", t: 1 }, null, 3]), []);
});

test("registro siempre gana al previo aunque el reloj vaya atrasado", () => {
  const previo = [r("m/x", "leyendo", 1000)];
  const nuevo = N.registro(previo, "m/x", "leida", { ahora: 10 });
  assert.equal(nuevo.t, 1001);
  assert.equal(N.mezclar(previo, [nuevo])[0].e, "leida");
  assert.throws(() => N.registro([], "m/x", "otro"));
});

test("registro conserva la nota previa salvo que se dé una nueva (o vacía para quitarla)", () => {
  const p = [r("m/x", "leyendo", 1, "ojo")];
  assert.equal(N.registro(p, "m/x", "leida", { ahora: 5 }).n, "ojo");
  assert.equal(N.registro(p, "m/x", "leida", { n: "otra", ahora: 5 }).n, "otra");
  assert.equal("n" in N.registro(p, "m/x", "leida", { n: "", ahora: 5 }), false);
});

test("el formato cifrado ida y vuelta, y no se descifra con otra llave ni con otro uso", async () => {
  const items = [r("m/a", "leida", 3, "una nota"), r("m/b", "leyendo", 4)];
  const bytes = await N.cifrar(items, LLAVE);
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 4)), "WRF1");
  assert.deepEqual(await N.descifrar(bytes, LLAVE), items);
  await assert.rejects(N.descifrar(bytes, L.nuevaLlave()));
  // Con la llave de los fragmentos (otro uso de la misma llave) tampoco
  await assert.rejects(L.descifrarFragmento(bytes, LLAVE));
  assert.ok(!Buffer.from(bytes).toString("latin1").includes("una nota"), "la nota no debe verse en claro");
});

test("contar y siguientes", () => {
  const materias = { m: { ruta: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }] }, z: { ruta: [{ id: "q" }] } };
  const items = [r("m/a", "leida", 1), r("m/b", "apuntada", 2), r("m/c", "leyendo", 7)];
  const c = N.contar(N.idsDeMateria("m", materias.m), items);
  assert.deepEqual([c.leida, c.apuntada, c.leyendo, c.pendiente, c.hechas, c.fraccion], [1, 1, 1, 1, 2, 0.5]);
  assert.equal(N.contar([], []).fraccion, 0);
  const sig = N.siguientes(materias, items, 5);
  assert.deepEqual(sig.map((s) => `${s.materia}/${s.entrada.id}`), ["m/c", "m/d", "z/q"]);
});

// ---- Manifiestos reales ----

test("los manifiestos de materias son válidos y cada materia tiene su archivo", () => {
  const indice = leerJSON("estudio/datos/estudio.json");
  assert.ok(Object.keys(indice.areas).length >= 1);
  for (const id of indice.materias) {
    const m = leerJSON(`estudio/datos/materias/${id}.json`);
    assert.deepEqual(N.validarMateria(id, m, indice.areas), []);
  }
  const archivos = fs.readdirSync(new URL("estudio/datos/materias/", RAIZ)).filter((f) => f.endsWith(".json"));
  assert.deepEqual(archivos.map((f) => f.replace(/\.json$/, "")).sort(), [...indice.materias].sort(), "materias sin registrar o archivos sobrantes");
});

test("validarMateria detecta los errores típicos", () => {
  const base = { nombre: "X", area: "a", secciones: [{ id: "s", nombre: "S" }], fuentes: { f: { titulo: "F", texto: false } }, ruta: [{ id: "e", titulo: "E", rol: "principal", seccion: "s", fuente: "f" }] };
  const areas = { a: {} };
  assert.deepEqual(N.validarMateria("x", base, areas), []);
  const con = (cambio) => N.validarMateria("x", { ...base, ...cambio }, areas);
  assert.ok(con({ area: "b" }).length);
  assert.ok(con({ ruta: [{ ...base.ruta[0], fuente: "nada" }] }).length);
  assert.ok(con({ ruta: [{ ...base.ruta[0], rol: "otro" }] }).length);
  assert.ok(con({ ruta: [{ ...base.ruta[0], seccion: "nada" }] }).length);
  assert.ok(con({ ruta: [base.ruta[0], base.ruta[0]] }).length);
  assert.ok(con({ ruta: [{ ...base.ruta[0], complementos: ["nada"] }] }).length);
});

test("cada fuente con texto tiene su .enc y su página, y ninguna sin texto los tiene", () => {
  const indice = leerJSON("estudio/datos/estudio.json");
  for (const id of indice.materias) {
    const m = leerJSON(`estudio/datos/materias/${id}.json`);
    for (const [fid, f] of Object.entries(m.fuentes)) {
      const enc = fs.existsSync(new URL(`estudio/${id}/${fid}.enc`, RAIZ));
      const pagina = fs.existsSync(new URL(`estudio/${id}/${fid}.html`, RAIZ));
      assert.equal(enc, f.texto, `${id}/${fid}.enc ${f.texto ? "falta" : "sobra"}`);
      assert.equal(pagina, f.texto, `${id}/${fid}.html ${f.texto ? "falta" : "sobra"}`);
    }
  }
});

test("las lecturas publicadas están cifradas: nada de su texto en claro en estudio/", () => {
  const indice = leerJSON("estudio/datos/estudio.json");
  for (const id of indice.materias) {
    const dir = new URL(`estudio/${id}/`, RAIZ);
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".enc"))) {
      const bytes = fs.readFileSync(new URL(f, dir));
      assert.equal(bytes.subarray(0, 4).toString(), "WRF1", `${f} no es un fragmento cifrado`);
      // Cadenas largas: en bytes al azar no aparecen (una corta saldría por casualidad)
      for (const marca of ["<style", "<div", "<span", "Sócrates", "Platón"]) assert.equal(bytes.includes(Buffer.from(marca)), false, `${f} contiene «${marca}» en claro`);
    }
  }
  assert.ok(fs.readFileSync(new URL(".gitignore", RAIZ), "utf8").split("\n").includes(".privado/"));
});

test("el estudio no usa el guion largo en sus archivos propios (salvo los textos cifrados)", () => {
  const revisar = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = new URL(e.name + (e.isDirectory() ? "/" : ""), dir);
      if (e.isDirectory()) revisar(ruta);
      else if (/\.(html|css|mjs|js|json|md)$/.test(e.name)) assert.ok(!fs.readFileSync(ruta, "utf8").includes(String.fromCharCode(0x2014)), `${ruta.pathname} tiene un guion largo`);
    }
  };
  revisar(new URL("estudio/", RAIZ));
});

// ---- Sincronización con un remoto simulado ----

function remotoSimulado(inicial = null) {
  const r = { bytes: inicial, sha: inicial ? "s0" : null, n: 0, escrituras: 0, lecturas: 0, falla: null, antesDeEscribir: null };
  const cliente = {
    async leer(conocido) {
      r.lecturas++;
      if (r.falla) throw r.falla;
      if (conocido && conocido === r.sha) return { sinCambios: true };
      return { bytes: r.bytes, sha: r.sha };
    },
    async escribir(bytes, shaPrevio) {
      if (r.falla) throw r.falla;
      await r.antesDeEscribir?.();
      if ((shaPrevio ?? null) !== r.sha) return { conflicto: true };
      r.bytes = bytes;
      r.sha = `s${++r.n}`;
      r.escrituras++;
      return { sha: r.sha };
    },
  };
  return { r, cliente };
}

const sinReloj = { setTimeout: () => 1, clearTimeout: () => {} };
const nuevo = (cliente, extra = {}) => crearEstado({ llave: LLAVE, cliente, temporizadores: sinReloj, ...extra });

test("marcar y sincronizar crea el archivo remoto cifrado; otro equipo lo lee", async () => {
  const { r, cliente } = remotoSimulado(await N.cifrar([], LLAVE));
  const a = nuevo(cliente);
  await a.iniciar();
  await a.marcar("m/x", "leida", "me gustó");
  assert.equal(a.estadoDe("m/x"), "leida");
  assert.equal(a.estado().sucio, true);
  await a.sincronizar();
  assert.equal(a.estado().estado, "sincronizado");
  assert.equal(a.estado().sucio, false);
  assert.equal(r.escrituras, 1);
  const b = nuevo(cliente);
  await b.iniciar();
  await b.sincronizar();
  assert.equal(b.estadoDe("m/x"), "leida");
  assert.equal(b.notaDe("m/x"), "me gustó");
});

test("dos equipos cambian cosas distintas sin conexión y no se pierde nada", async () => {
  const { r, cliente } = remotoSimulado(await N.cifrar([], LLAVE));
  const a = nuevo(cliente, { almacen: undefined });
  const b = nuevo(cliente);
  await a.iniciar();
  await b.iniciar();
  await a.marcar("m/a", "leida");
  await b.marcar("m/b", "leyendo");
  await a.sincronizar();
  await b.sincronizar(); // conflicto: b relee, mezcla y reescribe
  await a.sincronizar();
  for (const x of [a, b]) {
    assert.equal(x.estadoDe("m/a"), "leida");
    assert.equal(x.estadoDe("m/b"), "leyendo");
  }
  assert.equal((await N.descifrar(r.bytes, LLAVE)).length, 2);
});

test("un conflicto en pleno PUT (409) se resuelve releyendo y mezclando", async () => {
  const { r, cliente } = remotoSimulado(await N.cifrar([], LLAVE));
  const a = nuevo(cliente);
  await a.iniciar();
  await a.sincronizar(); // aprende el sha
  await a.marcar("m/a", "leida");
  let una = true;
  r.antesDeEscribir = async () => {
    if (!una) return;
    una = false;
    // Otro equipo escribe justo antes que nosotros
    r.bytes = await N.cifrar([r_(["m/z", "apuntada", 99])], LLAVE);
    r.sha = "s-ajeno";
  };
  await a.sincronizar();
  assert.equal(a.estadoDe("m/z"), "apuntada");
  assert.equal(a.estadoDe("m/a"), "leida");
  assert.equal(a.estado().estado, "sincronizado");
  assert.equal((await N.descifrar(r.bytes, LLAVE)).length, 2);
});
const r_ = ([id, e, t]) => ({ id, e, t });

test("sin rama (remoto vacío) se crea el archivo; si no se puede, error claro", async () => {
  const { r, cliente } = remotoSimulado(null);
  const a = nuevo(cliente);
  await a.iniciar();
  await a.marcar("m/a", "leida");
  await a.sincronizar();
  assert.equal(r.escrituras, 1);
  assert.equal(a.estado().estado, "sincronizado");
  // Un cliente que siempre da conflicto sobre archivo inexistente => la rama no existe
  const roto = { leer: async () => ({ bytes: null, sha: null }), escribir: async () => ({ conflicto: true }) };
  const b = nuevo(roto);
  await b.iniciar();
  await b.marcar("m/a", "leida");
  await b.sincronizar();
  assert.equal(b.estado().estado, "error");
  assert.match(b.estado().detalle, /rama/);
  assert.equal(b.estadoDe("m/a"), "leida", "el cambio no se pierde en local");
});

test("sin red queda pendiente y se sube al volver; la caché local es cifrada y se recupera", async () => {
  const { r, cliente } = remotoSimulado(await N.cifrar([], LLAVE));
  const almacen = (await import("../../js/sync.mjs")).almacenMemoria();
  const a = nuevo(cliente, { almacen });
  await a.iniciar();
  r.falla = new ErrorSync("Sin conexión", "sin-conexion");
  await a.marcar("m/a", "leida");
  await a.sincronizar();
  assert.equal(a.estado().estado, "sin-conexion");
  assert.equal(a.estado().sucio, true);
  // "Reabrir la página": un estado nuevo con el mismo almacén recupera lo pendiente
  const guardado = await almacen.leer();
  assert.ok(!Buffer.from(guardado.cifrado).toString("latin1").includes("leida"), "la caché local debe ir cifrada");
  const b = nuevo(cliente, { almacen });
  await b.iniciar();
  assert.equal(b.estadoDe("m/a"), "leida");
  assert.equal(b.estado().sucio, true);
  r.falla = null;
  await b.sincronizar();
  assert.equal(b.estado().sucio, false);
  assert.equal((await N.descifrar(r.bytes, LLAVE)).length, 1);
});

test("un cambio que llega con un PUT en vuelo sigue pendiente", async () => {
  const { r, cliente } = remotoSimulado(await N.cifrar([], LLAVE));
  const a = nuevo(cliente);
  await a.iniciar();
  await a.sincronizar();
  await a.marcar("m/a", "leyendo");
  r.antesDeEscribir = async () => {
    r.antesDeEscribir = null;
    await a.marcar("m/b", "leida"); // llega mientras se escribe
  };
  await a.sincronizar();
  assert.equal(a.estado().sucio, true, "lo posterior al PUT debe seguir pendiente");
  await a.sincronizar();
  assert.equal(a.estado().sucio, false);
  assert.equal((await N.descifrar(r.bytes, LLAVE)).length, 2);
});

test("con otra llave el remoto no se descifra: error y nada se pisa", async () => {
  const ajeno = await N.cifrar([r("m/z", "leida", 1)], L.nuevaLlave());
  const { r: remoto, cliente } = remotoSimulado(ajeno);
  const a = nuevo(cliente);
  await a.iniciar();
  await a.marcar("m/a", "leida");
  await a.sincronizar();
  assert.equal(a.estado().estado, "error");
  assert.equal(remoto.escrituras, 0);
});

test("sin token no hay cliente: se trabaja en local y el estado lo dice", async () => {
  const a = crearEstado({ llave: LLAVE, temporizadores: sinReloj });
  await a.iniciar();
  assert.equal(a.conectado(), false);
  assert.equal(a.estado().estado, "error");
  await a.marcar("m/a", "leida");
  assert.equal(a.estadoDe("m/a"), "leida");
  await a.sincronizar(); // no lanza
});

test("detenido (sesión cerrada) no acepta cambios en silencio", async () => {
  const { cliente } = remotoSimulado(await N.cifrar([], LLAVE));
  const a = nuevo(cliente);
  await a.iniciar();
  a.detener();
  await assert.rejects(a.marcar("m/a", "leida"), /detenida/);
});
