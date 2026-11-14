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
| `manuales-conagua` | `manuales-conagua/` | `manuales-conagua/CLAUDE.md` |

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

### Reglas que heredan todos los proyectos

Cada `CLAUDE.md` de proyecto las repite, pero valen siempre:

- Responder en español y no usar el guion largo (U+2014) en textos, interfaz, comentarios ni mensajes (el cuerpo transcrito de los libros de `manuales-conagua` es la única excepción, por fidelidad al original). Notación formal cuando aporte.
- El repositorio es **público**: nada privado en claro, nunca contraseñas ni llaves en el chat. Lo privado se publica cifrado con la sesión del sitio (ver «Sesión y partes privadas»).
- Solo HTML, CSS y JavaScript sin build ni gestor de paquetes; librerías externas solo si se copian al repo (`js/vendor/`) o con versión fija.
- Un cambio, una zona; `npm test` en verde antes de cada commit.

### Agregar un proyecto (entorno general)

1. `npm run proyectos -- nuevo <id> --nombre "Nombre" [--corto "Nombre corto"] [--icono "🧪"] [--descripcion "…"]`: copia `herramientas/plantilla/` a `<id>/` (`CLAUDE.md` e `index.html`, ya con el diseño del sitio), lo registra en `proyectos.json` y agrega su tarjeta y su enlace a la portada.
2. Completa en `proyectos.json` la descripción, el icono, el `area`, el `tipo` y las etiquetas, y corre `npm run proyectos -- portada`.
3. Commit y PR con la etiqueta `varias-zonas`.
4. El usuario crea en Claude Code un entorno con `WEB_PROYECTO=<id>`. Desde ahí se desarrolla el proyecto y se completa su `CLAUDE.md`.

Para quitar o renombrar un proyecto, edita `proyectos.json`, corre `npm run proyectos -- portada` y mueve la carpeta (cambio de varias zonas).

### La portada sale de `proyectos.json`

La portada va en este orden: nombre y una línea de identidad, Proyectos (por áreas), Sobre mí, Bitácora y el pie, donde se menciona a Darwin. En `index.html`, el menú lateral, las tarjetas de la sección «Proyectos» y el total están entre marcadores (`<!-- proyectos:menu -->`, `<!-- proyectos:tarjetas -->`, `<!-- proyectos:total -->`) y **no se editan a mano**: se generan con `npm run proyectos -- portada`. Una prueba (`npm test`, también en la revisión «Pruebas» de GitHub) falla si la portada no está al día.

Campos de cada proyecto en `proyectos.json` (en el orden en que aparecen en la portada):

| Campo | Uso |
|---|---|
| `nombre`, `carpetas` | Obligatorios. Título de la tarjeta y carpetas de la zona. |
| `area`, `tipo` | Área de la portada (`areas`) y tipo de proyecto (`tipos`). Una prueba falla si usan un valor no declarado. |
| `corto` | Nombre en el menú lateral (si no, `nombre`). |
| `inicio` | Página a la que lleva la tarjeta (por defecto `<carpeta>/`). |
| `descripcion`, `anio`, `icono`, `etiquetas` | Texto, año, emoji y etiquetas de la tarjeta. |
| `privado` | Marca la tarjeta como privada (p. ej. requiere contraseña). |
| `codigo: false` | Quita el enlace «Código» a GitHub. |
| `oculto: true` | Deja el proyecto fuera de la portada (en construcción). |

`areas` (id → `nombre`, `orden`) y `tipos` (lista) se declaran al principio de `proyectos.json`: la portada agrupa menú y tarjetas por área, en su orden. Hoy hay `ingenieria`, `filosofia` y `herramientas`, y los tipos son `herramienta`, `notas`, `biblioteca` y `app`; agregar uno nuevo (por ejemplo para tarjetas de estudio) es solo declararlo ahí.

`sitio.nombre`, `sitio.url` y `sitio.repositorio` son los datos generales (la URL arma `sitemap.xml`; el repositorio, los enlaces «Código»).

## Buscadores (SEO)

Meta: que al buscar «Wolfgang Reséndiz» o «Wolfgang Resendiz» salga primero este sitio, por encima de LinkedIn y de la tesis.

- La portada trata de él: `<title>`, descripción, `<h1>` y la sección «Sobre mí» llevan su nombre completo (con y sin acento), profesión, UNAM y tesis. Darwin se queda, pero no en el título ni en la descripción.
- `index.html` tiene en el `<head>` `canonical`, Open Graph (imagen `img/vista-previa.png`, 1200 × 630), `rel="me"` y un JSON-LD (`ProfilePage` + `Person` + `Thesis`) con `sameAs` a LinkedIn, ResearchGate y GitHub, y a la tesis en el Repositorio UNAM y Ptolomeo. Si hay un perfil nuevo, agrégalo en los tres lugares (JSON-LD, `rel="me"` y «Sobre mí»).
- `sitemap.xml` se genera con `npm run proyectos -- portada` (portada y página de inicio de cada proyecto público); una prueba revisa que esté al día. `robots.txt` solo sirve en la raíz del dominio, así que no hay.
- Si el sitio cambia de dominio, cambia `sitio.url`, el `canonical`, `og:url`, `og:image` y los `@id`/`url` del JSON-LD, y regenera la imagen de vista previa.
- Cada página de proyecto debería enlazar a la portada con el nombre completo (eso se hace desde el entorno del proyecto).

## Sesión y partes privadas

El sitio es estático y el repositorio público: no hay servidor que revise contraseñas. «Iniciar sesión» es obtener la **llave del sitio** $K$ (32 bytes) y lo privado se publica **cifrado** con ella. Ocultar con CSS o JavaScript no protege nada: todo lo que esté en claro en el repo es público.

- $\mathrm{KEK}_u = \mathrm{PBKDF2\text{-}SHA256}(\text{contraseña}_u, \text{sal}_u, 600\,000)$; `datos/acceso.json` guarda $\mathrm{AES\text{-}GCM}_{\mathrm{KEK}_u}(K)$ por usuario (con el nombre solo como resumen SHA-256) y una huella de $K$.
- Fragmentos: `"WRF1" ‖ iv ‖ AES-256-GCM(HKDF(K, "wr-fragmentos"), gzip(html))`. Llave propia de un proyecto: $K_p = \mathrm{HKDF}(K, \texttt{"wr-proyecto:"} \| id)$.
- **Interfaz**: `js/tema.js` importa `js/sesion.mjs` en todas las páginas, que pone un botón con punto de estado (○ sin sesión, ● con sesión) al principio de cada `.ajustes`, o con texto en un `[data-sesion-lugar]` (la portada en escritorio, esquina superior derecha). La sesión dura la pestaña; «Recordarme» la guarda en `localStorage`. Marca `<html data-sesion="activa|inactiva">`.
- **En las páginas** (cualquier proyecto, sin JavaScript propio):
  - `<div data-privado="notas.enc" data-lineas="4"></div>`: sin sesión se ve tachado con un botón para entrar; con sesión se descifra e inserta (evento `wr:privado`; los `<script>` del fragmento no corren).
  - `data-solo-sesion` / `data-sin-sesion`: mostrar u ocultar según la sesión. Solo cosmético.
- **Desde JavaScript**: `import { sesion } from "../js/sesion.mjs"` (o `window.WRSesion`, evento `wr:sesion`): `activa()`, `usuario()`, `llaveProyecto(id)`, `descifrar(bytes)`, `alCambiar(fn)`, `abrir()`, `cerrar()`.
- **Texto en claro** en `.privado/` (en `.gitignore`), con la misma ruta que el `.enc`: `.privado/calculadoras/notas.html` → `calculadoras/notas.enc`. Cada entorno sella solo su carpeta: `npm run sesion -- sellar <carpeta>`; `abrir <carpeta>` recupera el texto.
- **Credenciales**: `SITIO_USUARIO` y `SITIO_CONTRASENA` (y `SITIO_NUEVA_CONTRASENA` para `agregar`/`contrasena`) como variables del entorno de Claude Code; en una terminal se preguntan sin mostrarse. Nunca en el chat ni impresas.
- Quitar un usuario no revoca lo que ya descifró: para eso habría que cambiar $K$ y volver a sellar todo.
- Una prueba revisa que cada `data-privado` apunte a un `.enc` existente y que `.privado/` esté ignorado.

## Estructura de la zona general

| Ruta | Qué es |
|---|---|
| `index.html` | Portada: barra lateral (en celular, barra superior), presentación con bitácora y retrato de Darwin, y tarjetas de proyectos (generadas). |
| `css/styles.css` | Estilos base del sitio: variables de tema y acento, tipografía, encabezado, formularios, portada y componentes de las calculadoras. |
| `js/tema.js` | Tema claro/oscuro y color de acento elegidos por quien visita (se guardan en `localStorage`), botón para quitar a Darwin. También carga la sesión. |
| `js/sesion.mjs`, `js/llaves.mjs` | Sesión del sitio: botón de inicio de sesión y partes privadas (ver «Sesión y partes privadas»). |
| `datos/acceso.json` | Público: la llave del sitio envuelta con la contraseña de cada usuario. |
| `herramientas/sesion.mjs` | Usuarios y fragmentos cifrados (`npm run sesion -- ayuda`). |
| `js/darwin.js` | Darwin, la gatita del sitio: aparece en cada página, responde a clics y lleva accesorios de temporada. |
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
- **Componentes**: `.card`, `.back`, `form`, `.pastilla`, `.etiqueta`, `.proyectos` + `.proyecto`, `.bitacora`, `.censura` (partes privadas).
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
- Se quita o se pone con el botón del gato que `js/tema.js` agrega a cada `.ajustes` (clave `darwin-oculta` de `localStorage`: `1` oculta, `0` muestra). Sin preferencia, solo aparece en pantallas anchas y sin `prefers-reduced-motion`. `?darwin=no` la oculta y `?darwin=si` la muestra siempre. Respeta `prefers-reduced-motion` (no camina) y no se imprime.
- Rendimiento: repinta un canvas pequeño solo al cambiar de cuadro, usa `requestAnimationFrame` solo mientras se mueve y se detiene con la pestaña oculta.
- Pruebas en `herramientas/pruebas/darwin.test.mjs` (temporadas, sprites y que los accesorios quepan).
