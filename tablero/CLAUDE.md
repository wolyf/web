# Ideas y pendientes del sitio

Proyecto `tablero` del sitio de Wolfgang Reséndiz. Entorno de Claude Code: `WEB_PROYECTO=tablero`.

## Reglas heredadas del sitio

Español; sin guion largo (U+2014) en textos, interfaz, comentarios ni mensajes; repositorio **público** (nada privado en claro, nunca contraseñas en el chat); solo HTML, CSS y JavaScript sin build; ecuaciones en LaTeX con KaTeX; `npm test` en verde. Detalle en el `CLAUDE.md` de la raíz, «Reglas que heredan todos los proyectos».

## Zona

- Este proyecto solo edita `tablero/`. Todo lo demás se puede leer, pero no se modifica desde aquí.
- Lo común (`../css/styles.css`, `../js/tema.js`, `../js/darwin.js`, `../img/`, el `index.html` de la raíz, `herramientas/`, `proyectos.json`) es de la zona general. Si algo de ahí no sirve, se sobrescribe en el CSS propio (`tablero/css/`) o se le pide el cambio al entorno general.
- La tarjeta del proyecto en la portada sale de `proyectos.json`: si cambia, pídele al entorno general que la actualice. Está visible en la portada.
- Rutas relativas: los recursos propios en `tablero/css/`, `tablero/js/`; los comunes con `../`.

## Diseño

Usa los estilos comunes (papel beige, un color de acento, Outfit, Inter y monoespaciada) y solo sus variables: `--bg`, `--surface`, `--surface-2`, `--text`, `--text-strong`, `--muted`, `--border`, `--border-card`, `--border-strong`, `--accent`, `--accent-soft`, `--sobre-acento`, `--radius`, `--font-texto`, `--font-titulo`, `--font-mono`. Cada página incluye `../js/tema.js` (sin `defer`, en el `<head>`) y `../js/darwin.js` (con `defer`).

## Qué es

Un tablero sencillo de **ideas, pendientes y avances de todo el sitio** (no de las lecturas: eso es el Espacio de estudio). Cada elemento pertenece a una zona (un proyecto de `proyectos.json` o `general`) y se filtra por proyecto, prioridad o texto.

Columnas: **Ideas** (algo que podría hacerse), **Pendientes** (decidido, falta hacerlo), **En curso** y **Hechas** (plegada). Arriba, un resumen con el conteo de cada una.

## Datos (públicos)

El repositorio es público, así que `datos/tablero.json` también: **nada privado ahí** (ni contraseñas, ni contactos, ni datos de terceros). Si algún día hace falta algo privado, se publicaría cifrado con la sesión del sitio, como el estado del Espacio de estudio.

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

**Cómo se edita:** a mano o pidiéndoselo a Claude Code («agrega la idea X», «marca como hecho Y»); el cambio es un commit en `tablero/datos/tablero.json`. No hay edición desde el navegador (v1): el repositorio es público y escribir desde la página exigiría un token en el navegador. Si se quisiera, se haría como el estado del Espacio de estudio (rama propia, cifrada, con la sesión del sitio).

Los nombres de las zonas salen de `../proyectos.json` en el navegador (campo `corto`, si no `nombre`), así que un proyecto nuevo aparece solo en el filtro. Una prueba valida estados, zonas existentes, fechas, ids únicos y enlaces seguros.

## Estructura

| Ruta | Qué es |
|---|---|
| `tablero/index.html` | Página (CSP exacta del sitio, sin scripts en línea; la raíz lleva `data-no-subrayar`) |
| `tablero/css/tablero.css` | Estilos propios |
| `tablero/js/main.mjs` | Interfaz: resumen, filtros y columnas (todo texto con `textContent`; `?zona=<id>` y `?q=<texto>` preseleccionan el filtro) |
| `tablero/js/nucleo.mjs` | Núcleo puro: estados, validación, enlaces seguros, filtrado, orden y conteos |
| `tablero/datos/tablero.json` | Los elementos |
| `tablero/herramientas/pruebas/` | Pruebas (`npm test`) |
| `tablero/herramientas/verificar-ui.mjs` | Verificación en navegador real (Playwright), no forma parte de `npm test`: `node tablero/herramientas/verificar-ui.mjs [--salida dir]` |

## Pendiente

1. Elegir si los pendientes que siguen en los `CLAUDE.md` de otros proyectos pasan solo al tablero.
2. Origen de los primeros elementos: los pendientes que ya estaban anotados en los `CLAUDE.md` de Anki y Espacio de estudio y la idea de «Escuchar» (ver «Ideas pendientes» del `CLAUDE.md` raíz). Conviene dejar el tablero como único lugar de pendientes y que los `CLAUDE.md` solo describan cómo funciona cada proyecto.
