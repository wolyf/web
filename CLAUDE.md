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
- **Interfaz**: `js/tema.js` importa `js/sesion.mjs` en todas las páginas, que pone un botón con punto de estado (○ sin sesión, ● con sesión) al principio de cada `.ajustes`, o con texto en un `[data-sesion-lugar]` (la portada en escritorio, esquina superior derecha). La llave se guarda como `CryptoKey` HKDF **no extraíble** en IndexedDB: la sesión dura la pestaña y «Recordarme» (apagado por defecto) la guarda en este navegador. Solo queda una marca sin secretos en el almacenamiento web. No se ofrece el inicio de sesión dentro de un `iframe`. Marca `<html data-sesion="activa|inactiva">`.
- **En las páginas** (cualquier proyecto, sin JavaScript propio):
  - `<div data-privado="notas.enc" data-lineas="4"></div>`: sin sesión se ve tachado con un botón para entrar; con sesión se descifra e inserta (evento `wr:privado`; los `<script>` del fragmento no corren).
  - `data-solo-sesion` / `data-sin-sesion`: mostrar u ocultar según la sesión. Solo cosmético.
- **Desde JavaScript**: `import { sesion } from "../js/sesion.mjs"` (o `window.WRSesion`, evento `wr:sesion`): `activa()`, `usuario()`, `llaveProyecto(id)`, `descifrar(bytes)`, `alCambiar(fn)`, `abrir()`, `cerrar()`, `llave()` (la `CryptoKey` HKDF no extraíble, para módulos del sitio). Con sesión, al pintar el panel emite `wr:panel-sesion` (`detail.panel`) para que otros módulos agreguen botones.
- **Texto en claro** en `.privado/` (en `.gitignore`), con la misma ruta que el `.enc`: `.privado/calculadoras/notas.html` → `calculadoras/notas.enc`. Cada entorno sella solo su carpeta: `npm run sesion -- sellar <carpeta>`; `abrir <carpeta>` recupera el texto.
- **Credenciales**: `SITIO_USUARIO` y `SITIO_CONTRASENA` (y `SITIO_NUEVA_CONTRASENA` para `agregar`/`contrasena`) como variables del entorno de Claude Code; en una terminal se preguntan sin mostrarse. Nunca en el chat ni impresas.
### Subrayados

Con la sesión iniciada se puede subrayar texto en **cualquier página de cualquier proyecto** (actual o futuro) sin JavaScript propio: `js/tema.js` carga `js/subrayados.mjs`, igual que la sesión. Por eso **toda página HTML debe cargar `js/tema.js`** (sin `defer`, en el `<head>`; una prueba lo exige y las plantillas ya lo traen).

- **Comportamiento**: sin sesión no hay subrayados ni menú. Con sesión, al seleccionar texto sale un menú pequeño (colores, nota opcional); al tocar un subrayado se cambia color, se edita la nota o se borra. Se pintan con la CSS Custom Highlight API (`CSS.highlights`, grupos `wr-sub-<color>` y `wr-sub-nota`) **sin modificar el DOM**. Sin esa API (navegadores viejos) el módulo no hace nada.
- **Interruptor**: un botón en cada `.ajustes`, junto al de sesión (los libros 2 a 55 de `manuales-conagua` no cargan `styles.css`: su barra superior lleva un `.ajustes` con sesión, subrayados y Darwin, y `css/ajustes-aislado.css`; si alguna página futura no tiene `.ajustes`, el módulo pone un botón flotante). Apagado no pinta ni muestra el menú, pero los datos **no** se borran ni dejan de sincronizarse. Preferencia en `localStorage` (`subrayados-activos`: `1` o `0`; por defecto `1` con sesión), marca `<html data-subrayados="activos|apagados">` y evento `wr:subrayados` en `document` (`detail`: `activos`, `estado`, `huerfanos`, `total`). API: `window.WRSubrayados` (`activos()`, `establecer(bool)`, `alternar()`, `items()`, `estado()`, `alCambiar(fn)`).
- **Exclusiones** (`SELECTOR_EXCLUIDO` en `js/subrayados-nucleo.mjs`): `.ajustes`, `.site-header`, formularios, `input`, `textarea`, `[contenteditable]`, `[data-no-subrayar]`, además de `button`, `nav`, `svg`, `canvas`, `script`, `style` y `.katex-mathml` (texto duplicado de las fórmulas). El contenido descifrado de `data-privado` sí se subraya (se repinta al recibir `wr:privado`).
- **Datos**: `subrayados.enc` en la rama `subrayados` (no en `main`, para no disparar Pages ni ensuciar el historial). Formato: `"WRF1" ‖ iv ‖ AES-256-GCM(HKDF(K, "wr-subrayados"), gzip(JSON))`, con $\{v: 1, \text{items}: [\{id, p, e, pre, suf, c, n, t, b\}]\}$: `p` ruta de la página relativa a la base del sitio (sin `index.html`, hash ni query), `e` texto exacto, `pre` y `suf` hasta 32 caracteres de contexto, `c` color, `n` nota, `t` marca de tiempo en ms y `b` verdadero si es lápida.
- **Anclaje**: por cita de texto sobre el texto visible normalizado (espacios colapsados). Con varias coincidencias se desempata con `pre` y `suf`. Si la cita exacta ya no existe (una errata corregida, una cifra que cambió) se busca de forma **aproximada** (distancia de edición de Sellers, a lo más el 25 % de $|e|$, solo para citas de 12 caracteres o más, cerca del contexto o de los extremos de la cita); con la página asentada, el texto nuevo reemplaza a `e`, `pre` y `suf`. Lo exacto manda, y lo exacto ambiguo no se adivina. Si nada ancla, el subrayado queda **huérfano**: no se pierde y se lista en un panel pequeño, donde se puede **reubicar** (se selecciona el texto nuevo; conserva color y nota) o borrar. Se repinta con `MutationObserver` (con debounce) porque KaTeX y los fragmentos descifrados cambian el DOM.
- **Mis subrayados**: botón en el panel de sesión (el módulo escucha `wr:panel-sesion`, que `sesion.mjs` emite al pintarlo). Lista y busca (sin acentos ni mayúsculas) los subrayados y notas de **todo el sitio**, agrupados por página, con enlace de fragmento de texto (`#:~:text=`) y borrar. También `WRSubrayados.abrirLista()` y `todos()`.
- **Mezcla**: unión por `id`; gana el mayor $t$ (con $t$ igual, el contenido mayor, para que sea conmutativa, asociativa e idempotente). Borrar crea lápida (`b: true`). Las lápidas con más de 90 días se podan al sincronizar; un equipo cuya última sincronización fue hace más de 60 días descarta lo que conocía entonces y el remoto ya no tiene (lo creado después se conserva), para que nada podado resucite.
- **Sincronización** (API de GitHub, **no** `raw.githubusercontent.com` por su caché): `GET /repos/wolyf/web/contents/subrayados.enc?ref=subrayados` solo para el `sha`, `GET /git/blobs/<sha>` para los bytes y `PUT` con el `sha` previo; ante 409 o 422 se relee, se mezcla y se reintenta. El `content` de la API de contenidos **no** se usa: trata los binarios como texto y puede transcodificarlos (ocurrió con este archivo), mientras que la de blobs devuelve los bytes exactos. Escritura con debounce (~2 s) y directa con el `sha` conocido (si hay 409 o 422 se relee); la consulta sin cambios es condicional (`If-None-Match`, un 304 casi no pesa ni cuenta contra el límite). Con varias pestañas solo la **líder** (Web Lock exclusivo, `js/subrayados-coord.mjs`) consulta, cada ~60 s y solo si alguna pestaña está visible; los cambios viajan entre pestañas por `BroadcastChannel` y cada pestaña escribe los suyos. Se relee al volver a la pestaña (`visibilitychange`) y al volver la red. Caché y cola de pendientes en IndexedDB, **cifradas** con la llave del sitio (sin sesión son ilegibles). Estados visibles: sincronizado, sincronizando, sin conexión, error (punto del botón y pastilla).
- **Token**: token de GitHub de grano fino, limitado a `wolyf/web`, permiso *Contents: read and write*. Lo crea el dueño y lo configura como `SITIO_TOKEN_GITHUB` en el entorno de Claude Code (nunca en el chat ni impreso). `npm run sesion -- token` lo cifra con $\mathrm{AES\text{-}GCM}_{\mathrm{HKDF}(K,\,\text{"wr-token"})}$ y lo guarda en `datos/acceso.json` (campo `token`, retrocompatible); al iniciar sesión se abre solo en memoria. Quien inicia sesión puede leer el token, igual que ya lee todo lo privado. `npm run sesion -- rama` crea la rama `subrayados` (sin historial, con un `subrayados.enc` inicial cifrado) si no existe. **Recomendado**: una regla (Ruleset) en GitHub sobre `main` que exija pull request, para que el token solo pueda escribir en `subrayados`. Si cambia $K$, hay que volver a correr `token` y recifrar `subrayados.enc`. Si se mueve o renombra una página, `npm run sesion -- rutas <vieja> <nueva>` cambia la ruta de sus subrayados (para una carpeta, ambas terminan en `/`).
- Pruebas: `herramientas/pruebas/subrayados.test.mjs` (formato cifrado, mezcla, anclaje exacto y aproximado, poda, interruptor, exclusiones, sincronización con una API simulada, ETag, escritura directa, varias pestañas, rama, rutas) y, en `proyectos.test.mjs`, que toda página cargue `tema.js` y lleve la CSP.

- Quitar un usuario no revoca lo que ya descifró: para eso habría que cambiar $K$ y volver a sellar todo.
- Una prueba revisa que cada `data-privado` apunte a un `.enc` existente y que `.privado/` esté ignorado.

## Estructura de la zona general

| Ruta | Qué es |
|---|---|
| `index.html` | Portada: barra lateral (en celular, barra superior), presentación con bitácora y retrato de Darwin, y tarjetas de proyectos (generadas). |
| `css/styles.css` | Reúne con `@import` las partes: `fuentes.css`, `base.css` (variables, tipografía, encabezado), `ajustes.css` (botones de `.ajustes` y panel de sesión; `ajustes-aislado.css` lo da a páginas sin `styles.css`), `componentes.css`, `portada.css` y `calculadoras.css`. Los proyectos solo enlazan `styles.css`. |
| `css/fuentes/`, `js/vendor/katex/` | Fuentes y KaTeX copiados al repo (ver «Endurecimiento del sitio»). |
| `js/tema.js` | Tema claro/oscuro y color de acento elegidos por quien visita (se guardan en `localStorage`), botón para quitar a Darwin. También carga la sesión y los subrayados. |
| `js/sesion.mjs`, `js/llaves.mjs` | Sesión del sitio: botón de inicio de sesión y partes privadas (ver «Sesión y partes privadas»). |
| `js/subrayados.mjs`, `js/subrayados-nucleo.mjs`, `js/subrayados-sync.mjs`, `js/subrayados-coord.mjs` | Subrayados sincronizados en todas las páginas (ver «Subrayados»): interfaz y pintado, lógica pura (mezcla, anclaje, formato), sincronización con GitHub y coordinación entre pestañas. |
| `datos/acceso.json` | Público: la llave del sitio envuelta con la contraseña de cada usuario y, cifrado, el token de sincronización de subrayados (campo `token`). |
| `herramientas/sesion.mjs` | Usuarios, fragmentos cifrados, token y rama de subrayados (`npm run sesion -- ayuda`). |
| `js/darwin.js` | Darwin, la gatita del sitio: aparece en cada página, responde a clics y lleva accesorios de temporada. |
| `img/darwin.svg`, `img/darwin-cara.svg` | Retrato de Darwin y su cara (marca y favicon), sacados de su sprite de `js/darwin.js`. |
| `proyectos.json` | Registro de proyectos: carpetas (zonas) y datos de su tarjeta en la portada. |
| `herramientas/proyectos.mjs` | Zonas y portada: comandos de arriba, hook y revisión de GitHub. Pruebas en `herramientas/pruebas/`. |
| `herramientas/plantilla/`, `herramientas/plantilla-notas/` | Plantillas de proyecto nuevo (`{{ID}}`, `{{NOMBRE}}`): la general y la de notas de estudio (`nuevo <id> --tipo notas`). |
| `.claude/settings.json` | Hooks de zona (`SessionStart` y `PreToolUse`). |
| `.github/workflows/zonas.yml` | Revisión de zonas en cada PR. |
| `.github/workflows/pruebas.yml` | `npm test` en cada PR y en `main`. |

## Endurecimiento del sitio

- **Política de contenido** (`<meta http-equiv="Content-Security-Policy">`, GitHub Pages no permite cabeceras): cada página la lleva al principio del `<head>`; solo recursos del propio sitio (`script-src 'self'`, sin scripts en línea; estilos en línea permitidos; imágenes `self` y `data:`). La única excepción es `connect-src 'self' https://api.github.com`, para sincronizar los subrayados; una prueba exige esa política exacta en todas las páginas (también las plantillas) y que no haya otros hosts. Para añadir un recurso externo hay que copiarlo al repo, no abrir un host en la política.
- **Sin terceros al cargar**: KaTeX 0.16.11 está en `js/vendor/katex/` (ver su `LEEME.md`) y las fuentes (Inter, Outfit, Google Sans Code) en `css/fuentes/` con `css/fuentes.css`. No uses CDN ni Google Fonts.
- Las acciones de GitHub (`.github/workflows/`) se fijan por SHA de commit, con la versión en un comentario.
- `.claude/settings.json` no preautoriza herramientas externas.

## Diseño

Inspirado gráficamente en un jardín digital: papel beige y grises cálidos, un solo color de acento, títulos en **Outfit**, texto en **Inter** y detalles (marca, fechas, etiquetas) en **Google Sans Code**. Las fuentes las trae `css/fuentes.css` (autoalojadas) a través de `css/styles.css`, así que basta enlazarlo.

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
