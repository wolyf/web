# Manuales de agua potable, alcantarillado y saneamiento

Proyecto `manuales-conagua` del sitio de Wolfgang Resendiz. Entorno de Claude Code: `WEB_PROYECTO=manuales-conagua`.

## Zona

- Este proyecto solo edita `manuales-conagua/`. Todo lo demás se puede leer, pero no se modifica desde aquí.
- Lo común (`../css/styles.css`, `../js/tema.js`, `../js/darwin.js`, `../img/`, el `index.html` de la raíz, `herramientas/`, `proyectos.json`) es de la zona general. Si algo de ahí no sirve, se sobrescribe en el CSS propio (`manuales-conagua/css/`) o se le pide el cambio al entorno general.
- Rutas relativas: los recursos propios van en `manuales-conagua/css/`, `manuales-conagua/js/`, etc.; los comunes con `../`.
- La tarjeta del proyecto en la portada (descripción, icono, etiquetas, página de inicio) sale de `proyectos.json`: si cambia, pídele al entorno general que la actualice.

## Diseño

Usa los estilos comunes: papel beige y grises cálidos, un color de acento, títulos en Outfit y detalles en monoespaciada.

- Variables principales: `--bg`, `--surface`, `--surface-2`, `--text`, `--text-strong`, `--muted`, `--border`, `--border-card`, `--border-strong`, `--accent`, `--accent-soft`, `--sobre-acento`, `--radius`, `--font-texto`, `--font-titulo`, `--font-mono`. Usa estas variables en el CSS propio para respetar el tema claro/oscuro y el acento que elija quien visita.
- `<body class="ancho">` da una columna de lectura de 760 px; sin la clase, 480 px (formularios angostos).
- Componentes listos: `.site-header` + `.brand` + `.ajustes`, `.back`, `form`, `.card`, `.pastilla`, `.etiqueta`, `.proyectos` + `.proyecto`.
- Cada página incluye `../js/tema.js` (sin `defer`, en el `<head>`) y `../js/darwin.js` (con `defer`).

## Qué es

Recopilación de los libros del *Manual de Agua Potable, Alcantarillado y Saneamiento* (MAPAS) de la Conagua, convertidos de PDF a HTML. Son documentos públicos del gobierno federal.

- Cada libro es un HTML autocontenido (su propio CSS; algunas páginas del original van como imagen JPEG en base64). Se conservan tal como se convirtieron; el sitio solo les agrega en el `<head>` el ícono, `darwin.js` y `<script type="module" src="../js/libro.js">` (búsqueda dentro del libro), una barra de navegación al inicio del `<body>`, y cambia el guion largo del `<title>` por «·».
- **Edición de lectura continua** (por ahora, solo el **Libro 1**): usa `css/libro.css` y `js/lectura.js` en lugar del CSS propio del libro (además de `js/libro.js` para la búsqueda). Los renglones del PDF se unieron en párrafos (sin guion de fin de renglón), las ilustraciones y tablas que cortaban una frase van al terminar el párrafo, los rótulos de esquemas y organigramas están dentro de su `<figure>` (`<details class="rotulos">`), las marcas de página son `.pag` con `data-p` (bloque `div` o en línea `span`, id `pdf-N`) y el índice y las referencias («Ilustración 2.3», «Tabla 2.9», «ecuación 2.1») son enlaces (`ilustracion-2-3`, `tabla-2-9`, `ecuacion-2-1`). Negritas y cursivas salen de las fuentes del PDF. Ilustraciones: recortes del PDF en `libros/img/libro-01/` (WebP); las sencillas están recreadas en HTML (`css/diagramas.css`, `<div class="diagrama …">`) y las gráficas 2.19 y 3.5 son interactivas (`js/graficas.js`, `css/graficas.css`, `<div class="grafica-libro" data-grafica="…">`; no usar la clase `grafica`, que es de las calculadoras), con el original plegado debajo. Ecuaciones en MathML; los posibles errores del original van en `.posible-error` (rojo). La barra de lectura (progreso, sección actual, panel del índice, botón «Páginas», enlaces a inicio y manuales) la arma `js/lectura.js` dentro de un `<nav class="lectura-raiz">`: la búsqueda ignora los `nav`, así que el texto que la barra pone al vuelo no cambia la numeración de bloques. Las palabras del texto no cambian; la nota de transcripción del libro detalla las correcciones.
- **Reflujo automático** (los demás libros): `node manuales-conagua/herramientas/reflujo.mjs [NN …] [--revisar]` une los `<p>` sin atributos que son renglones partidos de una misma frase (segundo renglón en minúscula, guion de fin de renglón, o coma/palabra de enlace entre renglones largos); una marca de página entre ellos pasa a quedar después del párrafo. Ya se aplicó a todos (unas 35 000 uniones); no cambia caracteres, solo espacios y guiones de corte. Lo demás (rótulos sueltos, figuras que cortan frases, pies con texto ajeno) queda para revisión libro por libro, como se hizo con el Libro 1. Después de aplicarlo, regenera el índice de búsqueda.
- Falta el **Libro 35** (no venía en la conversión). Para agregarlo: copiar el HTML como `libros/libro-35.html`, aplicar los mismos agregados, sumarlo a la lista y al grupo correspondiente en `index.html` y regenerar el índice de búsqueda (`node manuales-conagua/herramientas/indice.mjs`).
- El cuerpo de los libros conserva el guion largo de la transcripción (fidelidad al texto); la interfaz propia del proyecto no lo usa.
- `index.html` agrupa los libros por tema y tiene la búsqueda (ver abajo).

## Búsqueda

- **En el índice** (`js/buscador.js`): filtra la lista por título y busca en el texto completo de todos los libros. Cada resultado enlaza al párrafo exacto: `libros/libro-NN.html?q=<búsqueda>&b=<bloque>`.
- **Dentro del libro** (`js/libro.js`): con `?q=` resalta las coincidencias, lleva al bloque `b` (o al más cercano que coincida) y muestra una barra con anterior/siguiente (Intro, Mayús+Intro), «Todos» (vuelve al índice con la búsqueda) y cerrar (Esc). Sin `?q=`, un botón y la tecla «/» abren la barra.
- **Lenguaje** (`js/consulta.js`, compartido): palabras en el mismo bloque, desde el inicio de palabra y sin acentos; `"frase exacta"`; `a|b`; `-excluir`; `libro:20,26`. Los números van completos; un número solo, sin comillas, busca el libro con ese número.
- **Bloques** (`js/texto.js`): párrafo, renglón de tabla, encabezado, elemento de lista, etc., numerados en postorden y saltando los vacíos. `herramientas/bloques.mjs` (lector de HTML sin dependencias) y `bloquesDOM()` de `js/libro.js` aplican las mismas reglas: si cambias una, cambia la otra y comprueba en Chromium que coincidan los 54 libros.
- **Datos** (`datos/`, generados, no se editan a mano): `vocabulario.json` (palabra → libros, para descargar solo los libros que pueden coincidir) y `libros/libro-NN.json` (bloques y encabezados). Tras cambiar un libro o las reglas: `node manuales-conagua/herramientas/indice.mjs`. La prueba `herramientas/pruebas/busqueda.test.mjs` (en `npm test`) falla si no están al día.

## Estructura

| Ruta | Qué es |
|---|---|
| `manuales-conagua/index.html` | Índice de libros por tema, con búsqueda |
| `manuales-conagua/css/manuales-conagua.css` | Estilos del índice (usa las variables comunes) |
| `manuales-conagua/css/libro.css`, `manuales-conagua/js/lectura.js` | Estilos y barra de lectura de los libros en edición continua |
| `manuales-conagua/css/diagramas.css`, `manuales-conagua/css/graficas.css`, `manuales-conagua/js/graficas.js` | Ilustraciones recreadas y gráficas interactivas |
| `manuales-conagua/libros/img/libro-NN/` | Recortes de ilustraciones del PDF original |
| `manuales-conagua/libros/libro-NN.html` | Cada libro convertido (NN = número de libro, dos dígitos) |
| `manuales-conagua/js/` | Búsqueda: `texto.js` (reglas de texto y bloques), `consulta.js` (lenguaje), `buscador.js` (índice), `libro.js` (dentro del libro) |
| `manuales-conagua/datos/` | Índice de búsqueda generado |
| `manuales-conagua/herramientas/` | `indice.mjs` (genera `datos/`), `bloques.mjs`, `reflujo.mjs` (une renglones partidos) y pruebas |
