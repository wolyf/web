// Búsqueda dentro de un libro (se carga en cada libros/libro-NN.html).
//
// Si la dirección trae ?q=<búsqueda>&b=<bloque> (así enlaza el buscador del índice),
// resalta todas las coincidencias, lleva al bloque indicado y muestra una barra para
// ir a la anterior o la siguiente. Sin ?q, deja un botón «Buscar en este libro».
// Los bloques se numeran con las mismas reglas que el índice (js/texto.js).

import { BLOQUES, TITULOS, EN_LINEA, IGNORADOS, IDS_IGNORADOS, limpiar, normal } from "./texto.js";
import { interpretar, coincidir } from "./consulta.js";

const VACIOS_LIMITE = new Set(["br", "hr", "input"]);
const MAX_MARCAS = 3000;

/**
 * Bloques del documento: { texto, partes: (Text | " ")[], el, titulo, tag }.
 * Mismo recorrido que herramientas/bloques.mjs sobre el DOM real.
 */
export function bloquesDOM(raiz = document.body) {
  const bloques = [];
  let titulo = -1;
  let suelto = null;
  const emitir = (b) => {
    const texto = limpiar(b.partes.map((p) => (typeof p === "string" ? p : p.data)).join(""));
    if (!texto) return;
    if (TITULOS.has(b.tag)) titulo = bloques.length;
    bloques.push({ texto, partes: b.partes, el: b.el, titulo: TITULOS.has(b.tag) ? bloques.length : titulo, tag: b.tag });
  };
  const soltar = () => {
    if (suelto) emitir(suelto);
    suelto = null;
  };
  const limite = (abierto) => {
    if (abierto) abierto.partes.push(" ");
    else soltar();
  };
  const visitar = (nodo, abierto) => {
    for (let n = nodo.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        const t = n.data;
        if (abierto) abierto.partes.push(n);
        else if (/\S/.test(t) || suelto) {
          if (!suelto) suelto = { tag: "#suelto", partes: [], el: n.parentElement };
          suelto.partes.push(n);
        }
        continue;
      }
      if (n.nodeType !== 1) continue;
      const tag = n.localName;
      if (IGNORADOS.has(tag) || IDS_IGNORADOS.has(n.id)) { limite(abierto); continue; }
      if (tag === "img" || tag === "wbr") continue;
      if (VACIOS_LIMITE.has(tag)) { limite(abierto); continue; }
      if (EN_LINEA.has(tag)) { visitar(n, abierto); continue; }
      limite(abierto);
      if (BLOQUES.has(tag)) {
        const b = { tag, partes: [], el: n };
        visitar(n, b);
        emitir(b);
        if (abierto) abierto.partes.push(" ");
      } else {
        visitar(n, abierto);
        limite(abierto);
      }
    }
  };
  visitar(raiz, null);
  soltar();
  return bloques;
}

// --- Resaltado -----------------------------------------------------------------

/**
 * Envuelve en <mark> los rangos [inicio, fin) del texto limpio del bloque.
 * Devuelve un grupo de marcas por rango, en orden del documento.
 */
function marcar(bloque, rangos) {
  // Posición en el texto limpio -> [nodo, desplazamiento] (null en los separadores
  // que agrega el recorrido). Mismo colapso de espacios que limpiar().
  const pos = [];
  let enEspacio = true;
  for (const p of bloque.partes) {
    const nodo = typeof p === "string" ? null : p;
    const t = nodo ? nodo.data : p;
    for (let i = 0; i < t.length; i++) {
      if (/\s/.test(t[i])) {
        if (!enEspacio) pos.push(nodo && [nodo, i]);
        enEspacio = true;
      } else {
        pos.push(nodo && [nodo, i]);
        enEspacio = false;
      }
    }
  }
  const marcas = [];
  // De atrás hacia adelante: partir un nodo deja intacto su principio (y sus posiciones).
  for (let r = rangos.length - 1; r >= 0; r--) {
    const [a, b] = rangos[r];
    const porNodo = new Map(); // nodo -> [ini, fin)
    for (let i = a; i < b && i < pos.length; i++) {
      if (!pos[i]) continue;
      const [nodo, k] = pos[i];
      const t = porNodo.get(nodo);
      if (t) t[1] = k + 1;
      else porNodo.set(nodo, [k, k + 1]);
    }
    const grupo = [];
    for (const [nodo, [ini, fin]] of [...porNodo].reverse()) {
      if (fin < nodo.data.length) nodo.splitText(fin);
      const pedazo = ini > 0 ? nodo.splitText(ini) : nodo;
      const m = document.createElement("mark");
      m.className = "mapas-marca";
      pedazo.parentNode.insertBefore(m, pedazo);
      m.appendChild(pedazo);
      grupo.unshift(m);
    }
    if (grupo.length) marcas.unshift(grupo);
  }
  return marcas;
}

/** Quita todas las marcas. */
function desmarcar() {
  for (const m of document.querySelectorAll("mark.mapas-marca")) {
    const p = m.parentNode;
    while (m.firstChild) p.insertBefore(m.firstChild, m);
    p.removeChild(m);
    p.normalize();
  }
}

// --- Interfaz ------------------------------------------------------------------

const ESTILO = `
#mapas-hallazgos{position:fixed;top:10px;right:10px;z-index:2147483000;display:flex;align-items:center;gap:6px;
  font:14px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1a1a1a;background:#fff;border:1px solid #bbb;
  border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.15);padding:6px 8px;max-width:calc(100vw - 20px);box-sizing:border-box}
#mapas-hallazgos input{font:inherit;border:1px solid #bbb;border-radius:6px;padding:4px 8px;width:15em;max-width:42vw;min-width:0}
#mapas-hallazgos button{font:inherit;border:1px solid #ccc;background:#f4f4f4;color:#1a1a1a;border-radius:6px;padding:3px 9px;cursor:pointer;line-height:1.2}
#mapas-hallazgos button:hover{background:#e8e8e8}
#mapas-hallazgos .mapas-cuenta{white-space:nowrap;color:#555;font-variant-numeric:tabular-nums;min-width:5.5em;text-align:center}
#mapas-hallazgos .mapas-volver{color:#0b5fa5;white-space:nowrap;text-decoration:none}
#mapas-hallazgos[data-cerrado] > :not(.mapas-abrir){display:none}
#mapas-hallazgos:not([data-cerrado]) .mapas-abrir{display:none}
#mapas-hallazgos[data-cerrado]{padding:0;border:0;background:none;box-shadow:none}
#mapas-hallazgos[data-cerrado] .mapas-abrir{box-shadow:0 2px 8px rgba(0,0,0,.15);background:#fff}
mark.mapas-marca{background:#ffe58a;color:inherit;padding:0;border-radius:2px}
mark.mapas-marca.mapas-actual{background:#ff9f43;outline:2px solid #ff9f43}
.mapas-bloque-actual{outline:2px dashed #ff9f43;outline-offset:4px;border-radius:2px}
@media (max-width:560px){#mapas-hallazgos{left:10px;top:auto;bottom:10px;flex-wrap:wrap}#mapas-hallazgos input{flex:1;max-width:none}}
@media print{#mapas-hallazgos{display:none}mark.mapas-marca{background:none}}
`;

function iniciar() {
  const estilo = document.createElement("style");
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const params = new URLSearchParams(location.search);
  const barra = document.createElement("div");
  barra.id = "mapas-hallazgos";
  barra.setAttribute("role", "search");
  barra.innerHTML = `
    <button type="button" class="mapas-abrir" title="Buscar en este libro (/)">Buscar en este libro</button>
    <input type="search" aria-label="Buscar en este libro" placeholder="Buscar en este libro" autocomplete="off">
    <span class="mapas-cuenta" aria-live="polite"></span>
    <button type="button" data-ir="-1" aria-label="Coincidencia anterior" title="Anterior (Mayús+Intro)">‹</button>
    <button type="button" data-ir="1" aria-label="Coincidencia siguiente" title="Siguiente (Intro)">›</button>
    <a class="mapas-volver" href="../?q=" title="Ver los resultados en todos los libros">Todos</a>
    <button type="button" class="mapas-cerrar" aria-label="Cerrar la búsqueda" title="Cerrar (Esc)">✕</button>`;
  document.body.appendChild(barra);
  const entrada = barra.querySelector("input");
  const cuenta = barra.querySelector(".mapas-cuenta");
  const volver = barra.querySelector(".mapas-volver");

  let bloques = null;
  let marcas = []; // [[mark, ...], ...] en orden del documento
  let actual = -1;

  const ir = (i, desplazar = true) => {
    if (!marcas.length) return;
    for (const m of marcas[actual] || []) m.classList.remove("mapas-actual");
    actual = (i + marcas.length) % marcas.length;
    for (const m of marcas[actual]) m.classList.add("mapas-actual");
    cuenta.textContent = `${actual + 1} de ${marcas.length}${marcas.length >= MAX_MARCAS ? "+" : ""}`;
    if (desplazar) marcas[actual][0].scrollIntoView({ block: "center", behavior: "auto" });
  };

  const buscar = (q, bloqueDestino) => {
    desmarcar();
    document.querySelector(".mapas-bloque-actual")?.classList.remove("mapas-bloque-actual");
    marcas = [];
    actual = -1;
    const c = interpretar(q);
    volver.href = "../?q=" + encodeURIComponent(q);
    if (c.vacia) { cuenta.textContent = ""; return; }
    // Recalcular los bloques: las marcas parten nodos de texto
    bloques = bloquesDOM();
    let primera = -1; // índice en marcas del bloque destino (o el más cercano)
    let mejor = Infinity;
    for (let i = 0; i < bloques.length && marcas.length < MAX_MARCAS; i++) {
      const r = coincidir(c, normal(bloques[i].texto));
      if (!r) continue;
      const grupo = marcar(bloques[i], r.rangos);
      if (!grupo.length) continue;
      if (bloqueDestino !== undefined) {
        const d = Math.abs(i - bloqueDestino);
        if (d < mejor) { mejor = d; primera = marcas.length; }
      }
      marcas.push(...grupo);
    }
    if (!marcas.length) { cuenta.textContent = "Sin coincidencias"; return; }
    ir(primera >= 0 ? primera : 0);
    if (bloqueDestino !== undefined && mejor === 0) {
      bloques[bloqueDestino]?.el?.classList?.add("mapas-bloque-actual");
    }
  };

  const abrir = () => {
    barra.removeAttribute("data-cerrado");
    entrada.focus();
    entrada.select();
  };
  const cerrar = () => {
    desmarcar();
    document.querySelector(".mapas-bloque-actual")?.classList.remove("mapas-bloque-actual");
    marcas = [];
    barra.setAttribute("data-cerrado", "");
    const p = new URLSearchParams(location.search);
    p.delete("q");
    p.delete("b");
    const s = p.toString();
    history.replaceState(null, "", location.pathname + (s ? "?" + s : "") + location.hash);
  };

  let espera;
  entrada.addEventListener("input", () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      buscar(entrada.value);
      const p = new URLSearchParams(location.search);
      p.set("q", entrada.value);
      p.delete("b");
      history.replaceState(null, "", location.pathname + "?" + p + location.hash);
    }, 300);
  });
  entrada.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); ir(actual + (e.shiftKey ? -1 : 1)); }
    if (e.key === "Escape") cerrar();
  });
  barra.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.ir) ir(actual + Number(b.dataset.ir));
    else if (b.classList.contains("mapas-cerrar")) cerrar();
    else if (b.classList.contains("mapas-abrir")) abrir();
  });
  document.addEventListener("keydown", (e) => {
    const escribe = /^(input|textarea|select)$/i.test(e.target.localName) || e.target.isContentEditable;
    if (e.key === "/" && !escribe && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); abrir(); }
  });

  const q = params.get("q");
  if (q && q.trim()) {
    entrada.value = q;
    const b = params.has("b") ? Number(params.get("b")) : undefined;
    buscar(q, Number.isInteger(b) ? b : undefined);
  } else {
    barra.setAttribute("data-cerrado", "");
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
}
