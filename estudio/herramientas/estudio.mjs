#!/usr/bin/env node
// ============================================================
//  Herramientas del Espacio de estudio (zona estudio)
// ============================================================
//
//   node estudio/herramientas/estudio.mjs paginas [--revisar]   genera index.html, materia.html y la página
//                                                               de cada lectura desde estudio/datos/
//   node estudio/herramientas/estudio.mjs rama                  crea la rama «estudio» (estado.enc inicial, cifrado)
//   node estudio/herramientas/estudio.mjs estado                lee y descifra el estado de la rama (solo lectura)
//   node estudio/herramientas/estudio.mjs ayuda
//
// Variables del entorno de Claude Code (nunca en el chat ni impresas):
//   SITIO_TOKEN_GITHUB                token de GitHub de grano fino (Contents: read and write sobre wolyf/web)
//   SITIO_USUARIO, SITIO_CONTRASENA   para abrir la llave del sitio y cifrar el archivo inicial
//
// Las páginas se generan para que todas tengan la misma cabecera (política de contenido, tema,
// sesión, Darwin) y para que agregar una materia o una lectura sea solo editar su JSON.
// Una prueba falla si lo generado no está al día.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as L from "../../js/llaves.mjs";
import * as N from "../js/nucleo.mjs";
import { RAMA, RUTA } from "../js/sync.mjs";
import { clienteGitHub, REPO, API } from "../../js/subrayados-sync.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ESTUDIO = path.join(RAIZ, "estudio");
const RUTA_ACCESO = path.join(RAIZ, "datos", "acceso.json");

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'none'; form-action 'none'";

export const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------- Páginas ----------

// `p` = prefijo hasta estudio/ ("" en estudio/, "../" en estudio/<materia>/); el sitio queda en `${p}../`
export function pagina({ titulo, descripcion, p = "", cuerpo, atributosBody = "", css = [], noindex = false, katex = false }) {
  const sitio = `${p}../`;
  const hojas = ["css/lectura.css", "css/estudio.css"].filter((c) => css.includes(c) || c === "css/estudio.css");
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <!-- Política de contenido: solo recursos del propio sitio (ver CLAUDE.md, «Seguridad») -->
  <meta http-equiv="Content-Security-Policy" content="${CSP}">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapar(titulo)}</title>
  <meta name="description" content="${escapar(descripcion)}">${noindex ? '\n  <meta name="robots" content="noindex">' : ""}
  <link rel="icon" href="${sitio}img/darwin-cara.svg" type="image/svg+xml">

  <!-- Estilos comunes del sitio (zona general) y propios del proyecto -->
  <link rel="stylesheet" href="${sitio}css/styles.css">
${hojas.map((c) => `  <link rel="stylesheet" href="${p}${c}">`).join("\n")}${katex ? `\n  <!-- Ecuaciones: KaTeX local (zona general); js/tema.js renderiza los [data-latex] -->\n  <link rel="stylesheet" href="${sitio}js/vendor/katex/katex.min.css">` : ""}

  <!-- Tema, color de acento, sesión y subrayados (zona general): sin defer -->
  <script src="${sitio}js/tema.js"></script>
  <script type="module" src="${p}js/main.mjs"></script>${katex ? `\n  <script src="${sitio}js/vendor/katex/katex.min.js" defer></script>` : ""}

  <!-- Darwin, la gatita del sitio (zona general) -->
  <script src="${sitio}js/darwin.js" defer></script>
</head>

<body class="ancho"${atributosBody}>
  <header class="site-header">
    <a class="brand" href="${sitio}index.html">Wolfgang Reséndiz</a>

    <div class="ajustes">
      <button class="ajuste" type="button" data-tema-accion="acento" aria-label="Cambiar color de acento">
        <span class="ajuste__punto"></span>
      </button>
      <button class="ajuste" type="button" data-tema-accion="tema" aria-label="Cambiar tema">
        <svg class="icono-luna" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
        <svg class="icono-sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      </button>
    </div>
  </header>

  <main>
${cuerpo}
  </main>
</body>
</html>
`;
}

export function paginaInicio() {
  return pagina({
    titulo: "Espacio de estudio · Wolfgang Reséndiz",
    descripcion: "Lecturas, apuntes y progreso por materia: filosofía, matemáticas y economía.",
    atributosBody: ' data-pagina="inicio"',
    cuerpo: `    <a class="back" href="../index.html">← Inicio</a>

    <h1>Espacio de estudio</h1>
    <p class="subtitulo">Lecturas, apuntes y progreso por materia.</p>

    <!-- Lo llena js/app.mjs: tablero (estructura pública; el progreso solo con sesión) -->
    <div id="estudio-raiz" data-no-subrayar><noscript>Esta página necesita JavaScript.</noscript></div>`,
  });
}

export function paginaMateria() {
  return pagina({
    titulo: "Materia · Espacio de estudio · Wolfgang Reséndiz",
    descripcion: "Ruta de lecturas y estado de lectura de una materia.",
    atributosBody: ' data-pagina="materia"',
    cuerpo: `    <a class="back" href="index.html">← Espacio de estudio</a>

    <!-- Lo llena js/app.mjs según ?m=<materia> -->
    <div id="estudio-raiz" data-no-subrayar><noscript>Esta página necesita JavaScript.</noscript></div>`,
  });
}

export function paginaLectura(materiaId, materia, fuenteId, fuente) {
  const autor = [fuente.autor, fuente.edicion].filter(Boolean).join(" · ");
  return pagina({
    titulo: `${fuente.titulo} · ${materia.corto ?? materia.nombre} · Wolfgang Reséndiz`,
    descripcion: `Lectura de ${materia.nombre}. El texto va cifrado: requiere iniciar sesión.`,
    p: "../",
    css: ["css/lectura.css"],
    noindex: true,
    katex: fuente.latex === true,
    atributosBody: ` data-pagina="lectura" data-materia="${escapar(materiaId)}" data-fuente="${escapar(fuenteId)}"`,
    cuerpo: `    <a class="back" href="../materia.html?m=${escapar(encodeURIComponent(materiaId))}">← ${escapar(materia.corto ?? materia.nombre)}</a>

    <h1 class="e-solo-lectores">${escapar(fuente.titulo)}</h1>
    <p class="e-meta">${escapar(autor)}</p>

    <!-- Estado de lectura de las entradas de la ruta que usan este texto (js/app.mjs) -->
    <div id="estudio-raiz" data-no-subrayar></div>

    <!-- El texto de la lectura está cifrado: se descifra con la sesión del sitio -->
    <div class="e-texto" data-privado="${escapar(fuenteId)}.enc" data-lineas="14"></div>`,
  });
}

const leerJSON = (ruta) => JSON.parse(fs.readFileSync(path.join(ESTUDIO, ruta), "utf8"));

// Todas las páginas generadas: { ruta relativa a estudio/ → contenido }
export function paginasGeneradas() {
  const salida = { "index.html": paginaInicio(), "materia.html": paginaMateria() };
  const indice = leerJSON("datos/estudio.json");
  for (const id of indice.materias) {
    const materia = leerJSON(`datos/materias/${id}.json`);
    for (const [fid, f] of Object.entries(materia.fuentes)) if (f.texto) salida[`${id}/${fid}.html`] = paginaLectura(id, materia, fid, f);
  }
  return salida;
}

// ---------- Rama «estudio» ----------

const aBase64 = (bytes) => Buffer.from(bytes).toString("base64");

function ayudaPermisos(estado) {
  if (estado === 401) return " (el token no es válido o venció)";
  if (estado === 403) return " (el token no tiene permiso: necesita «Contents: read and write» sobre el repositorio, y la regla de ramas no debe impedir crear «estudio»)";
  if (estado === 404) return " (repositorio no encontrado o sin acceso para el token)";
  if (estado === 422) return " (GitHub rechazó la operación: ¿la regla de ramas impide crear «estudio»?)";
  return "";
}

// Crea la rama si no existe: commit sin padres con estado.enc vacío y cifrado, igual que la de
// subrayados y la del Anki. Si ya existe, solo agrega el archivo si falta (nunca sobrescribe).
// → "creada" | "archivos" | "existe". `fetch` se inyecta para las pruebas.
export async function crearRama({ token, llave, repo = REPO, rama = RAMA, fetch: f = globalThis.fetch }) {
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
  const inicial = await N.cifrar([], llave);

  const existente = await llamar(`branches/${encodeURIComponent(rama)}`);
  if (existente.estado === 200) {
    const archivo = await llamar(`contents/${RUTA}?ref=${encodeURIComponent(rama)}`);
    if (archivo.estado === 200) return "existe";
    if (archivo.estado !== 404) throw falla(`buscar ${RUTA}`, archivo);
    const puesto = await llamar(`contents/${RUTA}`, "PUT", { message: `Crea ${RUTA}`, content: aBase64(inicial), branch: rama });
    if (puesto.estado >= 300) throw falla(`crear ${RUTA}`, puesto);
    return "archivos";
  }
  if (existente.estado !== 404) throw falla("buscar la rama", existente);

  const blob = await llamar("git/blobs", "POST", { content: aBase64(inicial), encoding: "base64" });
  if (blob.estado !== 201) throw falla(`crear el blob de ${RUTA}`, blob);
  const arbol = await llamar("git/trees", "POST", { tree: [{ path: RUTA, mode: "100644", type: "blob", sha: blob.json.sha }] });
  if (arbol.estado !== 201) throw falla("crear el árbol", arbol);
  const commit = await llamar("git/commits", "POST", { message: "Rama del Espacio de estudio", tree: arbol.json.sha, parents: [] });
  if (commit.estado !== 201) throw falla("crear el commit", commit);
  const ref = await llamar("git/refs", "POST", { ref: `refs/heads/${rama}`, sha: commit.json.sha });
  if (ref.estado !== 201) throw falla("crear la rama", ref);
  return "creada";
}

// Lee y descifra el estado de la rama (solo lectura). → lista de registros, o null si no hay archivo
export async function leerRama({ token, llave, repo = REPO, rama = RAMA, fetch: f = globalThis.fetch }) {
  const cliente = clienteGitHub({ token, repo, rama, ruta: RUTA, fetch: f });
  const { bytes } = await cliente.leer();
  return bytes ? N.descifrar(bytes, llave) : null;
}

// ---------- Línea de órdenes ----------

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
  paginas(opciones) {
    const generadas = paginasGeneradas();
    const desactualizadas = [];
    for (const [ruta, contenido] of Object.entries(generadas)) {
      const archivo = path.join(ESTUDIO, ruta);
      const actual = fs.existsSync(archivo) ? fs.readFileSync(archivo, "utf8") : null;
      if (actual === contenido) continue;
      desactualizadas.push(ruta);
      if (!opciones.revisar) {
        fs.mkdirSync(path.dirname(archivo), { recursive: true });
        fs.writeFileSync(archivo, contenido);
      }
    }
    if (opciones.revisar) {
      if (desactualizadas.length) fallar(`Páginas desactualizadas: ${desactualizadas.join(", ")}. Corre «node estudio/herramientas/estudio.mjs paginas».`);
      console.log(`✓ ${Object.keys(generadas).length} página(s) al día.`);
    } else console.log(desactualizadas.length ? `✓ Escritas: ${desactualizadas.join(", ")}` : "✓ Todo estaba al día.");
  },

  async rama() {
    const resultado = await crearRama({ token: tokenDelEntorno(), llave: await abrirLlave() });
    const mensajes = {
      creada: `✓ Rama «${RAMA}» creada con ${RUTA} inicial (vacío y cifrado).`,
      archivos: `✓ La rama «${RAMA}» ya existía: se agregó ${RUTA}.`,
      existe: `✓ La rama «${RAMA}» ya existe con ${RUTA}: no se cambió nada.`,
    };
    console.log(mensajes[resultado]);
  },

  async estado() {
    const items = await leerRama({ token: tokenDelEntorno(), llave: await abrirLlave() });
    if (!items) fallar(`La rama «${RAMA}» no existe o no tiene ${RUTA}: corre «rama».`);
    const c = N.contar(items.map((x) => x.id), items);
    console.log(`✓ Rama «${RAMA}» legible y descifrada: ${items.length} registro(s) (${c.leida} leídas, ${c.apuntada} apuntadas, ${c.leyendo} leyendo).`);
  },

  ayuda() {
    console.log(
      "Uso: node estudio/herramientas/estudio.mjs <paginas|rama|estado|ayuda>\n  paginas [--revisar]  genera las páginas desde estudio/datos/ (con --revisar solo comprueba)\n  rama                 crea la rama «estudio» (sin historial, con estado.enc inicial cifrado) si no existe\n  estado               lee y descifra el estado de la rama (solo lectura)",
    );
  },
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [orden = "ayuda", ...resto] = process.argv.slice(2);
  if (!ordenes[orden]) fallar(`Orden desconocida: ${orden}. Prueba «ayuda».`);
  Promise.resolve()
    .then(() => ordenes[orden]({ revisar: resto.includes("--revisar") }))
    .catch((e) => fallar(e.message));
}
