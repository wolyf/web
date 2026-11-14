# Calculadoras de ingeniería

Proyecto `calculadoras` del sitio Wolfgang Resendiz. Entorno de Claude Code: `WEB_PROYECTO=calculadoras`.

## Zona

- Este proyecto solo edita `calculadoras/`. Todo lo demás se puede leer, pero no se modifica desde aquí.
- Lo común (`../css/styles.css`, la portada `../index.html`) es de la zona general. Si algo de ahí no sirve, se sobrescribe en un CSS propio (`calculadoras/css/`) o se le pide el cambio al entorno general.
- La tarjeta del proyecto en la portada sale de `proyectos.json` (`npm run proyectos -- portada`, entorno general): una calculadora nueva solo se enlaza desde el proyecto y no necesita tarjeta propia. Si cambia su descripción, icono o página de inicio, pídele el cambio al entorno general.

## Estructura

| Ruta | Qué es |
|---|---|
| `calculadoras/caudal.html` | Calculadora de caudal en tuberías: $Q = \frac{\pi}{4} d^2 v$, con gráfica $V$ vs $Q$. |
| `calculadoras/js/units.js` | Motor de unidades compartido por todas las calculadoras: magnitudes, conversiones a la base SI, barra de unidades y preferencias guardadas. |
| `calculadoras/js/caudal.js` | Declara entradas, magnitudes y cálculo de la calculadora de caudal. |
| `calculadoras/herramientas/pruebas/` | Pruebas en Node del motor de unidades y del cálculo de caudal (`npm test`), con un `window` mínimo para los scripts clásicos. |
| `calculadoras/js/grafica-caudal.js` | Gráfica SVG interactiva con los límites de velocidad de referencia (IWA, CONAGUA). |

## Cómo se hace una calculadora

- Cada calculadora es un HTML en `calculadoras/` que carga, con `defer` y en este orden, `js/units.js`, sus scripts propios y su script principal.
- Todo se calcula en unidades base (SI). La calculadora solo declara sus entradas (`magnitud`, `positivo`) y su función de cálculo en `crearCalculadora`; el motor arma la barra de unidades y convierte.
- Una magnitud nueva se agrega en `MAGNITUDES` de `units.js` con su unidad base y factores.
- Las ecuaciones se escriben en LaTeX (`data-latex`, con `data-display` en bloque) y las renderiza KaTeX (copia local en `../js/vendor/katex/`, 0.16.11; `../js/tema.js` y `units.js` las renderizan automáticamente), con texto de respaldo.
- Los scripts son clásicos (IIFE y `window`), no módulos, para que la página funcione también abierta como archivo (`file://`).
- Al terminar, abre la página en el navegador (Playwright) y comprueba un cálculo conocido, p. ej. $d = 100\ \text{mm}$, $v = 1\ \text{m/s} \Rightarrow Q \approx 7.85\ \text{L/s}$.
- Cada página HTML sigue el encabezado de `../herramientas/plantilla/index.html`: marca «Wolfgang Resendiz», bloque `.ajustes` (botones de acento y tema), favicon `../img/darwin-cara.svg` y enlace `← Inicio`. Las fuentes las trae `../css/styles.css` (autoalojadas; sin `preconnect`).
- Cada página HTML carga `<script src="../js/tema.js"></script>` en el `<head>`, **sin** `defer` y antes de los demás scripts, para aplicar tema y acento antes de pintar (script de la zona general). Fuera de la gráfica, los colores salen de las variables del sitio (`--accent`, `--text`, …); la gráfica se queda en tema claro a propósito.
- Cada página HTML incluye a Darwin, la gatita del sitio, con `<script src="../js/darwin.js" defer></script>` en el `<head>` (script de la zona general, no se edita desde aquí).

## Reglas heredadas del sitio

- Español; no usar el guion largo (U+2014) en textos, interfaz, comentarios ni mensajes. Notación formal cuando aporte.
- El repositorio es **público**: nada privado en claro. Nunca pidas contraseñas ni llaves en el chat.
- Solo HTML, CSS y JavaScript sin build; `npm test` en verde antes de cada commit.

## Sesión del sitio y partes privadas

El sitio es estático y el repositorio público, así que lo privado se publica **cifrado** con la llave de la sesión del sitio (`../js/sesion.mjs`, que `../js/tema.js` carga en cada página). Detalles en el `CLAUDE.md` de la raíz, «Sesión y partes privadas».

- `<div data-privado="calculadoras/notas.enc" data-lineas="3"></div>`: sin sesión se ve tachado; con sesión se descifra e inserta. El texto en claro vive en `.privado/` (ignorado por git) y se sella con `npm run sesion -- sellar calculadoras`.
- Desde JavaScript: `import { sesion } from "../js/sesion.mjs"` (`activa()`, `llaveProyecto(id)`, `descifrar(bytes)`, `alCambiar(fn)`).
- Las credenciales `SITIO_USUARIO` y `SITIO_CONTRASENA` van en el entorno de Claude Code, nunca en el chat.
