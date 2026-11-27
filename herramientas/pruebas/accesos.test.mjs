// Pruebas del registro de accesos (js/accesos-nucleo.mjs y js/accesos.mjs)

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as L from "../../js/llaves.mjs";
import * as A from "../../js/accesos-nucleo.mjs";

const RAIZ = new URL("../../", import.meta.url);

// Cliente simulado de GitHub en memoria (con conflictos opcionales)
function clienteSimulado({ conflictos = 0, alConflicto = null } = {}) {
  let bytes = null;
  let sha = null;
  let version = 0;
  let lecturas = 0;
  let escrituras = 0;

  return {
    get lecturas() {
      return lecturas;
    },
    get escrituras() {
      return escrituras;
    },
    async leer() {
      lecturas++;
      return { sha, bytes };
    },
    async escribir(nuevosBytes, shaEnviada) {
      escrituras++;
      if (conflictos > 0) {
        conflictos--;
        if (alConflicto) {
          bytes = await alConflicto(bytes);
          sha = `sha-${++version}`;
        }
        return { conflicto: true, estado: 409 };
      }
      if (sha !== null && shaEnviada !== sha) return { conflicto: true, estado: 409 };
      bytes = nuevosBytes;
      sha = `sha-${++version}`;
      return { sha };
    },
  };
}

test("esDueno solo reconoce a wolfgang (sin importar mayúsculas ni espacios)", () => {
  assert.equal(A.esDueno("wolfgang"), true);
  assert.equal(A.esDueno("  Wolfgang "), true);
  assert.equal(A.esDueno("WOLFGANG"), true);
  assert.equal(A.esDueno("invitado"), false);
  assert.equal(A.esDueno("wolf"), false);
  assert.equal(A.esDueno(""), false);
  assert.equal(A.esDueno(null), false);
});

test("resumirDispositivo identifica navegadores y sistemas comunes", () => {
  assert.equal(
    A.resumirDispositivo("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36"),
    "Chrome · Linux",
  );
  assert.equal(
    A.resumirDispositivo("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"),
    "Safari · iPhone",
  );
  assert.equal(
    A.resumirDispositivo("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0"),
    "Firefox · Windows",
  );
  assert.equal(
    A.resumirDispositivo("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0"),
    "Edge · macOS",
  );
  assert.equal(A.resumirDispositivo(""), "Desconocido");
});

test("mezclarRegistros deduplica por id, ordena del más reciente al más antiguo y acota a MAX_REGISTROS", () => {
  const a = A.crearRegistro({ id: "a1", usuario: "ana", pagina: "/web/catalogo/", base: "/web/", recordar: true, dispositivo: "Chrome · Android", ahora: () => 1000 });
  const b = A.crearRegistro({ id: "b2", usuario: "wolfgang", pagina: "/web/index.html", base: "/web/", recordar: false, dispositivo: "Firefox · Linux", ahora: () => 2000 });
  const mezclado = A.mezclarRegistros([a], [b, a]);
  assert.deepEqual(
    mezclado.map((x) => [x.id, x.u, x.p, x.r]),
    [
      ["b2", "wolfgang", "", false],
      ["a1", "ana", "catalogo/", true],
    ],
  );

  // Tope de MAX_REGISTROS: conserva los más recientes
  const muchos = Array.from({ length: A.MAX_REGISTROS + 25 }, (_, i) => ({
    id: `id-${i}`,
    u: "wolfgang",
    t: i + 1,
    p: "",
    r: false,
    d: "",
  }));
  const recortado = A.mezclarRegistros(muchos);
  assert.equal(recortado.length, A.MAX_REGISTROS);
  assert.equal(recortado[0].t, A.MAX_REGISTROS + 25);
  assert.equal(recortado.at(-1).t, 26);
});

test("cifrarRegistros y descifrarRegistros: ida y vuelta, otra llave u otro info fallan", async () => {
  const llave = L.nuevaLlave();
  const lista = [
    A.crearRegistro({ id: "r1", usuario: "invitado-secreto", pagina: "/web/tablero/", base: "/web/", recordar: true, dispositivo: "Chrome · Windows", ahora: () => 5000 }),
  ];
  const bytes = await A.cifrarRegistros(lista, llave);
  assert.ok(L.esFragmento(bytes));
  assert.ok(!Buffer.from(bytes).toString("latin1").includes("invitado-secreto"));
  assert.deepEqual(await A.descifrarRegistros(bytes, llave), lista);
  await assert.rejects(A.descifrarRegistros(bytes, L.nuevaLlave()));
  // No se puede abrir con el info de subrayados
  await assert.rejects(L.descifrarFragmento(bytes, llave, "wr-subrayados"));
});

test("sincronizarAccesos crea accesos.enc, lee sin escribir y resuelve conflictos 409 sin perder entradas", async () => {
  const llave = L.nuevaLlave();
  const r1 = A.crearRegistro({ id: "uno", usuario: "ana", pagina: "/web/", base: "/web/", ahora: () => 1000 });
  const r2 = A.crearRegistro({ id: "dos", usuario: "luis", pagina: "/web/catalogo/", base: "/web/", ahora: () => 2000 });
  const r3 = A.crearRegistro({ id: "tres", usuario: "wolfgang", pagina: "/web/anki/", base: "/web/", ahora: () => 3000 });

  // 1. Primer acceso: crea el archivo (antes no existe)
  const cliente = clienteSimulado();
  const primero = await A.sincronizarAccesos({ cliente, llave, nuevos: [r1] });
  assert.equal(primero.registros.length, 1);
  assert.equal(primero.registros[0].id, "uno");
  assert.equal(cliente.escrituras, 1);

  // 2. Solo lectura (visor de wolfgang): no escribe
  const soloLectura = await A.sincronizarAccesos({ cliente, llave });
  assert.equal(soloLectura.registros.length, 1);
  assert.equal(cliente.escrituras, 1);

  // 3. Conflicto 409 mientras otro dispositivo guarda r2: relee, mezcla ambos y guarda
  const conConflicto = clienteSimulado({
    conflictos: 1,
    alConflicto: async () => A.cifrarRegistros([r1, r2], llave),
  });
  await conConflicto.escribir(await A.cifrarRegistros([r1], llave), null);
  const res = await A.sincronizarAccesos({ cliente: conConflicto, llave, nuevos: [r3] });
  assert.deepEqual(
    res.registros.map((x) => x.id),
    ["tres", "dos", "uno"],
  );
});

test("main no lleva accesos.enc y js/accesos.mjs no guarda el token en almacenamiento web ni lo registra", () => {
  assert.equal(fs.existsSync(new URL(A.RUTA_ACCESOS, RAIZ)), false);
  const codigo = fs.readFileSync(new URL("js/accesos.mjs", RAIZ), "utf8");
  assert.doesNotMatch(codigo, /(localStorage|sessionStorage)\.setItem\([^)]*token/i);
  assert.doesNotMatch(codigo, /console\.\w+\([^)]*token/i);
  // Sin guion largo (U+2014) en los archivos nuevos
  for (const ruta of ["js/accesos.mjs", "js/accesos-nucleo.mjs", "herramientas/pruebas/accesos.test.mjs"]) {
    assert.equal(fs.readFileSync(new URL(ruta, RAIZ), "utf8").includes("\u2014"), false, `${ruta} contiene guion largo`);
  }
});
