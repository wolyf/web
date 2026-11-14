// ============================================================
//  Subrayados: sincronización con GitHub (zona general)
// ============================================================
//
// El archivo cifrado vive en la rama `subrayados` del repositorio (no en
// `main`, para no disparar Pages ni ensuciar el historial) y se lee y escribe
// con la API de contenidos de GitHub (no con raw.githubusercontent.com, que
// guarda en caché):
//
//   GET https://api.github.com/repos/<repo>/contents/subrayados.enc?ref=subrayados
//       (solo para saber el `sha`: esta API trata el archivo como texto y puede
//       transcodificar sus bytes al azar, así que su `content` NO se usa)
//   GET …/git/blobs/<sha>           el contenido exacto, en base64
//   PUT …/contents/subrayados.enc   { message, content, sha, branch }
//
// Si el PUT responde 409 o 422 (alguien escribió antes), se vuelve a leer,
// se mezcla y se reintenta. La mezcla es por id (gana el mayor t), así que
// ningún dispositivo pisa a otro.
//
// Local: lo último conocido se guarda CIFRADO en IndexedDB (sin la sesión es
// ilegible), junto con la marca de «cambios pendientes». Sin red se sigue
// trabajando y se sincroniza al volver.
//
// Las dependencias (fetch, almacén, reloj) se inyectan para poder probarlo
// en Node sin red.

import * as L from "./llaves.mjs";
import { cifrarDatos, descifrarDatos, mezclar, iguales, canonico } from "./subrayados-nucleo.mjs";

export const REPO = "wolyf/web";
export const RAMA = "subrayados";
export const RUTA = "subrayados.enc";
export const API = "https://api.github.com";

export const ESTADOS = ["sincronizado", "sincronizando", "sin-conexion", "error"];

const MAX_REINTENTOS = 5;
const ESPERA_ESCRITURA = 2000;
const PERIODO_LECTURA = 60_000;

export class ErrorSync extends Error {
  constructor(mensaje, estado = "error") {
    super(mensaje);
    this.name = "ErrorSync";
    this.estado = estado;
  }
}

const aBase64 = (bytes) => {
  let texto = "";
  for (let i = 0; i < bytes.length; i += 0x8000) texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(texto);
};
const deBase64 = (texto) => Uint8Array.from(atob(texto.replace(/\s+/g, "")), (c) => c.charCodeAt(0));

// ---- Cliente de la API ----

export function clienteGitHub({ token, repo = REPO, rama = RAMA, ruta = RUTA, fetch: f = globalThis.fetch.bind(globalThis) }) {
  const url = `${API}/repos/${repo}/contents/${ruta}`;
  const cabeceras = (extra = {}) => ({
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  });

  async function llamar(direccion, opciones) {
    let r;
    try {
      r = await f(direccion, { cache: "no-store", ...opciones });
    } catch {
      throw new ErrorSync("Sin conexión con GitHub", "sin-conexion");
    }
    return r;
  }

  return {
    // → { sha, bytes } o { sha: null, bytes: null } si el archivo no existe.
    // Con `shaConocida` igual a la actual no baja el contenido (bytes: null, sinCambios).
    async leer(shaConocida = null) {
      const r = await llamar(`${url}?ref=${encodeURIComponent(rama)}`, { headers: cabeceras() });
      if (r.status === 404) return { sha: null, bytes: null };
      if (!r.ok) throw errorHttp(r.status);
      const { sha } = await r.json();
      if (!sha) throw new ErrorSync("GitHub no devolvió el sha de subrayados.enc");
      if (shaConocida && sha === shaConocida) return { sha, bytes: null, sinCambios: true };
      const b = await llamar(`${API}/repos/${repo}/git/blobs/${sha}`, { headers: cabeceras() });
      if (!b.ok) throw errorHttp(b.status);
      const blob = await b.json();
      if (blob.encoding !== "base64" || typeof blob.content !== "string") throw new ErrorSync("Respuesta inesperada de GitHub al leer el blob");
      return { sha, bytes: deBase64(blob.content) };
    },

    // → { conflicto: true } si hay que releer; si no, { sha } nuevo
    async escribir(bytes, sha) {
      const cuerpo = { message: "Actualiza subrayados", content: aBase64(bytes), branch: rama };
      if (sha) cuerpo.sha = sha;
      const r = await llamar(url, {
        method: "PUT",
        headers: cabeceras({ "Content-Type": "application/json" }),
        body: JSON.stringify(cuerpo),
      });
      if (r.status === 409 || r.status === 422) {
        // 422 también es «la rama no existe»: se distingue al reintentar (la lectura da 404)
        return { conflicto: true, estado: r.status };
      }
      if (!r.ok) throw errorHttp(r.status);
      const json = await r.json();
      return { sha: json.content?.sha ?? null };
    },
  };
}

function errorHttp(estado) {
  if (estado === 401) return new ErrorSync("El token de GitHub no es válido o venció (401)");
  if (estado === 403) return new ErrorSync("GitHub rechazó la petición: permisos o límite de uso (403)");
  if (estado === 404) return new ErrorSync("No se encontró la rama «subrayados» o el repositorio (404)");
  return new ErrorSync(`GitHub respondió ${estado}`);
}

// ---- Almacén local ----

// Almacén en memoria (pruebas, o sin IndexedDB)
export function almacenMemoria() {
  let guardado = null;
  return {
    async leer() {
      return guardado;
    },
    async escribir(valor) {
      guardado = valor;
    },
    async borrar() {
      guardado = null;
    },
  };
}

// Almacén en IndexedDB (navegador). El valor es { cifrado, sha, sucio }, donde
// `cifrado` ya está sellado con la llave del sitio.
export function almacenIndexedDB(nombre = "wr-subrayados") {
  const abrir = () =>
    new Promise((ok, mal) => {
      if (!globalThis.indexedDB) return mal(new Error("Sin IndexedDB"));
      const r = indexedDB.open(nombre, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("estado");
      r.onsuccess = () => ok(r.result);
      r.onerror = () => mal(r.error);
    });
  const operar = async (modo, fn) => {
    const bd = await abrir();
    try {
      return await new Promise((ok, mal) => {
        const t = bd.transaction("estado", modo);
        const peticion = fn(t.objectStore("estado"));
        t.oncomplete = () => ok(peticion?.result);
        t.onerror = t.onabort = () => mal(t.error);
      });
    } finally {
      bd.close();
    }
  };
  return {
    leer: () => operar("readonly", (a) => a.get("datos")).catch(() => null),
    escribir: (valor) => operar("readwrite", (a) => a.put(valor, "datos")).catch(() => {}),
    borrar: () => operar("readwrite", (a) => a.delete("datos")).catch(() => {}),
  };
}

// ---- Sincronizador ----

export function crearSincronizador({
  llave,
  token,
  almacen = almacenMemoria(),
  cliente = token ? clienteGitHub({ token }) : null,
  ahora = () => Date.now(),
  alCambiar = () => {},
  espera = ESPERA_ESCRITURA,
  periodo = PERIODO_LECTURA,
  temporizadores = { setTimeout: globalThis.setTimeout?.bind(globalThis), clearTimeout: globalThis.clearTimeout?.bind(globalThis) },
}) {
  let items = [];
  let sha = null;
  let sucio = false;
  let estado = cliente ? "sincronizado" : "error";
  let detalle = cliente ? "" : "Falta el token de sincronización";
  let pendiente = null;
  let cola = Promise.resolve();
  let reloj = null;
  let detenido = false;

  const avisar = (tipo) => alCambiar(tipo, { estado, detalle, sucio });

  function poner(nuevo, mensaje = "") {
    if (estado === nuevo && detalle === mensaje) return;
    estado = nuevo;
    detalle = mensaje;
    avisar("estado");
  }

  async function guardarLocal() {
    try {
      await almacen.escribir({ cifrado: await cifrarDatos(items, llave), sha, sucio });
    } catch {
      /* sin almacén local: solo se pierde el trabajo sin red */
    }
  }

  async function cargarLocal() {
    try {
      const g = await almacen.leer();
      if (!g?.cifrado) return;
      items = mezclar(await descifrarDatos(g.cifrado, llave));
      sha = g.sha ?? null;
      sucio = !!g.sucio;
    } catch {
      /* caché de otra llave o dañada: se descarta */
      await almacen.borrar?.();
    }
  }

  // Una ronda: leer, mezclar y, si el remoto no lo tiene todo, escribir.
  async function ronda() {
    if (!cliente || detenido) return;
    poner("sincronizando");
    try {
      for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
        const remoto = await cliente.leer(intento === 0 ? sha : null);
        if (remoto.sinCambios) {
          // El remoto es justo lo último sincronizado: solo falta escribir lo pendiente
          if (!sucio) {
            poner("sincronizado");
            return;
          }
          const r = await cliente.escribir(await cifrarDatos(items, llave), remoto.sha);
          if (r.conflicto) continue;
          sha = r.sha;
          sucio = false;
          await guardarLocal();
          poner("sincronizado");
          return;
        }
        let deRemoto = [];
        if (remoto.bytes) {
          try {
            deRemoto = await descifrarDatos(remoto.bytes, llave);
          } catch {
            throw new ErrorSync("No se pudo descifrar subrayados.enc con la llave del sitio");
          }
        }
        const mezcla = mezclar(deRemoto, items);
        const hayCambioLocal = !iguales(mezcla, items);
        items = mezcla;
        const cambio = hayCambioLocal || sucio || sha !== remoto.sha;
        sha = remoto.sha;
        if (iguales(mezcla, deRemoto) && remoto.sha) {
          sucio = false;
          if (cambio) await guardarLocal();
          if (hayCambioLocal) avisar("datos");
          poner("sincronizado");
          return;
        }
        if (hayCambioLocal) avisar("datos");
        const r = await cliente.escribir(await cifrarDatos(mezcla, llave), remoto.sha);
        if (r.conflicto) {
          if (!remoto.sha && intento >= 1) throw new ErrorSync("No se pudo crear subrayados.enc: ¿existe la rama «subrayados»?");
          continue;
        }
        sha = r.sha;
        sucio = false;
        await guardarLocal();
        poner("sincronizado");
        return;
      }
      throw new ErrorSync("No se pudo sincronizar tras varios intentos");
    } catch (e) {
      const mensaje = e instanceof ErrorSync ? e.message : "Error inesperado al sincronizar";
      if (!(e instanceof ErrorSync)) console.warn("Subrayados:", e);
      poner(e instanceof ErrorSync ? e.estado : "error", mensaje);
      await guardarLocal();
    }
  }

  const sincronizar = () => {
    cola = cola.then(ronda, ronda);
    return cola;
  };

  function programar() {
    if (detenido) return;
    temporizadores.clearTimeout?.(pendiente);
    pendiente = temporizadores.setTimeout?.(() => {
      pendiente = null;
      sincronizar();
    }, espera);
  }

  return {
    // Carga la caché local (llámese antes de usar items)
    async iniciar() {
      await cargarLocal();
      avisar("datos");
    },
    items: () => items,
    conectado: () => !!cliente,
    estado: () => ({ estado, detalle, sucio }),

    // Cambio local: mezcla (el mayor t gana), guarda y programa la escritura
    async aplicar(...nuevos) {
      const validos = nuevos.map(canonico).filter(Boolean);
      if (!validos.length) return;
      items = mezclar(items, validos);
      sucio = true;
      avisar("datos");
      await guardarLocal();
      programar();
    },

    sincronizar,

    // Lectura periódica con la pestaña visible, al recuperar el foco y al volver la red
    arrancar(doc = globalThis.document, ventana = globalThis.window) {
      const si = () => {
        if (!doc || doc.visibilityState === "visible") sincronizar();
      };
      if (!doc) return;
      doc.addEventListener("visibilitychange", si);
      ventana?.addEventListener("online", sincronizar);
      reloj = globalThis.setInterval(si, periodo);
      this._quitar = () => {
        doc.removeEventListener("visibilitychange", si);
        ventana?.removeEventListener("online", sincronizar);
        globalThis.clearInterval(reloj);
      };
      si();
    },

    detener() {
      detenido = true;
      temporizadores.clearTimeout?.(pendiente);
      this._quitar?.();
    },
  };
}
