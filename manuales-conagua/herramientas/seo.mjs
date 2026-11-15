// Datos para buscadores de los manuales: título, descripción, canonical, Open Graph,
// JSON-LD (Book + BreadcrumbList) de cada libro y sitemap.xml del proyecto.
//
//   node manuales-conagua/herramientas/seo.mjs            # actualiza los libros y el sitemap
//   node manuales-conagua/herramientas/seo.mjs --revisar  # solo revisa (código 1 si algo no está al día)
//
// Solo toca el <head> (un bloque entre marcadores), el <title> y el nombre del sitio
// en la <nav class="ajustes-barra"> o en la marca (.brand) del encabezado. El cuerpo de los libros no cambia, así que
// la numeración de bloques de la búsqueda y los subrayados siguen igual.
// Nombres y número de cada libro: la lista de manuales-conagua/index.html.
// Si se reconstruye un libro, vuelve a correr esta herramienta (una prueba lo exige).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROYECTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = path.resolve(PROYECTO, "..");
const INICIO = "<!-- seo:inicio · generado por herramientas/seo.mjs, no se edita a mano -->";
const FIN = "<!-- seo:fin -->";
const SERIE = "Manual de Agua Potable, Alcantarillado y Saneamiento (MAPAS)";
const CONAGUA = { "@type": "GovernmentOrganization", name: "Comisión Nacional del Agua (Conagua)", url: "https://www.gob.mx/conagua" };

const escapar = (t) => String(t).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
// JSON dentro de <script>: que ningún texto pueda cerrar la etiqueta
const json = (o) => JSON.stringify(o, null, 2).replace(/</g, "\\u003c");

export function baseDelSitio(raiz = RAIZ) {
  const url = JSON.parse(fs.readFileSync(path.join(raiz, "proyectos.json"), "utf8")).sitio?.url;
  if (!url) throw new Error("Falta sitio.url en proyectos.json.");
  return url.endsWith("/") ? url : `${url}/`;
}

// Libros de la lista de index.html: [{ num, archivo, nombre, grupo }]
export function leerLibros(indiceHtml) {
  const libros = [];
  let grupo = "";
  const patron = /<h2>([^<]+)<\/h2>|<li class="mapas__libro"><a href="libros\/(libro-(\d+)\.html)"><span class="mapas__num">\d+<\/span><span>([^<]+)<\/span><\/a><\/li>/g;
  for (const m of indiceHtml.matchAll(patron)) {
    if (m[1]) grupo = m[1].trim();
    else libros.push({ num: Number(m[3]), archivo: m[2], nombre: m[4].trim(), grupo });
  }
  return libros.sort((a, b) => a.num - b.num);
}

const tituloDe = (l) => `Libro ${l.num} · ${l.nombre} (MAPAS, Conagua)`;
// Un título ya curado con el patrón «Libro N · … (MAPAS, Conagua)» se conserva.
const tituloCurado = (actual, l) => new RegExp(`^Libro ${l.num} · .+ \\(MAPAS, Conagua\\)$`).test(actual);
const descripcionDe = (l) =>
  `Libro ${l.num} del Manual de Agua Potable, Alcantarillado y Saneamiento (MAPAS) de la Conagua: ${l.nombre}. Texto completo en HTML con búsqueda, tablas y ecuaciones.`;

// Bloque del <head> de un libro. `conDescripcion`: si el libro no trae la suya.
export function bloqueLibro(l, base, { conDescripcion = true, tituloHtml = escapar(tituloDe(l)) } = {}) {
  const url = new URL(`manuales-conagua/libros/${l.archivo}`, base).href;
  const manuales = new URL("manuales-conagua/", base).href;
  const descripcion = descripcionDe(l);
  const datos = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Book",
        "@id": `${url}#libro`,
        name: `Libro ${l.num}. ${l.nombre}`,
        url,
        inLanguage: "es-MX",
        bookFormat: "https://schema.org/EBook",
        bookEdition: "Edición en HTML",
        description: descripcion,
        genre: l.grupo || undefined,
        isAccessibleForFree: true,
        isPartOf: { "@type": "BookSeries", "@id": `${manuales}#mapas`, name: SERIE, url: manuales },
        author: CONAGUA,
        publisher: CONAGUA,
        editor: { "@type": "Person", "@id": `${base}#persona`, name: "Wolfgang Reséndiz", url: base },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Wolfgang Reséndiz", item: base },
          { "@type": "ListItem", position: 2, name: "Manuales MAPAS", item: manuales },
          { "@type": "ListItem", position: 3, name: `Libro ${l.num}`, item: url },
        ],
      },
    ],
  };
  return [
    INICIO,
    ...(conDescripcion ? [`<meta name="description" content="${escapar(descripcion)}">`] : []),
    `<link rel="canonical" href="${escapar(url)}">`,
    `<meta property="og:type" content="book">`,
    `<meta property="og:locale" content="es_MX">`,
    `<meta property="og:site_name" content="Wolfgang Reséndiz">`,
    `<meta property="og:title" content="${tituloHtml.replace(/"/g, "&#34;")}">`,
    `<meta property="og:description" content="${escapar(descripcion)}">`,
    `<meta property="og:url" content="${escapar(url)}">`,
    `<meta property="og:image" content="${escapar(new URL("img/vista-previa.png", base).href)}">`,
    `<script type="application/ld+json">`,
    json(datos),
    `</script>`,
    FIN,
  ].join("\n");
}

// Quita el bloque generado (con la sangría de su primera línea y el salto final).
const quitarBloque = (html) => {
  const a = html.indexOf(INICIO);
  if (a < 0) return html;
  const b = html.indexOf(FIN, a);
  if (b < 0) throw new Error("Bloque seo sin cierre.");
  const desde = a - html.slice(0, a).match(/[ \t]*$/)[0].length;
  return html.slice(0, desde) + html.slice(b + FIN.length).replace(/^\n/, "");
};

// Devuelve el libro con su <head> al día. Idempotente.
export function actualizarLibro(html, l, base) {
  let nuevo = quitarBloque(html);
  const actual = nuevo.match(/<title>([^<]*)<\/title>/);
  if (!actual) throw new Error(`${l.archivo}: no tiene <title>.`);
  // El curado ya es HTML (puede traer entidades): se deja tal cual; el generado se escapa.
  const tituloHtml = tituloCurado(actual[1], l) ? actual[1] : escapar(tituloDe(l));
  nuevo = nuevo.replace(/<title>[^<]*<\/title>/, () => `<title>${tituloHtml}</title>`);
  const conDescripcion = !/<meta name="description"/.test(nuevo);
  const fin = nuevo.indexOf("</head>");
  if (fin < 0) throw new Error(`${l.archivo}: no tiene </head>.`);
  nuevo = `${nuevo.slice(0, fin)}${bloqueLibro(l, base, { conDescripcion, tituloHtml })}\n${nuevo.slice(fin)}`;
  // El nombre del sitio en la barra (es un <nav>: la búsqueda no lo cuenta)
  return nuevo
    .replace(/(<nav class="ajustes-barra">.*?>)Wolfgang Resendiz(<\/a>)/, "$1Wolfgang Reséndiz$2")
    .replace(/(<a class="brand" href="[^"]*">)Wolfgang Resendiz(<\/a>)/, "$1Wolfgang Reséndiz$2");
}

// Bloque del <head> del índice de los manuales: canonical, Open Graph y la colección.
export function bloqueIndice(libros, base) {
  const url = new URL("manuales-conagua/", base).href;
  const descripcion = `Los ${libros.length} libros del ${SERIE} de la Conagua en HTML: texto completo, búsqueda en todos los libros, tablas, ecuaciones y gráficas.`;
  const datos = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#pagina`,
        url,
        name: `${SERIE} en HTML`,
        inLanguage: "es-MX",
        description: descripcion,
        mainEntity: { "@id": `${url}#mapas` },
        editor: { "@type": "Person", "@id": `${base}#persona`, name: "Wolfgang Reséndiz", url: base },
      },
      {
        "@type": "BookSeries",
        "@id": `${url}#mapas`,
        name: SERIE,
        url,
        author: CONAGUA,
        publisher: CONAGUA,
        hasPart: libros.map((l) => ({ "@id": new URL(`manuales-conagua/libros/${l.archivo}`, base).href + "#libro" })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Wolfgang Reséndiz", item: base },
          { "@type": "ListItem", position: 2, name: "Manuales MAPAS", item: url },
        ],
      },
    ],
  };
  return [
    INICIO,
    `<link rel="canonical" href="${escapar(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="es_MX">`,
    `<meta property="og:site_name" content="Wolfgang Reséndiz">`,
    `<meta property="og:title" content="${escapar(`${SERIE}, Conagua`)}">`,
    `<meta property="og:description" content="${escapar(descripcion)}">`,
    `<meta property="og:url" content="${escapar(url)}">`,
    `<meta property="og:image" content="${escapar(new URL("img/vista-previa.png", base).href)}">`,
    `<script type="application/ld+json">`,
    json(datos),
    `</script>`,
    FIN,
  ].join("\n");
}

export function actualizarIndice(html, libros, base) {
  let nuevo = quitarBloque(html);
  const fin = nuevo.indexOf("</head>");
  if (fin < 0) throw new Error("index.html no tiene </head>.");
  const sangria = "  ";
  const bloque = bloqueIndice(libros, base).split("\n").map((l) => sangria + l).join("\n");
  return `${nuevo.slice(0, fin)}${bloque}\n${nuevo.slice(fin)}`;
}

export function generarSitemap(libros, base) {
  const urls = [new URL("manuales-conagua/", base).href, ...libros.map((l) => new URL(`manuales-conagua/libros/${l.archivo}`, base).href)];
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- Generado por manuales-conagua/herramientas/seo.mjs -->`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls.map((u) => `  <url><loc>${escapar(u)}</loc></url>`),
    `</urlset>`,
    ``,
  ].join("\n");
}

// Todo lo que debería haber en disco: [[ruta, contenido]]
export function esperado(proyecto = PROYECTO, raiz = RAIZ) {
  const base = baseDelSitio(raiz);
  const indice = fs.readFileSync(path.join(proyecto, "index.html"), "utf8");
  const libros = leerLibros(indice);
  const salida = libros.map((l) => {
    const ruta = path.join(proyecto, "libros", l.archivo);
    return [ruta, actualizarLibro(fs.readFileSync(ruta, "utf8"), l, base)];
  });
  salida.push([path.join(proyecto, "index.html"), actualizarIndice(indice, libros, base)]);
  salida.push([path.join(proyecto, "sitemap.xml"), generarSitemap(libros, base)]);
  return salida;
}

const ejecutadoDirecto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (ejecutadoDirecto) {
  const revisar = process.argv.includes("--revisar");
  const pendientes = esperado().filter(([ruta, nuevo]) => !fs.existsSync(ruta) || fs.readFileSync(ruta, "utf8") !== nuevo);
  if (revisar) {
    for (const [ruta] of pendientes) console.error(`✗ ${path.relative(RAIZ, ruta)} no está al día.`);
    if (pendientes.length) process.exitCode = 1;
    else console.log("✓ Libros y sitemap al día.");
  } else {
    for (const [ruta, nuevo] of pendientes) fs.writeFileSync(ruta, nuevo);
    console.log(`${pendientes.length} archivo(s) actualizado(s).`);
  }
}
