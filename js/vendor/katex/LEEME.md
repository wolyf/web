# KaTeX 0.16.11

Copia local de [KaTeX](https://katex.org) 0.16.11 (licencia MIT, ver `LICENSE`), tomada del paquete de npm `katex@0.16.11` (`dist/`).

- `katex.min.js`: sin cambios.
- `katex.min.css`: solo se conservan las fuentes `.woff2` que usan las ecuaciones del sitio (Main Regular, Italic y Bold, Math Italic, AMS Regular y Size1 a Size4) y se quitaron los respaldos `.woff` y `.ttf`.
- Si una ecuación nueva necesita otra fuente (caligráfica, fraktur, etc.), copia su `.woff2` de `dist/fonts/` y agrega su `@font-face` en `katex.min.css`.
