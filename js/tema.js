/*
 * Tema (claro u oscuro) y color de acento del sitio.
 *
 * Se carga en el <head> SIN defer para aplicar la preferencia guardada antes
 * de pintar la página (así no parpadea):
 *   <script src="js/tema.js"></script>          (desde la raíz)
 *   <script src="../js/tema.js"></script>       (desde un proyecto)
 *
 * Botones (cualquier página, opcionales):
 *   <button class="ajuste" data-tema-accion="tema">…</button>     claro ⇄ oscuro
 *   <button class="ajuste" data-tema-accion="acento">…</button>   siguiente color
 *
 * Sin elección guardada se sigue el tema del sistema y el acento rosa.
 * Las preferencias viven en localStorage de este navegador; si no está
 * disponible (modo privado estricto), los botones funcionan solo en la página.
 *
 * También carga la sesión del sitio (js/sesion.mjs: botón de inicio de sesión
 * en cada `.ajustes` y partes privadas). Antes de pintar marca
 * <html data-sesion="activa|inactiva"> según la sesión guardada, para que las
 * partes con data-solo-sesion o data-sin-sesion no parpadeen.
 */
(() => {
  "use strict";

  const raiz = document.documentElement;
  const ACENTOS = ["rosa", "azul", "verde", "lavanda", "ambar"];
  const NOMBRES = { rosa: "rosa", azul: "azul", verde: "verde", lavanda: "lavanda", ambar: "ámbar" };
  const CLAVE_TEMA = "web-tema";
  const CLAVE_ACENTO = "web-acento";

  const leer = (clave) => {
    try {
      return localStorage.getItem(clave);
    } catch {
      return null;
    }
  };
  const guardar = (clave, valor) => {
    try {
      localStorage.setItem(clave, valor);
    } catch {
      /* sin almacenamiento: solo cambia en esta página */
    }
  };

  // Aplica la preferencia guardada (o la del sistema) al <html>
  const tema = leer(CLAVE_TEMA);
  if (tema === "claro" || tema === "oscuro") raiz.dataset.tema = tema;
  const acento = leer(CLAVE_ACENTO);
  if (ACENTOS.includes(acento) && acento !== "rosa") raiz.dataset.acento = acento;
  raiz.classList.add("con-js");

  // Sesión del sitio: estado guardado (sin validar) y módulo completo
  let guardada = null;
  for (const nombre of ["sessionStorage", "localStorage"]) {
    try {
      guardada = guardada || window[nombre].getItem("wr-sesion-activa");
    } catch {
      /* almacenamiento bloqueado */
    }
  }
  raiz.dataset.sesion = guardada ? "activa" : "inactiva";
  const origen = document.currentScript?.src;
  if (origen) import(new URL("sesion.mjs", origen).href).catch((e) => console.warn("Sesión no disponible", e));

  const sistemaOscuro = window.matchMedia("(prefers-color-scheme: dark)");
  const esOscuro = () => (raiz.dataset.tema ? raiz.dataset.tema === "oscuro" : sistemaOscuro.matches);
  const acentoActual = () => raiz.dataset.acento || "rosa";

  // Etiquetas accesibles de los botones según el estado
  function rotular() {
    for (const b of document.querySelectorAll('[data-tema-accion="tema"]')) {
      const texto = esOscuro() ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
      b.setAttribute("aria-label", texto);
      b.title = texto;
    }
    for (const b of document.querySelectorAll('[data-tema-accion="acento"]')) {
      const texto = `Color de acento: ${NOMBRES[acentoActual()]}. Cambiar`;
      b.setAttribute("aria-label", texto);
      b.title = texto;
    }
  }

  document.addEventListener("click", (evento) => {
    const boton = evento.target.closest?.("[data-tema-accion]");
    if (!boton) return;
    if (boton.dataset.temaAccion === "darwin") {
      guardar(CLAVE_DARWIN, darwinVisible() ? "1" : "0");
      location.reload(); // Darwin se arma al cargar la página
      return;
    }
    if (boton.dataset.temaAccion === "tema") {
      const nuevo = esOscuro() ? "claro" : "oscuro";
      raiz.dataset.tema = nuevo;
      guardar(CLAVE_TEMA, nuevo);
    } else if (boton.dataset.temaAccion === "acento") {
      const siguiente = ACENTOS[(ACENTOS.indexOf(acentoActual()) + 1) % ACENTOS.length];
      if (siguiente === "rosa") delete raiz.dataset.acento;
      else raiz.dataset.acento = siguiente;
      guardar(CLAVE_ACENTO, siguiente);
    }
    rotular();
  });

  // Botón para quitar o poner a Darwin (se agrega a cada .ajustes; ver js/darwin.js)
  const CLAVE_DARWIN = "darwin-oculta";
  const darwinVisible = () => {
    const pref = leer(CLAVE_DARWIN);
    if (pref === "1") return false;
    if (pref === "0") return true;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches && innerWidth >= 560;
  };
  const SVG_GATO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4l3 3h8l3-3v9a7 7 0 0 1-14 0z"/><path d="M9.5 12h.01M14.5 12h.01"/></svg>';
  function agregarBotonDarwin() {
    for (const contenedor of document.querySelectorAll(".ajustes")) {
      if (contenedor.querySelector('[data-tema-accion="darwin"]')) continue;
      const b = document.createElement("button");
      b.className = "ajuste";
      b.type = "button";
      b.dataset.temaAccion = "darwin";
      b.innerHTML = SVG_GATO;
      contenedor.appendChild(b);
    }
  }
  function rotularDarwin() {
    for (const b of document.querySelectorAll('[data-tema-accion="darwin"]')) {
      const texto = darwinVisible() ? "Quitar a Darwin" : "Mostrar a Darwin";
      b.setAttribute("aria-label", texto);
      b.setAttribute("aria-pressed", String(darwinVisible()));
      b.title = texto;
    }
  }

  // Si cambia el tema del sistema y no hay elección guardada, actualiza las etiquetas
  sistemaOscuro.addEventListener?.("change", rotular);

  const iniciarBotones = () => { agregarBotonDarwin(); rotular(); rotularDarwin(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciarBotones);
  else iniciarBotones();
})();
