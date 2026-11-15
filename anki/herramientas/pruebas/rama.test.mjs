// Pruebas del comando que crea la rama «anki» (anki/herramientas/anki.mjs) con una API de Git simulada
import test from "node:test";
import assert from "node:assert/strict";
import { crearRamaAnki, leerRamaAnki } from "../anki.mjs";
import * as M from "../../js/modelo.mjs";
import * as L from "../../../js/llaves.mjs";

// API de Git falsa: ramas con archivos, blobs, árboles, commits y refs
function gitFalso({ ramas = {}, forzar = {} } = {}) {
  const e = { ramas: structuredClone(ramas), blobs: new Map(), arboles: new Map(), commits: new Map(), llamadas: [], n: 0 };
  const res = (cuerpo, status = 200) => ({ status, ok: status < 300, json: async () => cuerpo, headers: { get: () => null } });
  const f = async (url, o = {}) => {
    const u = new URL(url);
    const metodo = o.method ?? "GET";
    const ruta = u.pathname.replace(/^\/repos\/[^/]+\/[^/]+\//, "");
    e.llamadas.push(`${metodo} ${ruta}`);
    if (o.headers?.Authorization !== "Bearer token-falso") return res({ message: "Bad credentials" }, 401);
    const cuerpo = o.body ? JSON.parse(o.body) : null;
    const clave = `${metodo} ${ruta.replace(/\?.*$/, "").replace(/branches\/.*/, "branches/*").replace(/contents\/.*/, "contents/*")}`;
    if (forzar[clave]) return res({ message: "forzado" }, forzar[clave]);
    if (metodo === "GET" && ruta.startsWith("branches/")) return decodeURIComponent(ruta.slice(9)) in e.ramas ? res({ name: "anki" }) : res({ message: "Not Found" }, 404);
    if (metodo === "GET" && ruta.startsWith("contents/")) {
      const nombre = decodeURIComponent(ruta.slice(9).split("?")[0]);
      const rama = u.searchParams.get("ref");
      const a = e.ramas[rama]?.[nombre];
      return a ? res({ sha: a.sha }) : res({ message: "Not Found" }, 404);
    }
    if (metodo === "GET" && ruta.startsWith("git/blobs/")) {
      const b = [...Object.values(e.ramas)].flatMap((r) => Object.values(r)).find((a) => a.sha === ruta.slice(10));
      return b ? res({ encoding: "base64", content: Buffer.from(b.bytes).toString("base64") }) : res({}, 404);
    }
    if (metodo === "PUT" && ruta.startsWith("contents/")) {
      const nombre = decodeURIComponent(ruta.slice(9));
      e.ramas[cuerpo.branch] ??= {};
      e.ramas[cuerpo.branch][nombre] = { bytes: Buffer.from(cuerpo.content, "base64"), sha: `c${++e.n}` };
      return res({ content: { sha: e.ramas[cuerpo.branch][nombre].sha } });
    }
    if (metodo === "POST" && ruta === "git/blobs") {
      const sha = `b${++e.n}`;
      e.blobs.set(sha, Buffer.from(cuerpo.content, "base64"));
      return res({ sha }, 201);
    }
    if (metodo === "POST" && ruta === "git/trees") {
      const sha = `t${++e.n}`;
      e.arboles.set(sha, cuerpo.tree);
      return res({ sha }, 201);
    }
    if (metodo === "POST" && ruta === "git/commits") {
      const sha = `m${++e.n}`;
      e.commits.set(sha, cuerpo);
      return res({ sha }, 201);
    }
    if (metodo === "POST" && ruta === "git/refs") {
      const rama = cuerpo.ref.replace("refs/heads/", "");
      const commit = e.commits.get(cuerpo.sha);
      e.ramas[rama] = Object.fromEntries(e.arboles.get(commit.tree).map((x) => [x.path, { bytes: e.blobs.get(x.sha), sha: x.sha }]));
      return res({}, 201);
    }
    return res({ message: `no simulado: ${metodo} ${ruta}` }, 500);
  };
  return { f, e };
}

test("crea la rama con un commit sin padres y los dos archivos vacíos y cifrados", async () => {
  const { f, e } = gitFalso();
  const llave = L.nuevaLlave();
  assert.equal(await crearRamaAnki({ token: "token-falso", llave, fetch: f }), "creada");
  assert.deepEqual(Object.keys(e.ramas.anki).sort(), ["repasos.enc", "tarjetas.enc"]);
  assert.deepEqual([...e.commits.values()].map((c) => c.parents), [[]], "commit huérfano: no hereda el árbol del sitio");
  assert.deepEqual(await M.descifrarTarjetas(e.ramas.anki["tarjetas.enc"].bytes, llave), []);
  assert.deepEqual(await M.descifrarRepasos(e.ramas.anki["repasos.enc"].bytes, llave), []);
  assert.ok(L.esFragmento(e.ramas.anki["tarjetas.enc"].bytes), "formato WRF1");
});

test("es idempotente: con la rama completa no escribe nada", async () => {
  const { f, e } = gitFalso();
  const llave = L.nuevaLlave();
  await crearRamaAnki({ token: "token-falso", llave, fetch: f });
  e.llamadas.length = 0;
  assert.equal(await crearRamaAnki({ token: "token-falso", llave, fetch: f }), "existe");
  assert.ok(e.llamadas.every((l) => l.startsWith("GET")), `solo lecturas: ${e.llamadas}`);
});

test("con la rama ya creada agrega solo el archivo que falta y nunca sobrescribe", async () => {
  const llave = L.nuevaLlave();
  const previo = Buffer.from("contenido-que-no-debe-tocarse");
  const { f, e } = gitFalso({ ramas: { anki: { "tarjetas.enc": { bytes: previo, sha: "x1" } } } });
  assert.equal(await crearRamaAnki({ token: "token-falso", llave, fetch: f }), "archivos");
  assert.ok(Buffer.from(e.ramas.anki["tarjetas.enc"].bytes).equals(previo), "tarjetas.enc intacto");
  assert.deepEqual(await M.descifrarRepasos(e.ramas.anki["repasos.enc"].bytes, llave), []);
});

test("los errores de permisos dicen qué hacer y no filtran el token", async () => {
  const llave = L.nuevaLlave();
  const { f } = gitFalso({ forzar: { "POST git/refs": 403 } });
  await assert.rejects(crearRamaAnki({ token: "token-falso", llave, fetch: f }), (err) => /403/.test(err.message) && /Contents: read and write/.test(err.message) && !err.message.includes("token-falso"));
  const malo = gitFalso();
  await assert.rejects(crearRamaAnki({ token: "otro", llave, fetch: malo.f }), /401/);
  const r422 = gitFalso({ forzar: { "POST git/refs": 422 } });
  await assert.rejects(crearRamaAnki({ token: "token-falso", llave, fetch: r422.f }), /regla de ramas/);
});

test("leerRamaAnki descifra lo que hay y devuelve null por archivo ausente", async () => {
  const llave = L.nuevaLlave();
  const tarjeta = M.canonicoTarjeta({ id: "a", tipo: "basico", frente: "f", reverso: "r", t: 1 });
  const bytes = await M.cifrarTarjetas([tarjeta], llave);
  const { f } = gitFalso({ ramas: { anki: { "tarjetas.enc": { bytes: Buffer.from(bytes), sha: "x1" } } } });
  const datos = await leerRamaAnki({ token: "token-falso", llave, fetch: f });
  assert.deepEqual(datos.tarjetas, [tarjeta]);
  assert.equal(datos.repasos, null);
  await assert.rejects(leerRamaAnki({ token: "token-falso", llave: L.nuevaLlave(), fetch: f }), "otra llave no descifra");
});
