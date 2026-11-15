# Espacio de estudio

Proyecto `estudio` del sitio de Wolfgang Reséndiz. Entorno de Claude Code: `WEB_PROYECTO=estudio`.

## Reglas heredadas del sitio

Español; sin guion largo (U+2014) en textos, interfaz, comentarios ni mensajes; repositorio **público** (nada privado en claro, nunca contraseñas en el chat); solo HTML, CSS y JavaScript sin build; ecuaciones en LaTeX con KaTeX (`data-latex`, copia local en `../js/vendor/katex/`, renderizado automático desde `../js/tema.js`); `npm test` en verde. Detalle en el `CLAUDE.md` de la raíz, «Reglas que heredan todos los proyectos».

## Zona

- Este proyecto solo edita `estudio/`. Todo lo demás se puede leer, pero no se modifica desde aquí.
- Lo común (`../css/styles.css`, `../js/tema.js`, `../js/darwin.js`, `../img/`, el `index.html` de la raíz, `herramientas/`, `proyectos.json`) es de la zona general. Si algo de ahí no sirve, se sobrescribe en el CSS propio (`estudio/css/`) o se le pide el cambio al entorno general.
- Rutas relativas: los recursos propios van en `estudio/css/`, `estudio/js/`, etc.; los comunes con `../`.
- La tarjeta del proyecto en la portada (descripción, icono, etiquetas, página de inicio) sale de `proyectos.json`: si cambia, pídele al entorno general que la actualice. Mientras se construye está `oculto` y `privado`.

## Diseño

Usa los estilos comunes: papel beige y grises cálidos, un color de acento, títulos en Outfit y detalles en monoespaciada. Solo variables del sitio (`--bg`, `--surface`, `--surface-2`, `--text`, `--text-strong`, `--muted`, `--border`, `--border-card`, `--border-strong`, `--accent`, `--accent-soft`, `--sobre-acento`, `--radius`, `--font-texto`, `--font-titulo`, `--font-mono`), para respetar el tema claro u oscuro y el acento de quien visita. Cada página incluye `../js/tema.js` (sin `defer`, en el `<head>`) y `../js/darwin.js` (con `defer`).

## Qué es

Un lugar para organizar lecturas y apuntes de lo que se estudia: filosofía, matemáticas, economía y lo que venga. Surgió del paquete offline de **Historia de la Filosofía II**, que fue la primera materia migrada.

**Jerarquía:** área de estudio (Filosofía, Matemáticas, Economía) → materia (Historia 2, …) → ruta de lecturas y fuentes. Una materia sin curso (por ejemplo, algo que se aprende por cuenta propia) es una materia con su ruta como lista de lecturas libre.

**Tres conceptos separados** (en el paquete original estaban mezclados):

| Concepto | Qué es | Dónde vive |
|---|---|---|
| **Fuente** | Un texto, con su identificador (`platon-dialogos-4`) | `fuentes` de la materia; su texto va cifrado |
| **Entrada de ruta** | Un ítem del curso: apunta a una fuente (y a un ancla), con rol `principal` o `apoyo` | `ruta` de la materia |
| **Apunte** | Escritura propia sobre una lectura | `apuntes` de la materia (aún no hay; ver «Apuntes») |

Varias entradas pueden apuntar a la misma fuente: la fuente `platon-dialogos-4` reúne Banquete, Fedro y República VII, cada uno con su estado y su ancla. Ojo con el nombre: es solo un identificador (de él depende la ruta de los subrayados, así que no se cambia); Banquete y Fedro salen del PDF de Diálogos III y solo República VII, de Diálogos IV.

**Estado de lectura** (por entrada): `pendiente`, `leyendo`, `leida`, `apuntada`, con nota opcional. Es **privado**: se guarda cifrado en la rama `estudio` y solo se ve con sesión. El tablero muestra estadísticas (por estado, progreso general y por materia) y «Sigue con» (lo que se está leyendo y la primera pendiente de cada materia).

## Qué es público y qué va cifrado

El repositorio es público:

- **Público:** la estructura (`datos/`: áreas, materias, rutas, datos bibliográficos), el código y las páginas.
- **Cifrado** con la llave del sitio $K$: el **texto de las lecturas** (`<materia>/<fuente>.enc`; son ediciones con derechos de autor) y el **estado de lectura** (rama `estudio`).
- Texto de trabajo en claro: `.privado/estudio/<materia>/<fuente>.html` (ignorado por git). `npm run sesion -- sellar estudio` genera los `.enc`. Requiere `SITIO_USUARIO` y `SITIO_CONTRASENA` en el entorno de Claude Code (nunca en el chat).
- Una prueba comprueba que cada `.enc` publicado es un fragmento cifrado, sin texto en claro, y que `.privado/` sigue ignorado.
- **Guion largo (U+2014) en el cuerpo de las lecturas: pendiente de decisión del dueño.** La regla del sitio solo exceptúa el cuerpo transcrito de `manuales-conagua`. Los textos cifrados de aquí conservan el guion largo tal como vienen de la transcripción (y algún encabezado puesto por el conversor), porque no se ha pedido cambiarlos. Mientras no se decida, no se publica en claro nada con él: la interfaz, el CSS, los datos y los comentarios del proyecto no lo usan, y una prueba lo comprueba en todos los archivos de `estudio/` (los `.enc` no se leen).

## Agregar una materia

1. `datos/materias/<id>.json` (copia la forma de `historia-2.json`): `nombre`, `corto`, `area`, `descripcion`, `secciones`, `fuentes`, `ruta`, `apuntes`. Una fuente con `"texto": true` debe tener su `.enc`; con `false` queda como «Texto pendiente».
2. Registra el id en `datos/estudio.json` (`materias`). Si es un área nueva, decláralo también en `areas`.
3. Por cada fuente con texto: `node estudio/herramientas/importar.mjs <archivo.html> <materia> <fuente>` (deja el fragmento normalizado en `.privado/estudio/...`) y `npm run sesion -- sellar estudio`.
4. `node estudio/herramientas/estudio.mjs paginas` genera `index.html`, `materia.html` y la página de cada lectura.
5. `npm test` valida los manifiestos (ids únicos, fuentes y secciones declaradas, roles) y que cada fuente tenga o no su `.enc` según `texto`.

**Una página por fuente, no una sola con `?fuente=`:** los subrayados del sitio se guardan por ruta de página (sin query ni hash), así que cada texto necesita su propio HTML. Por eso se generan.

## Importar una lectura

`importar.mjs` convierte un HTML suelto (con su propio `<style>`, banners de paquete offline, barra «Escuchar» y scripts) en un fragmento:

- quita `<head>`, scripts, manejadores `on…`, banners y enlaces al índice viejo;
- `<main>` pasa a `<div class="lt-main">` (el fragmento va dentro del `<main>` de la página);
- cada selector del CSS original se prefija con `.lt--<fuente>`; `html`, `body` y `:root` pasan a ser el contenedor, sin fuente, color, fondo ni márgenes (los pone `css/lectura.css`);
- los colores pasan a variables del sitio: fondos claros a `--surface` o `--surface-2`, textos oscuros a `--text` o `--muted`, tonos a `color-mix(…, var(--text-strong))`, bordes a `--border`; un fondo oscuro del original se respeta. Las variables propias de la lectura se renombran a `--lt-…` para no pisar las del sitio;
- el cuerpo no se toca.

Las 10 lecturas de Historia 2 se revisaron en tema claro, tema oscuro y celular. Si una lectura nueva se ve mal en oscuro, se ajusta su CSS en el fragmento de `.privado/` y se vuelve a sellar.

## Estado de lectura y sincronización

- Registros `{id, e, n?, t}` con `id = "<materia>/<entrada>"`. Mezcla por `id`: gana el mayor `t` (con `t` igual, el contenido mayor): conmutativa, asociativa e idempotente (probado como propiedad). Sin lápidas: volver a «pendiente» es un estado más. Un cambio siempre gana al previo, aunque el reloj esté atrasado.
- Formato: `"WRF1" ‖ iv ‖ AES-256-GCM(HKDF(K, "wr-estudio-estado"), gzip(JSON))`, con $\{v: 1, \text{items}\}$. Otro uso de la llave (fragmentos, subrayados, Anki) no lo abre.
- Archivo `estado.enc` en la rama `estudio` (sin historial, no dispara Pages), por la API de GitHub con el cliente de los subrayados (`sha` por contenidos, bytes exactos por `git/blobs`, `If-None-Match`, 409 y 422 se relee y mezcla). Escritura 2 s después del último cambio (máximo 10 s), al ocultar o cerrar la pestaña; lectura cada 60 s con la pestaña visible, al volver a ella y al volver la red. Caché y cola de pendientes en IndexedDB, **cifradas** con la llave del sitio.
- Usa el token de sincronización del sitio (el mismo de subrayados y Anki, `Contents: read and write` sobre `wolyf/web`), que se abre con la sesión. Sin token o sin rama, el estado se guarda solo en el navegador y la pastilla lo dice.
- **Varias pestañas:** no hay pestaña líder; cada una mezcla con el remoto antes de escribir y los choques se resuelven con 409 y mezcla, así que no se pierde nada. Un cambio hecho en otra pestaña aparece en la siguiente lectura periódica.
- `node estudio/herramientas/estudio.mjs rama` crea la rama (idempotente: no sobrescribe) y `estado` la lee y descifra (solo lectura). Necesitan `SITIO_TOKEN_GITHUB`, `SITIO_USUARIO` y `SITIO_CONTRASENA`.

## Estructura

| Ruta | Qué es |
|---|---|
| `estudio/index.html`, `estudio/materia.html` | Tablero y ruta de una materia (`materia.html?m=<id>`). **Generadas** |
| `estudio/<materia>/<fuente>.html` y `.enc` | Página de cada lectura (generada) y su texto cifrado |
| `estudio/datos/estudio.json`, `datos/materias/<id>.json` | Públicos: áreas, materias, rutas y fuentes |
| `estudio/css/estudio.css`, `css/lectura.css` | Estilos del tablero y base común de los textos (`.lt`) |
| `estudio/js/main.mjs` | Arranque: elige la vista según `<body data-pagina>` |
| `estudio/js/app.mjs` | Interfaz: tablero, materia y barra de estado en cada lectura (todo texto con `textContent`) |
| `estudio/js/nucleo.mjs` | Núcleo puro: estados, mezcla, formato cifrado, conteos, «Sigue con», validación de manifiestos |
| `estudio/js/sync.mjs` | Sincronización cifrada con la rama `estudio` |
| `estudio/herramientas/estudio.mjs` | `paginas [--revisar]`, `rama`, `estado` |
| `estudio/herramientas/importar.mjs` | Importa una lectura suelta como fragmento listo para sellar |
| `estudio/herramientas/verificar-ui.mjs` | Verificación en navegador real (Playwright), con la sesión real del sitio y una API de GitHub falsa; **no** forma parte de `npm test`: `node estudio/herramientas/verificar-ui.mjs [--salida dir]` |
| `estudio/herramientas/pruebas/` | `estudio` (núcleo, sincronización con remoto simulado, manifiestos, cifrado) y `herramientas` (páginas al día, rama, importador) |

## Apuntes

Aún no hay. Cuando haya, cada apunte será una página con la plantilla de notas (`herramientas/plantilla-notas/`: índice, notas al pie, citas, bibliografía; copiar su `css/notas.css` a `estudio/css/`), registrada en `apuntes` de la materia con su `ruta`, y enlazada desde la entrada de la ruta que comenta. Un apunte con texto privado va cifrado igual que una lectura. Marcar una entrada como `apuntada` es manual.

## Notas de la migración de Historia 2

- La ruta original tenía 14 entradas; son **13**: «Diálogos I» y «Apología de Sócrates» eran el mismo texto (Apología, 17a–42a) y se unieron en una (`apologia`).
- Los avisos de los propios archivos corrigieron el índice original: el **Protágoras no está transcrito** (está en Diálogos I de Gredos y solo se cargó la Apología), y el **Fedón** está en `platon-dialogos-3` (Diálogos III), mientras que Banquete, Fedro y República VII están reunidos en `platon-dialogos-4`. El Protágoras y el Eutidemo quedan como «Texto pendiente». El texto de Hadot llega hasta la p. 54 del libro.
- No se migraron `subrayados.html` (vacío; el sitio ya tiene subrayados sincronizados) ni la barra «Escuchar» (idea pendiente para el sitio: ver «Ideas pendientes» en el `CLAUDE.md` de la raíz).

## Pendiente

1. Quitar `oculto` de `proyectos.json` (zona general) cuando se haya probado con datos reales en el celular.
2. Apuntes (ver arriba) y, si se quiere, enlace con el Anki (`filosofia::…`) y con los subrayados.
3. Reubicar el Anki en el área «Estudio» (hoy está en «Herramientas»; cambio de zona general).
4. Probar con las primeras lecturas reales de matemáticas o economía: si necesitan fórmulas, la fuente lleva `"latex": true` en su manifiesto: la página generada enlaza KaTeX local y el fragmento usa `data-latex` (se renderiza al descifrar).
