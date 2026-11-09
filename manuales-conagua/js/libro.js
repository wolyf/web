/* ==========================================================================
   Lectura de los libros MAPAS (manuales-conagua/libros/)

   - Barra fija arriba al bajar por el libro: progreso, sección actual,
     botón «Índice» (panel con el contenido) y botón «Páginas» (muestra u
     oculta las marcas de página del original; se recuerda en el navegador).
   - Sin librerías. Si falta el marcado de la barra, no hace nada.
   ========================================================================== */
(function () {
  "use strict";

  var barra = document.querySelector(".lectura");
  var panel = document.querySelector(".panel-indice");
  var indice = document.querySelector(".libro__texto .indice");
  if (!barra || !panel || !indice) return;

  var progreso = barra.querySelector(".lectura__progreso span");
  var seccion = barra.querySelector(".lectura__seccion");
  var botonPaginas = barra.querySelector('[data-lectura="paginas"]');
  var CLAVE = "mapas-paginas";

  barra.hidden = false;

  /* ---- Panel del índice: copia de la lista del libro ---- */
  var lista = indice.querySelector("ul").cloneNode(true);
  panel.querySelector(".panel-indice__cuerpo").appendChild(lista);
  panel.querySelector(".panel-indice__cuerpo").classList.add("indice");

  barra.querySelector('[data-lectura="indice"]').addEventListener("click", function () {
    marcarActual();
    if (panel.showModal) panel.showModal(); else panel.setAttribute("open", "");
    var actual = lista.querySelector('[aria-current="true"]');
    if (actual) actual.scrollIntoView({ block: "center" });
  });

  function cerrarPanel() {
    if (panel.close) panel.close(); else panel.removeAttribute("open");
  }
  panel.querySelector('[data-lectura="cerrar"]').addEventListener("click", cerrarPanel);
  lista.addEventListener("click", function (e) {
    if (e.target.closest("a")) cerrarPanel();
  });
  // Clic en el fondo oscuro: cierra
  panel.addEventListener("click", function (e) {
    if (e.target === panel) cerrarPanel();
  });

  /* ---- Marcas de página: mostrar u ocultar ---- */
  function ponerPaginas(mostrar) {
    document.body.classList.toggle("sin-paginas", !mostrar);
    botonPaginas.setAttribute("aria-pressed", String(mostrar));
  }
  var guardado = null;
  try { guardado = localStorage.getItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
  ponerPaginas(guardado !== "no");
  botonPaginas.addEventListener("click", function () {
    var mostrar = botonPaginas.getAttribute("aria-pressed") !== "true";
    ponerPaginas(mostrar);
    try { localStorage.setItem(CLAVE, mostrar ? "si" : "no"); } catch (e) { /* nada */ }
  });

  /* ---- Sección actual y progreso ---- */
  var titulos = Array.prototype.slice.call(
    document.querySelectorAll(".libro__texto > h1[id], .libro__texto > h2[id], .libro__texto > h3[id], .libro__texto > h4[id]")
  );
  var enlaces = {};
  Array.prototype.forEach.call(lista.querySelectorAll('a[href^="#"]'), function (a) {
    enlaces[a.getAttribute("href").slice(1)] = a;
  });
  var inicioTexto = indice;
  var posiciones = [];

  function medir() {
    posiciones = titulos.map(function (h) {
      return h.getBoundingClientRect().top + window.scrollY;
    });
  }

  // Último título por encima de la orilla superior (más la barra)
  function tituloActual() {
    var y = window.scrollY + 70;
    var lo = 0, hi = posiciones.length - 1, r = -1;
    while (lo <= hi) {
      var m = (lo + hi) >> 1;
      if (posiciones[m] <= y) { r = m; lo = m + 1; } else hi = m - 1;
    }
    return r >= 0 ? titulos[r] : null;
  }

  // En el panel resalta la entrada del índice más cercana (si el título no está en él, la de su capítulo)
  function marcarActual() {
    var previo = lista.querySelector('[aria-current="true"]');
    if (previo) previo.removeAttribute("aria-current");
    var y = window.scrollY + 70;
    for (var i = titulos.length - 1; i >= 0; i--) {
      if (posiciones[i] <= y && enlaces[titulos[i].id]) {
        enlaces[titulos[i].id].setAttribute("aria-current", "true");
        return;
      }
    }
  }

  var pendiente = false;
  function actualizar() {
    pendiente = false;
    var alto = document.documentElement.scrollHeight - window.innerHeight;
    var f = alto > 0 ? Math.min(1, Math.max(0, window.scrollY / alto)) : 0;
    progreso.style.transform = "scaleX(" + f + ")";

    var umbral = inicioTexto.getBoundingClientRect().top + window.scrollY;
    barra.classList.toggle("visible", window.scrollY > umbral);

    var h = tituloActual();
    var texto = h ? h.textContent.replace(/\s+/g, " ").trim() : "";
    if (seccion.textContent !== texto) seccion.textContent = texto;
  }
  function alMover() {
    if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); }
  }

  medir();
  actualizar();
  window.addEventListener("scroll", alMover, { passive: true });
  window.addEventListener("resize", function () { medir(); alMover(); });
  // Las fuentes y los plegables cambian alturas: volver a medir
  window.addEventListener("load", function () { medir(); alMover(); });
  document.addEventListener("toggle", function () { medir(); alMover(); }, true);
  botonPaginas.addEventListener("click", function () { medir(); alMover(); });
})();
