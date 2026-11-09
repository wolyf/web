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

- Cada libro es un HTML autocontenido (su propio CSS; algunas páginas del original van como imagen JPEG en base64). Se conservan tal como se convirtieron; el sitio solo les agrega en el `<head>` el ícono y `darwin.js`, una barra de navegación al inicio del `<body>`, y cambia el guion largo del `<title>` por «·».
- Falta el **Libro 35** (no venía en la conversión). Para agregarlo: copiar el HTML como `libros/libro-35.html`, aplicar los mismos agregados y sumarlo a la lista y al grupo correspondiente en `index.html`.
- El cuerpo de los libros conserva el guion largo de la transcripción (fidelidad al texto); la interfaz propia del proyecto no lo usa.
- `index.html` agrupa los libros por tema y tiene una búsqueda (por número exacto o por palabras, sin acentos).

## Estructura

| Ruta | Qué es |
|---|---|
| `manuales-conagua/index.html` | Índice de libros por tema, con búsqueda |
| `manuales-conagua/css/manuales-conagua.css` | Estilos del índice (usa las variables comunes) |
| `manuales-conagua/libros/libro-NN.html` | Cada libro convertido (NN = número de libro, dos dígitos) |
