# Anki personal

Proyecto `anki` del sitio de Wolfgang Reséndiz. Entorno de Claude Code: `WEB_PROYECTO=anki`.

## Reglas heredadas del sitio

Español; sin guion largo (U+2014) en textos, interfaz, comentarios ni mensajes; repositorio **público** (nada privado en claro, nunca contraseñas en el chat); solo HTML, CSS y JavaScript sin build; ecuaciones en LaTeX con KaTeX (`data-latex`, copia local en `../js/vendor/katex/`, renderizado automático desde `../js/tema.js`); `npm test` en verde. Detalle en el `CLAUDE.md` de la raíz, «Reglas que heredan todos los proyectos».

## Zona

- Este proyecto solo edita `anki/`. Todo lo demás se puede leer, pero no se modifica desde aquí.
- Lo común (`../css/styles.css`, `../js/tema.js`, `../js/darwin.js`, `../img/`, el `index.html` de la raíz, `herramientas/`, `proyectos.json`) es de la zona general. Si algo de ahí no sirve, se sobrescribe en el CSS propio (`anki/css/`) o se le pide el cambio al entorno general.
- Rutas relativas: los recursos propios van en `anki/css/`, `anki/js/`, etc.; los comunes con `../`.
- La tarjeta del proyecto en la portada (descripción, icono, etiquetas, página de inicio) sale de `proyectos.json`: si cambia, pídele al entorno general que la actualice. Mientras se construye está `oculto` y `privado`.

## Diseño

Usa los estilos comunes: papel beige y grises cálidos, un color de acento, títulos en Outfit y detalles en monoespaciada.

- Variables principales: `--bg`, `--surface`, `--surface-2`, `--text`, `--text-strong`, `--muted`, `--border`, `--border-card`, `--border-strong`, `--accent`, `--accent-soft`, `--sobre-acento`, `--radius`, `--font-texto`, `--font-titulo`, `--font-mono`. Usa estas variables en el CSS propio para respetar el tema claro/oscuro y el acento que elija quien visita.
- `<body class="ancho">` da una columna de lectura de 760 px; sin la clase, 480 px (formularios angostos).
- Componentes listos: `.site-header` + `.brand` + `.ajustes`, `.back`, `form`, `.card`, `.pastilla`, `.etiqueta`, `.proyectos` + `.proyecto`.
- Cada página incluye `../js/tema.js` (sin `defer`, en el `<head>`) y `../js/darwin.js` (con `defer`). `tema.js` trae también el botón de inicio de sesión del sitio.
- Todo texto de una tarjeta se pinta **escapado** (nunca como HTML). Las fórmulas van en LaTeX con `data-latex`.

## Qué es

Un Anki personal: tarjetas de estudio con repetición espaciada, solo para el dueño, que se integran con los subrayados del sitio. Los datos viven **cifrados** con la llave del sitio $K$ en la rama `anki` del repositorio (público), igual que los subrayados.

Plan por fases (el estado real está en «Estado» al final):

| Fase | Entrega |
|---|---|
| 0 | Modelo, programación, sincronización cifrada, interfaz de estudio y creación manual, PWA con uso sin conexión |
| 1a | Generación por IA desde los subrayados (comando en Claude Code, nunca en el navegador), contexto por página o sección, cita de respaldo verificada por programa, estimación y presupuesto, bandeja de aprobación |
| 1b | Generación desde texto pegado o fuente externa, deduplicación, taxonomía y aprendizaje de las ediciones |
| 2 | Imágenes cifradas, estadísticas, filtros por etiqueta, FSRS |
| 3 | Respaldo cifrado completo, exportación `.apkg` o CSV con historial, modelo de IA en dos niveles |
| 4 | Botón «crear tarjeta» en el menú de subrayados (zona general, PR aparte) |

## Decisiones de diseño

- **La IA nunca corre en el navegador.** La CSP solo permite `connect-src 'self' https://api.github.com` y una llave de API en la web sería pública. La generación es un comando que se lanza a mano en una sesión de Claude Code con `SITIO_USUARIO` y `SITIO_CONTRASENA`; la web solo muestra la bandeja de aprobación. Sin GitHub Actions con credenciales (repo y logs públicos).
- **Un solo mazo** con etiquetas jerárquicas con `::` (por ejemplo `filosofia::logica`); se estudia por filtro de etiqueta. Evidencia: pocas colas, práctica intercalada.
- **Tarjeta frente a unidad.** Una *tarjeta* (nota) es lo que se escribe; una *unidad* es lo que se repasa. `basico` produce una unidad (`uid = id`); `cloze` una por cada número `cN` (`uid = id#cN`).
- **Repasos de solo agregado.** El estado de cada unidad **nunca se guarda**: se deriva reproduciendo su registro de repasos ordenado por $(t, u, g)$. La unión de repasos (clave $(u, t)$) es conmutativa, asociativa e idempotente, así que estudiar sin conexión en dos equipos no pierde nada y cambiar de algoritmo no exige migrar datos.
- **Algoritmo detrás de una interfaz estable:** `siguiente(estado, g, ahora, config) → estado`. Hoy SM-2 determinista (sin «fuzz»). FSRS se acopla después portando la implementación de referencia con versión fija; no se reconstruyen fórmulas ni parámetros de memoria.
- **Repasos duplicados.** Un repaso que no es «Otra vez» hecho más de **un día antes** de que la unidad venza cuenta en el registro pero no mueve la programación: es lo que pasa con el segundo de dos equipos que repasan sin conexión la misma unidad (llega con la unidad ya reprogramada a días de distancia). «Otra vez» siempre se aplica. Invariante probada como propiedad: la cola solo presenta unidades con `vence < fin del día de estudio ≤ ahora + 1 día`, así que responder a lo que se presenta SIEMPRE la reprograma (una versión anterior con ventana de 12 h atascaba tarjetas graduadas por la tarde). Costo asumido: con intervalos de 1 día un duplicado sí se aplica.
- **Texto de tarjeta con fórmulas** (formato persistente, no cambia sin migración): texto plano con `$…$` en línea (reglas de pandoc: sin espacio tras la apertura, sin espacio antes ni dígito después del cierre, así «cuesta $5 y $10» sigue siendo texto), `$$…$$` en bloque, `\(…\)` y `\[…\]` (los de Anki) y `\$` para un dólar literal. Dentro de un hueco cloze las fórmulas van delimitadas: `{{c1::$\frac{a}{b}$}}`. El analizador de huecos cuenta llaves, así que el LaTeX no cierra el hueco antes de tiempo. `aDelimitadoresAnki` convierte al formato de Anki para exportar.
- **Una sola pestaña activa** (Web Lock exclusivo `wr-anki:activa`): la segunda avisa y ofrece «Usar aquí», que le quita el control a la primera, y esta puede recuperarlo igual. Las conexiones se encadenan y no se vuelve a pedir un bloqueo que la pestaña ya tiene (`sesion.entrar()` avisa siempre, y un segundo «activa» la dejaba bloqueada por sí misma). Una pestaña detenida (sin el control o con la sesión cerrada) no escribe más en la caché local compartida y `aplicar` lanza un error en vez de perder el cambio. Sin Web Locks se asume una pestaña.
- **Editar no rompe el historial:** el tipo de una tarjeta queda fijo al editar (cambiarlo cambia los `uid` y dejaría el historial huérfano) y quitar un hueco cloze con historial pide confirmación.
- **Respuestas sin esperar:** `registrarRepaso` deja el repaso en memoria de forma síncrona (contrato probado) y el guardado local y la subida siguen en segundo plano. Con 20 000 repasos, la parte síncrona de una respuesta cuesta unos 7 ms.
- **Lotes de escritura:** las tarjetas se suben 2 s tras el último cambio; los repasos 2 min tras el último (máximo 5 min con cambios pendientes) y al terminar o salir de una sesión de estudio, al ocultar la pestaña y al cerrarla. Cada commit guarda el archivo completo (crecimiento del repositorio: pendiente, ver «Estado»). La marca de pendiente usa un contador de versión: un cambio que llega con un PUT en vuelo no se pierde.
- **Seguridad de la interfaz:** el texto de las tarjetas entra SOLO con `textContent`; las fórmulas con `katex.render` sin `trust`. No hay `innerHTML` ni manejadores en línea (la CSP lo impediría).
- **Origen opcional y tipado:** `subrayado` (id, ruta `p`, cita), `externo` (fuente, `url` solo http o https) o ninguno (manual). La tarjeta sobrevive si el subrayado se borra o queda huérfano.
- **Identificadores** `id = <fecha en ms, 12 hex><3 bytes aleatorios>`: ordenar por id es ordenar por creación (orden de las nuevas).
- **Nada se pierde en silencio.** `guardarTarjeta` y `registrarRepaso` lanzan error si el dato es inválido; con el reloj atrasado, `t` sube a «último conocido + 1» para que la edición, el borrado o el repaso gane de verdad.
- **Alineado con Anki** para poder exportar después: tipos `basico` y `cloze` con `{{c1::respuesta::pista}}`, cuatro calificaciones, marcas de tiempo en ms.

## Estructura

| Ruta | Qué es |
|---|---|
| `anki/index.html`, `anki/css/anki.css` | Página (KaTeX local, sin scripts en línea) y estilos propios |
| `anki/js/main.mjs` | Arranque: pasa a la interfaz la sesión real del sitio |
| `anki/js/app.mjs` | Interfaz (`montar(raiz, deps)`, con sesión, `fetch`, reloj, bloqueos y KaTeX inyectables): inicio, estudio, editor, explorador, pestaña única |
| `anki/js/estudio.mjs` | Núcleo puro: foto de lo que toca estudiar, siguiente unidad (sin hermanos cloze seguidos), búsqueda, validación |
| `anki/js/render.mjs` | Núcleo puro: separa texto y fórmulas; conversión al formato de Anki |
| `anki/js/modelo.mjs` | Núcleo puro: tarjetas, cloze (con llaves de LaTeX), unidades, repasos, mezcla, adición incremental y formato cifrado |
| `anki/js/scheduler.mjs` | Núcleo puro: SM-2, reproducción del registro, día de estudio (corte a las 4:00) y cola con topes diarios |
| `anki/js/sync.mjs` | Sincronización cifrada con la rama `anki` (`crearArchivo` genérico y `crearAnki`); reutiliza `clienteGitHub` de `../js/subrayados-sync.mjs` |
| `anki/herramientas/pruebas/` | `modelo`, `render`, `scheduler`, `estudio` y `sync` (con una API de GitHub simulada): corren con `npm test` |
| `anki/herramientas/verificar-ui.mjs` | Verificación en un navegador real (Playwright) sobre el `index.html` real, con acceso desechable y API de GitHub falsa; NO forma parte de `npm test`: `node anki/herramientas/verificar-ui.mjs [--salida dir]` |

## Datos cifrados

- Archivos de la rama `anki` (no en `main`, para no disparar Pages): `tarjetas.enc`, `repasos.enc` (y `propuestas.enc` en la fase 1). Formato `"WRF1" ‖ iv ‖ AES-256-GCM(HKDF(K, info), gzip(JSON))` con `info` = `wr-anki-tarjetas` y `wr-anki-repasos` (una llave derivada distinta por colección).
- Sincronización: API de GitHub (no `raw.githubusercontent.com`): `sha` por contenidos, bytes exactos por `git/blobs`, `PUT` con el `sha` previo; 409 o 422 se relee, se mezcla y se reintenta. Se escribe por lotes (cada `PUT` es un commit y reescribe el archivo). Caché y cola de pendientes en IndexedDB, **cifradas** con la llave del sitio.
- Usa el token de sincronización del sitio (el de los subrayados, con permiso *Contents: read and write* sobre `wolyf/web`), que se abre con la sesión. Nunca en el chat ni impreso.
- Pruebas: una prueba debe mantener que no quede texto privado en claro; el texto de trabajo va en `.privado/` (ignorado por git).

## Estado

Hecho (fase 0): modelo, programación, sincronización, interfaz de estudio y creación manual (tarjetas básicas y cloze con LaTeX, etiquetas jerárquicas, explorador con búsqueda, editar y eliminar), pestaña única y verificación en navegador real (celular, escritorio y tema oscuro; 38 comprobaciones, incluidas pestañas, edición y la rama ausente).

Pendiente:

1. **Crear la rama `anki`.** `npm run sesion -- rama` solo crea `subrayados`; sin la rama, la sincronización real muestra «No se encontró la rama «anki»» y todo se guarda en el equipo. Hace falta un comando (sin historial, con archivos iniciales cifrados) o que el dueño la cree.
2. **Quitar `oculto` de `proyectos.json`** (zona general) cuando la rama exista y se haya probado con datos reales.
3. PWA: `manifest` y `service worker` dentro de `anki/` (alcance `anki/`; la CSP no cambia). En iPhone conviene instalarla en la pantalla de inicio por la política de borrado de Safari. Hasta entonces, sin red la página no carga aunque los datos estén en la caché local.
4. Crecimiento del repositorio: cada commit guarda `repasos.enc` completo; falta compactar el registro (y podar lápidas).
5. Deshacer la última respuesta (el registro es de solo agregado: haría falta un repaso compensatorio).
6. Fases 1 a 4 del plan.
