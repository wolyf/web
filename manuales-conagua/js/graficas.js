/*
 * Gráficas interactivas del Libro 1 (MAPAS, Conagua).
 *
 * Recrea en SVG, sin librerías, dos ilustraciones del libro:
 *   - 2.19 «Comparación de mediciones entre pozo y llegada a tanque»
 *   - 3.5  «Gasto promedio de los usuarios fuera del área de influencia»
 *
 * Uso: <div class="grafica-libro" data-grafica="2-19"></div> (o "3-5") y este
 * script con defer. Dibuja la gráfica, una leyenda con botones para ocultar
 * o mostrar series, un globo con los valores (cursor, toque o teclado) y,
 * debajo, una tabla con los datos dentro de <details>.
 * Estilos en ../css/graficas.css (solo variables del sitio).
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  /*
   * Datos tomados del PDF original del Libro 1:
   * - 2.19 (página 31 del libro): coordenadas de las polilíneas vectoriales
   *   de cada serie convertidas a datos con la retícula de los ejes
   *   (17.5 a 22.0 L/s, 0 a 45 min); los marcadores coinciden.
   * - 3.5 (página 55 del libro): etiquetas de valor del texto del PDF,
   *   asignadas a cada usuario por su posición horizontal y comprobadas con
   *   la altura de las barras. El usuario 13 no trae etiqueta en el original;
   *   su barra mide lo mismo que las de 1 600.00 (usuarios 9 y 16).
   */
  var DATOS = {
    '2-19': {
      tipo: 'lineas',
      titulo: 'Comparación de mediciones entre pozo y llegada a tanque',
      x: { titulo: 'Tiempo (minutos)', min: 0, max: 45, paso: 5, nombre: 'Minuto' },
      y: { titulo: 'Gasto (L/s)', min: 17.5, max: 22, paso: 0.5, unidad: 'L/s', decimales: 2 },
      minutos: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45],
      series: [
        { nombre: 'Pozo', marcador: 'rombo',
          valores: [21.40, 19.00, 19.20, 18.80, 18.70, 19.80, 19.60, 19.40, 19.70, 19.60] },
        { nombre: 'Tanque', marcador: 'cuadro',
          valores: [20.00, 20.40, 18.90, 18.85, 18.45, 18.20, 18.00, 18.00, 18.30, 18.30] }
      ]
    },
    '3-5': {
      tipo: 'barras',
      titulo: 'Gasto promedio de los usuarios fuera del área de influencia',
      x: { titulo: 'Usuario identificado', nombre: 'Usuario' },
      y: { titulo: 'Gasto mensual', min: 0, max: 10000, paso: 1000 },
      serie: 'Gasto mensual',
      valores: [2800, 2000, 2000, 7000, 5280, 1200, 1200, 9600, 1600,
                1400, 1400, 1400, 1600, 3200, 4800, 1600, 1200, 4800],
      // Índices (desde 0) sin etiqueta de valor en el original
      sinEtiqueta: [12]
    }
  };

  var contador = 0;

  /* ---- Utilidades ---- */

  function el(etiqueta, attrs, padre) {
    var nodo = document.createElementNS(NS, etiqueta);
    for (var k in attrs) if (attrs[k] != null) nodo.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(nodo);
    return nodo;
  }

  function html(etiqueta, attrs, padre, texto) {
    var nodo = document.createElement(etiqueta);
    for (var k in attrs) if (attrs[k] != null) nodo.setAttribute(k, attrs[k]);
    if (texto != null) nodo.textContent = texto;
    if (padre) padre.appendChild(nodo);
    return nodo;
  }

  function texto(padre, x, y, contenido, clase, extra) {
    var t = el('text', Object.assign({ x: x, y: y, 'class': clase }, extra || {}), padre);
    t.textContent = contenido;
    return t;
  }

  // Miles separados con espacio (sin quiebre) como en el original: «$ 2 800.00»
  function pesos(v) {
    if (v === 0) return '$ -';
    var partes = v.toFixed(2).split('.');
    return '$ ' + partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '.' + partes[1];
  }

  function numero(v, d) { return v.toFixed(d); }

  // Forma del marcador centrada en (x, y); r = medio lado
  function marcador(forma, x, y, r) {
    if (forma === 'rombo') {
      var a = r * 1.3;
      return 'M' + x + ' ' + (y - a) + 'L' + (x + a) + ' ' + y + 'L' + x + ' ' + (y + a) + 'L' + (x - a) + ' ' + y + 'Z';
    }
    return 'M' + (x - r) + ' ' + (y - r) + 'h' + 2 * r + 'v' + 2 * r + 'h' + -2 * r + 'Z';
  }

  // Ancho del texto más largo con la clase dada (para fijar márgenes)
  function anchoMaximo(svg, textos, clase) {
    var max = 0;
    textos.forEach(function (s) {
      var t = texto(svg, 0, 0, s, clase);
      max = Math.max(max, t.getComputedTextLength());
      svg.removeChild(t);
    });
    return max;
  }

  /* ---- Estructura común: leyenda, lienzo, globo y tabla ---- */

  function armar(caja, datos) {
    var id = 'grafica-' + (++contador);
    caja.textContent = '';
    caja.classList.add('grafica--' + datos.tipo);

    var leyenda = html('div', { 'class': 'grafica-leyenda', role: 'group', 'aria-label': 'Series de la gráfica' }, caja);
    var lienzo = html('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = html('div', { 'class': 'grafica-globo', id: id + '-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);

    return { id: id, leyenda: leyenda, lienzo: lienzo, globo: globo };
  }

  function botonSerie(partes, nombre, forma, clase, alCambiar) {
    var b = html('button', { type: 'button', 'class': 'grafica-serie ' + clase, 'aria-pressed': 'true' }, partes.leyenda);
    var muestra = el('svg', { viewBox: '0 0 28 14', width: '28', height: '14', 'aria-hidden': 'true', 'class': 'grafica-muestra' }, b);
    if (forma === 'barra') {
      el('rect', { x: 8, y: 1, width: 12, height: 12, rx: 2, 'class': 'marca' }, muestra);
    } else {
      el('line', { x1: 1, y1: 7, x2: 27, y2: 7, 'class': 'linea' }, muestra);
      el('path', { d: marcador(forma, 14, 7, 3.6), 'class': 'marca' }, muestra);
    }
    html('span', null, b, nombre);
    b.addEventListener('click', function () {
      var activa = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(activa));
      alCambiar(activa);
    });
    return b;
  }

  // Coloca el globo junto al punto (px, py), dentro del lienzo
  function mostrarGlobo(partes, contenido, px, py) {
    var g = partes.globo;
    g.innerHTML = '';
    g.appendChild(contenido);
    g.hidden = false;
    var ancho = partes.lienzo.clientWidth;
    var gw = g.offsetWidth, gh = g.offsetHeight;
    var x = px + 14;
    if (x + gw > ancho - 4) x = px - 14 - gw;
    if (x < 4) x = Math.max(4, Math.min(ancho - gw - 4, px - gw / 2));
    var y = Math.max(4, py - gh - 10);
    g.style.left = x + 'px';
    g.style.top = y + 'px';
  }

  function ocultarGlobo(partes) { partes.globo.hidden = true; }

  function filaGlobo(padre, clase, forma, etiqueta, valor) {
    var fila = html('div', { 'class': 'fila ' + (clase || '') }, padre);
    if (forma) {
      var m = el('svg', { viewBox: '0 0 12 12', width: '12', height: '12', 'aria-hidden': 'true' }, fila);
      if (forma === 'barra') el('rect', { x: 1, y: 1, width: 10, height: 10, rx: 2, 'class': 'marca' }, m);
      else el('path', { d: marcador(forma, 6, 6, 3.6), 'class': 'marca' }, m);
    }
    html('span', { 'class': 'nombre' }, fila, etiqueta);
    html('span', { 'class': 'valor' }, fila, valor);
    return fila;
  }

  function tabla(caja, encabezados, filas, pie, nota) {
    var det = html('details', { 'class': 'grafica-datos' }, caja);
    html('summary', null, det, 'Datos de la gráfica');
    var t = html('table', null, det);
    var thead = html('thead', null, t);
    var tr = html('tr', null, thead);
    encabezados.forEach(function (h) { html('th', { scope: 'col' }, tr, h); });
    var tbody = html('tbody', null, t);
    filas.forEach(function (f) {
      var r = html('tr', null, tbody);
      f.forEach(function (c, i) { html(i === 0 ? 'th' : 'td', i === 0 ? { scope: 'row' } : null, r, c); });
    });
    if (pie) {
      var tf = html('tfoot', null, t);
      var r = html('tr', null, tf);
      pie.forEach(function (c, i) { html(i === 0 ? 'th' : 'td', i === 0 ? { scope: 'row' } : null, r, c); });
    }
    if (nota) html('p', { 'class': 'grafica-nota' }, det, nota);
  }

  /* ---- Ilustración 2.19: líneas ---- */

  function lineas(caja, datos) {
    var partes = armar(caja, datos);
    var visibles = datos.series.map(function () { return true; });
    var dibujo = null;

    datos.series.forEach(function (s, i) {
      botonSerie(partes, s.nombre, s.marcador, 'serie-' + (i + 1), function (activa) {
        visibles[i] = activa;
        if (dibujo) dibujo.aplicarVisibles();
      });
    });

    function dibujar() {
      var W = Math.round(partes.lienzo.clientWidth);
      if (!W) return;
      var angosto = W < 520;
      var H = angosto ? 290 : 360;
      var X = datos.x, Y = datos.y;

      partes.lienzo.querySelectorAll('svg').forEach(function (n) { n.remove(); });
      ocultarGlobo(partes);
      var svg = el('svg', {
        viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H, 'class': 'grafica-svg',
        role: 'group', 'aria-label': 'Ilustración 2.19. ' + datos.titulo + '. Gasto en litros por segundo contra tiempo en minutos.'
      });
      partes.lienzo.insertBefore(svg, partes.globo);

      var marcasY = [];
      for (var v = Y.min; v <= Y.max + 1e-9; v += Y.paso) marcasY.push(Math.round(v * 10) / 10);
      var anchoY = anchoMaximo(svg, marcasY.map(function (m) { return numero(m, 1); }), 'marca-eje');
      var m = { izq: Math.ceil(anchoY) + 30, der: 16, arr: 14, abj: 46 };
      var pw = W - m.izq - m.der, ph = H - m.arr - m.abj;
      var sx = function (x) { return m.izq + (x - X.min) / (X.max - X.min) * pw; };
      var sy = function (y) { return m.arr + (Y.max - y) / (Y.max - Y.min) * ph; };

      // Retícula y ejes
      var reticula = el('g', { 'class': 'reticula', 'aria-hidden': 'true' }, svg);
      marcasY.forEach(function (v) {
        el('line', { x1: m.izq, x2: m.izq + pw, y1: sy(v), y2: sy(v) }, reticula);
        texto(svg, m.izq - 8, sy(v) + 4, numero(v, 1), 'marca-eje', { 'text-anchor': 'end', 'aria-hidden': 'true' });
      });
      for (var x = X.min; x <= X.max; x += X.paso) {
        el('line', { x1: sx(x), x2: sx(x), y1: m.arr, y2: m.arr + ph }, reticula);
        texto(svg, sx(x), m.arr + ph + 18, String(x), 'marca-eje', { 'text-anchor': 'middle', 'aria-hidden': 'true' });
      }
      el('rect', { x: m.izq, y: m.arr, width: pw, height: ph, 'class': 'marco', 'aria-hidden': 'true' }, svg);
      texto(svg, m.izq + pw / 2, H - 6, X.titulo, 'titulo-eje', { 'text-anchor': 'middle', 'aria-hidden': 'true' });
      texto(svg, 0, 0, Y.titulo, 'titulo-eje', {
        'text-anchor': 'middle', 'aria-hidden': 'true',
        transform: 'translate(14 ' + (m.arr + ph / 2) + ') rotate(-90)'
      });

      // Guía vertical
      var guia = el('line', { y1: m.arr, y2: m.arr + ph, 'class': 'guia', 'aria-hidden': 'true', visibility: 'hidden' }, svg);

      // Series
      var grupos = [], puntos = [];
      datos.series.forEach(function (s, i) {
        var g = el('g', { 'class': 'serie serie-' + (i + 1), role: 'list', 'aria-label': 'Serie ' + s.nombre }, svg);
        var d = s.valores.map(function (v, j) { return (j ? 'L' : 'M') + sx(datos.minutos[j]) + ' ' + sy(v); }).join('');
        el('path', { d: d, 'class': 'linea', 'aria-hidden': 'true' }, g);
        puntos[i] = s.valores.map(function (v, j) {
          var p = el('path', {
            d: marcador(s.marcador, sx(datos.minutos[j]), sy(v), angosto ? 4 : 4.5),
            'class': 'marca punto', tabindex: '0', role: 'listitem',
            'aria-label': s.nombre + ', minuto ' + datos.minutos[j] + ': ' + numero(v, Y.decimales) + ' ' + Y.unidad
          }, g);
          p.addEventListener('focus', function () { activar(j, i); });
          p.addEventListener('blur', function () { desactivar(); });
          p.addEventListener('keydown', function (e) {
            var k = { ArrowRight: j + 1, ArrowLeft: j - 1, Home: 0, End: datos.minutos.length - 1 }[e.key];
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              var otra = datos.series.findIndex(function (_, n) { return n !== i && visibles[n]; });
              if (otra >= 0) { e.preventDefault(); puntos[otra][j].focus(); }
              return;
            }
            if (k == null) return;
            e.preventDefault();
            puntos[i][Math.max(0, Math.min(datos.minutos.length - 1, k))].focus();
          });
          return p;
        });
        grupos.push(g);
      });

      // Zona sensible al cursor y al toque (todo el área de la gráfica)
      var zona = el('rect', { x: m.izq, y: 0, width: pw, height: m.arr + ph, 'class': 'zona', 'aria-hidden': 'true' }, svg);
      svg.insertBefore(zona, grupos[0]);
      function indiceDesde(e) {
        var r = svg.getBoundingClientRect();
        var xv = (e.clientX - r.left) * (W / r.width);
        var min = X.min + (xv - m.izq) / pw * (X.max - X.min);
        var j = Math.round(min / X.paso);
        return Math.max(0, Math.min(datos.minutos.length - 1, j));
      }
      [zona].concat(grupos).forEach(function (n) {
        n.addEventListener('pointermove', function (e) { activar(indiceDesde(e)); });
        n.addEventListener('pointerdown', function (e) { activar(indiceDesde(e)); });
      });
      svg.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'mouse') desactivar();
      });

      var actual = -1;
      function activar(j, foco) {
        if (!visibles.some(Boolean)) return;
        actual = j;
        var xm = sx(datos.minutos[j]);
        guia.setAttribute('x1', xm); guia.setAttribute('x2', xm);
        guia.setAttribute('visibility', 'visible');
        puntos.forEach(function (ps, i) {
          ps.forEach(function (p, n) { p.classList.toggle('activo', n === j && visibles[i]); });
        });
        var c = document.createDocumentFragment();
        html('div', { 'class': 'titulo' }, c, X.nombre + ' ' + datos.minutos[j]);
        var yArriba = Infinity;
        datos.series.forEach(function (s, i) {
          if (!visibles[i]) return;
          filaGlobo(c, 'serie-' + (i + 1) + (foco === i ? ' enfocada' : ''), s.marcador, s.nombre,
            numero(s.valores[j], Y.decimales) + ' ' + Y.unidad);
          yArriba = Math.min(yArriba, sy(s.valores[j]));
        });
        var esc = partes.lienzo.clientWidth / W;
        mostrarGlobo(partes, c, xm * esc, yArriba * esc);
      }
      function desactivar() {
        actual = -1;
        guia.setAttribute('visibility', 'hidden');
        puntos.forEach(function (ps) { ps.forEach(function (p) { p.classList.remove('activo'); }); });
        ocultarGlobo(partes);
      }

      function aplicarVisibles() {
        grupos.forEach(function (g, i) {
          g.style.display = visibles[i] ? '' : 'none';
          puntos[i].forEach(function (p) {
            if (visibles[i]) p.setAttribute('tabindex', '0'); else p.removeAttribute('tabindex');
          });
        });
        if (actual >= 0 && visibles.some(Boolean)) activar(actual); else desactivar();
      }
      aplicarVisibles();
      return { aplicarVisibles: aplicarVisibles };
    }

    dibujo = dibujar();
    observar(partes.lienzo, function () { dibujo = dibujar() || dibujo; });

    tabla(caja,
      [datos.x.titulo].concat(datos.series.map(function (s) { return s.nombre + ' (' + datos.y.unidad + ')'; })),
      datos.minutos.map(function (min, j) {
        return [String(min)].concat(datos.series.map(function (s) { return numero(s.valores[j], datos.y.decimales); }));
      }),
      null,
      'Valores medidos en el PDF original (Libro 1, ilustración 2.19), a dos decimales.');
  }

  /* ---- Ilustración 3.5: barras ---- */

  function pw0(W, m) { return W - m.izq - m.der; }

  function barras(caja, datos) {
    var partes = armar(caja, datos);
    var visible = true;
    var dibujo = null;

    botonSerie(partes, datos.serie, 'barra', 'serie-1', function (activa) {
      visible = activa;
      if (dibujo) dibujo.aplicarVisibles();
    });

    function dibujar() {
      var W = Math.round(partes.lienzo.clientWidth);
      if (!W) return;
      var angosto = W < 520;
      var X = datos.x, Y = datos.y, n = datos.valores.length;

      partes.lienzo.querySelectorAll('svg').forEach(function (s) { s.remove(); });
      ocultarGlobo(partes);
      var svg = el('svg', {
        width: '100%', 'class': 'grafica-svg', role: 'group',
        'aria-label': 'Ilustración 3.5. ' + datos.titulo + '. Gasto mensual en pesos de 18 usuarios identificados.'
      });
      partes.lienzo.insertBefore(svg, partes.globo);

      var marcasY = [];
      for (var v = Y.min; v <= Y.max; v += Y.paso) marcasY.push(v);
      var anchoY = anchoMaximo(svg, marcasY.map(pesos), 'marca-eje');
      var m = { izq: Math.ceil(anchoY) + 30, der: 8, abj: 46 };
      if (pw0(W, m) / n < 18) m.abj = 58;
      var pw = W - m.izq - m.der;
      var banda = pw / n;
      var bw = Math.max(6, Math.min(30, banda * 0.62));
      // Etiquetas de valor giradas (como el original) solo si caben
      var conEtiquetas = banda >= 24;
      m.arr = conEtiquetas ? 70 : 14;
      var ph = angosto ? 230 : 280;
      var H = m.arr + ph + m.abj;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('height', H);

      var sy = function (y) { return m.arr + (Y.max - y) / (Y.max - Y.min) * ph; };
      var cx = function (i) { return m.izq + banda * (i + 0.5); };

      var reticula = el('g', { 'class': 'reticula', 'aria-hidden': 'true' }, svg);
      marcasY.forEach(function (v) {
        el('line', { x1: m.izq, x2: m.izq + pw, y1: sy(v), y2: sy(v) }, reticula);
        texto(svg, m.izq - 8, sy(v) + 4, pesos(v), 'marca-eje', { 'text-anchor': 'end', 'aria-hidden': 'true' });
      });
      el('line', { x1: m.izq, x2: m.izq + pw, y1: sy(0), y2: sy(0), 'class': 'base', 'aria-hidden': 'true' }, svg);
      // Si las bandas son angostas, los números van en dos renglones (pares abajo)
      var dosRenglones = banda < 18;
      datos.valores.forEach(function (_, i) {
        var dy = dosRenglones && i % 2 ? 30 : 18;
        texto(svg, cx(i), sy(0) + dy, String(i + 1), 'marca-eje', { 'text-anchor': 'middle', 'aria-hidden': 'true' });
        if (dosRenglones && i % 2) el('line', { x1: cx(i), x2: cx(i), y1: sy(0) + 2, y2: sy(0) + 20, 'class': 'guia-eje', 'aria-hidden': 'true' }, svg);
      });
      texto(svg, m.izq + pw / 2, H - 6, X.titulo, 'titulo-eje', { 'text-anchor': 'middle', 'aria-hidden': 'true' });
      texto(svg, 0, 0, Y.titulo, 'titulo-eje', {
        'text-anchor': 'middle', 'aria-hidden': 'true',
        transform: 'translate(14 ' + (m.arr + ph / 2) + ') rotate(-90)'
      });

      var g = el('g', { 'class': 'serie serie-1', role: 'list', 'aria-label': 'Serie ' + datos.serie }, svg);
      var items = datos.valores.map(function (v, i) {
        var sin = datos.sinEtiqueta.indexOf(i) >= 0;
        var item = el('g', {
          'class': 'barra', tabindex: '0', role: 'listitem',
          'aria-label': X.nombre + ' ' + (i + 1) + ': ' + pesos(v).replace(/ /g, ' ') + ' al mes' +
            (sin ? ' (sin etiqueta en el original; valor por la altura de la barra)' : '')
        }, g);
        // Zona sensible: toda la banda, más grande que la barra
        el('rect', { x: m.izq + banda * i, y: m.arr - (conEtiquetas ? m.arr : 0), width: banda, height: ph + (conEtiquetas ? m.arr : 0), 'class': 'zona' }, item);
        var x0 = cx(i) - bw / 2, y0 = sy(v), yb = sy(0), r = Math.min(4, bw / 2, yb - y0);
        el('path', {
          d: 'M' + x0 + ' ' + yb + 'V' + (y0 + r) + 'Q' + x0 + ' ' + y0 + ' ' + (x0 + r) + ' ' + y0 +
             'H' + (x0 + bw - r) + 'Q' + (x0 + bw) + ' ' + y0 + ' ' + (x0 + bw) + ' ' + (y0 + r) + 'V' + yb + 'Z',
          'class': 'marca'
        }, item);
        if (conEtiquetas && !sin) {
          texto(item, 0, 0, pesos(v), 'valor-barra', {
            'aria-hidden': 'true', transform: 'translate(' + (cx(i) + 4) + ' ' + (y0 - 5) + ') rotate(-90)'
          });
        }
        function mostrar() {
          items.forEach(function (o) { o.classList.toggle('activo', o === item); });
          var c = document.createDocumentFragment();
          html('div', { 'class': 'titulo' }, c, X.nombre + ' ' + (i + 1));
          filaGlobo(c, 'serie-1', 'barra', 'Gasto mensual', pesos(v));
          if (sin) html('div', { 'class': 'aviso' }, c, 'Sin etiqueta en el original; valor por la altura de la barra.');
          var esc = partes.lienzo.clientWidth / W;
          mostrarGlobo(partes, c, cx(i) * esc, y0 * esc);
        }
        item.addEventListener('pointerenter', mostrar);
        item.addEventListener('pointerdown', mostrar);
        item.addEventListener('focus', mostrar);
        item.addEventListener('blur', ocultar);
        item.addEventListener('keydown', function (e) {
          var k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
          if (k == null) return;
          e.preventDefault();
          items[Math.max(0, Math.min(n - 1, k))].focus();
        });
        return item;
      });
      function ocultar() {
        items.forEach(function (o) { o.classList.remove('activo'); });
        ocultarGlobo(partes);
      }
      svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') ocultar(); });

      function aplicarVisibles() {
        g.style.display = visible ? '' : 'none';
        items.forEach(function (o) {
          if (visible) o.setAttribute('tabindex', '0'); else o.removeAttribute('tabindex');
        });
        if (!visible) ocultar();
      }
      aplicarVisibles();
      return { aplicarVisibles: aplicarVisibles };
    }

    dibujo = dibujar();
    observar(partes.lienzo, function () { dibujo = dibujar() || dibujo; });

    var suma = datos.valores.reduce(function (a, b) { return a + b; }, 0);
    tabla(caja,
      [datos.x.titulo, datos.y.titulo],
      datos.valores.map(function (v, i) {
        return [String(i + 1) + (datos.sinEtiqueta.indexOf(i) >= 0 ? '*' : ''), pesos(v)];
      }),
      ['Promedio', pesos(Math.round(suma / datos.valores.length * 100) / 100)],
      'Valores de las etiquetas del PDF original (Libro 1, ilustración 3.5). ' +
      '* El usuario 13 no tiene etiqueta en el original; su barra mide lo mismo que las de $ 1 600.00. ' +
      'El promedio se calculó con estos datos.');
  }

  // Vuelve a dibujar si cambia el ancho (texto siempre a su tamaño real)
  function observar(nodo, fn) {
    var ancho = nodo.clientWidth, pendiente = 0;
    if (!('ResizeObserver' in window)) return;
    new ResizeObserver(function () {
      var w = nodo.clientWidth;
      if (w === ancho) return;
      ancho = w;
      cancelAnimationFrame(pendiente);
      pendiente = requestAnimationFrame(fn);
    }).observe(nodo);
  }

  // Cierra el globo al tocar fuera de una gráfica
  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('.grafica-lienzo')) return;
    document.querySelectorAll('.grafica-globo').forEach(function (g) { g.hidden = true; });
    document.querySelectorAll('.grafica-libro .activo').forEach(function (n) { n.classList.remove('activo'); });
    document.querySelectorAll('.grafica-libro .guia').forEach(function (n) { n.setAttribute('visibility', 'hidden'); });
  });

  function iniciar() {
    document.querySelectorAll('.grafica-libro[data-grafica]').forEach(function (caja) {
      var datos = DATOS[caja.getAttribute('data-grafica')];
      if (!datos || caja.dataset.lista) return;
      caja.dataset.lista = '1';
      if (datos.tipo === 'lineas') lineas(caja, datos); else barras(caja, datos);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
