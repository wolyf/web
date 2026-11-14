// ============================================================
//  Subrayados: coordinación entre pestañas (zona general)
// ============================================================
//
// Con varias pestañas abiertas solo una (la «líder») consulta a GitHub cada
// minuto; las demás reciben los cambios por BroadcastChannel. El liderazgo es
// un Web Lock exclusivo: al cerrarse la pestaña líder, el navegador lo libera
// y otra pestaña lo toma.
//
// Mensajes (JSON):
//   { t: "items", items }   elementos que una pestaña tiene (se mezclan)
//   { t: "visible" }        «hay una pestaña mía visible» (latido cada 30 s)
//   { t: "sondear" }        «consulta ya» (al volver a una pestaña no líder)
//
// Sin Web Locks o BroadcastChannel (navegadores viejos, Node) la pestaña es
// líder y no difunde: se comporta como una sola.

export function crearCoordinador({
  nombre = "wr-subrayados",
  locks = globalThis.navigator?.locks,
  Canal = globalThis.BroadcastChannel,
} = {}) {
  let lider = !locks?.request;
  let canal = null;
  let liberar = null;
  let cerrado = false;
  const oyentesLider = new Set();
  const oyentesMensaje = new Set();

  try {
    if (Canal) {
      canal = new Canal(nombre);
      canal.onmessage = (e) => {
        for (const fn of oyentesMensaje) fn(e.data);
      };
    }
  } catch {
    canal = null;
  }

  const volverseLider = () => {
    lider = true;
    for (const fn of oyentesLider) fn();
  };

  if (locks?.request) {
    // La promesa no se resuelve hasta cerrar(): el lock dura lo que dure la pestaña
    locks
      .request(`${nombre}:lider`, { mode: "exclusive" }, () => {
        if (cerrado) return undefined;
        volverseLider();
        return new Promise((ok) => {
          liberar = ok;
        });
      })
      .catch(() => {
        if (!cerrado) volverseLider(); // Web Locks falló: se opera como líder
      });
  }

  return {
    esLider: () => lider,
    alSerLider(fn) {
      oyentesLider.add(fn);
      if (lider) fn();
      return () => oyentesLider.delete(fn);
    },
    enviar(mensaje) {
      try {
        canal?.postMessage(mensaje);
      } catch {
        /* canal cerrado */
      }
    },
    alMensaje(fn) {
      oyentesMensaje.add(fn);
      return () => oyentesMensaje.delete(fn);
    },
    cerrar() {
      cerrado = true;
      lider = false;
      liberar?.();
      try {
        canal?.close();
      } catch {
        /* ya cerrado */
      }
    },
  };
}
