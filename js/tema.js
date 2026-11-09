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
 * Tema: por defecto sigue SIEMPRE al del sistema (día o noche). El botón lo
 * cambia a voluntad, pero la elección solo dura la visita (sessionStorage,
 * para que no se pierda al pasar de una página a otra): al volver otro día,
 * o si el sistema cambia de tema, manda de nuevo el del sistema. Si quien
 * visita elige justo el tema del sistema, la elección se borra.
 *
 * Acento: rosa por defecto; el elegido se recuerda en localStorage.
 * Si el almacenamiento no está disponible (modo privado estricto), los
 * botones funcionan solo en la página.
 */
(() => {
  "use strict";

  const raiz = document.documentElement;
  const ACENTOS = ["rosa", "azul", "verde", "lavanda", "ambar"];
  const NOMBRES = { rosa: "rosa", azul: "azul", verde: "verde", lavanda: "lavanda", ambar: "ámbar" };
  const CLAVE_TEMA = "web-tema";
  const CLAVE_ACENTO = "web-acento";

  // Acceso seguro al almacenamiento (puede estar bloqueado)
  const almacen = (tipo) => {
    try {
      return window[tipo];
    } catch {
      return null;
    }
  };
  const local = almacen("localStorage");
  const sesion = almacen("sessionStorage");
  const leer = (donde, clave) => {
    try {
      return donde?.getItem(clave) ?? null;
    } catch {
      return null;
    }
  };
  const guardar = (donde, clave, valor) => {
    try {
      if (valor === null) donde?.removeItem(clave);
      else donde?.setItem(clave, valor);
    } catch {
      /* sin almacenamiento: solo cambia en esta página */
    }
  };

  // Versiones anteriores guardaban el tema para siempre: se descarta
  guardar(local, CLAVE_TEMA, null);

  const sistemaOscuro = window.matchMedia("(prefers-color-scheme: dark)");
  const temaSistema = () => (sistemaOscuro.matches ? "oscuro" : "claro");

  // Aplica al <html> la elección de esta visita (si difiere del sistema) y el acento
  const tema = leer(sesion, CLAVE_TEMA);
  if ((tema === "claro" || tema === "oscuro") && tema !== temaSistema()) raiz.dataset.tema = tema;
  else guardar(sesion, CLAVE_TEMA, null);
  const acento = leer(local, CLAVE_ACENTO);
  if (ACENTOS.includes(acento) && acento !== "rosa") raiz.dataset.acento = acento;
  raiz.classList.add("con-js");

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
      if (nuevo === temaSistema()) {
        // Volver al tema del sistema: se deja de forzar
        delete raiz.dataset.tema;
        guardar(sesion, CLAVE_TEMA, null);
      } else {
        raiz.dataset.tema = nuevo;
        guardar(sesion, CLAVE_TEMA, nuevo);
      }
    } else if (boton.dataset.temaAccion === "acento") {
      const siguiente = ACENTOS[(ACENTOS.indexOf(acentoActual()) + 1) % ACENTOS.length];
      if (siguiente === "rosa") delete raiz.dataset.acento;
      else raiz.dataset.acento = siguiente;
      guardar(local, CLAVE_ACENTO, siguiente);
    }
    rotular();
  });

  // Si cambia el tema del sistema (p. ej. al anochecer), manda el del sistema
  sistemaOscuro.addEventListener?.("change", () => {
    delete raiz.dataset.tema;
    guardar(sesion, CLAVE_TEMA, null);
    rotular();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", rotular);
  else rotular();
})();
