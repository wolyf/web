// ============================================================
//  Anki personal: sincronización cifrada con GitHub
// ============================================================
//
// Cada colección vive en su archivo cifrado de la rama `anki` (no en `main`, para no
// disparar Pages ni ensuciar el historial). Se usa el cliente de la API de GitHub de
// los subrayados (js/subrayados-sync.mjs: sha por contenidos, bytes exactos por blobs,
// If-None-Match, 409 y 422 como conflicto) y su mismo esquema:
//
//   · Los cambios se mezclan localmente al instante (aplicar) y se escriben por lotes: cada
//     PUT es un commit y reescribe el archivo ENTERO. Las tarjetas esperan 2 s tras el último
//     cambio; los repasos, 2 min (con un máximo de 5 min sin escribir mientras haya cambios) y
//     se vacían al terminar de estudiar o al ocultar la pestaña. Cada commit guarda el archivo
//     completo: el crecimiento del repositorio con los repasos queda pendiente (compactación).
//   · Una escritura en vuelo solo cubre lo que llevaba: si llega otro cambio mientras tanto, la
//     marca de pendiente se conserva (contador de versión) y se vuelve a programar.
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
const ESPERA_TARJETAS = 2000;
const ESPERA_REPASOS = 120_000;
const ESPERA_MAX_REPASOS = 300_000;

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
  incorporar = (items, nuevos) => {
    const mezcla = mezclar(items, nuevos);
    return { lista: mezcla, cambio: !iguales(mezcla, items) };
  },
  ahora = () => Date.now(),
  alCambiar = () => {},
  espera = ESPERA_TARJETAS,
  esperaMax = 5 * espera,
  temporizadores = { setTimeout: globalThis.setTimeout?.bind(globalThis), clearTimeout: globalThis.clearTimeout?.bind(globalThis) },
}) {
  let items = [];
  let sha = null;
  let sucio = false;
  let version = 0; // sube con cada cambio local: permite saber si una escritura cubría todo
  let sucioDesde = 0;
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

  // Un solo escritor local: las copias se hacen en orden y las que se piden mientras otra está en
  // curso se funden en UNA más, tomada con el estado más reciente. Así nunca termina de escribirse
  // una versión vieja después de una nueva, y 50 respuestas seguidas no cifran el archivo 50 veces.
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
          if (detenido) break; // pestaña sin el control o sesión cerrada: la caché es de quien siga activo
          try {
            const foto = { lista: items, sha, sucio, ultima };
            await almacen.escribir({ cifrado: await cifrar(foto.lista, llave), sha: foto.sha, sucio: foto.sucio, ultima: foto.ultima });
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
      items = mezclar(await descifrar(g.cifrado, llave));
      sha = g.sha ?? null;
      sucio = !!g.sucio;
      if (sucio) sucioDesde = ahora();
      ultima = g.ultima ?? null;
    } catch {
      /* caché de otra llave o dañada: se descarta */
      await almacen.borrar?.();
    }
  }

  // `v` es la versión que llevaba la escritura: si llegó algo después, sigue pendiente
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
        const r = await cliente.escribir(await cifrar(items, llave), sha);
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
          sucioDesde = 0;
          ultima = t0;
          await guardarLocal();
          if (cambioLocal) avisar("datos");
          return poner("sincronizado");
        }
        if (cambioLocal) avisar("datos");
        const v = version;
        const r = await cliente.escribir(await cifrar(mezcla, llave), remoto.sha);
        if (r.conflicto) {
          if (!remoto.sha && intento >= 1) throw new ErrorSync(`No se pudo crear ${nombre}: ¿existe la rama «${RAMA}»?`);
          continue;
        }
        return await confirmar(r, t0, v);
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

  // Espera `espera` tras el último cambio, pero nunca más de `esperaMax` desde que empezó a haber
  // cambios pendientes: una sesión larga de estudio también se escribe de vez en cuando.
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
    estado: () => ({ nombre, estado, detalle, sucio }),
    conectado: () => !!cliente,

    // Cambio local: se mezcla al instante, se guarda y se programa la escritura
    async aplicar(...nuevos) {
      if (detenido) throw new Error("La sincronización está detenida (otra pestaña tiene el control o se cerró la sesión): el cambio no se guardó");
      const { lista, cambio } = incorporar(items, nuevos);
      if (!cambio) return;
      items = lista;
      version++;
      if (!sucio) sucioDesde = ahora();
      sucio = true;
      avisar("datos");
      programar();
      await guardarLocal();
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
  esperaTarjetas = ESPERA_TARJETAS,
  esperaRepasos = ESPERA_REPASOS,
  esperaMaxRepasos = ESPERA_MAX_REPASOS,
  temporizadores,
}) {
  const cliente = (clave, mensaje) =>
    clientes[clave] ?? (token ? clienteGitHub({ token, repo, rama, ruta: ARCHIVOS[clave], mensaje, ...(f ? { fetch: f } : {}) }) : null);
  const comun = { llave, ahora, alCambiar, ...(temporizadores ? { temporizadores } : {}) };
  const tarjetas = crearArchivo({
    ...comun,
    nombre: ARCHIVOS.tarjetas,
    espera: esperaTarjetas,
    esperaMax: 5 * esperaTarjetas,
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
    espera: esperaRepasos,
    esperaMax: esperaMaxRepasos,
    cliente: cliente("repasos", "Actualiza repasos"),
    almacen: almacenes.repasos ?? almacenMemoria(),
    cifrar: M.cifrarRepasos,
    descifrar: M.descifrarRepasos,
    mezclar: M.mezclarRepasos,
    iguales: M.igualesRepasos,
    incorporar: M.agregarRepasos,
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
