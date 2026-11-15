#!/usr/bin/env node
// ============================================================
//  Herramientas del Anki personal (zona anki)
// ============================================================
//
//   node anki/herramientas/anki.mjs rama      crea la rama «anki» si no existe
//   node anki/herramientas/anki.mjs estado    lee y descifra lo que hay en la rama (solo lectura)
//   node anki/herramientas/anki.mjs ayuda
//
// Variables del entorno de Claude Code (nunca en el chat ni impresas):
//   SITIO_TOKEN_GITHUB                token de GitHub de grano fino (Contents: read and write sobre wolyf/web)
//   SITIO_USUARIO, SITIO_CONTRASENA   para abrir la llave del sitio y cifrar los archivos iniciales
//
// La rama «anki» es un commit SIN padres con tarjetas.enc y repasos.enc vacíos y cifrados, igual
// que la de subrayados: no hereda el árbol del sitio ni dispara Pages.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as L from "../../js/llaves.mjs";
import * as M from "../js/modelo.mjs";
import { ARCHIVOS, RAMA } from "../js/sync.mjs";
import { clienteGitHub, REPO, API } from "../../js/subrayados-sync.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUTA_ACCESO = path.join(RAIZ, "datos", "acceso.json");

// Archivos iniciales: colecciones vacías, cifradas con la llave del sitio
async function inicialesCifrados(llave) {
  return {
    [ARCHIVOS.tarjetas]: await M.cifrarTarjetas([], llave),
    [ARCHIVOS.repasos]: await M.cifrarRepasos([], llave),
  };
}

const aBase64 = (bytes) => Buffer.from(bytes).toString("base64");

function ayudaPermisos(estado) {
  if (estado === 401) return " (el token no es válido o venció)";
  if (estado === 403) return " (el token no tiene permiso: necesita «Contents: read and write» sobre el repositorio, y la regla de ramas no debe impedir crear «anki»)";
  if (estado === 404) return " (repositorio no encontrado o sin acceso para el token)";
  if (estado === 422) return " (GitHub rechazó la operación: ¿la regla de ramas impide crear «anki»?)";
  return "";
}

// Crea la rama si no existe: commit sin padres con los dos archivos iniciales. Si la rama ya
// existe, solo agrega los archivos que falten (nunca sobrescribe). → "creada" | "archivos" | "existe".
// `fetch` se inyecta para las pruebas.
export async function crearRamaAnki({ token, llave, repo = REPO, rama = RAMA, fetch: f = globalThis.fetch }) {
  const llamar = async (ruta, metodo = "GET", cuerpo) => {
    const r = await f(`${API}/repos/${repo}/${ruta}`, {
      method: metodo,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(cuerpo ? { "Content-Type": "application/json" } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    return { estado: r.status, json: r.status === 204 ? null : await r.json().catch(() => null) };
  };
  const falla = (que, r) => new Error(`GitHub respondió ${r.estado} al ${que}${ayudaPermisos(r.estado)}`);
  const iniciales = await inicialesCifrados(llave);

  const existente = await llamar(`branches/${encodeURIComponent(rama)}`);
  if (existente.estado === 200) {
    let agregados = 0;
    for (const [nombre, bytes] of Object.entries(iniciales)) {
      const archivo = await llamar(`contents/${nombre}?ref=${encodeURIComponent(rama)}`);
      if (archivo.estado === 200) continue;
      if (archivo.estado !== 404) throw falla(`buscar ${nombre}`, archivo);
      const puesto = await llamar(`contents/${nombre}`, "PUT", { message: `Crea ${nombre}`, content: aBase64(bytes), branch: rama });
      if (puesto.estado >= 300) throw falla(`crear ${nombre}`, puesto);
      agregados++;
    }
    return agregados ? "archivos" : "existe";
  }
  if (existente.estado !== 404) throw falla("buscar la rama", existente);

  const arbol = [];
  for (const [nombre, bytes] of Object.entries(iniciales)) {
    const blob = await llamar("git/blobs", "POST", { content: aBase64(bytes), encoding: "base64" });
    if (blob.estado !== 201) throw falla(`crear el blob de ${nombre}`, blob);
    arbol.push({ path: nombre, mode: "100644", type: "blob", sha: blob.json.sha });
  }
  const arbolNuevo = await llamar("git/trees", "POST", { tree: arbol });
  if (arbolNuevo.estado !== 201) throw falla("crear el árbol", arbolNuevo);
  const commit = await llamar("git/commits", "POST", { message: "Rama del Anki personal", tree: arbolNuevo.json.sha, parents: [] });
  if (commit.estado !== 201) throw falla("crear el commit", commit);
  const ref = await llamar("git/refs", "POST", { ref: `refs/heads/${rama}`, sha: commit.json.sha });
  if (ref.estado !== 201) throw falla("crear la rama", ref);
  return "creada";
}

// Lee y descifra la rama (solo lectura). → { tarjetas, repasos } con los elementos válidos, o null por archivo ausente
export async function leerRamaAnki({ token, llave, repo = REPO, rama = RAMA, fetch: f = globalThis.fetch }) {
  const salida = {};
  const lectores = { tarjetas: M.descifrarTarjetas, repasos: M.descifrarRepasos };
  for (const clave of ["tarjetas", "repasos"]) {
    const cliente = clienteGitHub({ token, repo, rama, ruta: ARCHIVOS[clave], fetch: f });
    const { bytes } = await cliente.leer();
    salida[clave] = bytes ? await lectores[clave](bytes, llave) : null;
  }
  return salida;
}

// ---- Línea de órdenes ----

function fallar(mensaje) {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

async function abrirLlave() {
  if (!fs.existsSync(RUTA_ACCESO)) fallar("No hay datos/acceso.json.");
  const usuario = (process.env.SITIO_USUARIO ?? "").trim();
  const contrasena = process.env.SITIO_CONTRASENA ?? "";
  if (!usuario || !contrasena) fallar("Faltan SITIO_USUARIO y SITIO_CONTRASENA en el entorno de Claude Code (nunca en el chat).");
  try {
    return await L.entrar(JSON.parse(fs.readFileSync(RUTA_ACCESO, "utf8")), usuario, contrasena);
  } catch (e) {
    if (e instanceof L.ErrorAcceso) fallar("Usuario o contraseña incorrectos.");
    throw e;
  }
}

const tokenDelEntorno = () => {
  const token = (process.env.SITIO_TOKEN_GITHUB ?? "").trim();
  if (!token) fallar("Falta SITIO_TOKEN_GITHUB en el entorno de Claude Code (nunca en el chat).");
  return token;
};

const ordenes = {
  async rama() {
    const resultado = await crearRamaAnki({ token: tokenDelEntorno(), llave: await abrirLlave() });
    const mensajes = {
      creada: `✓ Rama «${RAMA}» creada con ${Object.values(ARCHIVOS).join(" y ")} iniciales (vacíos y cifrados).`,
      archivos: `✓ La rama «${RAMA}» ya existía: se agregaron los archivos que faltaban.`,
      existe: `✓ La rama «${RAMA}» ya existe con sus archivos: no se cambió nada.`,
    };
    console.log(mensajes[resultado]);
  },

  async estado() {
    const datos = await leerRamaAnki({ token: tokenDelEntorno(), llave: await abrirLlave() });
    if (!datos.tarjetas && !datos.repasos) fallar(`La rama «${RAMA}» no existe o no tiene archivos: corre «rama».`);
    const vivas = (datos.tarjetas ?? []).filter((t) => !t.b).length;
    console.log(`✓ Rama «${RAMA}» legible y descifrada: ${vivas} tarjeta(s) y ${(datos.repasos ?? []).length} repaso(s).`);
  },

  ayuda() {
    console.log("Uso: node anki/herramientas/anki.mjs <rama|estado|ayuda>\n  rama     crea la rama «anki» (sin historial, con archivos iniciales cifrados) si no existe\n  estado   lee y descifra lo que hay en la rama (solo lectura)");
  },
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const orden = process.argv[2] ?? "ayuda";
  if (!ordenes[orden]) fallar(`Orden desconocida: ${orden}. Prueba «ayuda».`);
  Promise.resolve()
    .then(() => ordenes[orden]())
    .catch((e) => fallar(e.message));
}
