/*
 * Subrayados y notas de lectura (zona general).
 *
 * Quien visita puede subrayar texto y anotarlo en cualquier página del sitio.
 * Todo vive en localStorage de su navegador (clave «web-notas»): nada se envía
 * a ningún servidor. Para pasarlas al repositorio se exportan en Markdown
 * (archivo, sección, cita con contexto y nota), pensado para dárselo a Claude.
 *
 * No hace falta agregarlo a cada página: js/darwin.js (que está en todas) lo
 * carga. Para apagarlo:
 *   - en una página:   <meta name="notas" content="no">
 *   - en un proyecto:  "notas": false en proyectos.json
 *
 * Uso:
 *   seleccionar texto  aparece una barrita: colores (subrayar) y «Nota»
 *   clic en un subrayado  editar la nota, cambiar el color o borrarlo
 *   botón ✎ (en .ajustes o flotante)  lista, exportar, respaldo e importar
 *
 * Anclaje (como los selectores de W3C Web Annotation): cada marca guarda su
 * posición en el texto de <main> (o <body>) y la cita exacta con 40 caracteres
 * antes y después. Si la página cambia, se busca la cita y se elige la
 * aparición cuyo contexto se parece más. Se pinta con la API de resaltado de
 * CSS (::highlight), que no toca el DOM de la página.
 */
(() => {
  "use strict";

  const CLAVE = "web-notas";
  const VERSION = 1;
  const CONTEXTO = 40;
  const COLORES = {
    amarillo: { nombre: "amarillo", fondo: "rgba(250, 204, 21, 0.42)" },
    verde: { nombre: "verde", fondo: "rgba(74, 222, 128, 0.36)" },
    rosa: { nombre: "rosa", fondo: "rgba(244, 114, 182, 0.34)" },
    azul: { nombre: "azul", fondo: "rgba(96, 165, 250, 0.36)" },
  };
  const COLOR_INICIAL = "amarillo";

  // ---------------------------------------------------------------------------
  // Funciones puras (se prueban con node: herramientas/pruebas/notas.test.mjs)
  // ---------------------------------------------------------------------------

  /** Espacios colapsados y sin orillas. */
  const limpiar = (t) => String(t ?? "").replace(/\s+/g, " ").trim();

  /** Largo del sufijo común de a y b. */
  function sufijoComun(a, b) {
    let n = 0;
    while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
    return n;
  }

  /** Largo del prefijo común de a y b. */
  function prefijoComun(a, b) {
    let n = 0;
    while (n < a.length && n < b.length && a[n] === b[n]) n++;
    return n;
  }

  /**
   * Ubica una marca en el texto: [inicio, fin) o null si la cita ya no está.
   * 1) Si en su posición guardada sigue la misma cita, ahí se queda.
   * 2) Si no, entre todas las apariciones de la cita gana la de mayor
   *    puntaje = (contexto igual antes) + (contexto igual después) + cercanía.
   */
  function anclar(texto, marca) {
    const { exacto, prefijo = "", sufijo = "", inicio = 0 } = marca;
    if (!exacto) return null;
    if (texto.slice(inicio, inicio + exacto.length) === exacto) return [inicio, inicio + exacto.length];
    let mejor = null;
    let puntaje = -Infinity;
    let vistas = 0;
    for (let i = texto.indexOf(exacto); i !== -1 && vistas < 5000; i = texto.indexOf(exacto, i + 1), vistas++) {
      const antes = sufijoComun(texto.slice(Math.max(0, i - prefijo.length), i), prefijo);
      const despues = prefijoComun(texto.slice(i + exacto.length, i + exacto.length + sufijo.length), sufijo);
      const cerca = 1 - Math.min(1, Math.abs(i - inicio) / Math.max(1, texto.length));
      const p = antes + despues + cerca;
      if (p > puntaje) {
        puntaje = p;
        mejor = [i, i + exacto.length];
      }
    }
    return mejor;
  }

  /** Datos de anclaje de [inicio, fin) dentro del texto. */
  function citar(texto, inicio, fin) {
    return {
      exacto: texto.slice(inicio, fin),
      prefijo: texto.slice(Math.max(0, inicio - CONTEXTO), inicio),
      sufijo: texto.slice(fin, fin + CONTEXTO),
      inicio,
      fin,
    };
  }

  /**
   * Ruta del archivo en el repositorio a partir de la URL de la página y la
   * raíz del sitio: «/web/manuales-conagua/» → «manuales-conagua/index.html».
   */
  function rutaDePagina(ruta, raiz) {
    let r = decodeURIComponent(ruta);
    const base = decodeURIComponent(raiz);
    if (r.startsWith(base)) r = r.slice(base.length);
    r = r.replace(/^\/+/, "");
    if (r === "" || r.endsWith("/")) r += "index.html";
    return r;
  }

  /** Proyecto (zona) al que pertenece una ruta; «general» si a ninguno. */
  function zonaDe(ruta, proyectos) {
    const carpeta = ruta.split("/")[0];
    for (const [id, p] of Object.entries(proyectos || {})) {
      if ((p.carpetas ?? [id]).includes(carpeta)) return id;
    }
    return "general";
  }

  const dosDigitos = (n) => String(n).padStart(2, "0");
  const fechaCorta = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
  };
  const fechaHora = (ms) => {
    const d = new Date(ms);
    return `${fechaCorta(ms)} ${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
  };
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

  /** Ordena por página y, dentro de cada una, por posición en el texto. */
  const ordenar = (marcas) =>
    [...marcas].sort((a, b) => a.pagina.localeCompare(b.pagina) || (a.inicio ?? 0) - (b.inicio ?? 0));

  /**
   * Markdown para integrar las marcas al sitio con ayuda de Claude.
   * opciones: { sitio: {nombre, url}, proyectos, ahora }
   */
  function aMarkdown(marcas, opciones = {}) {
    const { sitio = {}, proyectos = {}, ahora = Date.now() } = opciones;
    const lista = ordenar(marcas);
    const paginas = new Set(lista.map((m) => m.pagina));
    const conNota = lista.filter((m) => limpiar(m.nota)).length;
    const salida = [];
    salida.push(`# Notas de lectura${sitio.nombre ? ` · ${sitio.nombre}` : ""}`, "");
    salida.push(`- Exportado: ${fechaHora(ahora)}`);
    salida.push(`- ${plural(lista.length, "marca", "marcas")} (${plural(conNota, "con nota", "con nota")}) en ${plural(paginas.size, "página", "páginas")}`);
    if (sitio.url) salida.push(`- Sitio: ${sitio.url}`);
    salida.push(`- Formato: notas-web v${VERSION}`, "");
    salida.push(
      "> Para Claude: cada marca indica el archivo del repositorio, la sección y la cita textual con su contexto",
      "> («…antes **cita** después…»). Para ubicarla en el HTML busca la cita; si aparece varias veces, desempata",
      "> con el contexto y la sección. Cada zona se edita desde su propio entorno (`WEB_PROYECTO`): integra solo",
      "> la zona del entorno en que estés y avisa qué falta de las demás.",
      "",
    );

    // Zona → página → marcas
    const porZona = new Map();
    for (const m of lista) {
      const zona = zonaDe(m.pagina, proyectos);
      if (!porZona.has(zona)) porZona.set(zona, new Map());
      const pags = porZona.get(zona);
      if (!pags.has(m.pagina)) pags.set(m.pagina, []);
      pags.get(m.pagina).push(m);
    }
    for (const [zona, pags] of porZona) {
      const nombre = proyectos[zona]?.nombre;
      salida.push(`## Zona \`${zona}\`${nombre ? ` · ${nombre}` : ""}`, "");
      for (const [pagina, ms] of pags) {
        salida.push(`### \`${pagina}\``, "");
        const titulo = ms.find((m) => m.titulo)?.titulo;
        const url = sitio.url ? sitio.url.replace(/\/?$/, "/") + pagina.replace(/(^|\/)index\.html$/, "$1") : "";
        const cabeza = [titulo, url].filter(Boolean).join(" · ");
        if (cabeza) salida.push(cabeza, "");
        ms.forEach((m, i) => {
          const tipo = limpiar(m.nota) ? "Nota" : "Subrayado";
          const donde = [limpiar(m.seccion), m.ancla ? `\`#${m.ancla}\`` : ""].filter(Boolean).join(" ");
          salida.push(`#### ${i + 1}. ${tipo}${donde ? ` · ${donde}` : ""}`, "");
          salida.push(`> ${limpiar(m.exacto)}`, "");
          // Espacios colapsados, pero sin quitar los que tocan la cita (así se ve si está pegada)
          const antes = String(m.prefijo || "").replace(/\s+/g, " ").trimStart();
          const despues = String(m.sufijo || "").replace(/\s+/g, " ").trimEnd();
          salida.push(`- Contexto: «…${antes}**${limpiar(m.exacto)}**${despues}…»`);
          if (limpiar(m.nota)) {
            const renglones = String(m.nota).trim().split(/\r?\n/);
            salida.push(`- Nota: ${renglones[0]}`);
            for (const r of renglones.slice(1)) salida.push(`  ${r}`);
          }
          salida.push(`- Color: ${m.color || COLOR_INICIAL} · ${fechaCorta(m.editada || m.creada || ahora)}`, "");
        });
      }
    }
    return salida.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  }

  /** Valida y normaliza marcas importadas (de un respaldo .json). */
  function validar(datos) {
    const lista = Array.isArray(datos) ? datos : datos?.marcas;
    if (!Array.isArray(lista)) throw new Error("El archivo no tiene marcas.");
    return lista
      .filter((m) => m && typeof m.pagina === "string" && typeof m.exacto === "string" && m.exacto)
      .map((m) => ({
        id: String(m.id || nuevoId()),
        pagina: m.pagina,
        titulo: String(m.titulo || ""),
        exacto: m.exacto,
        prefijo: String(m.prefijo || ""),
        sufijo: String(m.sufijo || ""),
        inicio: Number(m.inicio) || 0,
        fin: Number(m.fin) || 0,
        seccion: String(m.seccion || ""),
        ancla: String(m.ancla || ""),
        color: COLORES[m.color] ? m.color : COLOR_INICIAL,
        nota: String(m.nota || ""),
        creada: Number(m.creada) || Date.now(),
        editada: Number(m.editada) || Number(m.creada) || Date.now(),
      }));
  }

  /** Une dos listas por id; gana la versión editada más reciente. */
  function fusionar(actuales, nuevas) {
    const porId = new Map(actuales.map((m) => [m.id, m]));
    let agregadas = 0;
    for (const m of nuevas) {
      const previa = porId.get(m.id);
      if (!previa) agregadas++;
      if (!previa || (m.editada || 0) > (previa.editada || 0)) porId.set(m.id, m);
    }
    return { marcas: [...porId.values()], agregadas };
  }

  function nuevoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // Sin navegador (pruebas con node): solo expone las funciones puras
  if (typeof document === "undefined") {
    globalThis.NotasPruebas = { anclar, citar, rutaDePagina, zonaDe, aMarkdown, validar, fusionar, limpiar, COLORES };
    return;
  }

  // ---------------------------------------------------------------------------
  // Navegador
  // ---------------------------------------------------------------------------

  if (window.__notasWeb || window.top !== window.self) return;
  window.__notasWeb = true;
  if (document.querySelector('meta[name="notas"][content="no"]')) return;

  // Raíz del sitio: este archivo vive en <raíz>/js/notas.js
  const yo = document.currentScript?.src || "";
  const RAIZ = yo ? new URL("../", yo) : new URL("./", location.href);
  const PAGINA = rutaDePagina(location.pathname, RAIZ.pathname);

  // --- Almacén ---------------------------------------------------------------

  let todas = [];
  function cargar() {
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE) || "null");
      todas = d ? validar(d) : [];
    } catch {
      todas = [];
    }
  }
  function guardarTodas() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ version: VERSION, marcas: todas }));
      return true;
    } catch {
      avisar("No se pudo guardar (almacenamiento lleno o bloqueado).");
      return false;
    }
  }
  const dePagina = () => todas.filter((m) => m.pagina === PAGINA);

  // Otra pestaña cambió las notas: recarga y repinta
  addEventListener("storage", (e) => {
    if (e.key !== CLAVE) return;
    cargar();
    pintar();
    if (panel?.open) llenarPanel();
  });

  // --- Proyectos (para zonas y para apagar las notas en un proyecto) --------

  let proyectos = null;
  let sitio = { nombre: "Wolfgang Reséndiz", url: "" };
  async function leerProyectos() {
    if (proyectos) return proyectos;
    try {
      const r = await fetch(new URL("proyectos.json", RAIZ), { cache: "force-cache" });
      const d = await r.json();
      proyectos = d.proyectos || {};
      if (d.sitio) sitio = d.sitio;
    } catch {
      proyectos = {};
    }
    return proyectos;
  }

  // --- Texto de la página ----------------------------------------------------

  const raizTexto = () => document.querySelector("main") || document.body;
  const OMITIR = "script, style, noscript, template, textarea, select, #darwin, [data-notas-ui]";

  const BLOQUES = "p, div, li, dt, dd, h1, h2, h3, h4, h5, h6, td, th, caption, blockquote, pre, figure, figcaption, section, article, header, footer, aside, nav, details, summary, main, body, table, tr";

  let indice = null; // { texto, nodos, inicios }
  function indexar() {
    const raiz = raizTexto();
    const nodos = [];
    const inicios = [];
    let texto = "";
    const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement?.closest(OMITIR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    // Entre bloques (párrafos, celdas, encabezados…) se agrega un salto que no está
    // en ningún nodo: así la cita y su contexto no quedan pegados («SuelosComisión»).
    let bloqueAnterior = null;
    for (let n = recorrido.nextNode(); n; n = recorrido.nextNode()) {
      const bloque = n.parentElement.closest(BLOQUES);
      if (bloqueAnterior && bloque !== bloqueAnterior && !/\s$/.test(texto)) texto += "\n";
      bloqueAnterior = bloque;
      nodos.push(n);
      inicios.push(texto.length);
      texto += n.data;
    }
    indice = { raiz, texto, nodos, inicios };
    return indice;
  }

  /** Punto (contenedor, desplazamiento) → posición en el texto. */
  function posicionDe(contenedor, desplazamiento) {
    const { nodos, inicios, texto } = indice;
    if (contenedor.nodeType === Node.TEXT_NODE) {
      const k = nodos.indexOf(contenedor);
      if (k !== -1) return inicios[k] + Math.min(desplazamiento, contenedor.data.length);
    }
    // Primer nodo de texto que queda en o después del punto (búsqueda binaria)
    const punto = document.createRange();
    punto.setStart(contenedor, desplazamiento);
    let a = 0;
    let b = nodos.length;
    while (a < b) {
      const m = (a + b) >> 1;
      if (punto.comparePoint(nodos[m], 0) < 0) a = m + 1;
      else b = m;
    }
    return a < nodos.length ? inicios[a] : texto.length;
  }

  /** Posición en el texto → [nodo, desplazamiento]. */
  function puntoDe(pos, alFinal) {
    const { nodos, inicios } = indice;
    let a = 0;
    let b = nodos.length - 1;
    while (a < b) {
      const m = (a + b + 1) >> 1;
      if (inicios[m] < pos || (!alFinal && inicios[m] === pos)) a = m;
      else b = m - 1;
    }
    const n = nodos[a];
    return [n, Math.max(0, Math.min(n.data.length, pos - inicios[a]))];
  }

  function rangoDe(inicio, fin) {
    const r = document.createRange();
    r.setStart(...puntoDe(inicio, false));
    r.setEnd(...puntoDe(fin, true));
    return r;
  }

  /** Sección (encabezado anterior) y ancla (id anterior o contenedor) de un punto. */
  function ubicar(nodo) {
    let seccion = "";
    let ancla = "";
    const recorrido = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    recorrido.currentNode = nodo.nodeType === Node.ELEMENT_NODE ? nodo : nodo.parentElement || document.body;
    for (let e = recorrido.currentNode, vueltas = 0; e && vueltas < 20000 && !(seccion && ancla); e = recorrido.previousNode(), vueltas++) {
      if (e.closest?.(OMITIR) || e.closest?.("nav")) continue;
      if (!ancla && e.id) ancla = e.id;
      if (!seccion && /^H[1-6]$/.test(e.tagName)) seccion = limpiar(e.textContent).slice(0, 140);
    }
    return { seccion, ancla };
  }

  // --- Pintar ----------------------------------------------------------------

  const conResaltado = typeof Highlight === "function" && !!window.CSS?.highlights;
  let rangos = new Map(); // id → Range
  let huerfanas = new Set(); // ids que no se encontraron en la página

  function pintar() {
    const marcas = dePagina();
    rangos = new Map();
    huerfanas = new Set();
    if (conResaltado) {
      for (const c of Object.keys(COLORES)) CSS.highlights.delete(`notas-${c}`);
      CSS.highlights.delete("notas-con-nota");
    }
    if (!marcas.length) return;
    indexar();
    const grupos = Object.fromEntries(Object.keys(COLORES).map((c) => [c, []]));
    const anotadas = [];
    for (const m of marcas) {
      const lugar = anclar(indice.texto, m);
      if (!lugar) {
        huerfanas.add(m.id);
        continue;
      }
      // Recuerda la posición nueva si la página cambió
      [m.inicio, m.fin] = lugar;
      const r = rangoDe(...lugar);
      rangos.set(m.id, r);
      (grupos[m.color] || grupos[COLOR_INICIAL]).push(r);
      if (limpiar(m.nota)) anotadas.push(r);
    }
    if (!conResaltado) return;
    for (const [c, rs] of Object.entries(grupos)) if (rs.length) CSS.highlights.set(`notas-${c}`, new Highlight(...rs));
    if (anotadas.length) {
      const h = new Highlight(...anotadas);
      h.priority = 1;
      CSS.highlights.set("notas-con-nota", h);
    }
  }

  // Si la página cambia su texto (búsquedas, calculadoras), vuelve a anclar
  let pendiente = 0;
  const observador = new MutationObserver((cambios) => {
    if (!dePagina().length) return;
    const esUI = (n) => n.nodeType === Node.ELEMENT_NODE ? !!n.closest("[data-notas-ui]") : !!n.parentElement?.closest("[data-notas-ui]");
    const propio = (c) => esUI(c.target) || (c.type === "childList" && [...c.addedNodes, ...c.removedNodes].every(esUI));
    if (cambios.every(propio)) return;
    clearTimeout(pendiente);
    pendiente = setTimeout(pintar, 350);
  });

  // --- Estilos ---------------------------------------------------------------

  const ESTILO = `
${Object.entries(COLORES).map(([c, { fondo }]) => `::highlight(notas-${c}){background-color:${fondo}}`).join("\n")}
::highlight(notas-con-nota){text-decoration:underline 2px;text-decoration-color:var(--accent,#e0607e);text-underline-offset:3px}
[data-notas-ui]{--n-bg:var(--surface,#fff);--n-bg2:var(--surface-2,#f3efe8);--n-tx:var(--text-strong,#1f1b16);
  --n-mut:var(--muted,#6b645b);--n-bd:var(--border-strong,#d6cfc4);--n-ac:var(--accent,#d6457a);--n-sobre:var(--sobre-acento,#fff);
  font:14px/1.4 var(--font-texto,system-ui,-apple-system,"Segoe UI",sans-serif);color:var(--n-tx);box-sizing:border-box;text-align:left}
[data-notas-ui] *{box-sizing:border-box}
[data-notas-ui] :where(button){font:inherit;font-weight:400;color:inherit;margin:0;min-height:0;width:auto;padding:0;
  cursor:pointer;line-height:1.2;filter:none;transform:none;background:none;border:0}
.notas-barra{position:absolute;z-index:2147483100;display:flex;align-items:center;gap:4px;padding:5px;
  background:var(--n-bg);border:1px solid var(--n-bd);border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.18)}
.notas-barra[hidden],.notas-globo[hidden]{display:none}
.notas-punto{flex:none;width:24px;height:24px;padding:0;border-radius:50%;border:2px solid transparent;background:var(--c)}
.notas-punto:hover,.notas-punto[aria-pressed="true"]{border-color:var(--n-tx)}
.notas-btn{padding:5px 11px;border-radius:999px;border:1px solid var(--n-bd);background:var(--n-bg2)}
.notas-btn:hover{border-color:var(--n-ac)}
.notas-btn--acento{background:var(--n-ac);border-color:var(--n-ac);color:var(--n-sobre)}
.notas-btn--peligro:hover{border-color:#c0392b;color:#c0392b}
.notas-globo{position:absolute;z-index:2147483100;width:min(340px,calc(100vw - 20px));padding:12px;
  background:var(--n-bg);border:1px solid var(--n-bd);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.2)}
.notas-globo blockquote{margin:0 0 8px;padding:0 0 0 10px;border-left:3px solid var(--n-ac);color:var(--n-mut);
  max-height:5.6em;overflow:auto;font-size:13px}
.notas-globo textarea,.notas-panel textarea{width:100%;min-height:84px;resize:vertical;font:inherit;color:var(--n-tx);
  background:var(--n-bg2);border:1px solid var(--n-bd);border-radius:8px;padding:8px}
.notas-fila{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px}
.notas-fila .notas-espacio{flex:1}
.notas-abrir{position:relative}
.notas-flotante{position:fixed;right:14px;bottom:76px;z-index:9100;width:40px;height:40px;min-height:0;margin:0;border-radius:50%;
  display:grid;place-items:center;padding:0;color:var(--n-tx);cursor:pointer;background:var(--n-bg);border:1px solid var(--n-bd);box-shadow:0 3px 12px rgba(0,0,0,.15)}
.notas-abrir svg{width:18px;height:18px}
.notas-cuenta{position:absolute;top:1px;right:0;min-width:15px;height:15px;padding:0 3px;border-radius:999px;
  background:var(--n-ac);color:var(--n-sobre);font:600 10px/15px var(--font-mono,ui-monospace,monospace);text-align:center}
.notas-cuenta:empty{display:none}
.notas-panel{width:min(620px,calc(100vw - 24px));max-height:min(86vh,900px);padding:0;border:1px solid var(--n-bd);
  border-radius:14px;background:var(--n-bg);color:var(--n-tx);box-shadow:0 20px 60px rgba(0,0,0,.3)}
.notas-panel::backdrop{background:rgba(20,16,12,.35)}
.notas-panel__cabeza{position:sticky;top:0;display:flex;align-items:center;gap:8px;padding:14px 16px;background:var(--n-bg);
  border-bottom:1px solid var(--n-bd)}
.notas-panel__cabeza h2{margin:0;font:600 18px/1.2 var(--font-titulo,inherit);flex:1}
.notas-panel__cuerpo{padding:12px 16px 16px}
.notas-panel h3{margin:14px 0 6px;font:600 13px/1.3 var(--font-mono,ui-monospace,monospace);color:var(--n-mut);
  text-transform:uppercase;letter-spacing:.04em}
.notas-panel p{margin:6px 0;color:var(--n-mut)}
.notas-panel ol{list-style:none;margin:0;padding:0}
.notas-item{display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--n-bd)}
.notas-item__color{flex:none;width:6px;border-radius:3px;background:var(--c)}
.notas-item__texto{flex:1;min-width:0}
.notas-item__cita{display:block;width:100%;padding:0;border:0;background:none;text-align:left;color:var(--n-tx)}
.notas-item__cita:hover{color:var(--n-ac)}
.notas-item__nota{margin-top:3px;color:var(--n-mut);white-space:pre-wrap;font-size:13px}
.notas-item__extra{font:11px/1.3 var(--font-mono,ui-monospace,monospace);color:var(--n-mut);margin-top:3px}
.notas-panel select{font:inherit;color:var(--n-tx);background:var(--n-bg2);border:1px solid var(--n-bd);border-radius:8px;padding:5px 8px;width:auto}
.notas-aviso{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483200;padding:8px 14px;border-radius:999px;
  background:var(--n-tx);color:var(--n-bg);box-shadow:0 6px 20px rgba(0,0,0,.25)}
.notas-destello{animation:notas-destello 1.2s ease}
@keyframes notas-destello{0%,60%{outline:3px solid var(--n-ac)}100%{outline:3px solid transparent}}
@media print{[data-notas-ui]{display:none!important}}
`;

  // --- Interfaz --------------------------------------------------------------

  const crear = (etiqueta, props = {}, ...hijos) => {
    const e = document.createElement(etiqueta);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") e.className = v;
      else if (k === "texto") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k === "style") e.style.cssText = v;
      else e.setAttribute(k, v);
    }
    for (const h of hijos) if (h != null) e.append(h);
    return e;
  };
  const marcarUI = (e) => (e.setAttribute("data-notas-ui", ""), e);

  const ICONO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`;

  let barra; // barrita al seleccionar
  let globo; // editor de una marca
  let panel; // <dialog> con la lista y la exportación
  let botonAbrir;

  function avisar(texto) {
    const a = marcarUI(crear("div", { class: "notas-aviso", role: "status", texto }));
    // Con el panel abierto (modal), lo de fuera queda debajo: el aviso va dentro
    (panel?.open ? panel : document.body).append(a);
    setTimeout(() => a.remove(), 2600);
  }

  /** Coloca un elemento flotante bajo (o sobre) un rectángulo de la página. */
  function colocar(el, rect) {
    el.hidden = false;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = document.documentElement.clientWidth;
    let x = rect.left + rect.width / 2 - w / 2;
    x = Math.max(8, Math.min(vw - w - 8, x));
    let y = rect.bottom + 10;
    if (y + h > innerHeight - 8 && rect.top - h - 10 > 8) y = rect.top - h - 10;
    el.style.left = `${x + scrollX}px`;
    el.style.top = `${y + scrollY}px`;
  }

  function construir() {
    document.head.append(crear("style", { id: "notas-estilo", texto: ESTILO }));

    // Barrita de selección
    barra = marcarUI(crear("div", { class: "notas-barra", role: "toolbar", "aria-label": "Subrayar selección", hidden: "" }));
    for (const [c, { nombre, fondo }] of Object.entries(COLORES)) {
      barra.append(crear("button", { type: "button", class: "notas-punto", style: `--c:${fondo}`, title: `Subrayar en ${nombre}`, "aria-label": `Subrayar en ${nombre}`, "data-color": c }));
    }
    barra.append(crear("button", { type: "button", class: "notas-btn", "data-accion": "nota", texto: "Nota" }));
    // Que el clic no borre la selección antes de leerla
    barra.addEventListener("pointerdown", (e) => e.preventDefault());
    barra.addEventListener("mousedown", (e) => e.preventDefault());
    barra.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const m = crearDeSeleccion(b.dataset.color || ultimoColor());
      if (m && b.dataset.accion === "nota") abrirGlobo(m, true);
    });
    document.body.append(barra);

    // Globo de edición
    globo = marcarUI(crear("div", { class: "notas-globo", role: "dialog", "aria-label": "Nota", hidden: "" }));
    document.body.append(globo);

    // Botón para abrir el panel: en los ajustes del encabezado o flotante
    botonAbrir = marcarUI(crear("button", { type: "button", class: "notas-abrir", title: "Notas y subrayados", "aria-label": "Notas y subrayados" }));
    botonAbrir.innerHTML = ICONO + '<span class="notas-cuenta"></span>';
    botonAbrir.addEventListener("click", abrirPanel);
    const ajustes = document.querySelector(".ajustes");
    if (ajustes) {
      botonAbrir.classList.add("ajuste");
      ajustes.prepend(botonAbrir);
    } else {
      botonAbrir.classList.add("notas-flotante");
      document.body.append(botonAbrir);
    }
    contar();
  }

  function contar() {
    const n = dePagina().length;
    const c = botonAbrir?.querySelector(".notas-cuenta");
    if (c) c.textContent = n ? String(n) : "";
  }

  let colorPreferido = COLOR_INICIAL;
  const ultimoColor = () => colorPreferido;

  // --- Selección → marca -----------------------------------------------------

  function seleccionValida() {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const r = sel.getRangeAt(0);
    const raiz = raizTexto();
    if (!raiz.contains(r.commonAncestorContainer) && r.commonAncestorContainer !== raiz) return null;
    const nodo = r.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
    if (nodo?.closest(OMITIR) || nodo?.closest("input, [contenteditable]")) return null;
    if (!limpiar(r.toString())) return null;
    return r;
  }

  function crearDeSeleccion(color) {
    const r = seleccionValida();
    if (!r) return null;
    indexar();
    let inicio = posicionDe(r.startContainer, r.startOffset);
    let fin = posicionDe(r.endContainer, r.endOffset);
    // Sin espacios en las orillas
    while (inicio < fin && /\s/.test(indice.texto[inicio])) inicio++;
    while (fin > inicio && /\s/.test(indice.texto[fin - 1])) fin--;
    if (fin <= inicio) return null;
    const ahora = Date.now();
    const m = {
      id: nuevoId(),
      pagina: PAGINA,
      titulo: limpiar(document.title),
      ...citar(indice.texto, inicio, fin),
      ...ubicar(r.startContainer),
      color,
      nota: "",
      creada: ahora,
      editada: ahora,
    };
    colorPreferido = color;
    todas.push(m);
    guardarTodas();
    getSelection().removeAllRanges();
    barra.hidden = true;
    pintar();
    contar();
    return m;
  }

  let temporizador = 0;
  function revisarSeleccion() {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      const r = seleccionValida();
      if (!r) {
        barra.hidden = true;
        return;
      }
      const rects = r.getClientRects();
      const ultimo = rects[rects.length - 1] || r.getBoundingClientRect();
      colocar(barra, ultimo);
    }, 180);
  }

  // --- Globo: editar una marca ----------------------------------------------

  let enGlobo = null;
  function abrirGlobo(m, enfocar) {
    enGlobo = m.id;
    globo.replaceChildren();
    const cita = crear("blockquote", { texto: limpiar(m.exacto) });
    const area = crear("textarea", { placeholder: "Escribe una nota…", "aria-label": "Nota" });
    area.value = m.nota || "";
    area.addEventListener("input", () => {
      m.nota = area.value;
      m.editada = Date.now();
      guardarTodas();
    });
    area.addEventListener("change", () => pintar());
    const colores = crear("div", { class: "notas-fila" });
    for (const [c, { nombre, fondo }] of Object.entries(COLORES)) {
      colores.append(
        crear("button", {
          type: "button", class: "notas-punto", style: `--c:${fondo}`, title: nombre, "aria-label": `Color ${nombre}`,
          "aria-pressed": String(m.color === c),
          onclick: () => {
            m.color = c;
            m.editada = Date.now();
            colorPreferido = c;
            guardarTodas();
            pintar();
            for (const b of colores.querySelectorAll(".notas-punto")) b.setAttribute("aria-pressed", String(b.title === nombre));
          },
        }),
      );
    }
    colores.append(crear("span", { class: "notas-espacio" }));
    colores.append(
      crear("button", {
        type: "button", class: "notas-btn notas-btn--peligro", texto: "Borrar",
        onclick: () => {
          borrar([m.id]);
          cerrarGlobo();
        },
      }),
      crear("button", { type: "button", class: "notas-btn notas-btn--acento", texto: "Listo", onclick: cerrarGlobo }),
    );
    globo.append(cita, area, colores);
    const r = rangos.get(m.id);
    const rect = r ? r.getClientRects()[r.getClientRects().length - 1] || r.getBoundingClientRect() : new DOMRect(innerWidth / 2, innerHeight / 3, 0, 0);
    colocar(globo, rect);
    if (enfocar) area.focus({ preventScroll: true });
  }

  function cerrarGlobo() {
    if (globo.hidden) return;
    globo.hidden = true;
    enGlobo = null;
    pintar();
    contar();
  }

  function borrar(ids) {
    const fuera = new Set(ids);
    todas = todas.filter((m) => !fuera.has(m.id));
    guardarTodas();
    pintar();
    contar();
  }

  /** ¿Hay una marca en este punto de la pantalla? */
  function marcaEn(x, y) {
    if (!rangos.size) return null;
    let nodo;
    let desp;
    if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      if (!p) return null;
      nodo = p.offsetNode;
      desp = p.offset;
    } else if (document.caretRangeFromPoint) {
      const p = document.caretRangeFromPoint(x, y);
      if (!p) return null;
      nodo = p.startContainer;
      desp = p.startOffset;
    } else return null;
    // Preferir la marca más corta (la más específica) si hay encimadas
    let elegida = null;
    for (const m of dePagina()) {
      const r = rangos.get(m.id);
      if (!r) continue;
      try {
        if (r.isPointInRange(nodo, desp) && !(r.endContainer === nodo && r.endOffset === desp)) {
          if (!elegida || m.exacto.length < elegida.exacto.length) elegida = m;
        }
      } catch {
        /* nodo fuera del documento */
      }
    }
    return elegida;
  }

  // --- Panel: lista, exportar, respaldo --------------------------------------

  function abrirPanel() {
    cerrarGlobo();
    if (!panel) {
      panel = marcarUI(crear("dialog", { class: "notas-panel", "aria-label": "Notas y subrayados" }));
      panel.addEventListener("click", (e) => {
        if (e.target === panel) panel.close(); // clic en el fondo
      });
      document.body.append(panel);
    }
    llenarPanel();
    panel.showModal();
  }

  function descargar(nombre, contenido, tipo) {
    const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    const a = crear("a", { href: url, download: nombre });
    // Dentro del panel: fuera de un <dialog> modal todo es inerte y el clic no cuenta
    (panel?.open ? panel : document.body).append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      const t = crear("textarea", { style: "position:fixed;opacity:0" });
      t.value = texto;
      panel.append(t);
      t.select();
      const ok = document.execCommand?.("copy");
      t.remove();
      return !!ok;
    }
  }

  const alcances = () => {
    const zona = proyectos ? zonaDe(PAGINA, proyectos) : PAGINA.split("/")[0];
    return {
      pagina: { nombre: "Esta página", filtro: (m) => m.pagina === PAGINA },
      zona: { nombre: `Este proyecto (${zona})`, filtro: (m) => zonaDe(m.pagina, proyectos || {}) === zona },
      todo: { nombre: "Todo el sitio", filtro: () => true },
    };
  };

  async function llenarPanel() {
    await leerProyectos();
    const propias = dePagina().sort((a, b) => a.inicio - b.inicio);
    const cuerpo = crear("div", { class: "notas-panel__cuerpo" });

    // Lista de esta página
    cuerpo.append(crear("h3", { texto: `En esta página · ${propias.length}` }));
    if (!propias.length) {
      cuerpo.append(crear("p", { texto: "Selecciona texto de la página para subrayarlo o anotarlo. Todo se guarda solo en este navegador." }));
    } else {
      const ol = crear("ol");
      for (const m of propias) {
        const perdida = huerfanas.has(m.id);
        const extra = [m.seccion, perdida ? "no se encontró en la página" : "", fechaCorta(m.editada)].filter(Boolean).join(" · ");
        ol.append(
          crear(
            "li",
            { class: "notas-item" },
            crear("span", { class: "notas-item__color", style: `--c:${COLORES[m.color]?.fondo}` }),
            crear(
              "div",
              { class: "notas-item__texto" },
              crear("button", { type: "button", class: "notas-item__cita", texto: `«${limpiar(m.exacto).slice(0, 220)}»`, onclick: () => irA(m) }),
              limpiar(m.nota) ? crear("div", { class: "notas-item__nota", texto: m.nota.trim() }) : null,
              crear("div", { class: "notas-item__extra", texto: extra }),
            ),
          ),
        );
      }
      cuerpo.append(ol);
    }

    // Resumen del sitio
    const paginas = new Set(todas.map((m) => m.pagina));
    cuerpo.append(crear("h3", { texto: "Exportar" }));
    cuerpo.append(
      crear("p", {
        texto: `En este navegador hay ${plural(todas.length, "marca", "marcas")} en ${plural(paginas.size, "página", "páginas")}. ` +
          "El Markdown sirve para pasárselo a Claude y llevar las notas al sitio; el respaldo .json, para moverlas a otro navegador.",
      }),
    );
    const opciones = alcances();
    const selector = crear("select", { "aria-label": "Qué exportar" });
    for (const [k, { nombre, filtro }] of Object.entries(opciones)) {
      const n = todas.filter(filtro).length;
      selector.append(crear("option", { value: k, texto: `${nombre} · ${n}` }));
    }
    selector.value = todas.some(opciones.zona.filtro) && !propias.length ? "zona" : propias.length ? "pagina" : "todo";
    const elegidas = () => todas.filter(opciones[selector.value].filtro);
    const markdown = () => aMarkdown(elegidas(), { sitio, proyectos, ahora: Date.now() });
    const nombreArchivo = (ext) => `notas-${selector.value === "pagina" ? PAGINA.replace(/\.html$/, "").replace(/[\/]/g, "-") : selector.value === "zona" ? zonaDe(PAGINA, proyectos) : "sitio"}-${fechaCorta(Date.now())}.${ext}`;
    const sinMarcas = () => {
      if (elegidas().length) return false;
      avisar("No hay marcas en esa selección.");
      return true;
    };

    cuerpo.append(
      crear("div", { class: "notas-fila" }, selector),
      crear(
        "div",
        { class: "notas-fila" },
        crear("button", {
          type: "button", class: "notas-btn notas-btn--acento", texto: "Copiar para Claude",
          onclick: async () => !sinMarcas() && avisar((await copiar(markdown())) ? "Copiado. Pégalo en Claude." : "No se pudo copiar; usa «Descargar .md»."),
        }),
        crear("button", { type: "button", class: "notas-btn", texto: "Descargar .md", onclick: () => !sinMarcas() && descargar(nombreArchivo("md"), markdown(), "text/markdown;charset=utf-8") }),
        crear("button", {
          type: "button", class: "notas-btn", texto: "Respaldo .json",
          onclick: () => !sinMarcas() && descargar(nombreArchivo("json"), JSON.stringify({ formato: "notas-web", version: VERSION, exportado: new Date().toISOString(), marcas: ordenar(elegidas()) }, null, 2), "application/json"),
        }),
      ),
    );

    // Importar y borrar
    const archivo = crear("input", { type: "file", accept: ".json,application/json", hidden: "" });
    archivo.addEventListener("change", async () => {
      const f = archivo.files?.[0];
      if (!f) return;
      try {
        const { marcas, agregadas } = fusionar(todas, validar(JSON.parse(await f.text())));
        todas = marcas;
        guardarTodas();
        pintar();
        contar();
        llenarPanel();
        avisar(`Importadas: ${plural(agregadas, "marca nueva", "marcas nuevas")}.`);
      } catch (e) {
        avisar(`No se pudo importar: ${e.message}`);
      }
    });
    cuerpo.append(
      crear("h3", { texto: "Respaldo y limpieza" }),
      crear("p", { texto: "Después de integrar las notas al sitio puedes borrarlas de aquí (usa el mismo alcance de arriba)." }),
      crear(
        "div",
        { class: "notas-fila" },
        archivo,
        crear("button", { type: "button", class: "notas-btn", texto: "Importar .json…", onclick: () => archivo.click() }),
        crear("span", { class: "notas-espacio" }),
        crear("button", {
          type: "button", class: "notas-btn notas-btn--peligro", texto: "Borrar…",
          onclick: () => {
            const ids = elegidas().map((m) => m.id);
            if (!ids.length) return void avisar("No hay marcas en esa selección.");
            if (!confirm(`¿Borrar ${plural(ids.length, "marca", "marcas")} (${opciones[selector.value].nombre.toLowerCase()})? Esto no se puede deshacer.`)) return;
            borrar(ids);
            llenarPanel();
          },
        }),
      ),
    );

    const cabeza = crear(
      "div",
      { class: "notas-panel__cabeza" },
      crear("h2", { texto: "Notas y subrayados" }),
      crear("button", { type: "button", class: "notas-btn", texto: "Cerrar", onclick: () => panel.close() }),
    );
    panel.replaceChildren(cabeza, cuerpo);
  }

  function irA(m) {
    const r = rangos.get(m.id);
    if (!r) return void avisar("Esa marca ya no se encuentra en la página.");
    panel?.close();
    // Abre los <details> que la contengan
    for (let e = r.startContainer.parentElement; e; e = e.parentElement) if (e.tagName === "DETAILS") e.open = true;
    const el = r.startContainer.parentElement;
    el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    el.classList.add("notas-destello");
    setTimeout(() => el.classList.remove("notas-destello"), 1300);
    setTimeout(() => abrirGlobo(m, false), 450);
  }

  // --- Arranque --------------------------------------------------------------

  async function iniciar() {
    await leerProyectos();
    const zona = zonaDe(PAGINA, proyectos);
    if (proyectos[zona]?.notas === false) return;
    cargar();
    construir();
    pintar();
    contar();
    observador.observe(document.body, { subtree: true, childList: true, characterData: true });

    document.addEventListener("selectionchange", revisarSeleccion);
    document.addEventListener("click", (e) => {
      if (e.target.closest?.("[data-notas-ui]")) return;
      if (!globo.hidden) {
        cerrarGlobo();
        return;
      }
      if (getSelection()?.isCollapsed === false) return;
      if (e.target.closest?.("a, button, input, select, textarea, summary, label")) return;
      const m = marcaEn(e.clientX, e.clientY);
      if (m) abrirGlobo(m, false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        barra.hidden = true;
        cerrarGlobo();
      }
    });
    // Si la ventana cambia, la barrita se reubica (o se esconde)
    addEventListener("resize", () => {
      barra.hidden = true;
      if (!globo.hidden && enGlobo) {
        const m = todas.find((x) => x.id === enGlobo);
        if (m) abrirGlobo(m, false);
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
