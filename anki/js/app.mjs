// ============================================================
//  Anki personal: interfaz
// ============================================================
//
// montar(raiz, deps) pinta todo el Anki dentro de `raiz`. Las dependencias se inyectan (sesión,
// fetch, reloj, bloqueos, KaTeX, almacenes) para poder verificarla en un navegador real contra una
// API falsa, sin tocar el sitio. main.mjs las pasa reales.
//
// Reglas de la página (CLAUDE.md del sitio y de este proyecto):
//   · Nada de HTML construido con texto: el texto de las tarjetas entra SOLO con textContent y las
//     fórmulas con katex.render (trust desactivado). Sin innerHTML ni manejadores en línea.
//   · La raíz lleva data-no-subrayar (no se subraya la interfaz de estudio).
//   · Atajos de teclado ignorados dentro de campos de texto.
//   · Responder NO espera al guardado: registrarRepaso deja el repaso en memoria de forma
//     síncrona y el guardado local y la subida siguen en segundo plano.
//   · Una sola pestaña activa (Web Lock exclusivo): dos pestañas escribiendo el mismo registro
//     serían correctas por la mezcla, pero confusas y con más commits.

import * as L from "../../js/llaves.mjs";
import * as M from "./modelo.mjs";
import * as S from "./scheduler.mjs";
import * as R from "./render.mjs";
import * as E from "./estudio.mjs";
import * as Y from "./sync.mjs";

const NOMBRE_BLOQUEO = "wr-anki:activa";
const ESPERA_ATAJO = 250; // ms tras mostrar la respuesta antes de aceptar Espacio o Enter como «Bien»
const POR_PAGINA = 100;

const TEXTO_ESTADO = {
  sincronizado: "Sincronizado",
  sincronizando: "Sincronizando",
  "sin-conexion": "Sin conexión: se guarda en este equipo",
  error: "Error de sincronización",
};

export function montar(raiz, deps = {}) {
  const doc = deps.doc ?? raiz.ownerDocument;
  const ventana = deps.ventana ?? doc.defaultView ?? globalThis;
  const sesion = deps.sesion;
  const ahora = deps.ahora ?? (() => Date.now());
  const fetchar = deps.fetch ?? globalThis.fetch?.bind(globalThis);
  const abrirSecreto = deps.abrirSecreto ?? L.abrirSecreto;
  const urlAcceso = deps.urlAcceso ?? "../datos/acceso.json";
  const crearAnki = deps.crearAnki ?? Y.crearAnki;
  const crearAlmacenes = deps.almacenes ?? (() => ({ tarjetas: Y.almacenIndexedDB("wr-anki-tarjetas"), repasos: Y.almacenIndexedDB("wr-anki-repasos") }));
  const locks = "locks" in deps ? deps.locks : globalThis.navigator?.locks;
  const katex = deps.katex ?? (() => globalThis.katex);
  const desfaseMin = deps.desfaseMin ?? (() => -new Date().getTimezoneOffset());
  const periodoSync = deps.periodoSync ?? 60_000;

  if (!sesion) throw new Error("montar necesita la sesión del sitio");

  // ---- Estado ----
  let anki = null;
  let generacion = 0;
  let vista = "sin-sesion";
  let soltarBloqueo = null;
  let tengoBloqueo = false;
  let epocaBloqueo = 0; // cada adquisición tiene la suya: un rechazo viejo no puede afectar a la actual
  let reloj = null;
  const est = { filtro: "", prep: null, uid: null, revelada: false, desde: 0, reveladaEn: 0, ultimoId: null, hechas: 0 };
  const ed = { id: null, tipo: "basico", retorno: "inicio" };
  const nav = { busqueda: "", pagina: 1 };
  let mensaje = "";

  // ---- DOM ----
  function h(etiqueta, props = {}, ...hijos) {
    const el = doc.createElement(etiqueta);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "clase") el.className = v;
      else if (k === "al") for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
      else if (["value", "disabled", "hidden", "checked", "selected"].includes(k)) el[k] = v;
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    const poner = (x) => {
      if (x == null || x === false) return;
      if (Array.isArray(x)) x.forEach(poner);
      else el.append(typeof x === "string" || typeof x === "number" ? doc.createTextNode(String(x)) : x);
    };
    hijos.forEach(poner);
    return el;
  }

  const barra = h("div", { clase: "anki-barra" });
  const contenido = h("div", { clase: "anki-vista", tabindex: "-1" });
  const aviso = h("p", { clase: "anki-aviso", role: "status", hidden: true });
  raiz.setAttribute("data-no-subrayar", "");
  raiz.classList.add("anki");
  raiz.replaceChildren(barra, aviso, contenido);

  let relojAviso = null;
  function avisar(texto, tipo = "info") {
    ventana.clearTimeout(relojAviso);
    mensaje = texto;
    aviso.textContent = texto;
    aviso.hidden = !texto;
    aviso.dataset.tipo = tipo;
    if (texto && tipo === "ok") relojAviso = ventana.setTimeout(() => avisar(""), 4000);
  }

  // ---- Texto con fórmulas ----
  function pintarTexto(destino, texto) {
    const k = katex();
    for (const seg of R.partirMath(texto)) {
      if (seg.t === "texto") {
        destino.append(doc.createTextNode(seg.v));
        continue;
      }
      const span = h("span", { clase: seg.bloque ? "anki-mat anki-mat--bloque" : "anki-mat" });
      try {
        if (!k) throw new Error("KaTeX no cargó");
        k.render(seg.v, span, { displayMode: seg.bloque, throwOnError: false, trust: false, strict: "ignore" });
      } catch {
        span.textContent = seg.v;
        span.classList.add("anki-mat--crudo");
      }
      destino.append(span);
    }
  }

  function pintarCloze(destino, frente, n, revelar) {
    for (const seg of M.segmentosCloze(frente, n, revelar)) {
      if (seg.t === "texto") pintarTexto(destino, seg.v);
      else if (seg.t === "hueco") destino.append(h("span", { clase: "anki-hueco" }, seg.v ? `[${seg.v}]` : "[…]"));
      else {
        const r = h("span", { clase: "anki-respuesta" });
        pintarTexto(r, seg.v);
        destino.append(r);
      }
    }
  }

  const cara = (clase, relleno) => {
    const el = h("div", { clase: `anki-cara ${clase}` });
    relleno(el);
    return el;
  };

  // ---- Estado de sincronización ----
  function pintarBarra() {
    const e = anki ? anki.estado() : null;
    let estado = "sin-sesion";
    let texto = "Sin sesión";
    if (vista === "bloqueada") ({ estado, texto } = { estado: "bloqueada", texto: "Abierto en otra pestaña" });
    else if (e) {
      estado = e.estado;
      texto = e.estado === "sincronizado" && e.sucio ? "Cambios pendientes de subir" : TEXTO_ESTADO[e.estado] ?? e.estado;
    }
    const pastilla = h("span", { clase: "anki-estado", "data-estado": estado, role: "status" }, h("span", { clase: "anki-punto", "aria-hidden": "true" }), texto);
    const detalle = e?.estado === "error" && e.detalle ? h("span", { clase: "anki-detalle" }, `${e.detalle}${/rama/i.test(e.detalle) ? ". Mientras tanto todo se guarda en este equipo." : ""}`) : null;
    const boton = anki
      ? h("button", { type: "button", clase: "anki-secundario", al: { click: () => anki.sincronizar() } }, "Sincronizar")
      : null;
    barra.replaceChildren(...[pastilla, detalle, boton].filter(Boolean));
  }

  // ---- Vistas ----
  function mostrar(nueva, ...hijos) {
    vista = nueva;
    pintarBarra();
    contenido.replaceChildren(...hijos.flat().filter(Boolean)); // replaceChildren(null) pintaría «null»
    contenido.dataset.vista = nueva;
  }

  function vistaSinSesion() {
    mostrar(
      "sin-sesion",
      h("h1", {}, "Anki personal"),
      h("p", { clase: "anki-nota" }, "Tus tarjetas están cifradas. Inicia sesión para verlas y estudiar."),
      h("button", { type: "button", clase: "anki-primario", al: { click: () => sesion.abrir() } }, "Iniciar sesión"),
    );
  }

  function vistaBloqueada() {
    mostrar(
      "bloqueada",
      h("h1", {}, "Anki personal"),
      h("p", { clase: "anki-nota" }, "Anki ya está abierto en otra pestaña. Para evitar escrituras duplicadas solo una pestaña puede estar activa."),
      h("button", { type: "button", clase: "anki-primario", al: { click: () => tomarBloqueo(true) } }, "Usar aquí"),
    );
  }

  function foto(filtro = est.filtro) {
    return E.prepararEstudio({ tarjetas: anki.tarjetas.items(), repasos: anki.repasos.items(), ahora: ahora(), desfaseMin: desfaseMin(), filtro });
  }

  function selectorEtiqueta(valor, alCambiar) {
    const etiquetas = E.etiquetasConPadres(anki.tarjetas.items());
    return h(
      "select",
      { "aria-label": "Filtrar por etiqueta", clase: "anki-select", al: { change: (ev) => alCambiar(ev.target.value) } },
      h("option", { value: "", selected: !valor }, "Todas las etiquetas"),
      etiquetas.map((e) => h("option", { value: e, selected: e === valor }, e.replaceAll("::", " › "))),
    );
  }

  function vistaInicio() {
    const prep = foto();
    const total = anki.tarjetas.items().filter((t) => !t.b).length;
    const r = prep.resumen;
    const contador = (n, nombre, clave) => h("div", { clase: "anki-cuenta", "data-cuenta": clave }, h("strong", {}, n), h("span", {}, nombre));
    mostrar(
      "inicio",
      h("h1", {}, "Anki personal"),
      total ? selectorEtiqueta(est.filtro, (v) => { est.filtro = v; vistaInicio(); }) : null,
      h("div", { clase: "anki-cuentas" }, contador(r.nuevas, "Nuevas", "nuevas"), contador(r.aprendiendo, "Aprendiendo", "aprendiendo"), contador(r.repaso, "Repaso", "repaso")),
      h(
        "div",
        { clase: "anki-acciones" },
        h("button", { type: "button", clase: "anki-primario", disabled: r.pendientes === 0, al: { click: iniciarEstudio } }, r.pendientes ? "Estudiar" : total ? "Nada que estudiar hoy" : "Sin tarjetas todavía"),
        h("button", { type: "button", clase: "anki-secundario", al: { click: () => abrirEditor(null, "inicio") } }, "Nueva tarjeta"),
        total ? h("button", { type: "button", clase: "anki-secundario", al: { click: vistaTarjetas } }, `Tarjetas (${total})`) : null,
      ),
      total ? null : h("p", { clase: "anki-nota" }, "Crea tu primera tarjeta con «Nueva tarjeta». Las fórmulas van entre $…$ y los huecos de cloze como {{c1::respuesta}}."),
    );
  }

  // ---- Estudio ----
  function iniciarEstudio() {
    est.hechas = 0;
    est.ultimoId = null;
    avisar("");
    siguienteUnidad();
  }

  function siguienteUnidad() {
    est.prep = foto();
    est.uid = E.elegirSiguiente(est.prep, est.ultimoId);
    est.revelada = false;
    est.desde = ahora();
    if (!est.uid) return vistaTerminado();
    pintarEstudio();
  }

  function pintarEstudio() {
    const u = E.vistaUnidad(est.prep, est.uid, ahora());
    if (!u) return siguienteUnidad();
    const t = u.tarjeta;
    const r = est.prep.resumen;
    const faseBase = u.fase === "nueva" ? "nueva" : u.fase === "repaso" ? "repaso" : "aprendiendo"; // reaprendiendo cuenta como aprendiendo
    const tipoCuenta = (clave, n, nombre) => h("span", { clase: faseBase === clave ? "anki-cuenta-actual" : "", "data-cuenta": clave }, `${n} ${nombre}`);
    const caras = [];
    if (t.tipo === "cloze") {
      caras.push(cara("anki-frente", (el) => pintarCloze(el, t.frente, u.n, est.revelada)));
      if (est.revelada && t.reverso) caras.push(cara("anki-reverso", (el) => pintarTexto(el, t.reverso)));
    } else {
      caras.push(cara("anki-frente", (el) => pintarTexto(el, t.frente)));
      if (est.revelada) caras.push(h("hr", { clase: "anki-separador" }), cara("anki-reverso", (el) => pintarTexto(el, t.reverso)));
    }
    const nombres = ["Otra vez", "Difícil", "Bien", "Fácil"];
    const acciones = est.revelada
      ? h(
          "div",
          { clase: "anki-notas", role: "group", "aria-label": "¿Qué tal te fue?" },
          nombres.map((n, i) =>
            h(
              "button",
              { type: "button", clase: `anki-nota-boton anki-g${i + 1}`, "data-g": i + 1, al: { click: () => responder(i + 1) } },
              h("span", { clase: "anki-nota-nombre" }, n),
              h("span", { clase: "anki-nota-espera" }, S.etiquetaIntervalo(u.previa[i])),
              h("kbd", { "aria-hidden": "true" }, i + 1),
            ),
          ),
        )
      : h("button", { type: "button", clase: "anki-primario anki-mostrar", al: { click: revelar } }, "Mostrar respuesta");
    mostrar(
      "estudio",
      h(
        "div",
        { clase: "anki-encabezado" },
        h("div", { clase: "anki-progreso" }, tipoCuenta("nueva", r.nuevas, "nuevas"), tipoCuenta("aprendiendo", r.aprendiendo, "aprendiendo"), tipoCuenta("repaso", r.repaso, "repaso")),
        h(
          "div",
          { clase: "anki-herramientas" },
          h("button", { type: "button", clase: "anki-enlace", al: { click: () => abrirEditor(t.id, "estudio") } }, "Editar"),
          h("button", { type: "button", clase: "anki-enlace", al: { click: salirDeEstudio } }, "Salir"),
        ),
      ),
      h("article", { clase: "anki-tarjeta", "data-fase": faseBase, "data-uid": est.uid, "aria-live": "polite", tabindex: "-1" }, caras),
      (t.etiquetas ?? []).length ? h("p", { clase: "anki-etiquetas" }, t.etiquetas.map((e) => h("span", { clase: "etiqueta" }, e))) : null,
      acciones,
    );
    // Tras revelar, el foco va a la tarjeta (no a un botón de nota): un Espacio de más no califica
    if (est.revelada) contenido.querySelector(".anki-tarjeta")?.focus({ preventScroll: true });
    else contenido.querySelector(".anki-mostrar")?.focus({ preventScroll: true });
  }

  function revelar() {
    if (vista !== "estudio" || est.revelada) return;
    est.revelada = true;
    est.reveladaEn = ahora();
    pintarEstudio();
  }

  function responder(g) {
    if (vista !== "estudio" || !est.revelada || !est.uid) return;
    const duracion = Math.min(Math.max(0, ahora() - est.desde), M.MAX_DURACION);
    est.ultimoId = est.prep.porUid.get(est.uid)?.id ?? null;
    est.hechas++;
    // Sin await: el repaso ya está en memoria (síncrono); el guardado sigue en segundo plano
    Promise.resolve(anki.registrarRepaso(est.uid, g, duracion)).catch((e) => avisar(`No se pudo registrar el repaso: ${e.message}`, "error"));
    siguienteUnidad();
  }

  function vistaTerminado() {
    anki?.vaciar?.().catch?.(() => {});
    const hechas = est.hechas;
    mostrar(
      "terminado",
      h("h1", {}, hechas ? "Listo por hoy" : "Nada que estudiar"),
      h("p", { clase: "anki-nota" }, hechas ? `Repasaste ${hechas} ${hechas === 1 ? "tarjeta" : "tarjetas"}. Tu progreso se está guardando.` : "No hay tarjetas pendientes ahora mismo."),
      h("button", { type: "button", clase: "anki-primario", al: { click: vistaInicio } }, "Volver al inicio"),
    );
    contenido.focus({ preventScroll: true });
  }

  function salirDeEstudio() {
    anki?.vaciar?.().catch?.(() => {});
    vistaInicio();
  }

  // ---- Editor ----
  function abrirEditor(id, retorno) {
    ed.id = id;
    ed.retorno = retorno;
    const t = id ? anki.tarjetas.items().find((x) => x.id === id && !x.b) : null;
    if (id && !t) return vistaInicio();
    ed.tipo = t?.tipo ?? ed.tipo ?? "basico";
    avisar("");
    const etiquetasUsadas = E.etiquetasConPadres(anki.tarjetas.items());

    const frente = h("textarea", { id: "anki-frente", rows: "4", clase: "anki-campo", value: t?.frente ?? "", "aria-describedby": "anki-ayuda", spellcheck: "true" });
    const reverso = h("textarea", { id: "anki-reverso", rows: "3", clase: "anki-campo", value: t?.reverso ?? "", spellcheck: "true" });
    const etiquetas = h("input", { id: "anki-etiquetas", type: "text", clase: "anki-campo", value: (t?.etiquetas ?? []).join(", "), list: "anki-lista-etiquetas", autocomplete: "off", placeholder: "filosofia::logica, examen" });
    const lista = h("datalist", { id: "anki-lista-etiquetas" }, etiquetasUsadas.map((e) => h("option", { value: e })));
    const tipo = h(
      "select",
      { id: "anki-tipo", clase: "anki-select", "aria-label": "Tipo de tarjeta", disabled: !!t, title: t ? "El tipo no se puede cambiar al editar: se perdería el historial de repaso" : null },
      h("option", { value: "basico", selected: ed.tipo === "basico" }, "Básica (frente y reverso)"),
      h("option", { value: "cloze", selected: ed.tipo === "cloze" }, "Cloze (huecos)"),
    );
    const etiquetaFrente = h("label", { for: "anki-frente" });
    const etiquetaReverso = h("label", { for: "anki-reverso" });
    const previa = h("div", { clase: "anki-previa", "aria-label": "Vista previa", "aria-live": "off" });
    const error = h("p", { clase: "anki-error", role: "alert", hidden: true });

    let confirmaQuitar = false;
    const actualizar = () => {
      error.hidden = true; // el aviso de error se va en cuanto se corrige algo
      confirmaQuitar = false;
      const esCloze = tipo.value === "cloze";
      ed.tipo = tipo.value;
      etiquetaFrente.textContent = esCloze ? "Texto con huecos" : "Frente";
      etiquetaReverso.textContent = esCloze ? "Texto extra (opcional, se ve al responder)" : "Reverso";
      const vp = [];
      if (frente.value.trim()) {
        if (esCloze) {
          const numeros = M.numerosCloze(frente.value);
          if (!numeros.length) vp.push(h("p", { clase: "anki-nota" }, "Aún no hay ningún hueco válido."));
          for (const n of numeros.slice(0, 3)) vp.push(h("div", { clase: "anki-previa-par" }, cara("anki-frente", (el) => pintarCloze(el, frente.value, n, false)), cara("anki-frente", (el) => pintarCloze(el, frente.value, n, true))));
          if (reverso.value.trim()) vp.push(cara("anki-reverso", (el) => pintarTexto(el, reverso.value)));
        } else {
          vp.push(cara("anki-frente", (el) => pintarTexto(el, frente.value)));
          if (reverso.value.trim()) vp.push(cara("anki-reverso", (el) => pintarTexto(el, reverso.value)));
        }
      }
      previa.replaceChildren(...vp);
    };
    let temporizador = null;
    const diferir = () => {
      ventana.clearTimeout(temporizador);
      temporizador = ventana.setTimeout(actualizar, 150);
    };
    for (const campo of [frente, reverso]) campo.addEventListener("input", diferir);
    tipo.addEventListener("change", actualizar);

    const guardar = async (otra) => {
      const datos = { tipo: tipo.value, frente: frente.value, reverso: reverso.value };
      const problema = E.validarTarjeta(datos);
      error.hidden = !problema;
      error.textContent = problema;
      if (problema) return;
      // Quitar un hueco de un cloze deja sin uso el historial de esa unidad: se pide confirmación
      if (t?.tipo === "cloze" && !confirmaQuitar) {
        const quedan = new Set(M.numerosCloze(datos.frente));
        const quitados = M.numerosCloze(t.frente).filter((n) => !quedan.has(n) && anki.repasos.items().some((r) => r.u === M.uidDe(t.id, n)));
        if (quitados.length) {
          confirmaQuitar = true;
          error.hidden = false;
          error.textContent = `Quitas ${quitados.length === 1 ? "el hueco" : "los huecos"} ${quitados.map((n) => `c${n}`).join(", ")}: su historial de repaso quedará sin uso. Pulsa Guardar otra vez para confirmar.`;
          return;
        }
      }
      const base = t ?? { id: M.idNuevo(ahora()) };
      try {
        await anki.guardarTarjeta({ ...base, ...datos, reverso: datos.reverso, etiquetas: E.parsearEtiquetas(etiquetas.value) });
      } catch (e) {
        error.hidden = false;
        error.textContent = e.message;
        return;
      }
      if (otra) {
        abrirEditor(null, ed.retorno);
        avisar("Tarjeta guardada.", "ok");
      } else volverDelEditor("Tarjeta guardada.");
    };

    let confirmando = false;
    const botonBorrar = t
      ? h("button", {
          type: "button",
          clase: "anki-peligro",
          al: {
            click: async (ev) => {
              if (!confirmando) {
                confirmando = true;
                ev.target.textContent = "Confirmar eliminar";
                ventana.setTimeout(() => {
                  confirmando = false;
                  ev.target.textContent = "Eliminar";
                }, 4000);
                return;
              }
              await anki.borrarTarjeta(t.id);
              volverDelEditor("Tarjeta eliminada.");
            },
          },
        }, "Eliminar")
      : null;

    mostrar(
      "editor",
      h("h1", {}, t ? "Editar tarjeta" : "Nueva tarjeta"),
      h("form", { clase: "anki-formulario", novalidate: true, al: { submit: (ev) => { ev.preventDefault(); guardar(false); } } },
        h("div", { clase: "anki-grupo" }, h("label", { for: "anki-tipo" }, "Tipo"), tipo),
        h("div", { clase: "anki-grupo" }, etiquetaFrente, frente),
        h("div", { clase: "anki-grupo" }, etiquetaReverso, reverso),
        h("div", { clase: "anki-grupo" }, h("label", { for: "anki-etiquetas" }, "Etiquetas (separadas por comas; «a::b» crea jerarquía)"), etiquetas, lista),
        h("p", { id: "anki-ayuda", clase: "anki-nota" }, "Fórmulas: $x^2$ en línea, $$…$$ en bloque, \\$ para un dólar. Cloze: {{c1::respuesta::pista}}."),
        error,
        h("div", { clase: "anki-acciones" },
          h("button", { type: "submit", clase: "anki-primario" }, "Guardar"),
          t ? null : h("button", { type: "button", clase: "anki-secundario", al: { click: () => guardar(true) } }, "Guardar y crear otra"),
          h("button", { type: "button", clase: "anki-secundario", al: { click: () => volverDelEditor("") } }, "Cancelar"),
          botonBorrar,
        ),
      ),
      h("h2", { clase: "anki-subtitulo" }, "Vista previa"),
      previa,
    );
    actualizar();
    frente.focus({ preventScroll: true });
    ed.guardar = guardar;
  }

  function volverDelEditor(texto) {
    avisar(texto, "ok");
    if (ed.retorno === "estudio" && est.prep) {
      est.ultimoId = null;
      siguienteUnidad();
    } else if (ed.retorno === "tarjetas") vistaTarjetas();
    else vistaInicio();
  }

  // ---- Explorador ----
  function vistaTarjetas() {
    avisar(mensaje && vista === "editor" ? mensaje : "");
    const todas = E.buscarTarjetas(anki.tarjetas.items(), { filtro: est.filtro, texto: nav.busqueda });
    const visibles = todas.slice(0, nav.pagina * POR_PAGINA);
    const hoy = foto();
    const filas = visibles.map((t) => {
      const unidades = M.unidadesDe(t);
      const pendiente = unidades.some((u) => hoy.cola.orden.includes(u.uid));
      return h(
        "li",
        { clase: "anki-fila" },
        h("button", { type: "button", clase: "anki-fila-boton", "data-id": t.id, al: { click: () => abrirEditor(t.id, "tarjetas") } },
          h("span", { clase: "anki-fila-texto" }, resumenTexto(t.frente)),
          h("span", { clase: "anki-fila-meta" },
            h("span", { clase: "pastilla" }, t.tipo === "cloze" ? "cloze" : "básica"),
            pendiente ? h("span", { clase: "pastilla anki-pendiente" }, "pendiente") : null,
            (t.etiquetas ?? []).map((e) => h("span", { clase: "etiqueta" }, e)),
          ),
        ),
      );
    });
    const buscador = h("input", { type: "search", clase: "anki-campo", "aria-label": "Buscar tarjetas", placeholder: "Buscar", value: nav.busqueda, autocomplete: "off" });
    let espera = null;
    buscador.addEventListener("input", () => {
      ventana.clearTimeout(espera);
      espera = ventana.setTimeout(() => {
        nav.busqueda = buscador.value;
        nav.pagina = 1;
        vistaTarjetas();
        doc.getElementById("anki-buscador")?.focus?.();
      }, 200);
    });
    buscador.id = "anki-buscador";
    mostrar(
      "tarjetas",
      h("div", { clase: "anki-encabezado" }, h("h1", {}, "Tarjetas"), h("button", { type: "button", clase: "anki-enlace", al: { click: vistaInicio } }, "Volver")),
      h("div", { clase: "anki-filtros" }, buscador, selectorEtiqueta(est.filtro, (v) => { est.filtro = v; nav.pagina = 1; vistaTarjetas(); })),
      h("p", { clase: "anki-nota", "aria-live": "polite" }, `${todas.length} ${todas.length === 1 ? "tarjeta" : "tarjetas"}`),
      filas.length ? h("ul", { clase: "anki-lista" }, filas) : h("p", { clase: "anki-nota" }, "Ninguna tarjeta coincide."),
      todas.length > visibles.length ? h("button", { type: "button", clase: "anki-secundario", al: { click: () => { nav.pagina++; vistaTarjetas(); } } }, "Mostrar más") : null,
    );
    if (nav.busqueda) {
      const b = doc.getElementById("anki-buscador");
      b?.focus({ preventScroll: true });
      b?.setSelectionRange?.(nav.busqueda.length, nav.busqueda.length);
    }
  }

  // Una línea para la lista: el texto como se escribió, con cada hueco cloze como [respuesta]
  const resumenTexto = (texto) => {
    let plano = String(texto);
    for (const h of M.huecosCloze(plano).reverse()) plano = `${plano.slice(0, h.inicio)}[${h.respuesta}]${plano.slice(h.fin)}`;
    plano = plano.replace(/\s+/g, " ").trim();
    return plano.length > 140 ? `${plano.slice(0, 140)}…` : plano;
  };

  // ---- Teclado ----
  function enCampoDeTexto(el) {
    return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
  }

  function alTeclear(ev) {
    if (ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey) {
      if (vista === "editor" && (ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
        ev.preventDefault();
        ed.guardar?.(false);
      }
      return;
    }
    if (enCampoDeTexto(ev.target)) {
      if (ev.key === "Escape" && vista === "editor") ev.target.blur();
      return;
    }
    if (vista === "estudio") {
      if (ev.key === " " || ev.key === "Enter") {
        if (ev.target?.tagName === "BUTTON") return; // el botón enfocado ya actúa con su propio clic
        ev.preventDefault();
        if (!est.revelada) revelar();
        else if (ahora() - est.reveladaEn >= ESPERA_ATAJO) responder(3);
      } else if (est.revelada && ["1", "2", "3", "4"].includes(ev.key)) responder(Number(ev.key));
      else if (ev.key === "e" || ev.key === "E") {
        const u = E.vistaUnidad(est.prep, est.uid, ahora());
        if (u) abrirEditor(u.tarjeta.id, "estudio");
      } else if (ev.key === "Escape") salirDeEstudio();
    } else if (vista === "editor" && ev.key === "Escape") volverDelEditor("");
  }

  // ---- Bloqueo de pestaña única ----
  function tomarBloqueo(robar = false) {
    if (!locks?.request) {
      tengoBloqueo = true;
      return Promise.resolve(true);
    }
    const mia = ++epocaBloqueo;
    return new Promise((resolver) => {
      const opciones = robar ? { steal: true } : { ifAvailable: true };
      locks
        .request(NOMBRE_BLOQUEO, opciones, (bloqueo) => {
          if (!bloqueo) {
            resolver(false);
            return undefined;
          }
          tengoBloqueo = true;
          resolver(true);
          return new Promise((liberar) => {
            soltarBloqueo = () => {
              soltarBloqueo = null;
              liberar();
            };
          });
        })
        .catch(() => {
          // Nos lo robó otra pestaña: dejamos de escribir (solo si este rechazo es de la adquisición vigente)
          if (mia === epocaBloqueo && tengoBloqueo) perderBloqueo();
        });
    }).then((ok) => {
      if (ok && robar) conectarDatos();
      return ok;
    });
  }

  function perderBloqueo() {
    tengoBloqueo = false;
    soltarBloqueo = null;
    pararDatos();
    vistaBloqueada();
  }

  // ---- Datos y sesión ----
  function pararDatos() {
    generacion++;
    ventana.clearInterval(reloj);
    reloj = null;
    anki?.detener();
    anki = null;
  }

  async function conectarDatos() {
    const mia = ++generacion;
    const llave = sesion.llave();
    if (!llave) return;
    mostrar("cargando", h("p", { clase: "anki-nota" }, "Abriendo tus tarjetas"));
    let token = null;
    try {
      const r = await fetchar(urlAcceso, { cache: "no-cache" });
      if (r.ok) {
        const acceso = await r.json();
        if (acceso.token) token = await abrirSecreto(acceso.token, llave);
      }
    } catch {
      /* sin red o token ilegible: se trabaja en local */
    }
    if (mia !== generacion) return;
    const nuevo = crearAnki({
      llave,
      token,
      fetch: deps.fetchGitHub,
      almacenes: crearAlmacenes(),
      ahora,
      alCambiar: (tipo) => {
        if (mia !== generacion) return;
        pintarBarra();
        if (tipo === "datos" && (vista === "inicio" || vista === "tarjetas")) (vista === "inicio" ? vistaInicio : vistaTarjetas)();
      },
      ...(deps.opcionesAnki ?? {}),
    });
    anki = nuevo;
    await nuevo.iniciar();
    if (mia !== generacion) return;
    arrancarReloj();
    if (ventana.location?.hash === "#nueva") abrirEditor(null, "inicio");
    else vistaInicio();
    nuevo.sincronizar();
  }

  // Lectura periódica (no escribe lo pendiente: eso lo decide el lote) y al volver a la pestaña o la red
  function arrancarReloj() {
    ventana.clearInterval(reloj);
    reloj = ventana.setInterval(() => {
      if (anki && tengoBloqueo && doc.visibilityState === "visible" && !anki.estado().sucio) anki.sincronizar();
    }, periodoSync);
  }

  // Las conexiones se encadenan: sesion.entrar() avisa siempre, así que puede llegar un segundo
  // «activa» estando ya conectados, o dos seguidos. Cada una espera a la anterior y, si esta
  // pestaña ya tiene el bloqueo, no lo vuelve a pedir (se bloquearía a sí misma).
  let conectando = Promise.resolve();
  function conectar() {
    conectando = conectando.then(hacerConexion, hacerConexion);
    return conectando;
  }

  async function hacerConexion() {
    if (!sesion.activa()) return;
    pararDatos();
    const ok = tengoBloqueo || (await tomarBloqueo(false));
    if (!sesion.activa()) {
      // La sesión se cerró mientras esperábamos el bloqueo
      soltarBloqueo?.();
      tengoBloqueo = false;
      return;
    }
    if (!ok) return vistaBloqueada();
    await conectarDatos();
  }

  function desconectar() {
    pararDatos();
    epocaBloqueo++;
    soltarBloqueo?.();
    tengoBloqueo = false;
    est.prep = null;
    est.uid = null;
    avisar("");
    vistaSinSesion();
  }

  doc.addEventListener("keydown", alTeclear);
  doc.addEventListener("visibilitychange", () => {
    if (!anki) return;
    if (doc.visibilityState === "hidden") anki.vaciar().catch(() => {});
    else if (tengoBloqueo) anki.sincronizar();
  });
  ventana.addEventListener("pagehide", () => anki?.vaciar().catch(() => {}));
  ventana.addEventListener("online", () => anki && tengoBloqueo && anki.sincronizar());
  const dejarDeEscuchar = sesion.alCambiar(({ activa }) => (activa ? conectar() : desconectar()));

  if (sesion.activa()) conectar();
  else vistaSinSesion();

  return {
    destruir() {
      dejarDeEscuchar?.();
      doc.removeEventListener("keydown", alTeclear);
      pararDatos();
      soltarBloqueo?.();
    },
    vista: () => vista,
    anki: () => anki,
  };
}
