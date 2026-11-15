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
- **Repasos duplicados.** Un repaso que no es «Otra vez» llegado a menos de 12 h del último efectivo cuenta en el registro pero no mueve la programación (dos equipos que repasan sin conexión la misma unidad no multiplican el intervalo dos veces). «Otra vez» siempre se aplica.
- **Origen opcional y tipado:** `subrayado` (id, ruta `p`, cita), `externo` (fuente, `url` solo http o https) o ninguno (manual). La tarjeta sobrevive si el subrayado se borra o queda huérfano.
- **Identificadores** `id = <fecha en ms, 12 hex><3 bytes aleatorios>`: ordenar por id es ordenar por creación (orden de las nuevas).
- **Nada se pierde en silencio.** `guardarTarjeta` y `registrarRepaso` lanzan error si el dato es inválido; con el reloj atrasado, `t` sube a «último conocido + 1» para que la edición, el borrado o el repaso gane de verdad.
- **Alineado con Anki** para poder exportar después: tipos `basico` y `cloze` con `{{c1::respuesta::pista}}`, cuatro calificaciones, marcas de tiempo en ms.

## Estructura

| Ruta | Qué es |
|---|---|
| `anki/index.html` | Página principal (aún sin interfaz) |
| `anki/js/modelo.mjs` | Núcleo puro: tarjetas, cloze, unidades, repasos, mezcla y formato cifrado |
| `anki/js/scheduler.mjs` | Núcleo puro: SM-2, reproducción del registro, día de estudio (corte a las 4:00) y cola con topes diarios |
| `anki/js/sync.mjs` | Sincronización cifrada con la rama `anki` (`crearArchivo` genérico y `crearAnki`); reutiliza `clienteGitHub` de `../js/subrayados-sync.mjs` |
| `anki/herramientas/pruebas/` | `modelo`, `scheduler` y `sync` (con una API de GitHub simulada) |

## Datos cifrados

- Archivos de la rama `anki` (no en `main`, para no disparar Pages): `tarjetas.enc`, `repasos.enc` (y `propuestas.enc` en la fase 1). Formato `"WRF1" ‖ iv ‖ AES-256-GCM(HKDF(K, info), gzip(JSON))` con `info` = `wr-anki-tarjetas` y `wr-anki-repasos` (una llave derivada distinta por colección).
- Sincronización: API de GitHub (no `raw.githubusercontent.com`): `sha` por contenidos, bytes exactos por `git/blobs`, `PUT` con el `sha` previo; 409 o 422 se relee, se mezcla y se reintenta. Se escribe por lotes (cada `PUT` es un commit y reescribe el archivo). Caché y cola de pendientes en IndexedDB, **cifradas** con la llave del sitio.
- Usa el token de sincronización del sitio (el de los subrayados, con permiso *Contents: read and write* sobre `wolyf/web`), que se abre con la sesión. Nunca en el chat ni impreso.
- Pruebas: una prueba debe mantener que no quede texto privado en claro; el texto de trabajo va en `.privado/` (ignorado por git).

## Estado

Hecho (fase 0, pasos 1 a 3): modelo, programación y sincronización, con pruebas.

Pendiente:

1. **Crear la rama `anki`.** `npm run sesion -- rama` solo crea `subrayados`; sin la rama, la sincronización real falla con «No se encontró la rama «anki»». Hace falta un comando (sin historial, con archivos iniciales cifrados) o que el dueño la cree.
2. Interfaz de estudio y creación manual (tarjetas básicas y cloze, con LaTeX), y coordinación entre pestañas con Web Locks.
3. PWA: `manifest` y `service worker` dentro de `anki/` (alcance `anki/`; la CSP no cambia). En iPhone conviene instalarla en la pantalla de inicio por la política de borrado de Safari.
4. Poda o compactación del registro de repasos y de las lápidas (hoy se conserva todo).
5. Fases 1 a 4.
