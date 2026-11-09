# CLAUDE.md

Sitio personal de **Wolfgang Reséndiz** (también «Resendiz»; GitHub Pages, se publica desde `main`): https://wolyf.github.io/web/

Preferencias del dueño: responder en español; no usar el guion largo (U+2014) en textos, interfaz ni mensajes; notación formal cuando aporte.

## Lo primero: el repositorio es PÚBLICO

- Todo lo que se sube se publica. Nada privado va al repo en claro: datos, contraseñas, llaves, contactos.
- Nunca pidas contraseñas ni llaves en el chat ni imprimas variables de entorno con credenciales. Si faltan, pide al usuario que las configure en el entorno de Claude Code.
- Cada proyecto puede tener reglas más estrictas en su `CLAUDE.md` (p. ej. el catálogo publica sus datos solo cifrados).

## Proyectos y zonas

El sitio se divide en **proyectos**, uno por carpeta, registrados en `proyectos.json`. Todo lo que no pertenece a un proyecto es la **zona general**.

| Zona | Carpetas | Instrucciones |
|---|---|---|
| `general` | `index.html`, `css/`, `js/`, `img/`, `herramientas/`, `.claude/`, `.github/`, `proyectos.json`, `package.json`, `README.md` | Este archivo |
| `calculadoras` | `calculadoras/` | `calculadoras/CLAUDE.md` |
| `catalogo` | `catalogo/`, `.catalogo/` (privada) | `catalogo/CLAUDE.md` |

Reglas:

- Cada entorno de Claude Code trabaja en una zona, indicada con la variable `WEB_PROYECTO` (`general` o el id de un proyecto). Al iniciar la sesión, un hook dice cuál es.
- **Solo se edita la zona propia.** El hook de `.claude/settings.json` bloquea `Edit`/`Write` fuera de ella. Con Bash tampoco se escribe fuera, aunque el hook no lo detecte. Si hace falta un cambio en otra zona, dile al usuario qué hace falta y desde qué entorno.
- Sin `WEB_PROYECTO` no hay restricción: úsalo solo para cambios que cruzan zonas a propósito (como una reorganización).
- Cada proyecto es autocontenido: su HTML, CSS, JS, herramientas y pruebas viven en su carpeta. Lo compartido (estilos base, portada) es de la zona general y los proyectos solo lo leen. Si un proyecto necesita otro aspecto, lo sobrescribe en su propio CSS.
- Un cambio en lo compartido afecta a todos los proyectos: antes de publicarlo, revisa que cada uno se siga viendo bien (`npm run capturas` cubre el catálogo).
- Un PR toca una sola zona. La revisión «Zonas» de GitHub (`.github/workflows/zonas.yml`) falla si mezcla zonas, o si la rama se llama `<zona>/…` y toca otra. Un cruce intencional lleva la etiqueta `varias-zonas`.

Comandos (`npm run proyectos -- …`):

```bash
npm run proyectos -- listar                      # proyectos y sus carpetas
npm run proyectos -- zona <ruta>                 # a qué zona pertenece una ruta
npm run proyectos -- revisar                     # zonas que toca la copia de trabajo frente a origin/main
npm run proyectos -- nuevo <id> --nombre "…"     # crea un proyecto (solo desde el entorno general)
npm run proyectos -- portada [--revisar]         # regenera (o revisa) la portada y sitemap.xml
```

### Agregar un proyecto (entorno general)

1. `npm run proyectos -- nuevo <id> --nombre "Nombre" [--corto "Nombre corto"] [--icono "🧪"] [--descripcion "…"]`: copia `herramientas/plantilla/` a `<id>/` (`CLAUDE.md` e `index.html`, ya con el diseño del sitio), lo registra en `proyectos.json` y agrega su tarjeta y su enlace a la portada.
2. Completa en `proyectos.json` la descripción, el icono y las etiquetas, y corre `npm run proyectos -- portada`.
3. Commit y PR con la etiqueta `varias-zonas`.
4. El usuario crea en Claude Code un entorno con `WEB_PROYECTO=<id>`. Desde ahí se desarrolla el proyecto y se completa su `CLAUDE.md`.

Para quitar o renombrar un proyecto, edita `proyectos.json`, corre `npm run proyectos -- portada` y mueve la carpeta (cambio de varias zonas).

### La portada sale de `proyectos.json`

En `index.html`, el menú lateral, las tarjetas de la sección «Proyectos» y el total están entre marcadores (`<!-- proyectos:menu -->`, `<!-- proyectos:tarjetas -->`, `<!-- proyectos:total -->`) y **no se editan a mano**: se generan con `npm run proyectos -- portada`. Una prueba (`npm test`, también en la revisión «Pruebas» de GitHub) falla si la portada no está al día.

Campos de cada proyecto en `proyectos.json` (en el orden en que aparecen en la portada):

| Campo | Uso |
|---|---|
| `nombre`, `carpetas` | Obligatorios. Título de la tarjeta y carpetas de la zona. |
| `corto` | Nombre en el menú lateral (si no, `nombre`). |
| `inicio` | Página a la que lleva la tarjeta (por defecto `<carpeta>/`). |
| `descripcion`, `anio`, `icono`, `etiquetas` | Texto, año, emoji y etiquetas de la tarjeta. |
| `privado` | Marca la tarjeta como privada (p. ej. requiere contraseña). |
| `codigo: false` | Quita el enlace «Código» a GitHub. |
| `oculto: true` | Deja el proyecto fuera de la portada (en construcción). |
| `notas: false` | Apaga los subrayados y notas en sus páginas (el catálogo, por sus datos privados). |

`sitio.nombre`, `sitio.url` y `sitio.repositorio` son los datos generales (la URL arma `sitemap.xml`; el repositorio, los enlaces «Código»).

## Buscadores (SEO)

Meta: que al buscar «Wolfgang Reséndiz» o «Wolfgang Resendiz» salga primero este sitio, por encima de LinkedIn y de la tesis.

- La portada trata de él: `<title>`, descripción, `<h1>` y la sección «Sobre mí» llevan su nombre completo (con y sin acento), profesión, UNAM y tesis. Darwin se queda, pero no en el título ni en la descripción.
- `index.html` tiene en el `<head>` `canonical`, Open Graph (imagen `img/vista-previa.png`, 1200 × 630), `rel="me"` y un JSON-LD (`ProfilePage` + `Person` + `Thesis`) con `sameAs` a LinkedIn, ResearchGate y GitHub, y a la tesis en el Repositorio UNAM y Ptolomeo. Si hay un perfil nuevo, agrégalo en los tres lugares (JSON-LD, `rel="me"` y «Sobre mí»).
- `sitemap.xml` se genera con `npm run proyectos -- portada` (portada y página de inicio de cada proyecto público); una prueba revisa que esté al día. `robots.txt` solo sirve en la raíz del dominio, así que no hay.
- Si el sitio cambia de dominio, cambia `sitio.url`, el `canonical`, `og:url`, `og:image` y los `@id`/`url` del JSON-LD, y regenera la imagen de vista previa.
- Cada página de proyecto debería enlazar a la portada con el nombre completo (eso se hace desde el entorno del proyecto).

## Estructura de la zona general

| Ruta | Qué es |
|---|---|
| `index.html` | Portada: barra lateral (en celular, barra superior), presentación con bitácora y retrato de Darwin, y tarjetas de proyectos (generadas). |
| `css/styles.css` | Estilos base del sitio: variables de tema y acento, tipografía, encabezado, formularios, portada y componentes de las calculadoras. |
| `js/tema.js` | Tema claro/oscuro y color de acento elegidos por quien visita (se guardan en `localStorage`). |
| `js/darwin.js` | Darwin, la gatita del sitio: aparece en cada página, responde a clics y lleva accesorios de temporada. |
| `js/notas.js` | Subrayados y notas de lectura en cualquier página (locales, se exportan en Markdown). Lo carga `js/darwin.js`. |
| `img/darwin.svg`, `img/darwin-cara.svg` | Retrato de Darwin y su cara (marca y favicon), sacados de su sprite de `js/darwin.js`. |
| `proyectos.json` | Registro de proyectos: carpetas (zonas) y datos de su tarjeta en la portada. |
| `herramientas/proyectos.mjs` | Zonas y portada: comandos de arriba, hook y revisión de GitHub. Pruebas en `herramientas/pruebas/`. |
| `herramientas/plantilla/` | Plantilla de proyecto nuevo (`{{ID}}`, `{{NOMBRE}}`), con el diseño del sitio. |
| `.claude/settings.json` | Hooks de zona (`SessionStart` y `PreToolUse`). |
| `.github/workflows/zonas.yml` | Revisión de zonas en cada PR. |
| `.github/workflows/pruebas.yml` | `npm test` en cada PR y en `main`. |

## Diseño

Inspirado gráficamente en un jardín digital: papel beige y grises cálidos, un solo color de acento, títulos en **Outfit**, texto en **Inter** y detalles (marca, fechas, etiquetas) en **Google Sans Code**. Las fuentes las importa `css/styles.css`, así que basta enlazarlo.

- **Tema**: sigue al sistema; `js/tema.js` permite fijarlo (`<html data-tema="claro|oscuro">`). El bloque oscuro de variables está dos veces en el CSS (sistema y elección manual): si cambias un color, cambia ambos.
- **Acento**: rosa por defecto; `data-acento="azul|verde|lavanda|ambar"`. Cada acento tiene versión clara y oscura (`--acento-claro`, `--acento-oscuro`); el resto del sitio usa `--accent`.
- **Variables** que deben usar los proyectos: `--bg`, `--surface`, `--surface-2`, `--text`, `--text-strong`, `--muted`, `--border`, `--border-card`, `--border-strong`, `--accent`, `--accent-soft`, `--sobre-acento`, `--radius`, `--font-texto`, `--font-titulo`, `--font-mono`.
- **Páginas de proyecto**: `.site-header` con `.brand` (la cara de Darwin se agrega sola con CSS) y `.ajustes` (botones de tema y acento); columna de 480 px o, con `<body class="ancho">`, de 760 px.
- **Componentes**: `.card`, `.back`, `form`, `.pastilla`, `.etiqueta`, `.proyectos` + `.proyecto`, `.bitacora`.
- La gráfica de las calculadoras se queda siempre en tema claro (es técnica).

## Código del sitio

- HTML, CSS y JavaScript sin dependencias ni build; comentarios en español. Librerías externas solo por CDN con versión fija.
- Rutas relativas (el sitio vive en `/web/`): desde un proyecto, lo común se enlaza con `../`.
- Pruebas: `npm test` corre `herramientas/pruebas/` y las de cada proyecto (`*/herramientas/pruebas/`).

## Darwin, la gatita del sitio

`js/darwin.js` dibuja a Darwin (pixel art) en la orilla inferior de cada página. Es autocontenido: inyecta su propio estilo, no usa librerías y solo su cuerpo recibe clics.

- **Cada página HTML del sitio la incluye** con una línea en el `<head>`: `<script src="../js/darwin.js" defer></script>` (desde la raíz, `js/darwin.js`). La plantilla de proyectos ya la trae, junto con `js/tema.js`.
- Si debajo de ella hay una barra fija pegada a la orilla (como la de unidades de las calculadoras), se para encima para no tapar sus controles.
- Comportamiento: se sienta, pasea, se duerme tras 75 s sin actividad; al hacer clic en la página voltea o camina hacia ahí; al acariciarla ronronea y saluda (cada 5 caricias salta); se puede arrastrar. Recuerda su lugar entre páginas de la misma sesión.
- Accesorios por fecha en `TEMPORADAS` (Reyes, invierno, San Valentín, primavera, verano, fiestas patrias, otoño, Halloween, Día de Muertos, Navidad). Para verlos: `?darwin=<id>` (p. ej. `?darwin=navidad`).
- `?darwin=no` la oculta en ese navegador; `?darwin=si` la regresa. Respeta `prefers-reduced-motion` (no camina) y no se imprime.
- Rendimiento: repinta un canvas pequeño solo al cambiar de cuadro, usa `requestAnimationFrame` solo mientras se mueve y se detiene con la pestaña oculta.
- Pruebas en `herramientas/pruebas/darwin.test.mjs` (temporadas, sprites y que los accesorios quepan).

## Subrayados y notas de lectura

`js/notas.js` deja subrayar y anotar texto en cualquier página del sitio. Todo se guarda en `localStorage` del navegador de quien lee (clave `web-notas`); nada sale de ahí hasta que se exporta.

- **Carga**: no se agrega a cada página; `js/darwin.js` (que ya está en todas) lo inserta. Se apaga en una página con `<meta name="notas" content="no">` y en un proyecto con `"notas": false` en `proyectos.json` (así está el catálogo).
- **Uso**: al seleccionar texto aparece una barrita (cuatro colores y «Nota»); un clic en un subrayado abre su nota, color y «Borrar». El botón del lápiz (en `.ajustes`, o flotante en páginas sin encabezado del sitio) abre el panel: lista de la página, exportar, respaldo e importar, y borrar.
- **Anclaje** (al estilo de W3C Web Annotation): posición en el texto de `<main>` (o `<body>`) más la cita exacta con 40 caracteres de contexto antes y después. Si la página cambia, se busca la cita y se desempata por contexto; si ya no está, la marca se conserva y el panel la señala. Se pinta con `::highlight` (API de resaltado de CSS), sin tocar el DOM, y se vuelve a anclar si la página cambia su texto.
- **Exportar**: alcance «Esta página», «Este proyecto» o «Todo el sitio». «Copiar para Claude» y «Descargar .md» dan Markdown agrupado por zona y archivo; «Respaldo .json» sirve para importar en otro navegador (une por id y gana la edición más reciente).
- Pruebas en `herramientas/pruebas/notas.test.mjs` (anclaje, rutas, zonas, Markdown, respaldo).

### Integrar notas exportadas

Cuando el usuario pegue o adjunte una exportación (`# Notas de lectura …`, formato `notas-web v1`):

1. Cada `## Zona` se integra desde el entorno de esa zona (regla de zonas). Integra solo la tuya y di qué entorno hace falta para las demás.
2. Cada `### \`ruta\`` es el archivo del repositorio. Ubica la marca buscando la cita (`> …`); si se repite, usa el contexto («…antes **cita** después…»), la sección y el ancla (`#id` del elemento anterior).
3. La nota dice qué quiere el usuario (corregir, ampliar, comentar, pendiente); si no queda claro qué hacer con un subrayado sin nota, pregunta.
4. Recuerda que el repositorio es público: no subas notas con datos privados.

