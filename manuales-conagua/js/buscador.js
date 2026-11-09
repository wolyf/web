// Buscador del índice de manuales: filtra la lista por título y busca en el texto
// completo de los libros, con enlaces al párrafo exacto (libros/libro-NN.html?q=…&b=…).
//
// Datos (generados por herramientas/indice.mjs):
//   datos/vocabulario.json   palabra -> libros donde aparece (para no descargar de más)
//   datos/libros/libro-NN.json  texto del libro en bloques
// Se descargan solo al buscar, y solo los libros que pueden tener la búsqueda.

import { normal } from "./texto.js";
import { interpretar, coincidir, enlace } from "./consulta.js";

const DATOS = "datos/";
const EN_PARALELO = 6;
const VISIBLES = 3; // coincidencias por libro antes de «Ver todas»
const MAX_LISTA = 200; // tope de coincidencias listadas por libro

const $ = (s) => document.querySelector(s);
const entrada = $("#buscar");
const cuenta = $("#cuenta");
const vacio = $("#vacio");
const zona = $("#resultados");
const lista = $("#resultados-lista");
const estado = $("#resultados-estado");
const grupos = [...document.querySelectorAll(".mapas__grupo")];

// Libros de la lista: número, título y elemento
const libros = [...document.querySelectorAll(".mapas__libro")].map((li) => ({
  li,
  num: Number(li.querySelector(".mapas__num").textContent),
  titulo: li.querySelector(".mapas__num + span").textContent,
}));
for (const l of libros) l.normal = normal(l.titulo);
const porNumero = new Map(libros.map((l) => [l.num, l]));

const escapar = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const plural = (n, uno, varios) => `${n.toLocaleString("es-MX")} ${n === 1 ? uno : varios}`;

// --- Datos ---------------------------------------------------------------------

let vocabulario = null; // Promise<{palabras: string[], mascaras: string[], libros: number[]}>
function cargarVocabulario() {
  vocabulario ??= fetch(DATOS + "vocabulario.json")
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((v) => {
      const palabras = [];
      const mascaras = [];
      for (const linea of v.p.split("\n")) {
        const i = linea.indexOf(" ");
        palabras.push(linea.slice(0, i));
        mascaras.push(linea.slice(i + 1));
      }
      return { palabras, mascaras, libros: v.libros };
    })
    .catch((e) => { vocabulario = null; throw e; });
  return vocabulario;
}

const textos = new Map(); // num -> Promise<{t, b, n: string[], esTitulo: Set}>
function cargarLibro(num) {
  if (!textos.has(num)) {
    const p = fetch(`${DATOS}libros/libro-${String(num).padStart(2, "0")}.json`)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => ({ ...d, n: d.b.map(([, t]) => normal(t)), esTitulo: new Set(d.t.map((t) => t[2])) }));
    p.catch(() => textos.delete(num));
    textos.set(num, p);
  }
  return textos.get(num);
}

/** Libros que pueden contener la búsqueda, según el vocabulario (máscara de bits). */
function candidatos(c, v) {
  const parseMask = (s) => BigInt(0) + [...s].reduce((a, ch) => a * 36n + BigInt(parseInt(ch, 36)), 0n);
  const rango = (p, prefijo) => {
    // Primera palabra >= p (búsqueda binaria)
    let a = 0, b = v.palabras.length;
    while (a < b) { const m = (a + b) >> 1; if (v.palabras[m] < p) a = m + 1; else b = m; }
    let mask = 0n;
    for (let i = a; i < v.palabras.length; i++) {
      const w = v.palabras[i];
      if (w === p || (prefijo && w.startsWith(p))) mask |= parseMask(v.mascaras[i]);
      else break;
    }
    return mask;
  };
  const todos = (1n << BigInt(v.libros.length)) - 1n;
  let total = todos;
  for (const g of c.grupos) {
    let delGrupo = 0n;
    for (const o of g.opciones) {
      let m = todos;
      o.palabras.forEach((p, i) => {
        const ultima = i === o.palabras.length - 1;
        m &= rango(p, !o.exactas && ultima && !o.numero);
      });
      delGrupo |= m;
    }
    total &= delGrupo;
  }
  return v.libros.filter((n, i) => (total >> BigInt(i)) & 1n);
}

// --- Búsqueda en un libro --------------------------------------------------------

/** Coincidencias de un libro: [{bloque, rangos, puntos}] en orden del documento. */
function buscarEnLibro(c, d) {
  const hallazgos = [];
  for (let i = 0; i < d.n.length; i++) {
    const r = coincidir(c, d.n[i]);
    if (!r) continue;
    let puntos = r.cuenta.reduce((s, k) => s + Math.min(k, 3), 0);
    if (d.esTitulo.has(i)) puntos += 5;
    else {
      const h = d.b[i][0];
      if (h >= 0 && coincidir(c, normal(d.t[h][1]))) puntos += 2; // la sección también habla de esto
      if (d.b[i][1].length < 25) puntos -= 1; // renglones sueltos, entradas de índice
    }
    hallazgos.push({ bloque: i, rangos: r.rangos, puntos });
  }
  return hallazgos;
}

/** Fragmento del bloque alrededor de la primera coincidencia, con <mark>. */
function fragmento(texto, rangos, largo = 230) {
  const [a0] = rangos[0];
  let ini = Math.max(0, a0 - 70);
  if (ini > 0) { const e = texto.indexOf(" ", ini); if (e >= 0 && e < a0) ini = e + 1; }
  let fin = Math.min(texto.length, ini + largo);
  if (fin < texto.length) { const e = texto.lastIndexOf(" ", fin); if (e > rangos[0][1]) fin = e; }
  let html = ini > 0 ? "… " : "";
  let k = ini;
  for (const [a, b] of rangos) {
    if (b <= ini || a >= fin) continue;
    html += escapar(texto.slice(k, Math.max(k, a))) + "<mark>" + escapar(texto.slice(Math.max(a, k), Math.min(b, fin))) + "</mark>";
    k = Math.min(b, fin);
  }
  html += escapar(texto.slice(k, fin)) + (fin < texto.length ? " …" : "");
  return html;
}

// --- Presentación ----------------------------------------------------------------

function tarjeta(r, q) {
  const { libro, d, hallazgos } = r;
  const art = document.createElement("article");
  art.className = "mapas__res";
  const mejores = [...hallazgos].sort((a, b) => b.puntos - a.puntos || a.bloque - b.bloque).slice(0, VISIBLES)
    .sort((a, b) => a.bloque - b.bloque);
  const item = (h) => {
    const [ti, texto] = d.b[h.bloque];
    const esTitulo = d.esTitulo.has(h.bloque);
    const seccion = !esTitulo && ti >= 0 ? d.t[ti][1] : "";
    return `<li><a href="${escapar(enlace("libros/", libro.num, q, h.bloque))}">` +
      (esTitulo ? `<span class="mapas__seccion">Título de sección</span>` : seccion ? `<span class="mapas__seccion">${escapar(seccion.length > 90 ? seccion.slice(0, 88) + "…" : seccion)}</span>` : "") +
      `<span class="mapas__frag${esTitulo ? " mapas__frag--titulo" : ""}">${fragmento(texto, h.rangos)}</span></a></li>`;
  };
  art.innerHTML =
    `<h3><a href="${escapar(enlace("libros/", libro.num, q, hallazgos[0].bloque))}"><span class="mapas__num">${String(libro.num).padStart(2, "0")}</span><span>${escapar(libro.titulo)}</span></a></h3>` +
    `<p class="mapas__res-n">${plural(hallazgos.length, "coincidencia", "coincidencias")}</p>` +
    `<ol class="mapas__hits">${mejores.map(item).join("")}</ol>`;
  if (hallazgos.length > VISIBLES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mapas__mas";
    b.textContent = `Ver ${hallazgos.length > MAX_LISTA ? `las primeras ${MAX_LISTA}` : `las ${hallazgos.length}`}`;
    b.addEventListener("click", () => {
      art.querySelector(".mapas__hits").innerHTML = hallazgos.slice(0, MAX_LISTA).map(item).join("") +
        (hallazgos.length > MAX_LISTA ? `<li class="mapas__resto"><a href="${escapar(enlace("libros/", libro.num, q, hallazgos[MAX_LISTA].bloque))}">Y ${plural(hallazgos.length - MAX_LISTA, "más", "más")}: sigue en el libro</a></li>` : "");
      b.remove();
    });
    art.appendChild(b);
  }
  return art;
}

function puntaje(r, c) {
  const top = r.hallazgos.map((h) => h.puntos).sort((a, b) => b - a).slice(0, 5);
  const enTitulo = coincidir(c, r.libro.normal) ? 30 : 0;
  return enTitulo + top.reduce((s, p) => s + p, 0) + 2 * Math.log2(1 + r.hallazgos.length);
}

// --- Filtro por título -----------------------------------------------------------

function filtrarTitulos(c) {
  let visibles = 0;
  for (const l of libros) {
    let ok = !c.libros || c.libros.includes(l.num);
    if (ok && !c.vacia) {
      ok = !c.excluir.some((g) => coincidir({ grupos: [g], excluir: [] }, l.normal));
      // Cada grupo: un número que sea el del libro, o el título que lo contenga
      ok &&= c.grupos.every((g) =>
        g.opciones.some((o) => o.numero && Number(o.palabras.join(".")) === l.num) ||
        coincidir({ grupos: [g], excluir: [] }, l.normal));
    }
    l.li.hidden = !ok;
    if (ok) visibles++;
  }
  for (const g of grupos) g.hidden = !g.querySelector(".mapas__libro:not([hidden])");
  return visibles;
}

// --- Orquestación ----------------------------------------------------------------

let turno = 0;

async function buscar(q) {
  const yo = ++turno;
  const c = interpretar(q);
  const sinFiltro = c.vacia && !c.libros;
  const titulos = sinFiltro ? libros.length : filtrarTitulos(c);
  if (sinFiltro) { for (const l of libros) l.li.hidden = false; for (const g of grupos) g.hidden = false; }
  cuenta.textContent = sinFiltro ? plural(libros.length, "libro", "libros") : `${plural(titulos, "libro", "libros")} por título`;
  history.replaceState(null, "", q.trim() ? `?q=${encodeURIComponent(q.trim())}` : location.pathname);

  lista.replaceChildren();
  // Solo números sueltos (p. ej. «20»): se entiende como número de libro.
  const soloNumeros = !c.vacia && c.grupos.every((g) => g.opciones.every((o) => o.numero) && !g.texto.startsWith('"'));
  const corta = c.grupos.length && c.grupos.every((g) => g.opciones.every((o) => o.palabras.join("").length < 2 && !o.numero));
  if (c.vacia || soloNumeros || corta) {
    zona.hidden = !(soloNumeros || corta);
    estado.textContent = soloNumeros ? "Para buscar ese número dentro del texto, escríbelo entre comillas (p. ej. \"20\")." : corta ? "Escribe al menos dos letras." : "";
    vacio.style.display = !sinFiltro && !titulos && c.vacia ? "block" : "none";
    return;
  }
  zona.hidden = false;
  vacio.style.display = "none";
  estado.textContent = "Buscando en el texto…";

  let v;
  try { v = await cargarVocabulario(); } catch { if (yo === turno) estado.textContent = "No se pudo cargar el índice de búsqueda."; return; }
  if (yo !== turno) return;
  let nums = candidatos(c, v);
  if (c.libros) nums = nums.filter((n) => c.libros.includes(n));
  // Primero los libros cuyo título coincide
  nums.sort((a, b) => (porNumero.get(a) && !porNumero.get(a).li.hidden ? 0 : 1) - (porNumero.get(b) && !porNumero.get(b).li.hidden ? 0 : 1) || a - b);

  const resultados = [];
  let hechos = 0;
  let total = 0;
  let pintar = 0;
  const repintar = () => {
    pintar ||= requestAnimationFrame(() => {
      pintar = 0;
      if (yo !== turno) return;
      resultados.sort((a, b) => b.puntaje - a.puntaje || a.libro.num - b.libro.num);
      lista.replaceChildren(...resultados.map((r) => r.el));
      const faltan = nums.length - hechos;
      estado.textContent = (total
        ? `${plural(total, "coincidencia", "coincidencias")} en ${plural(resultados.length, "libro", "libros")}`
        : faltan ? "" : "Sin coincidencias en el texto.") +
        (faltan ? `${total ? " · " : ""}buscando… ${hechos} de ${nums.length} libros` : "");
    });
  };
  repintar();

  let siguiente = 0;
  let fallas = 0;
  const trabajador = async () => {
    while (siguiente < nums.length && yo === turno) {
      const num = nums[siguiente++];
      try {
        const d = await cargarLibro(num);
        if (yo !== turno) return;
        const hallazgos = buscarEnLibro(c, d);
        if (hallazgos.length) {
          const libro = porNumero.get(num) || { num, titulo: `Libro ${num}`, normal: "" };
          const r = { libro, d, hallazgos };
          r.puntaje = puntaje(r, c);
          r.el = tarjeta(r, q.trim());
          resultados.push(r);
          total += hallazgos.length;
        }
      } catch { fallas++; }
      hechos++;
      repintar();
    }
  };
  await Promise.all(Array.from({ length: EN_PARALELO }, trabajador));
  if (yo === turno && fallas) estado.textContent += ` · ${plural(fallas, "libro no se pudo cargar", "libros no se pudieron cargar")}`;
}

let espera;
entrada.addEventListener("input", () => {
  clearTimeout(espera);
  espera = setTimeout(() => buscar(entrada.value), 250);
});
entrada.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { clearTimeout(espera); buscar(entrada.value); }
});
// Ejemplos de la ayuda: se escriben en la caja
document.addEventListener("click", (e) => {
  const ej = e.target.closest("[data-ejemplo]");
  if (!ej) return;
  entrada.value = ej.dataset.ejemplo;
  entrada.focus();
  buscar(entrada.value);
});

const inicial = new URLSearchParams(location.search).get("q");
if (inicial) {
  entrada.value = inicial;
  buscar(inicial);
}
