// ============================================================
//  Anki personal: sincronización cifrada con GitHub
// ============================================================
//
// Cada colección vive en su archivo cifrado de la rama `anki` (no en `main`, para no
// disparar Pages ni ensuciar el historial). Se usa el cliente de la API de GitHub de
// los subrayados (js/subrayados-sync.mjs: sha por contenidos, bytes exactos por blobs,
// If-None-Match, 409 y 422 como conflicto) y su mismo esquema:
//
//   · Los cambios se mezclan localmente al instante (aplicar) y se escriben con
//     debounce, por lotes: cada PUT es un commit y reescribe el archivo entero.
//   · Si el remoto cambió, se relee, se mezcla (unión: nada se pierde) y se reintenta.
//   · Lo último conocido y la marca de «cambios pendientes» se guardan CIFRADOS en
//     IndexedDB: sin red se sigue estudiando y se sincroniza al volver.
//
// Aún no hay coordinación entre pestañas (Web Locks): se agrega con la interfaz.
// Dependencias inyectables (cliente, almacén, reloj) para probar en Node sin red.

import { clienteGitHub, almacenMemoria, almacenIndexedDB, ErrorSync, REPO } from "../../js/subrayados-sync.mjs";
import * as M from "./modelo.mjs";

export { almacenMemoria, almacenIndexedDB, ErrorSync };

export const RAMA = "anki";
export const ARCHIVOS = { tarjetas: "tarjetas.enc", repasos: "repasos.enc" };
const MAX_REINTENTOS = 5;
const ESPERA_ESCRITURA = 2000;

// ---- Un archivo cifrado ----

export function crearArchivo({
  nombre,
  llave,
  cliente,
  almacen = almacenMemoria(),
  cifrar,
  descifrar,
  mezclar,
  iguales,
  ahora = () => Date.now(),
  alCambiar = () => {},
  espera = ESPERA_ESCRITURA,
  temporizadores = { setTimeout: globalThis.setTimeout?.bind(globalThis), clearTimeout: globalThis.clearTimeout?.bind(globalThis) },
}) {
  let items = [];
  let sha = null;
  let sucio = false;
  let ultima = null;
  let estado = cliente ? "sincronizado" : "error";
  let detalle = cliente ? "" : "Falta el token de sincronización";
  let pendiente = null;
  let cola = Promise.resolve();
  let detenido = false;

  const avisar = (tipo) => alCambiar(tipo, { nombre, estado, detalle, sucio });
  function poner(nuevo, mensaje = "") {
    if (estado === nuevo && detalle === mensaje) return;
    estado = nuevo;
    detalle = mensaje;
    avisar("estado");
  }

  async function guardarLocal() {
    try {
      await almacen.escribir({ cifrado: await cifrar(items, llave), sha, sucio, ultima });
    } catch {
      /* sin almacén local: solo se pierde el trabajo sin red */
    }
  }

  async function cargarLocal() {
    try {
      const g = await almacen.leer();
      if (!g?.cifrado) return;
      items = mezclar(await descifrar(g.cifrado, llave));
      sha = g.sha ?? null;
      sucio = !!g.sucio;
      ultima = g.ultima ?? null;
    } catch {
      /* caché de otra llave o dañada: se descarta */
      await almacen.borrar?.();
    }
  }

  async function confirmar(r, t0) {
    sha = r.sha;
    sucio = false;
    ultima = t0;
    await guardarLocal();
    poner("sincronizado");
  }

  async function ronda() {
    if (!cliente || detenido) return;
    const t0 = ahora();
    if (sucio || estado !== "sincronizado") poner("sincronizando");
    try {
      // Escritura pendiente: directa con el sha conocido
      if (sha && sucio) {
        const r = await cliente.escribir(await cifrar(items, llave), sha);
        if (!r.conflicto) return await confirmar(r, t0);
        sha = null; // el remoto cambió: a leerlo completo
      }
      for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
        const remoto = await cliente.leer(intento === 0 ? sha : null);
        if (remoto.sinCambios) {
          if (!sucio) {
            ultima = t0;
            return poner("sincronizado");
          }
          // Con cambios pendientes y sha conocido ya se intentó la escritura directa;
          // por prudencia, si se llega aquí se fuerza una lectura completa y se mezcla.
          sha = null;
          continue;
        }
        let deRemoto = [];
        if (remoto.bytes) {
          try {
            deRemoto = await descifrar(remoto.bytes, llave);
          } catch {
            throw new ErrorSync(`No se pudo descifrar ${nombre} con la llave del sitio`);
          }
        }
        const mezcla = mezclar(deRemoto, items);
        const cambioLocal = !iguales(mezcla, items);
        items = mezcla;
        sha = remoto.sha;
        if (remoto.sha && iguales(mezcla, deRemoto)) {
          sucio = false;
          ultima = t0;
          await guardarLocal();
          if (cambioLocal) avisar("datos");
          return poner("sincronizado");
        }
        if (cambioLocal) avisar("datos");
        const r = await cliente.escribir(await cifrar(mezcla, llave), remoto.sha);
        if (r.conflicto) {
          if (!remoto.sha && intento >= 1) throw new ErrorSync(`No se pudo crear ${nombre}: ¿existe la rama «${RAMA}»?`);
          continue;
        }
        return await confirmar(r, t0);
      }
      throw new ErrorSync("No se pudo sincronizar tras varios intentos");
    } catch (e) {
      const mensaje = e instanceof ErrorSync ? e.message : "Error inesperado al sincronizar";
      if (!(e instanceof ErrorSync)) console.warn("Anki:", e);
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
    async iniciar() {
      await cargarLocal();
      avisar("datos");
    },
    items: () => items,
    estado: () => ({ nombre, estado, detalle, sucio }),
    conectado: () => !!cliente,

    // Cambio local: se mezcla al instante, se guarda y se programa la escritura
    async aplicar(...nuevos) {
      const mezcla = mezclar(items, nuevos);
      if (iguales(mezcla, items)) return;
      items = mezcla;
      sucio = true;
      avisar("datos");
      await guardarLocal();
      programar();
    },

    sincronizar,
    // Escribe ya lo pendiente (p. ej. al terminar una sesión de estudio o al ocultar la pestaña)
    async vaciar() {
      temporizadores.clearTimeout?.(pendiente);
      pendiente = null;
      if (sucio) await sincronizar();
    },
    detener() {
      detenido = true;
      temporizadores.clearTimeout?.(pendiente);
    },
  };
}

// ---- Todo el Anki: tarjetas y repasos ----

export function crearAnki({
  llave,
  token,
  repo = REPO,
  rama = RAMA,
  fetch: f,
  almacenes = {},
  clientes = {},
  ahora = () => Date.now(),
  alCambiar = () => {},
  espera,
  temporizadores,
}) {
  const cliente = (clave, mensaje) =>
    clientes[clave] ?? (token ? clienteGitHub({ token, repo, rama, ruta: ARCHIVOS[clave], mensaje, ...(f ? { fetch: f } : {}) }) : null);
  const comun = { llave, ahora, alCambiar, ...(espera != null ? { espera } : {}), ...(temporizadores ? { temporizadores } : {}) };
  const tarjetas = crearArchivo({
    ...comun,
    nombre: ARCHIVOS.tarjetas,
    cliente: cliente("tarjetas", "Actualiza tarjetas"),
    almacen: almacenes.tarjetas ?? almacenMemoria(),
    cifrar: M.cifrarTarjetas,
    descifrar: M.descifrarTarjetas,
    mezclar: M.mezclarTarjetas,
    iguales: M.igualesTarjetas,
  });
  const repasos = crearArchivo({
    ...comun,
    nombre: ARCHIVOS.repasos,
    cliente: cliente("repasos", "Actualiza repasos"),
    almacen: almacenes.repasos ?? almacenMemoria(),
    cifrar: M.cifrarRepasos,
    descifrar: M.descifrarRepasos,
    mezclar: M.mezclarRepasos,
    iguales: M.igualesRepasos,
  });

  return {
    tarjetas,
    repasos,
    async iniciar() {
      await Promise.all([tarjetas.iniciar(), repasos.iniciar()]);
    },
    // Tarjetas primero: así un repaso nunca llega al remoto antes que su tarjeta
    async sincronizar() {
      await tarjetas.sincronizar();
      await repasos.sincronizar();
    },
    async vaciar() {
      await tarjetas.vaciar();
      await repasos.vaciar();
    },
    estado() {
      const a = tarjetas.estado();
      const b = repasos.estado();
      const peor = [a, b].find((x) => x.estado === "error") ?? [a, b].find((x) => x.estado === "sin-conexion") ?? [a, b].find((x) => x.estado === "sincronizando");
      return { estado: peor?.estado ?? "sincronizado", detalle: peor?.detalle ?? "", sucio: a.sucio || b.sucio };
    },

    // Operaciones del dominio. Ninguna pierde datos en silencio:
    //  · una tarjeta o repaso inválido LANZA un error en lugar de ignorarse;
    //  · con el reloj atrasado, t se sube a «último conocido + 1» para que la edición,
    //    el borrado o el repaso gane de verdad a lo anterior (en la mezcla gana el mayor t,
    //    y un repaso con la misma clave (u, t) que otro se descartaría como duplicado).
    async guardarTarjeta(x) {
      if (!M.canonicoTarjeta({ ...x, b: false, t: 0 })) throw new Error("Tarjeta inválida: revisa el tipo, el frente, el reverso o los huecos del cloze");
      const previo = tarjetas.items().find((y) => y.id === x.id);
      const t = Math.max(ahora(), previo ? previo.t + 1 : 0);
      await tarjetas.aplicar({ ...x, b: false, t });
      return t;
    },
    async borrarTarjeta(id) {
      const previo = tarjetas.items().find((y) => y.id === id);
      const t = Math.max(ahora(), previo ? previo.t + 1 : 0);
      await tarjetas.aplicar(M.lapidaTarjeta({ id }, t));
      return t;
    },
    async registrarRepaso(u, g, d) {
      if (!M.canonicoRepaso({ u, t: 0, g })) throw new Error("Repaso inválido: unidad vacía o calificación fuera de 1 a 4");
      const ultimo = repasos.items().reduce((m, r) => (r.u === u && r.t > m ? r.t : m), -1);
      const t = Math.max(ahora(), ultimo + 1);
      await repasos.aplicar({ u, t, g, ...(d != null ? { d } : {}) });
      return t;
    },

    detener() {
      tarjetas.detener();
      repasos.detener();
    },
  };
}
