// Pruebas de la sesión del sitio (js/llaves.mjs y herramientas/sesion.mjs)

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as L from "../../js/llaves.mjs";
import { fragmentos, referenciasRotas } from "../sesion.mjs";

const RAIZ = new URL("../../", import.meta.url);
const POCAS = 1000; // iteraciones bajas: solo para que las pruebas sean rápidas

async function accesoDePrueba(llave, usuarios) {
  const acceso = { formato: L.FORMATO, version: 1, huella: await L.huella(llave), usuarios: {} };
  for (const [u, c] of Object.entries(usuarios)) {
    const { id, entrada } = await L.entradaUsuario(llave, u, c, POCAS);
    acceso.usuarios[id] = entrada;
  }
  return acceso;
}

test("entrar devuelve la llave con la contraseña correcta", async () => {
  const llave = L.nuevaLlave();
  const acceso = await accesoDePrueba(llave, { Wolf: "una contraseña larga", otra: "otra contraseña" });
  assert.deepEqual(await L.entrar(acceso, "  wolf ", "una contraseña larga"), llave);
  assert.deepEqual(await L.entrar(acceso, "otra", "otra contraseña"), llave);
});

test("entrar rechaza contraseñas y usuarios incorrectos", async () => {
  const acceso = await accesoDePrueba(L.nuevaLlave(), { wolf: "una contraseña larga" });
  await assert.rejects(L.entrar(acceso, "wolf", "equivocada"), L.ErrorAcceso);
  await assert.rejects(L.entrar(acceso, "nadie", "una contraseña larga"), L.ErrorAcceso);
  // Una entrada ajena (otra llave) tampoco sirve: la huella no coincide
  const ajeno = await accesoDePrueba(L.nuevaLlave(), { wolf: "una contraseña larga" });
  await assert.rejects(L.entrar({ ...ajeno, huella: acceso.huella }, "wolf", "una contraseña larga"), L.ErrorAcceso);
});

test("los nombres de usuario no aparecen en acceso.json", async () => {
  const acceso = await accesoDePrueba(L.nuevaLlave(), { "usuario-secreto": "una contraseña larga" });
  assert.ok(!JSON.stringify(acceso).includes("usuario-secreto"));
});

test("fragmentos: ida y vuelta, y otra llave no los abre", async () => {
  const llave = L.nuevaLlave();
  const html = "<p>Precio: <strong>$1,234.00</strong> · ñandú</p>";
  const cifrado = await L.cifrarFragmento(html, llave);
  assert.ok(L.esFragmento(cifrado));
  assert.ok(!Buffer.from(cifrado).toString("latin1").includes("Precio"));
  assert.equal(await L.descifrarFragmento(cifrado, llave), html);
  await assert.rejects(L.descifrarFragmento(cifrado, L.nuevaLlave()));
});

test("la llave de cada proyecto es estable y distinta", async () => {
  const llave = L.nuevaLlave();
  const a = await L.llaveProyecto(llave, "catalogo");
  assert.deepEqual(a, await L.llaveProyecto(llave, "catalogo"));
  assert.notDeepEqual(a, await L.llaveProyecto(llave, "calculadoras"));
  assert.notDeepEqual(a, llave);
  assert.equal(a.length, 32);
});

test("datos/acceso.json, si existe, tiene el formato esperado", () => {
  const ruta = new URL("datos/acceso.json", RAIZ);
  if (!fs.existsSync(ruta)) return;
  const acceso = JSON.parse(fs.readFileSync(ruta, "utf8"));
  assert.equal(acceso.formato, L.FORMATO);
  assert.match(acceso.huella, /^[0-9a-f]{16}$/);
  for (const [id, e] of Object.entries(acceso.usuarios)) {
    assert.match(id, /^[0-9a-f]{64}$/);
    for (const campo of ["sal", "iv", "llave"]) assert.equal(typeof e[campo], "string", `${id}.${campo}`);
    assert.ok(e.iteraciones >= 600_000, "iteraciones demasiado bajas");
  }
});

test("cada data-privado apunta a un fragmento cifrado que existe", () => {
  assert.deepEqual(referenciasRotas(), []);
  for (const enc of fragmentos()) assert.ok(fs.statSync(enc).size > 16);
});

test("no se publica texto en claro de .privado/", () => {
  const ignorado = fs.readFileSync(new URL(".gitignore", RAIZ), "utf8");
  assert.match(ignorado, /^\.privado\/$/m);
});
