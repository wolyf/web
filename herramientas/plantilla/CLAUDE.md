# {{NOMBRE}}

Proyecto `{{ID}}` del sitio de Wolfgang Resendiz. Entorno de Claude Code: `WEB_PROYECTO={{ID}}`.

## Zona

- Este proyecto solo edita `{{ID}}/`. Todo lo demás se puede leer, pero no se modifica desde aquí.
- Lo común (`../css/styles.css`, `../js/tema.js`, `../js/darwin.js`, `../img/`, el `index.html` de la raíz, `herramientas/`, `proyectos.json`) es de la zona general. Si algo de ahí no sirve, se sobrescribe en el CSS propio (`{{ID}}/css/`) o se le pide el cambio al entorno general.
- Rutas relativas: los recursos propios van en `{{ID}}/css/`, `{{ID}}/js/`, etc.; los comunes con `../`.
- La tarjeta del proyecto en la portada (descripción, icono, etiquetas, página de inicio) sale de `proyectos.json`: si cambia, pídele al entorno general que la actualice.

## Diseño

Usa los estilos comunes: papel beige y grises cálidos, un color de acento, títulos en Outfit y detalles en monoespaciada.

- Variables principales: `--bg`, `--surface`, `--surface-2`, `--text`, `--text-strong`, `--muted`, `--border`, `--border-card`, `--border-strong`, `--accent`, `--accent-soft`, `--sobre-acento`, `--radius`, `--font-texto`, `--font-titulo`, `--font-mono`. Usa estas variables en el CSS propio para respetar el tema claro/oscuro y el acento que elija quien visita.
- `<body class="ancho">` da una columna de lectura de 760 px; sin la clase, 480 px (formularios angostos).
- Componentes listos: `.site-header` + `.brand` + `.ajustes`, `.back`, `form`, `.card`, `.pastilla`, `.etiqueta`, `.proyectos` + `.proyecto`.
- Cada página incluye `../js/tema.js` (sin `defer`, en el `<head>`) y `../js/darwin.js` (con `defer`). `tema.js` trae también el botón de inicio de sesión del sitio.

## Partes privadas

El repo es público: lo privado se publica cifrado con la llave de la sesión del sitio (detalles en el `CLAUDE.md` de la raíz, «Sesión y partes privadas»).

- Texto en claro en `.privado/{{ID}}/<nombre>.html` (nunca se sube); `npm run sesion -- sellar {{ID}}` genera `{{ID}}/<nombre>.enc`.
- En la página: `<div data-privado="<nombre>.enc" data-lineas="3"></div>`. Sin sesión se ve tachado; con sesión, el contenido.
- Requiere `SITIO_USUARIO` y `SITIO_CONTRASENA` en el entorno de Claude Code.

## Qué es

(Describe aquí el propósito, las páginas y las decisiones del proyecto.)

## Estructura

| Ruta | Qué es |
|---|---|
| `{{ID}}/index.html` | Página principal del proyecto |
