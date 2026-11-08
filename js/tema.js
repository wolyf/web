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

  // Si cambia el tema del sistema y no hay elección guardada, actualiza las etiquetas
  sistemaOscuro.addEventListener?.("change", rotular);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", rotular);
  else rotular();
})();
