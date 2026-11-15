// ============================================================
//  Espacio de estudio: interfaz
// ============================================================
//
// Tres páginas comparten este módulo (`<body data-pagina="…">`):
//
//   inicio    tablero: resumen, «Sigue con» y materias por área
//   materia   ruta de una materia (`materia.html?m=<id>`): estado de cada lectura
//   lectura   página de un texto (`<materia>/<fuente>.html`): el texto cifrado y el estado de las
//             entradas de la ruta que lo usan
//
// Todo texto entra con `textContent` (nunca como HTML): la CSP no permite scripts en línea y los
// datos vienen de un JSON. Las dependencias (sesión, fetch, documento) se inyectan para probar.
//
// El estado de lectura solo se ve y se edita con sesión: sin ella, el tablero muestra la
// estructura (público) pero no el progreso, y los controles quedan desactivados.

import { abrirSecreto } from "../../js/llaves.mjs";
import * as N from "./nucleo.mjs";
import { crearEstado, almacenIndexedDB } from "./sync.mjs";

// ---- Utilidades de DOM ----

export function h(doc, etiqueta, atributos, ...hijos) {
  const el = doc.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos ?? {})) {
    if (v == null || v === false) continue;
    if (k === "clase") el.className = v;
    else if (k === "al") for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === "datos") for (const [d, x] of Object.entries(v)) el.dataset[d] = x;
    else if (k in el && k !== "list") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const hijo of hijos.flat()) if (hijo != null && hijo !== false) el.append(hijo.nodeType ? hijo : doc.createTextNode(String(hijo)));
  return el;
}

const ETIQUETAS_PLURAL = { pendiente: "Pendientes", leyendo: "Leyendo", leida: "Leídas", apuntada: "Apuntadas" };
// append/replaceChildren convierten null en el texto «null»: se quitan antes
const sinNulos = (...xs) => xs.flat().filter((x) => x != null && x !== false);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// ---- Datos públicos (estructura de materias) ----

export async function cargarDatos(base, fetchf = globalThis.fetch.bind(globalThis)) {
  const leer = async (ruta) => {
    const r = await fetchf(new URL(ruta, base), { cache: "no-cache" });
    if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
    return r.json();
  };
  const indice = await leer("estudio.json");
  const materias = {};
  await Promise.all(
    indice.materias.map(async (id) => {
      materias[id] = await leer(`materias/${id}.json`);
    }),
  );
  // En el orden declarado
  return { areas: indice.areas, materias: Object.fromEntries(indice.materias.map((id) => [id, materias[id]])) };
}

// ---- Conexión: sesión del sitio + estado de lectura cifrado ----

export function crearConexion({ sesion, urlAcceso, fetchf = globalThis.fetch?.bind(globalThis), opciones = {}, doc = globalThis.document, ventana = globalThis.window }) {
  let store = null;
  let generacion = 0;
  let reloj = null;
  const oyentes = new Set();
  const avisar = (tipo) => oyentes.forEach((fn) => fn(tipo));

  function parar() {
    generacion++;
    ventana?.clearInterval(reloj);
    reloj = null;
    store?.detener();
    store = null;
  }

  async function conectar() {
    parar();
    const mia = generacion;
    const llave = sesion.llave();
    if (!llave) return avisar("sesion");
    let token = null;
    try {
      const r = await fetchf(urlAcceso, { cache: "no-cache" });
      if (r.ok) {
        const acceso = await r.json();
        if (acceso.token) token = await abrirSecreto(acceso.token, llave);
      }
    } catch {
      /* sin red o token ilegible: se trabaja en local */
    }
    if (mia !== generacion) return;
    const nuevo = crearEstado({
      llave,
      token,
      fetch: opciones.fetchGitHub,
      almacen: opciones.almacen ?? almacenIndexedDB("wr-estudio-estado"),
      alCambiar: (tipo) => {
        if (mia === generacion) avisar(tipo);
      },
      ...(opciones.estado ?? {}),
    });
    store = nuevo;
    await nuevo.iniciar();
    if (mia !== generacion) return;
    avisar("sesion");
    reloj = ventana?.setInterval(() => {
      if (store && doc?.visibilityState === "visible" && !store.estado().sucio) store.sincronizar();
    }, opciones.periodo ?? 60_000);
    nuevo.sincronizar();
  }

  doc?.addEventListener("visibilitychange", () => {
    if (!store) return;
    if (doc.visibilityState === "hidden") store.vaciar().catch(() => {});
    else store.sincronizar();
  });
  ventana?.addEventListener("pagehide", () => store?.vaciar().catch(() => {}));
  ventana?.addEventListener("online", () => {
    if (!store) return;
    if (!store.conectado()) conectar();
    else store.sincronizar();
  });
  const dejar = sesion.alCambiar(({ activa }) => (activa ? conectar() : (parar(), avisar("sesion"))));
  if (sesion.activa()) conectar();

  return {
    estado: () => store,
    activa: () => sesion.activa(),
    items: () => store?.items() ?? [],
    alCambiar(fn) {
      oyentes.add(fn);
      return () => oyentes.delete(fn);
    },
    destruir() {
      dejar?.();
      parar();
    },
  };
}

// ---- Piezas de interfaz ----

const TEXTO_ESTADO = {
  sincronizado: "Sincronizado",
  sincronizando: "Sincronizando",
  "sin-conexion": "Sin conexión",
  error: "Error de sincronización",
};

// Pastilla con el estado de la sincronización (o la invitación a iniciar sesión)
function pastillaSync(doc, conexion, sesion) {
  const punto = h(doc, "span", { clase: "e-punto", "aria-hidden": "true" });
  const texto = h(doc, "span");
  const el = h(doc, "button", { type: "button", clase: "e-sync", al: { click: () => (conexion.activa() ? conexion.estado()?.sincronizar() : sesion.abrir()) } }, punto, texto);
  function pintar() {
    const s = conexion.estado();
    if (!conexion.activa()) {
      el.dataset.estado = "sin-sesion";
      texto.textContent = "Sin sesión: inicia sesión para ver tu progreso";
      el.removeAttribute("title");
    } else if (!s) {
      el.dataset.estado = "sincronizando";
      texto.textContent = "Abriendo tu estado";
    } else {
      const e = s.estado();
      el.dataset.estado = e.estado;
      texto.textContent = TEXTO_ESTADO[e.estado] + (e.sucio && e.estado === "sincronizado" ? " (cambios por subir)" : "");
      el.title = e.detalle || "Toca para sincronizar ahora";
    }
  }
  pintar();
  conexion.alCambiar(pintar);
  return el;
}

function barra(doc, fraccion, etiqueta) {
  const pct = Math.round(fraccion * 100);
  const relleno = h(doc, "span", { clase: "e-barra__relleno" });
  relleno.style.width = `${pct}%`;
  return h(doc, "div", { clase: "e-barra", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct), "aria-label": etiqueta }, relleno);
}

// Selector de estado de una entrada. Se actualiza en su sitio (no se reconstruye: conserva el foco).
function selectorEstado(doc, conexion, id, titulo) {
  const select = h(
    doc,
    "select",
    {
      clase: "e-estado",
      "aria-label": `Estado de «${titulo}»`,
      al: {
        change: async () => {
          const store = conexion.estado();
          if (!store) return;
          try {
            await store.marcar(id, select.value);
          } catch (e) {
            select.value = store.estadoDe(id);
            console.warn("Estudio:", e);
          }
        },
      },
    },
    N.ESTADOS.map((e) => h(doc, "option", { value: e }, N.ETIQUETAS[e])),
  );
  function actualizar() {
    const store = conexion.estado();
    select.disabled = !store;
    select.value = store ? store.estadoDe(id) : "pendiente";
    select.dataset.valor = select.value;
    select.title = store ? "" : "Inicia sesión para marcar tu progreso";
    select.closest?.("[data-entrada]")?.setAttribute("data-estado", select.value);
  }
  select.actualizar = actualizar;
  conexion.alCambiar(actualizar);
  return select;
}

const rutaEntrada = (materia, entrada, fuentes) => {
  const f = fuentes[entrada.fuente];
  return f?.texto ? N.rutaLectura(materia, entrada.fuente, entrada.ancla) : null;
};

// Tras insertar los controles en la página: los pone al día con el estado actual
const iniciarControles = (raiz) => raiz.querySelectorAll("select.e-estado").forEach((s) => s.actualizar?.());

// ---- Inicio: tablero ----

export function montarInicio(raiz, { doc, datos, conexion, sesion }) {
  const { areas, materias } = datos;

  function pintar() {
    const items = conexion.items();
    const con = conexion.activa() && conexion.estado();
    const idsTodos = Object.entries(materias).flatMap(([id, m]) => N.idsDeMateria(id, m));
    const total = N.contar(idsTodos, items);
    const partes = [];

    // Resumen
    const resumen = h(doc, "section", { clase: "e-resumen", "aria-label": "Resumen" });
    if (con) {
      resumen.append(
        h(doc, "div", { clase: "e-fichas" }, N.ESTADOS.map((e) => h(doc, "div", { clase: "e-ficha", datos: { estado: e } }, h(doc, "strong", {}, String(total[e])), h(doc, "span", {}, ETIQUETAS_PLURAL[e])))),
        barra(doc, total.fraccion, "Progreso general"),
        h(doc, "p", { clase: "e-nota" }, `${total.hechas} de ${plural(total.total, "lectura", "lecturas")} terminadas (leídas o apuntadas).`),
      );
    } else {
      resumen.append(
        h(doc, "p", { clase: "e-nota" }, `${plural(total.total, "lectura", "lecturas")} en ${plural(Object.keys(materias).length, "materia", "materias")}. Tu progreso solo se ve con la sesión iniciada.`),
      );
    }
    partes.push(resumen);

    // Sigue con
    const sig = con ? N.siguientes(materias, items, 4) : [];
    if (sig.length) {
      partes.push(
        h(
          doc,
          "section",
          { clase: "e-sigue", "aria-label": "Sigue con" },
          h(doc, "h2", {}, "Sigue con"),
          h(
            doc,
            "ul",
            { clase: "e-lista" },
            sig.map(({ materia, entrada }) => {
              const m = materias[materia];
              const f = m.fuentes[entrada.fuente];
              const leer = rutaEntrada(materia, entrada, m.fuentes);
              const estado = N.estadoDe(items, N.idEstado(materia, entrada.id));
              return h(
                doc,
                "li",
                { datos: { estado } },
                h(doc, "div", {}, h(doc, "strong", {}, entrada.titulo), h(doc, "span", { clase: "e-meta" }, `${m.corto ?? m.nombre}${f?.autor ? ` · ${f.autor}` : ""}`)),
                leer ? h(doc, "a", { clase: "e-boton", href: leer }, estado === "leyendo" ? "Seguir" : "Leer") : h(doc, "span", { clase: "e-meta" }, "Texto pendiente"),
              );
            }),
          ),
        ),
      );
    }

    // Materias por área
    for (const [aid, area] of Object.entries(areas).sort((a, b) => (a[1].orden ?? 0) - (b[1].orden ?? 0))) {
      const lista = Object.entries(materias).filter(([, m]) => m.area === aid);
      const tarjetas = lista.map(([id, m]) => {
        const c = N.contar(N.idsDeMateria(id, m), items);
        const conTexto = m.ruta.filter((e) => m.fuentes[e.fuente]?.texto).length;
        return h(
          doc,
          "a",
          { clase: "e-materia", href: `materia.html?m=${encodeURIComponent(id)}` },
          h(doc, "h3", {}, m.nombre),
          m.descripcion ? h(doc, "p", {}, m.descripcion) : null,
          con ? barra(doc, c.fraccion, `Progreso en ${m.nombre}`) : null,
          h(
            doc,
            "span",
            { clase: "e-meta" },
            con ? `${c.hechas} de ${c.total} terminadas${c.leyendo ? ` · ${c.leyendo} en curso` : ""}` : `${plural(c.total, "lectura", "lecturas")} · ${conTexto} con texto`,
          ),
        );
      });
      partes.push(
        h(
          doc,
          "section",
          { clase: "e-area", datos: { area: aid } },
          h(doc, "h2", {}, area.nombre),
          lista.length ? h(doc, "div", { clase: "e-materias" }, tarjetas) : h(doc, "p", { clase: "e-nota" }, "Aún no hay materias en esta área."),
        ),
      );
    }
    raiz.replaceChildren(h(doc, "div", { clase: "e-barra-sup" }, pastillaSync(doc, conexion, sesion)), ...sinNulos(partes));
  }
  pintar();
  conexion.alCambiar((tipo) => tipo !== "estado" && pintar());
}

// ---- Materia ----

export function montarMateria(raiz, { doc, datos, conexion, sesion, id }) {
  const m = datos.materias[id];
  if (!m) {
    raiz.replaceChildren(h(doc, "p", { clase: "e-nota" }, "No se encontró esa materia."), h(doc, "a", { clase: "back", href: "index.html" }, "← Espacio de estudio"));
    return;
  }
  doc.title = `${m.nombre} · Espacio de estudio · Wolfgang Reséndiz`;
  const resumen = h(doc, "p", { clase: "e-nota" });
  const progreso = h(doc, "div", { clase: "e-progreso" });
  function pintarResumen() {
    const con = conexion.activa() && conexion.estado();
    const c = N.contar(N.idsDeMateria(id, m), conexion.items());
    progreso.replaceChildren(...(con ? [barra(doc, c.fraccion, `Progreso en ${m.nombre}`)] : []));
    resumen.textContent = con
      ? `${c.hechas} de ${plural(c.total, "lectura", "lecturas")} terminadas · ${c.leyendo} en curso · ${c.pendiente} pendientes.`
      : `${plural(c.total, "lectura", "lecturas")}. Inicia sesión para marcar tu progreso.`;
  }
  pintarResumen();
  conexion.alCambiar((tipo) => tipo !== "estado" && pintarResumen());

  const secciones = (m.secciones?.length ? m.secciones : [{ id: "", nombre: "Ruta" }]).map((s) => {
    const entradas = m.ruta.filter((e) => (e.seccion ?? "") === s.id);
    if (!entradas.length) return null;
    return h(
      doc,
      "section",
      { clase: "e-seccion" },
      h(doc, "h2", {}, s.nombre),
      entradas.map((e) => {
        const f = m.fuentes[e.fuente] ?? {};
        const leer = rutaEntrada(id, e, m.fuentes);
        const sid = N.idEstado(id, e.id);
        const card = h(doc, "article", { clase: "e-entrada", datos: { entrada: e.id, estado: "pendiente" } });
        card.append(
          ...sinNulos(
          h(doc, "div", { clase: "e-entrada__cabeza" }, h(doc, "h3", {}, e.titulo), e.rol === "apoyo" ? h(doc, "span", { clase: "pastilla" }, "apoyo") : null),
          h(doc, "p", { clase: "e-meta" }, [f.autor, f.edicion].filter(Boolean).join(" · ")),
          f.alcance ? h(doc, "p", { clase: "e-alcance" }, f.alcance) : null,
          e.nota ? h(doc, "p", { clase: "e-nota" }, e.nota) : null,
          h(
            doc,
            "div",
            { clase: "e-acciones" },
            selectorEstado(doc, conexion, sid, e.titulo),
            leer ? h(doc, "a", { clase: "e-boton", href: leer }, "Leer") : h(doc, "span", { clase: "e-meta" }, "Texto pendiente"),
            (e.complementos ?? []).filter((c) => m.fuentes[c]?.texto).map((c) => h(doc, "a", { clase: "e-enlace", href: N.rutaLectura(id, c) }, `Complemento: ${m.fuentes[c].titulo}`)),
          ),
          ),
        );
        return card;
      }),
    );
  });

  const apuntes = (m.apuntes ?? []).length
    ? h(
        doc,
        "section",
        { clase: "e-seccion" },
        h(doc, "h2", {}, "Apuntes"),
        h(doc, "ul", { clase: "e-lista" }, m.apuntes.map((a) => h(doc, "li", {}, h(doc, "a", { href: a.ruta }, a.titulo)))),
      )
    : null;

  raiz.replaceChildren(
    ...sinNulos(
      h(doc, "div", { clase: "e-barra-sup" }, pastillaSync(doc, conexion, sesion)),
      h(doc, "h1", {}, m.nombre),
      m.descripcion ? h(doc, "p", { clase: "subtitulo" }, m.descripcion) : null,
      progreso,
      resumen,
      secciones,
      apuntes,
    ),
  );
  iniciarControles(raiz);
}

// ---- Lectura ----

export function montarLectura(raiz, { doc, datos, conexion, sesion, materia, fuente, ventana = globalThis.window }) {
  const m = datos.materias[materia];
  const f = m?.fuentes[fuente];
  if (!f) return;
  const entradas = m.ruta.filter((e) => e.fuente === fuente || (e.complementos ?? []).includes(fuente));
  const lista = entradas.map((e) => {
    const sid = N.idEstado(materia, e.id);
    const propia = e.fuente === fuente;
    return h(
      doc,
      "li",
      { datos: { entrada: e.id, estado: "pendiente" } },
      h(doc, "span", { clase: "e-lectura__titulo" }, e.titulo, propia ? null : h(doc, "span", { clase: "e-meta" }, " (complemento)")),
      propia && e.ancla ? h(doc, "a", { clase: "e-enlace", href: `#${e.ancla}` }, "Ir al inicio") : null,
      propia ? selectorEstado(doc, conexion, sid, e.titulo) : h(doc, "a", { clase: "e-enlace", href: `../materia.html?m=${encodeURIComponent(materia)}` }, "Ver en la ruta"),
    );
  });
  raiz.replaceChildren(...sinNulos(h(doc, "div", { clase: "e-barra-sup" }, pastillaSync(doc, conexion, sesion)), lista.length ? h(doc, "ul", { clase: "e-lista e-lectura" }, lista) : null));
  iniciarControles(raiz);
  doc.title = `${f.titulo} · ${m.corto ?? m.nombre} · Wolfgang Reséndiz`;

  // El texto llega cifrado y se inserta después: el #ancla de la URL no se resuelve solo
  const irAlAncla = () => {
    const hash = ventana?.location?.hash;
    if (!hash || hash.length < 2) return;
    let id;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    doc.getElementById(id)?.scrollIntoView({ block: "start" });
  };
  doc.addEventListener("wr:privado", () => ventana?.setTimeout(irAlAncla, 0));
  // Si el texto ya se descifró antes de que este módulo arrancara, el evento ya pasó
  if (doc.querySelector('[data-privado-estado="visible"]')) irAlAncla();
}
