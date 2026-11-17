// Tablero de ideas y pendientes del sitio: lee datos/tablero.json y proyectos.json (nombres de las
// zonas) y pinta resumen, filtros y columnas. Todo texto entra con `textContent` (nunca como HTML).
import * as N from "./nucleo.mjs";

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

// nombres: id de zona → nombre para mostrar
export function montar(raiz, { doc, datos, nombres, ventana = globalThis.window }) {
  const consulta = new URLSearchParams(ventana?.location?.search ?? "");
  const estado = { zona: nombres[consulta.get("zona")] ? consulta.get("zona") : "", prioridad: "", texto: consulta.get("q") ?? "" };
  const items = datos.items;
  const nombreZona = (id) => nombres[id] ?? id;

  const fichas = h(doc, "div", { clase: "t-fichas" });
  const resultado = h(doc, "p", { clase: "t-nota", role: "status" });
  const columnas = h(doc, "div", { clase: "t-columnas" });

  const buscador = h(doc, "input", { type: "search", clase: "t-buscar", placeholder: "Buscar", "aria-label": "Buscar", value: estado.texto, al: { input: () => ((estado.texto = buscador.value), pintar()) } });
  const zonas = h(
    doc,
    "select",
    { clase: "t-select", "aria-label": "Proyecto", al: { change: () => ((estado.zona = zonas.value), pintar()) } },
    h(doc, "option", { value: "" }, "Todos los proyectos"),
    Object.keys(nombres).map((id) => h(doc, "option", { value: id }, nombreZona(id))),
  );
  zonas.value = estado.zona;
  const prioridades = h(
    doc,
    "select",
    { clase: "t-select", "aria-label": "Prioridad", al: { change: () => ((estado.prioridad = prioridades.value), pintar()) } },
    h(doc, "option", { value: "" }, "Cualquier prioridad"),
    N.PRIORIDADES.map((p) => h(doc, "option", { value: p }, `Prioridad ${p}`)),
  );

  function tarjeta(x) {
    const enlace = x.enlace && N.enlaceSeguro(x.enlace) ? x.enlace : null;
    return h(
      doc,
      "li",
      { clase: "t-item", datos: { id: x.id, estado: x.estado, prioridad: x.prioridad ?? "" } },
      h(doc, "div", { clase: "t-item__cabeza" }, h(doc, "strong", {}, x.titulo), x.prioridad ? h(doc, "span", { clase: "pastilla t-prio", datos: { prioridad: x.prioridad } }, x.prioridad) : null),
      x.detalle ? h(doc, "p", {}, x.detalle) : null,
      h(
        doc,
        "div",
        { clase: "t-pie" },
        h(doc, "span", { clase: "etiqueta" }, nombreZona(x.zona)),
        h(doc, "span", { clase: "t-fecha" }, x.estado === "hecho" ? `hecho ${x.hecho}` : x.fecha),
        enlace ? h(doc, "a", { href: enlace, rel: "noopener" }, "Ver") : null,
      ),
    );
  }

  function pintar() {
    const todos = N.contar(items);
    fichas.replaceChildren(
      ...N.ESTADOS.map((e) => h(doc, "div", { clase: "t-ficha", datos: { estado: e.id } }, h(doc, "strong", {}, String(todos.porEstado[e.id])), h(doc, "span", {}, e.nombre))),
    );
    const visibles = N.filtrar(items, estado);
    const grupos = N.agrupar(visibles);
    resultado.textContent =
      estado.zona || estado.prioridad || estado.texto.trim()
        ? `${visibles.length} de ${items.length} elementos.`
        : `${todos.abiertos} abiertos y ${todos.porEstado.hecho} hechos.`;
    columnas.replaceChildren(
      ...N.ESTADOS.map((e) => {
        const lista = grupos[e.id];
        const cuerpo = lista.length ? h(doc, "ul", { clase: "t-lista" }, lista.map(tarjeta)) : h(doc, "p", { clase: "t-vacio" }, "Nada por aquí.");
        // Lo hecho va plegado: lo que importa es lo que sigue
        if (e.id === "hecho") return h(doc, "details", { clase: "t-columna", datos: { estado: e.id }, open: lista.length > 0 && lista.length <= 5 }, h(doc, "summary", {}, `${e.nombre} (${lista.length})`), cuerpo);
        return h(doc, "section", { clase: "t-columna", datos: { estado: e.id } }, h(doc, "h2", {}, `${e.nombre} (${lista.length})`), cuerpo);
      }),
    );
  }

  raiz.replaceChildren(fichas, h(doc, "div", { clase: "t-controles" }, buscador, zonas, prioridades), resultado, columnas);
  pintar();
}

// Invitación a iniciar sesión (sin ella no hay nada del tablero a la vista)
export function invitacion(doc) {
  return h(
    doc,
    "div",
    { clase: "t-privado" },
    h(doc, "p", {}, "Este tablero es privado: se publica cifrado y se abre con tu sesión."),
    h(doc, "button", { type: "button", clase: "t-boton", "data-sesion-accion": "abrir" }, "Iniciar sesión"),
  );
}

// Abre datos/tablero.enc con la sesión del sitio → datos (lanza si no se puede)
export async function abrirDatos({ sesion, fetchf = globalThis.fetch.bind(globalThis), url }) {
  const r = await fetchf(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`tablero.enc: ${r.status}`);
  return JSON.parse(await sesion.descifrar(new Uint8Array(await r.arrayBuffer())));
}

// Arranque en la página
if (typeof document !== "undefined") {
  const raiz = document.getElementById("tablero-raiz");
  if (raiz) {
    const { sesion } = await import("../../js/sesion.mjs");
    let generacion = 0;
    try {
      // Solo los nombres de los proyectos (público): los elementos del tablero van cifrados
      const r = await fetch(new URL("../../proyectos.json", import.meta.url), { cache: "no-cache" });
      if (!r.ok) throw new Error(`proyectos.json: ${r.status}`);
      const proyectos = await r.json();
      const nombres = { [N.GENERAL]: "General" };
      for (const [id, p] of Object.entries(proyectos.proyectos)) nombres[id] = p.corto ?? p.nombre;

      const pintar = async () => {
        const mia = ++generacion;
        if (!sesion.activa()) return raiz.replaceChildren(invitacion(document));
        raiz.replaceChildren(h(document, "p", { clase: "t-nota" }, "Abriendo el tablero"));
        try {
          const datos = await abrirDatos({ sesion, url: new URL("../datos/tablero.enc", import.meta.url) });
          if (mia !== generacion) return;
          const errores = N.validar(datos, Object.keys(nombres));
          if (errores.length) console.warn("Tablero: datos con errores:", errores);
          montar(raiz, { doc: document, datos, nombres });
          if (errores.length) raiz.prepend(h(document, "p", { clase: "t-nota" }, `Ojo: los datos tienen ${errores.length} error(es): ${errores.slice(0, 2).join("; ")}`));
        } catch (e) {
          if (mia !== generacion) return;
          console.warn("Tablero:", e);
          raiz.replaceChildren(h(document, "p", { clase: "t-nota" }, "No se pudo abrir el tablero."));
        }
      };
      sesion.alCambiar(() => pintar());
      pintar();
    } catch (e) {
      console.warn("Tablero:", e);
      raiz.textContent = "No se pudo cargar el tablero.";
    }
  }
}
