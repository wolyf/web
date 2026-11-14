# web

Sitio personal de Wolfgang Reséndiz, ingeniero civil y estudiante de Filosofía, publicado con GitHub Pages en https://wolyf.github.io/web/

El sitio se divide en proyectos, uno por carpeta (`proyectos.json`). Cada proyecto tiene su `CLAUDE.md` y se trabaja desde su propio entorno de Claude Code (`WEB_PROYECTO=<id>`); lo compartido (portada, estilos base, herramientas) es la zona general. Detalles en `CLAUDE.md`.

- `calculadoras/`: calculadoras de ingeniería hidráulica.
- `catalogo/`: catálogo privado de cotizaciones de piezas y servicios de agua potable. Requiere usuario y contraseña; los datos se publican cifrados y se administran con Claude (ver `catalogo/CLAUDE.md`).
- `manuales-conagua/`: los libros de los manuales técnicos de la Conagua (agua potable, alcantarillado y saneamiento) convertidos a HTML.

## Comandos

```bash
npm test                      # pruebas de todo el sitio
npm run proyectos -- listar   # proyectos y zonas
npm run proyectos -- portada  # regenera la portada desde proyectos.json
npm run catalogo -- ayuda     # gestión del catálogo
npm run capturas              # revisión visual del catálogo con datos ficticios (Playwright)
```
