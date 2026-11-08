#!/usr/bin/env node
// ============================================================
//  Zonas del sitio: un proyecto por carpeta
// ============================================================
//
// Cada proyecto (proyectos.json) solo edita sus carpetas; todo lo demás
// (index.html, css/, herramientas/, .claude/, .github/…) es la zona
// «general». El entorno de Claude Code dice en qué zona trabaja con la
// variable WEB_PROYECTO (el id de un proyecto o "general"); sin ella no
// hay restricción.
//
// Uso:  npm run proyectos -- <comando>
//   listar                         Proyectos y sus carpetas
//   zona <ruta>…                   A qué zona pertenece cada ruta
//   revisar [--base ref] [--cabeza ref] [--rama nombre] [--varias]
//                                  Qué zonas toca un cambio (por defecto, la
//                                  copia de trabajo frente a origin/main)
//   nuevo <id> --nombre "Nombre" [--descripcion "…"] [--icono "🧪"] [--corto "Nombre corto"]
//                                  Crea un proyecto desde herramientas/plantilla/
//   portada [--revisar]            Regenera las tarjetas y el menú de proyectos de
//                                  index.html desde proyectos.json (--revisar solo
//                                  comprueba que estén al día)
//   hook | inicio                  Los usa .claude/settings.json (no a mano)
//
// Esto previene accidentes; no es una barrera de seguridad (Bash puede
// escribir donde sea). Lo sensible se protege con las credenciales de
// cada entorno.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRO = path.join(RAIZ, "proyectos.json");
const PLANTILLA = path.join(RAIZ, "herramientas", "plantilla");
export const GENERAL = "general";
const RESERVADOS = new Set([GENERAL, "css", "js", "herramientas", "node_modules", "proyectos"]);

// ---- Lógica pura (probada en herramientas/pruebas/) ----

const PORTADA = path.join(RAIZ, "index.html");

export function leerRegistro(archivo = REGISTRO) {
  return JSON.parse(fs.readFileSync(archivo, "utf8")).proyectos ?? {};
}

// Datos generales del sitio (nombre y repositorio), en "sitio" de proyectos.json.
export function leerSitio(archivo = REGISTRO) {
  return JSON.parse(fs.readFileSync(archivo, "utf8")).sitio ?? {};
}

// Ruta relativa a la raíz del repo, con "/" como separador.
const normalizar = (ruta) => ruta.split(path.sep).join("/").replace(/^\.\//, "").replace(/\/+$/, "");

// Zona de una ruta relativa a la raíz: id del proyecto o "general".
export function zonaDe(ruta, proyectos) {
  const r = normalizar(ruta);
  for (const [id, { carpetas = [] }] of Object.entries(proyectos)) {
    if (carpetas.some((c) => r === c || r.startsWith(`${c}/`))) return id;
  }
  return GENERAL;
}

const zonaValida = (zona, proyectos) => zona === GENERAL || Object.hasOwn(proyectos, zona);

// Decide si el entorno `zona` puede escribir en `archivo` (ruta absoluta).
// Devuelve null si puede, o el motivo del bloqueo.
export function motivoBloqueo(archivo, zona, proyectos, raiz = RAIZ) {
  if (!zona) return null;
  if (!zonaValida(zona, proyectos)) {
    return `WEB_PROYECTO="${zona}" no es "general" ni un proyecto de proyectos.json (${Object.keys(proyectos).join(", ")}). Corrige la variable del entorno.`;
  }
  const relativa = path.relative(raiz, path.resolve(raiz, archivo));
  if (!relativa || relativa.startsWith("..") || path.isAbsolute(relativa)) return null; // fuera del repo
  const destino = zonaDe(relativa, proyectos);
  if (destino === zona) return null;
  const donde = destino === GENERAL ? "a la zona general (lo compartido del sitio)" : `al proyecto «${destino}»`;
  return (
    `Bloqueado: este entorno trabaja en «${zona}» (WEB_PROYECTO) y ${normalizar(relativa)} pertenece ${donde}. ` +
    `No lo edites desde aquí: dile al usuario qué cambio hace falta para que lo haga desde el entorno ${destino === GENERAL ? "general" : `de «${destino}»`}.`
  );
}

// Revisa la lista de archivos de un cambio. Devuelve { zonas, errores }.
export function revisarCambio(archivos, proyectos, { rama = "", varias = false, zona = "" } = {}) {
  const porZona = new Map();
  for (const a of archivos.map(normalizar).filter(Boolean)) {
    const z = zonaDe(a, proyectos);
    if (!porZona.has(z)) porZona.set(z, []);
    porZona.get(z).push(a);
  }
  const zonas = [...porZona.keys()];
  const errores = [];
  const lista = (z) => {
    const archivosZona = porZona.get(z);
    return `${z}: ${archivosZona.slice(0, 5).join(", ")}${archivosZona.length > 5 ? ` … y ${archivosZona.length - 5} más` : ""}`;
  };

  if (zonas.length > 1 && !varias) {
    errores.push(`El cambio toca ${zonas.length} zonas (${zonas.join(", ")}). Sepáralo o, si es a propósito, márcalo con la etiqueta «varias-zonas».`);
    errores.push(...zonas.map(lista));
  }
  // Una rama "<zona>/…" solo puede tocar esa zona.
  const prefijo = rama.split("/")[0];
  if (zonaValida(prefijo, proyectos) && !varias) {
    for (const z of zonas.filter((z) => z !== prefijo)) errores.push(`La rama «${rama}» es de «${prefijo}» pero toca ${lista(z)}`);
  }
  // El entorno local (WEB_PROYECTO) solo puede tocar su zona.
  if (zona && zonaValida(zona, proyectos) && !varias) {
    for (const z of zonas.filter((z) => z !== zona)) errores.push(`Este entorno es «${zona}» pero el cambio toca ${lista(z)}`);
  }
  return { zonas, errores: [...new Set(errores)] };
}

// ---- Portada: tarjetas y menú de proyectos ----
//
// index.html marca con comentarios las partes que se generan:
//   <!-- proyectos:menu --> … <!-- /proyectos:menu -->          enlaces de la barra lateral
//   <!-- proyectos:tarjetas --> … <!-- /proyectos:tarjetas -->  tarjetas de la sección Proyectos
//   <!-- proyectos:total -->…<!-- /proyectos:total -->          «N proyectos»
// Campos de cada proyecto (además de nombre y carpetas): corto, inicio,
// descripcion, anio, icono, etiquetas, privado, codigo (false oculta el
// enlace al código) y oculto (true lo deja fuera de la portada).

export const escaparHTML = (texto) => String(texto).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const visibles = (proyectos) => Object.entries(proyectos).filter(([, p]) => !p.oculto);
const inicioDe = (id, p) => p.inicio || `${(p.carpetas ?? [id])[0]}/`;

export function tarjetaProyecto(id, p, { repositorio = "" } = {}) {
  const e = escaparHTML;
  const meta = [p.anio, p.privado ? "privado" : ""].filter(Boolean).map(e).join(" · ");
  const etiquetas = (p.etiquetas ?? []).map((t) => `<span class="etiqueta">#${e(t)}</span>`).join(" ");
  const enlaces = [`<a href="${e(inicioDe(id, p))}">Abrir</a>`];
  if (repositorio && p.codigo !== false) enlaces.push(`<a href="${e(`${repositorio}/tree/main/${(p.carpetas ?? [id])[0]}`)}">Código</a>`);
  return [
    `<article class="proyecto">`,
    `  <p class="proyecto__meta"><span>${meta}</span><span class="proyecto__icono" aria-hidden="true">${e(p.icono || "📁")}</span></p>`,
    `  <h3 class="proyecto__titulo"><a href="${e(inicioDe(id, p))}">${e(p.nombre)}</a></h3>`,
    ...(p.descripcion ? [`  <p class="proyecto__desc">${e(p.descripcion)}</p>`] : []),
    ...(etiquetas ? [`  <p class="proyecto__etiquetas">${etiquetas}</p>`] : []),
    `  <p class="proyecto__enlaces">${enlaces.join(" ")}</p>`,
    `</article>`,
  ];
}

export function enlaceMenu(id, p) {
  const e = escaparHTML;
  return `<a href="${e(inicioDe(id, p))}"><span class="lateral__icono" aria-hidden="true">${e(p.icono || "📁")}</span>${e(p.corto || p.nombre)}</a>`;
}

// Sustituye lo que hay entre <!-- proyectos:nombre --> y <!-- /proyectos:nombre -->.
// Si `contenido` es una lista de líneas, las pone en bloque con la sangría del marcador.
function reemplazarMarcador(html, nombre, contenido) {
  const inicio = `<!-- proyectos:${nombre} -->`;
  const fin = `<!-- /proyectos:${nombre} -->`;
  const a = html.indexOf(inicio);
  const b = html.indexOf(fin, a);
  if (a < 0 || b < 0) throw new Error(`index.html no tiene los marcadores ${inicio} … ${fin}.`);
  let medio = contenido;
  if (Array.isArray(contenido)) {
    const sangria = html.slice(html.lastIndexOf("\n", a) + 1, a).match(/^\s*/)[0];
    medio = `\n${contenido.map((l) => (l ? sangria + l : l)).join("\n")}\n${sangria}`;
  }
  return html.slice(0, a + inicio.length) + medio + html.slice(b);
}

// Devuelve la portada con las partes generadas al día.
export function actualizarPortada(html, proyectos, sitio = {}) {
  const lista = visibles(proyectos);
  let nuevo = reemplazarMarcador(html, "menu", lista.map(([id, p]) => enlaceMenu(id, p)));
  nuevo = reemplazarMarcador(nuevo, "tarjetas", lista.flatMap(([id, p]) => tarjetaProyecto(id, p, sitio)));
  nuevo = reemplazarMarcador(nuevo, "total", `${lista.length} ${lista.length === 1 ? "proyecto" : "proyectos"}`);
  return nuevo;
}

// ---- Línea de comandos ----

function argumentos(argv) {
  const posicionales = [];
  const opciones = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) posicionales.push(a);
    else if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) opciones[a.slice(2)] = true;
    else opciones[a.slice(2)] = argv[++i];
  }
  return { posicionales, opciones };
}

const git = (...args) =>
  execFileSync("git", args, { cwd: RAIZ, encoding: "utf8" })
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

function archivosCambiados({ base = "origin/main", cabeza }) {
  if (cabeza) return git("diff", "--name-only", "--no-renames", `${base}...${cabeza}`);
  // Copia de trabajo: confirmados, sin confirmar y nuevos sin seguimiento
  return [...new Set([...git("diff", "--name-only", "--no-renames", base), ...git("ls-files", "--others", "--exclude-standard")])];
}

const comandos = {
  listar() {
    const proyectos = leerRegistro();
    for (const [id, p] of Object.entries(proyectos)) console.log(`${id.padEnd(16)} ${p.nombre}  →  ${p.carpetas.map((c) => `${c}/`).join(", ")}`);
    console.log(`${GENERAL.padEnd(16)} Todo lo demás (index.html, css/, herramientas/, .claude/, .github/, proyectos.json…)`);
  },

  zona(rutas) {
    const proyectos = leerRegistro();
    for (const r of rutas) console.log(`${zonaDe(path.relative(RAIZ, path.resolve(r)), proyectos).padEnd(16)} ${r}`);
  },

  revisar(_, opciones) {
    const proyectos = leerRegistro();
    const archivos = archivosCambiados({ base: typeof opciones.base === "string" ? opciones.base : undefined, cabeza: opciones.cabeza });
    const { zonas, errores } = revisarCambio(archivos, proyectos, {
      rama: typeof opciones.rama === "string" ? opciones.rama : "",
      varias: opciones.varias === true,
      zona: process.env.WEB_PROYECTO ?? "",
    });
    console.log(`${archivos.length} archivo(s) cambiado(s) · zonas: ${zonas.join(", ") || "ninguna"}`);
    if (errores.length) {
      for (const e of errores) console.error(`  ✗ ${e}`);
      process.exitCode = 1;
    } else console.log("  ✓ Correcto");
  },

  nuevo([id], opciones) {
    if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) throw new Error('Uso: nuevo <id> --nombre "Nombre"  (id en minúsculas, p. ej. "bombas")');
    if (RESERVADOS.has(id)) throw new Error(`«${id}» es un nombre reservado.`);
    const nombre = typeof opciones.nombre === "string" ? opciones.nombre.trim() : "";
    if (!nombre) throw new Error('Falta --nombre "Nombre del proyecto".');
    const registro = JSON.parse(fs.readFileSync(REGISTRO, "utf8"));
    const destino = path.join(RAIZ, id);
    if (registro.proyectos[id] || fs.existsSync(destino)) throw new Error(`Ya existe «${id}».`);

    // Copia la plantilla sustituyendo {{ID}} y {{NOMBRE}}
    const copiar = (origen, salida) => {
      fs.mkdirSync(salida, { recursive: true });
      for (const e of fs.readdirSync(origen, { withFileTypes: true })) {
        const de = path.join(origen, e.name);
        const a = path.join(salida, e.name);
        if (e.isDirectory()) copiar(de, a);
        else {
          const valor = e.name.endsWith(".html") ? escaparHTML(nombre) : nombre;
          fs.writeFileSync(a, fs.readFileSync(de, "utf8").replaceAll("{{ID}}", id).replaceAll("{{NOMBRE}}", valor));
        }
      }
    };
    copiar(PLANTILLA, destino);

    const texto = (clave) => (typeof opciones[clave] === "string" ? opciones[clave].trim() : "");
    registro.proyectos[id] = {
      nombre,
      carpetas: [id],
      ...(texto("corto") ? { corto: texto("corto") } : {}),
      inicio: `${id}/`,
      descripcion: texto("descripcion") || "En construcción.",
      anio: new Date().getFullYear(),
      icono: texto("icono") || "🧪",
      etiquetas: [],
    };
    fs.writeFileSync(REGISTRO, `${JSON.stringify(registro, null, 2)}\n`);

    // Tarjeta y enlace en la portada
    try {
      fs.writeFileSync(PORTADA, actualizarPortada(fs.readFileSync(PORTADA, "utf8"), registro.proyectos, registro.sitio));
    } catch (error) {
      console.log(`Aviso: ${error.message} Agrega la tarjeta a mano.`);
    }

    console.log(`Proyecto «${id}» creado: ${id}/ (CLAUDE.md, index.html), registrado en proyectos.json y enlazado en index.html.`);
    console.log("Completa su descripción, icono y etiquetas en proyectos.json y corre «npm run proyectos -- portada».");
    console.log("Siguientes pasos:");
    console.log(`  1. Commit y PR con la etiqueta «varias-zonas» (toca general y ${id}).`);
    console.log(`  2. En Claude Code, crea un entorno con WEB_PROYECTO=${id}.`);
  },

  portada(_, opciones) {
    const html = fs.readFileSync(PORTADA, "utf8");
    const nuevo = actualizarPortada(html, leerRegistro(), leerSitio());
    if (opciones.revisar) {
      if (nuevo !== html) {
        console.error("✗ index.html no está al día con proyectos.json. Corre «npm run proyectos -- portada».");
        process.exitCode = 1;
      } else console.log("✓ La portada está al día con proyectos.json.");
    } else if (nuevo === html) console.log("La portada ya estaba al día.");
    else {
      fs.writeFileSync(PORTADA, nuevo);
      console.log("Portada actualizada desde proyectos.json.");
    }
  },

  // PreToolUse (Edit, Write…): bloquea con código 2 lo que no es de esta zona.
  hook() {
    let entrada;
    try {
      entrada = JSON.parse(fs.readFileSync(0, "utf8"));
    } catch {
      return; // sin datos legibles no se bloquea nada
    }
    const zona = (process.env.WEB_PROYECTO ?? "").trim();
    const archivo = entrada.tool_input?.file_path ?? entrada.tool_input?.notebook_path;
    if (!zona || !archivo) return;
    const motivo = motivoBloqueo(path.resolve(entrada.cwd ?? RAIZ, archivo), zona, leerRegistro());
    if (motivo) {
      console.error(motivo);
      process.exitCode = 2;
    }
  },

  // SessionStart: le dice a Claude en qué zona trabaja.
  inicio() {
    const zona = (process.env.WEB_PROYECTO ?? "").trim();
    const proyectos = leerRegistro();
    if (!zona) {
      console.log("WEB_PROYECTO no está definido: esta sesión no tiene restricción de zona. Ten cuidado de no mezclar proyectos (ver CLAUDE.md, «Proyectos y zonas»).");
    } else if (!zonaValida(zona, proyectos)) {
      console.log(`WEB_PROYECTO="${zona}" no es válido; las ediciones dentro del repo quedarán bloqueadas hasta corregirlo. Avisa al usuario.`);
    } else if (zona === GENERAL) {
      console.log(`Entorno: general. Editas lo compartido del sitio (index.html, css/, herramientas/, .claude/, .github/, proyectos.json). No edites las carpetas de proyecto: ${Object.values(proyectos).flatMap((p) => p.carpetas).map((c) => `${c}/`).join(", ")}.`);
    } else {
      const { nombre, carpetas } = proyectos[zona];
      console.log(`Entorno: ${zona} (${nombre}). Solo editas ${carpetas.map((c) => `${c}/`).join(", ")}; lee ${carpetas[0]}/CLAUDE.md. Lo demás se consulta pero no se modifica: si hace falta un cambio fuera, díselo al usuario.`);
    }
  },
};

const ejecutadoDirecto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (ejecutadoDirecto) {
  const [comando = "listar", ...resto] = process.argv.slice(2);
  const { posicionales, opciones } = argumentos(resto);
  if (!comandos[comando]) {
    console.error(`Comando desconocido: ${comando}. Usa listar, zona, revisar, nuevo o portada.`);
    process.exit(1);
  }
  try {
    comandos[comando](posicionales, opciones);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
