// ============================================================
//  Espacio de estudio: sincronización cifrada del estado de lectura
// ============================================================
//
// El archivo `estado.enc` vive en la rama `estudio` del repositorio (no en `main`, para no
// disparar Pages ni ensuciar el historial), igual que los subrayados y el Anki. Usa el cliente
// de la API de GitHub de los subrayados (js/subrayados-sync.mjs): `sha` por contenidos, bytes
// exactos por `git/blobs`, `If-None-Match`, y 409 o 422 como conflicto.
//
//   · Un cambio se mezcla en memoria al instante y se escribe 2 s después del último cambio
//     (máximo 10 s desde el primero) y al ocultar o cerrar la pestaña.
//   · Si el remoto cambió, se relee, se mezcla (unión: nada se pierde) y se reintenta.
//   · Lo último conocido y la marca de «cambios pendientes» se guardan CIFRADOS en IndexedDB:
//     sin red se sigue marcando lo leído y se sincroniza al volver.
//   · Varias pestañas: cada una mezcla con el remoto antes de escribir, así que ninguna pisa a
//     otra (las posibles colisiones se resuelven con 409 y mezcla). No hay pestaña líder.
//
// Las dependencias (cliente, almacén, reloj, temporizadores) se inyectan para probar en Node.

import { clienteGitHub, almacenMemoria, almacenIndexedDB, ErrorSync, REPO } from "../../js/subrayados-sync.mjs";
import * as N from "./nucleo.mjs";

export { almacenMemoria, almacenIndexedDB, ErrorSync };

export const RAMA = "estudio";
export const RUTA = "estado.enc";
const MAX_REINTENTOS = 5;
const ESPERA = 2000;
const ESPERA_MAX = 10_000;

export function crearEstado({
  llave,
  token,
  repo = REPO,
  rama = RAMA,
  fetch: f,
  cliente = token ? clienteGitHub({ token, repo, rama, ruta: RUTA, mensaje: "Actualiza estado de lectura", ...(f ? { fetch: f } : {}) }) : null,
  almacen = almacenMemoria(),
  ahora = () => Date.now(),
  alCambiar = () => {},
  espera = ESPERA,
  esperaMax = ESPERA_MAX,
  temporizadores = { setTimeout: globalThis.setTimeout?.bind(globalThis), clearTimeout: globalThis.clearTimeout?.bind(globalThis) },
}) {
  let items = [];
  let sha = null;
  let sucio = false;
  let sucioDesde = 0;
  let version = 0; // sube con cada cambio local: una escritura en vuelo solo cubre lo que llevaba
  let ultima = null;
  let estado = cliente ? "sincronizado" : "error";
  let detalle = cliente ? "" : "Falta el token de sincronización";
  let pendiente = null;
  let cola = Promise.resolve();
  let detenido = false;

  const avisar = (tipo) => alCambiar(tipo, { estado, detalle, sucio });
  function poner(nuevo, mensaje = "") {
    if (estado === nuevo && detalle === mensaje) return;
    estado = nuevo;
    detalle = mensaje;
    avisar("estado");
  }

  // Un solo escritor local: las copias que se piden mientras otra está en curso se funden en una
  let guardando = null;
  let repetir = false;
  function guardarLocal() {
    if (guardando) {
      repetir = true;
      return guardando;
    }
    guardando = (async () => {
      try {
        do {
          repetir = false;
          if (detenido) break;
          try {
            await almacen.escribir({ cifrado: await N.cifrar(items, llave), sha, sucio, ultima });
          } catch {
            /* sin almacén local: solo se pierde el trabajo sin red */
          }
        } while (repetir);
      } finally {
        guardando = null;
      }
    })();
    return guardando;
  }

  async function cargarLocal() {
    try {
      const g = await almacen.leer();
      if (!g?.cifrado) return;
      items = await N.descifrar(g.cifrado, llave);
      sha = g.sha ?? null;
      sucio = !!g.sucio;
      if (sucio) sucioDesde = ahora();
      ultima = g.ultima ?? null;
    } catch {
      /* caché de otra llave o dañada: se descarta */
      await almacen.borrar?.();
    }
  }

  async function confirmar(r, t0, v) {
    if (detenido) return;
    sha = r.sha;
    sucio = version !== v;
    sucioDesde = sucio ? ahora() : 0;
    ultima = t0;
    await guardarLocal();
    poner("sincronizado");
    if (sucio) programar();
  }

  async function ronda() {
    if (!cliente || detenido) return;
    const t0 = ahora();
    if (sucio || estado !== "sincronizado") poner("sincronizando");
    try {
      // Escritura pendiente: directa con el sha conocido
      if (sha && sucio) {
        const v = version;
        const r = await cliente.escribir(await N.cifrar(items, llave), sha);
        if (!r.conflicto) return await confirmar(r, t0, v);
        sha = null; // el remoto cambió: a leerlo completo
      }
      for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
        const remoto = await cliente.leer(intento === 0 ? sha : null);
        if (remoto.sinCambios) {
          if (!sucio) {
            ultima = t0;
            return poner("sincronizado");
          }
          sha = null;
          continue;
        }
        let deRemoto = [];
        if (remoto.bytes) {
          try {
            deRemoto = await N.descifrar(remoto.bytes, llave);
          } catch {
            throw new ErrorSync(`No se pudo descifrar ${RUTA} con la llave del sitio`);
          }
        }
        const mezcla = N.mezclar(deRemoto, items);
        const cambioLocal = !N.iguales(mezcla, items);
        items = mezcla;
        sha = remoto.sha;
        if (remoto.sha && N.iguales(mezcla, deRemoto)) {
          sucio = false;
          sucioDesde = 0;
          ultima = t0;
          await guardarLocal();
          if (cambioLocal) avisar("datos");
          return poner("sincronizado");
        }
        if (cambioLocal) avisar("datos");
        const v = version;
        const r = await cliente.escribir(await N.cifrar(mezcla, llave), remoto.sha);
        if (r.conflicto) {
          if (!remoto.sha && intento >= 1) throw new ErrorSync(`No se pudo crear ${RUTA}: ¿existe la rama «${rama}»? (node estudio/herramientas/estudio.mjs rama)`);
          continue;
        }
        return await confirmar(r, t0, v);
      }
      throw new ErrorSync("No se pudo sincronizar tras varios intentos");
    } catch (e) {
      if (!(e instanceof ErrorSync)) console.warn("Estudio:", e);
      poner(e instanceof ErrorSync ? e.estado : "error", e instanceof ErrorSync ? e.message : "Error inesperado al sincronizar");
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
    const retraso = Math.max(0, Math.min(espera, sucioDesde + esperaMax - ahora()));
    pendiente = temporizadores.setTimeout?.(() => {
      pendiente = null;
      sincronizar();
    }, retraso);
  }

  return {
    async iniciar() {
      await cargarLocal();
      avisar("datos");
    },
    items: () => items,
    estado: () => ({ estado, detalle, sucio, ultima }),
    conectado: () => !!cliente,
    estadoDe: (id) => N.estadoDe(items, id),
    notaDe: (id) => N.notaDe(items, id),

    // Cambia el estado (y, si se da, la nota) de una entrada. Lanza si el estado es inválido.
    async marcar(id, e, n) {
      if (detenido) throw new Error("La sincronización está detenida (se cerró la sesión): el cambio no se guardó");
      const nuevo = N.registro(items, id, e, { n, ahora: ahora() });
      if (!nuevo) throw new Error("Registro inválido");
      items = N.mezclar(items, [nuevo]);
      version++;
      if (!sucio) sucioDesde = ahora();
      sucio = true;
      avisar("datos");
      programar();
      await guardarLocal();
    },

    sincronizar,
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
