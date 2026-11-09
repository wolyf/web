#!/usr/bin/env node
// ============================================================
//  Sesión del sitio: usuarios y partes privadas (zona general)
// ============================================================
//
//   npm run sesion -- ayuda
//
// Usuarios: datos/acceso.json guarda la llave del sitio envuelta con la
// contraseña de cada usuario (ver js/llaves.mjs). Las contraseñas se toman
// de variables de entorno o, en una terminal, se preguntan sin mostrarlas:
//
//   SITIO_USUARIO, SITIO_CONTRASENA   cuenta con la que se abre la llave
//   SITIO_NUEVA_CONTRASENA            contraseña nueva (agregar, contrasena)
//
// Partes privadas: el texto en claro vive en .privado/ (en .gitignore) con
// la misma ruta que el fragmento cifrado que se publica:
//
//   .privado/calculadoras/notas.html   →   calculadoras/notas.enc
//
// y la página lo muestra con <div data-privado="notas.enc"></div>.

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import * as L from "../js/llaves.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUTA_ACCESO = path.join(RAIZ, "datos", "acceso.json");
const PRIVADO = path.join(RAIZ, ".privado");
const IGNORAR = new Set([".git", "node_modules", ".privado", ".catalogo"]);

const AYUDA = `Sesión del sitio (npm run sesion -- <comando>)

Usuarios
  iniciar                 crea la llave del sitio y el primer usuario (SITIO_USUARIO, SITIO_CONTRASENA)
  agregar <usuario>       agrega un usuario (contraseña: SITIO_NUEVA_CONTRASENA o se pregunta)
  quitar <usuario>        quita un usuario
  contrasena [usuario]    cambia la contraseña (por defecto, la de SITIO_USUARIO)
  usuarios                cuántos usuarios hay (los nombres no se guardan en claro)

Partes privadas (.privado/<ruta>.html ↔ <ruta>.enc)
  sellar [carpeta]        cifra lo que cambió en .privado/ (solo esa carpeta, si se indica)
  abrir [carpeta]         descifra los fragmentos .enc a .privado/
  verificar               revisa la llave, los fragmentos y las referencias data-privado

Las cuentas se abren con SITIO_USUARIO y SITIO_CONTRASENA (variables del entorno);
en una terminal, si faltan, se preguntan sin mostrarse.`;

// ---- Entrada y salida ----

function fallar(mensaje) {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

async function preguntar(texto, oculto = false) {
  if (!process.stdin.isTTY) return null;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  let silencio = false;
  if (oculto) {
    rl._writeToOutput = (s) => {
      if (!silencio) rl.output.write(s);
    };
  }
  const respuesta = await new Promise((resolver) => {
    rl.question(texto, resolver);
    silencio = oculto;
  });
  rl.close();
  if (oculto) process.stdout.write("\n");
  return respuesta;
}

async function credenciales() {
  const usuario = process.env.SITIO_USUARIO || (await preguntar("Usuario: "));
  const contrasena = process.env.SITIO_CONTRASENA || (usuario && (await preguntar("Contraseña: ", true)));
  if (!usuario || !contrasena)
    fallar(
      "Faltan SITIO_USUARIO y SITIO_CONTRASENA. Configúralas en el entorno de Claude Code " +
        "(o corre el comando en una terminal para que las pregunte). Nunca las escribas en el chat.",
    );
  return { usuario, contrasena };
}

async function contrasenaNueva(usuario) {
  if (process.env.SITIO_NUEVA_CONTRASENA) return process.env.SITIO_NUEVA_CONTRASENA;
  const una = await preguntar(`Contraseña nueva para «${usuario}»: `, true);
  if (una == null) fallar("Falta SITIO_NUEVA_CONTRASENA (o corre el comando en una terminal).");
  const otra = await preguntar("Repítela: ", true);
  if (una !== otra) fallar("Las contraseñas no coinciden.");
  return una;
}

function revisarContrasena(c) {
  if (String(c).length < 10) fallar("La contraseña debe tener al menos 10 caracteres.");
}

// ---- acceso.json ----

function leerAcceso() {
  if (!fs.existsSync(RUTA_ACCESO)) fallar("No hay datos/acceso.json. Créalo con «npm run sesion -- iniciar».");
  return JSON.parse(fs.readFileSync(RUTA_ACCESO, "utf8"));
}

function escribirAcceso(acceso) {
  fs.mkdirSync(path.dirname(RUTA_ACCESO), { recursive: true });
  fs.writeFileSync(RUTA_ACCESO, `${JSON.stringify(acceso, null, 2)}\n`);
}

async function abrirLlave(acceso = leerAcceso()) {
  const { usuario, contrasena } = await credenciales();
  try {
    return await L.entrar(acceso, usuario, contrasena);
  } catch (e) {
    if (e instanceof L.ErrorAcceso) fallar("Usuario o contraseña incorrectos.");
    throw e;
  }
}

// ---- Archivos ----

function* recorrer(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR.has(e.name)) continue;
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) yield* recorrer(ruta);
    else yield ruta;
  }
}

function* recorrerPrivado(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) yield* recorrerPrivado(ruta);
    else yield ruta;
  }
}

// Fragmentos cifrados del sitio dentro del repositorio
export function fragmentos(base = RAIZ) {
  const lista = [];
  for (const ruta of recorrer(base)) {
    if (!ruta.endsWith(".enc")) continue;
    const cabeza = Buffer.alloc(4);
    const fd = fs.openSync(ruta, "r");
    fs.readSync(fd, cabeza, 0, 4, 0);
    fs.closeSync(fd);
    if (cabeza.toString("latin1") === L.MAGIA_FRAGMENTO) lista.push(ruta);
  }
  return lista;
}

const relativa = (ruta) => path.relative(RAIZ, ruta).split(path.sep).join("/");

function carpetaArgumento(arg) {
  if (!arg) return RAIZ;
  const ruta = path.resolve(RAIZ, arg);
  if (!ruta.startsWith(RAIZ)) fallar("La carpeta debe estar dentro del repositorio.");
  return ruta;
}

// ---- Comandos ----

const comandos = {
  ayuda() {
    console.log(AYUDA);
  },

  async iniciar() {
    if (fs.existsSync(RUTA_ACCESO)) fallar("datos/acceso.json ya existe. Para más usuarios: «agregar».");
    const { usuario, contrasena } = await credenciales();
    revisarContrasena(contrasena);
    const llave = L.nuevaLlave();
    const { id, entrada } = await L.entradaUsuario(llave, usuario, contrasena);
    escribirAcceso({
      formato: L.FORMATO,
      version: 1,
      descripcion:
        "Acceso a las partes privadas del sitio. Por usuario (resumen SHA-256 del nombre), la llave del sitio envuelta con su contraseña (PBKDF2-SHA256 + AES-256-GCM). Ver js/llaves.mjs.",
      kdf: { algoritmo: "PBKDF2-SHA256", iteraciones: L.ITERACIONES },
      huella: await L.huella(llave),
      usuarios: { [id]: entrada },
    });
    console.log(`✓ Llave del sitio creada y usuario «${usuario}» agregado en datos/acceso.json.`);
  },

  async agregar(usuario) {
    if (!usuario) fallar("Uso: npm run sesion -- agregar <usuario>");
    const acceso = leerAcceso();
    const llave = await abrirLlave(acceso);
    const contrasena = await contrasenaNueva(usuario);
    revisarContrasena(contrasena);
    const { id, entrada } = await L.entradaUsuario(llave, usuario, contrasena);
    const existia = !!acceso.usuarios[id];
    acceso.usuarios[id] = entrada;
    escribirAcceso(acceso);
    console.log(existia ? `✓ Contraseña de «${usuario}» reemplazada.` : `✓ Usuario «${usuario}» agregado.`);
  },

  async quitar(usuario) {
    if (!usuario) fallar("Uso: npm run sesion -- quitar <usuario>");
    const acceso = leerAcceso();
    await abrirLlave(acceso);
    const id = await L.idUsuario(usuario);
    if (!acceso.usuarios[id]) fallar(`No existe el usuario «${usuario}».`);
    if (Object.keys(acceso.usuarios).length === 1) fallar("Es el único usuario: no se puede quitar.");
    delete acceso.usuarios[id];
    escribirAcceso(acceso);
    console.log(`✓ Usuario «${usuario}» quitado.`);
    console.log("  Ojo: si llegó a ver la llave, aún podría descifrar lo publicado antes.");
  },

  async contrasena(usuario) {
    const acceso = leerAcceso();
    const llave = await abrirLlave(acceso);
    const quien = usuario || process.env.SITIO_USUARIO;
    if (!quien) fallar("Uso: npm run sesion -- contrasena <usuario>");
    const id = await L.idUsuario(quien);
    if (!acceso.usuarios[id]) fallar(`No existe el usuario «${quien}».`);
    const nueva = await contrasenaNueva(quien);
    revisarContrasena(nueva);
    acceso.usuarios[id] = (await L.entradaUsuario(llave, quien, nueva)).entrada;
    escribirAcceso(acceso);
    console.log(`✓ Contraseña de «${quien}» cambiada.`);
  },

  usuarios() {
    const n = Object.keys(leerAcceso().usuarios ?? {}).length;
    console.log(`${n} usuario${n === 1 ? "" : "s"} (los nombres solo se guardan como resumen).`);
  },

  async sellar(carpeta) {
    const destino = carpetaArgumento(carpeta);
    const origen = path.join(PRIVADO, path.relative(RAIZ, destino));
    const planos = [...recorrerPrivado(origen)].filter((r) => r.endsWith(".html"));
    if (!planos.length) fallar(`No hay archivos .html en ${relativa(origen) || ".privado"}/.`);
    const llave = await abrirLlave();
    let cambios = 0;
    for (const plano of planos) {
      const salida = path.join(RAIZ, path.relative(PRIVADO, plano)).replace(/\.html$/, ".enc");
      const texto = fs.readFileSync(plano, "utf8");
      if (fs.existsSync(salida)) {
        try {
          if ((await L.descifrarFragmento(fs.readFileSync(salida), llave)) === texto) continue;
        } catch {
          /* ilegible o de otra llave: se reemplaza */
        }
      }
      fs.mkdirSync(path.dirname(salida), { recursive: true });
      fs.writeFileSync(salida, await L.cifrarFragmento(texto, llave));
      console.log(`  🔒 ${relativa(salida)}`);
      cambios++;
    }
    console.log(cambios ? `✓ ${cambios} fragmento(s) cifrado(s).` : "✓ Sin cambios.");
  },

  async abrir(carpeta) {
    const lista = fragmentos(carpetaArgumento(carpeta));
    if (!lista.length) fallar("No hay fragmentos cifrados.");
    const llave = await abrirLlave();
    for (const enc of lista) {
      const salida = path.join(PRIVADO, path.relative(RAIZ, enc)).replace(/\.enc$/, ".html");
      fs.mkdirSync(path.dirname(salida), { recursive: true });
      fs.writeFileSync(salida, await L.descifrarFragmento(fs.readFileSync(enc), llave));
      console.log(`  📄 ${relativa(salida)}`);
    }
    console.log(`✓ ${lista.length} fragmento(s) en .privado/ (no se sube al repositorio).`);
  },

  async verificar() {
    const acceso = leerAcceso();
    const llave = await abrirLlave(acceso);
    let errores = 0;
    for (const enc of fragmentos()) {
      try {
        await L.descifrarFragmento(fs.readFileSync(enc), llave);
      } catch {
        console.error(`  ✗ ${relativa(enc)}: no se descifra con la llave del sitio`);
        errores++;
      }
    }
    for (const falta of referenciasRotas()) {
      console.error(`  ✗ ${falta}`);
      errores++;
    }
    if (errores) fallar(`${errores} problema(s).`);
    console.log(`✓ Llave correcta; ${fragmentos().length} fragmento(s) y sus referencias en orden.`);
  },
};

// data-privado="…" en las páginas que apuntan a fragmentos inexistentes
export function referenciasRotas(base = RAIZ) {
  const rotas = [];
  for (const pagina of recorrer(base)) {
    if (!pagina.endsWith(".html")) continue;
    const html = fs.readFileSync(pagina, "utf8");
    for (const [, ref] of html.matchAll(/data-privado="([^"]+)"/g)) {
      const destino = path.resolve(path.dirname(pagina), ref);
      if (!fs.existsSync(destino)) rotas.push(`${path.relative(base, pagina)}: falta ${ref}`);
    }
  }
  return rotas;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [nombre = "ayuda", ...args] = process.argv.slice(2);
  const comando = comandos[nombre];
  if (!comando) fallar(`Comando desconocido: ${nombre}\n\n${AYUDA}`);
  await comando(...args);
}
