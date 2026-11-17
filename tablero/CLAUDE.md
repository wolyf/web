# Ideas y pendientes del sitio

Proyecto `tablero` del sitio de Wolfgang Reséndiz. Entorno de Claude Code: `WEB_PROYECTO=tablero`.

## Reglas heredadas del sitio

Español; sin guion largo (U+2014) en textos, interfaz, comentarios ni mensajes; repositorio **público** (nada privado en claro, nunca contraseñas en el chat); solo HTML, CSS y JavaScript sin build; ecuaciones en LaTeX con KaTeX; `npm test` en verde. Detalle en el `CLAUDE.md` de la raíz, «Reglas que heredan todos los proyectos».

## Zona

- Este proyecto solo edita `tablero/`. Todo lo demás se puede leer, pero no se modifica desde aquí.
- Lo común (`../css/styles.css`, `../js/tema.js`, `../js/darwin.js`, `../img/`, el `index.html` de la raíz, `herramientas/`, `proyectos.json`) es de la zona general. Si algo de ahí no sirve, se sobrescribe en el CSS propio (`tablero/css/`) o se le pide el cambio al entorno general.
- La tarjeta del proyecto en la portada sale de `proyectos.json`: si cambia, pídele al entorno general que la actualice. Está visible en la portada y marcado `privado`.
- Rutas relativas: los recursos propios en `tablero/css/`, `tablero/js/`; los comunes con `../`.

## Diseño

Usa los estilos comunes (papel beige, un color de acento, Outfit, Inter y monoespaciada) y solo sus variables: `--bg`, `--surface`, `--surface-2`, `--text`, `--text-strong`, `--muted`, `--border`, `--border-card`, `--border-strong`, `--accent`, `--accent-soft`, `--sobre-acento`, `--radius`, `--font-texto`, `--font-titulo`, `--font-mono`. Cada página incluye `../js/tema.js` (sin `defer`, en el `<head>`) y `../js/darwin.js` (con `defer`).

## Qué es

Un tablero sencillo y **privado** de **ideas, pendientes y avances de todo el sitio** (no de las lecturas: eso es el Espacio de estudio). Cada elemento pertenece a una zona (un proyecto de `proyectos.json` o `general`) y se filtra por proyecto, prioridad o texto.

Columnas: **Ideas** (algo que podría hacerse), **Pendientes** (decidido, falta hacerlo), **En curso** y **Hechas** (plegada). Arriba, un resumen con el conteo de cada una.

## Datos (privados, cifrados)

El repositorio es público, así que los elementos **no se publican en claro**: viven en `.privado/tablero/datos/tablero.html` (JSON; ignorado por git) y se publican cifrados con la llave del sitio $K$ en `tablero/datos/tablero.enc` (formato de fragmento: `"WRF1" ‖ iv ‖ AES-256-GCM(HKDF(K, "wr-fragmentos"), gzip(JSON))`). Sin sesión, la página solo muestra una invitación a iniciar sesión: no hay nada del contenido a la vista, ni descargado. Con sesión, `js/main.mjs` baja el `.enc`, lo descifra con `sesion.descifrar` y pinta el tablero; al cerrar sesión el contenido se va de la página.

**Lo que sigue siendo público:** el código, los nombres de los proyectos (salen de `../proyectos.json`) y el historial de git. El tablero se publicó un tiempo en claro (PR #37 a #38): esas versiones siguen en el historial. Su contenido era lo que ya estaba anotado en los `CLAUDE.md` de los proyectos, que son públicos, así que no se reescribió la historia.

**Cómo se edita:**

1. En una sesión nueva el texto de trabajo no existe: `npm run sesion -- abrir tablero` lo recupera en `.privado/tablero/datos/tablero.html` (necesita `SITIO_USUARIO` y `SITIO_CONTRASENA` en el entorno de Claude Code, nunca en el chat).
2. Editar ese archivo (a mano o pidiéndoselo a Claude Code: «agrega la idea X», «marca como hecho Y»).
3. `node tablero/herramientas/validar.mjs` (no necesita credenciales) comprueba estados, zonas, fechas, ids únicos y enlaces.
4. `npm run sesion -- sellar tablero` regenera `tablero/datos/tablero.enc`, que es lo que se sube en el commit.

No hay edición desde el navegador (v1). Si se quisiera, se haría como el estado del Espacio de estudio (rama propia, cifrada, con la sesión).

Cada elemento de `items`:

| Campo | Uso |
|---|---|
| `id` | Obligatorio, único, minúsculas con guiones. |
| `titulo` | Obligatorio. |
| `detalle` | Texto breve opcional. |
| `estado` | `idea`, `pendiente`, `en-curso` o `hecho`. |
| `zona` | `general` o el id de un proyecto de `proyectos.json`. |
| `prioridad` | Opcional: `alta`, `media` o `baja`. Dentro de una columna, la prioridad alta va primero y a igual prioridad manda el orden del archivo. |
| `fecha` | Cuándo se anotó (AAAA-MM-DD). |
| `hecho` | Solo en `hecho`: cuándo se cerró (AAAA-MM-DD). |
| `enlace` | Opcional: `https://…` o una ruta del sitio (p. ej. un PR). Nada de `javascript:` ni `..`. |

Los nombres de las zonas salen de `../proyectos.json` en el navegador (campo `corto`, si no `nombre`), así que un proyecto nuevo aparece solo en el filtro. Las pruebas comprueban que `datos/` solo tenga el `.enc` (un fragmento cifrado, sin texto en claro y sin `tablero.json`), que el proyecto figure como `privado` y, si existe el texto de trabajo, que sea válido.

## Estructura

| Ruta | Qué es |
|---|---|
| `tablero/index.html` | Página (CSP exacta del sitio, sin scripts en línea; la raíz lleva `data-no-subrayar`, así que lo descifrado no se puede subrayar) |
| `tablero/css/tablero.css` | Estilos propios |
| `tablero/js/main.mjs` | Invitación sin sesión; con sesión, abre el `.enc` y pinta resumen, filtros y columnas (todo texto con `textContent`; `?zona=<id>` y `?q=<texto>` preseleccionan el filtro) |
| `tablero/js/nucleo.mjs` | Núcleo puro: estados, validación, enlaces seguros, filtrado, orden y conteos |
| `tablero/datos/tablero.enc` | Los elementos, cifrados (el texto de trabajo está en `.privado/`) |
| `tablero/herramientas/validar.mjs` | Valida el texto de trabajo antes de sellar (sin credenciales) |
| `tablero/herramientas/pruebas/` | Pruebas (`npm test`) |
| `tablero/herramientas/verificar-ui.mjs` | Verificación en navegador real (Playwright) con la sesión del sitio: sin sesión no se ve nada, con sesión se pinta y filtra, y al cerrar sesión se va. No forma parte de `npm test`: `node tablero/herramientas/verificar-ui.mjs [--salida dir]` |

## Pendiente

1. Elegir si los pendientes que siguen en los `CLAUDE.md` de otros proyectos pasan solo al tablero.
2. Origen de los primeros elementos: los pendientes que ya estaban anotados en los `CLAUDE.md` de Anki y Espacio de estudio y la idea de «Escuchar» (ver «Ideas pendientes» del `CLAUDE.md` raíz). Conviene dejar el tablero como único lugar de pendientes y que los `CLAUDE.md` solo describan cómo funciona cada proyecto.
