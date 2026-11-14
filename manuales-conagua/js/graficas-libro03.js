/*
 * Gráfica interactiva del Libro 3 (MAPAS, Conagua): Ilustración 2.8
 * «La demanda de agua en condiciones normales y de emergencia».
 *
 * Uso: <div class="grafica-libro" data-grafica="l3-2-8"></div> y este script con
 * defer. Sin librerías; usa los estilos de ../css/graficas.css (leyenda, globo,
 * tabla de datos) y ../css/graficas-libro03.css (marcas de los sucesos).
 *
 * Datos tomados del PDF original (página 42 del libro): cada serie es una
 * polilínea vectorial de 289 vértices, uno cada 10 minutos de 0 a 48 horas;
 * se convirtieron a L/s con la retícula de los ejes (0 a 50 L/s, 0 a 45 h) y
 * se redondearon a una décima. Los sucesos son las líneas punteadas del
 * original, con su hora medida de la misma forma.
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var DATOS = {
    paso: 10, // minutos entre vértices
    series: [
      { nombre: 'Demanda normal', valores: [3.4,3.4,3.4,3.4,3.4,3.4,3.4,3.4,3.5,3.5,3.4,3.4,3.3,3.3,3.3,3.3,3.3,3.3,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.1,3.1,3.1,3.1,3.1,3.1,4.3,4.3,4.3,4.3,4.3,4.3,7.7,7.7,7.7,7.7,7.7,7.7,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,7.8,7.8,7.8,7.8,7.8,7.8,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.8,7.8,7.8,7.8,7.8,7.8,6.3,6.3,6.3,6.3,6.3,6.3,5.9,5.9,5.9,5.9,5.9,5.9,5.7,5.7,5.7,5.7,5.7,5.7,5.1,5.1,5.1,5.1,5.1,5.1,4.4,4.4,4.4,4.4,4.4,4.4,4.1,4.1,4.1,4.1,4.1,4.1,3.9,3.9,3.9,3.9,3.9,3.9,3.2,3.2,3.2,3.2,3.2,3.2,3.4,3.4,3.4,3.4,3.4,3.4,3.4,3.4,3.5,3.5,3.4,3.5,3.3,3.3,3.3,3.3,3.3,3.3,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.1,3.1,3.1,3.1,3.1,3.1,4.3,4.3,4.3,4.3,4.3,4.3,7.7,7.7,7.7,7.7,7.7,7.7,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,7.8,7.8,7.8,7.8,7.8,7.8,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.8,7.8,7.8,7.8,7.8,7.8,6.3,6.3,6.3,6.3,6.3,6.3,5.9,5.9,5.9,5.9,5.9,5.9,5.7,5.7,5.7,5.7,5.7,5.7,5.1,5.1,5.1,5.1,5.1,5.1,4.4,4.4,4.4,4.4,4.4,4.4,4.1,4.1,4.1,4.1,4.1,4.1,3.9,3.9,3.9,3.9,3.9,3.9,3.2,3.2,3.2,3.2,3.2,3.2,3.4] },
      { nombre: 'Demanda por sismo', valores: [3.4,3.4,3.4,3.4,3.4,3.4,3.5,3.5,3.5,3.5,3.5,3.5,3.3,3.3,3.3,3.3,3.3,3.3,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.1,3.1,3.1,3.1,3.1,3.1,4.3,4.3,4.3,4.3,4.3,4.3,7.7,7.7,7.7,7.7,7.7,7.7,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,8.4,7.8,7.8,7.8,7.8,7.8,7.8,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.8,7.8,7.8,7.8,7.8,7.8,6.3,6.3,6.3,6.3,6.3,6.3,5.9,5.9,5.9,5.9,5.9,5.9,37.9,37.8,0,0,0,0,0,0,0,0,0,0,0,37.3,37.3,37.3,37.2,37.1,36.9,37.1,37.2,37.1,37,36.9,36.8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36.6,36.6,36.6,36.5,36.4,36.3,36.5,36.7,36.6,36.5,36.4,36.3,36.5,36.6,36.5,36.5,36.4,43.8,43.9,44,43.9,43.9,43.8,46,46.2,46.2,46.2,46.1,46,46.6,46.8,46.7,46.6,46.6,46.6,46.7,46.7,46.7,46.6,46.5,46.7,46.4,46.3,46.2,46.2,46.2,46.3,15.3,15.3,15.2,15.1,15.1,15,14.9,14.9,14.8,0,15.3,15.4,15.3,15.3,15.2,15.2,15.1,15,15,14.9,14.8,14.7,15.1,15.4,15.5,15.4,15.3,15.3,15.2,15.2,6.3,6.3,6.3,6.3,6.3,6.3,5.9,5.9,5.9,5.9,5.9,5.9,5.7,5.7,5.7,5.7,5.7,5.7,5.1,5.1,5.1,5.1,5.1,5.1,4.4,4.4,4.4,4.4,4.4,4.4,4.1,4.1,4.1,4.1,4.1,4.1,4,4,4,4,4,4,3.2,3.2,3.2,3.2,3.2,3.2,3.4] }
    ],
    sucesos: [
      [17.82, 'Ocurre el sismo; Se interrumpe bombeo. Se presentan tres fugas importantes en la red'],
      [20.24, 'Se recupera parcialmente el bombeo'],
      [22.17, 'Se interumpe nuevamente el bombeo'],
      [27.12, 'Se restablece el bombeo'],
      [34.85, 'Se repara fuga 1'],
      [36.54, 'Se repara fuga 2'],
      [40.04, 'Se repara fuga 3']
    ]
  };
  var N = DATOS.series[0].valores.length;

  function el(t, a, p) {
    var n = document.createElementNS(NS, t);
    for (var k in a) if (a[k] != null) n.setAttribute(k, a[k]);
    if (p) p.appendChild(n);
    return n;
  }
  function h(t, a, p, txt) {
    var n = document.createElement(t);
    for (var k in a) if (a[k] != null) n.setAttribute(k, a[k]);
    if (txt != null) n.textContent = txt;
    if (p) p.appendChild(n);
    return n;
  }
  function hora(i) {
    var m = i * DATOS.paso;
    return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') + ' h';
  }
  function num(v) { return v.toFixed(1).replace('.', '.') + ' L/s'; }

  function armar(caja) {
    caja.textContent = '';
    caja.classList.add('grafica--lineas');
    var visibles = [true, true];
    var leyenda = h('div', { 'class': 'grafica-leyenda', role: 'group', 'aria-label': 'Series de la gráfica' }, caja);
    var lienzo = h('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = h('div', { 'class': 'grafica-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);
    var dibujo = null;
    DATOS.series.forEach(function (s, i) {
      var b = h('button', { type: 'button', 'class': 'grafica-serie serie-' + (2 - i), 'aria-pressed': 'true' }, leyenda);
      var m = el('svg', { viewBox: '0 0 28 14', width: '28', height: '14', 'aria-hidden': 'true', 'class': 'grafica-muestra' }, b);
      el('line', { x1: 1, y1: 7, x2: 27, y2: 7, 'class': 'linea' }, m);
      h('span', null, b, s.nombre);
      b.addEventListener('click', function () {
        visibles[i] = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(visibles[i]));
        if (dibujo) dibujo.aplicar();
      });
    });

    function dibujar() {
      var W = Math.round(lienzo.clientWidth);
      if (!W) return null;
      var angosto = W < 520, H = angosto ? 300 : 380;
      lienzo.querySelectorAll('svg').forEach(function (n) { n.remove(); });
      globo.hidden = true;
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H, 'class': 'grafica-svg', tabindex: '0',
        role: 'img', 'aria-label': 'Ilustración 2.8. Flujo en litros por segundo contra tiempo en horas, de 0 a 48 horas. ' +
          'Use las flechas para recorrer la gráfica cada 10 minutos (Inicio y Fin para los extremos).' });
      lienzo.insertBefore(svg, globo);
      var m = { izq: 44, der: 12, arr: 30, abj: 44 };
      var pw = W - m.izq - m.der, ph = H - m.arr - m.abj;
      var sx = function (t) { return m.izq + t / 48 * pw; };
      var sy = function (q) { return m.arr + (50 - q) / 50 * ph; };
      var ret = el('g', { 'class': 'reticula', 'aria-hidden': 'true' }, svg);
      for (var q = 0; q <= 50; q += 5) {
        el('line', { x1: m.izq, x2: m.izq + pw, y1: sy(q), y2: sy(q) }, ret);
        if (q % 10 === 0) el('text', { x: m.izq - 8, y: sy(q) + 4, 'class': 'marca-eje', 'text-anchor': 'end', 'aria-hidden': 'true' }, svg).textContent = q;
      }
      for (var t = 0; t <= 45; t += 5) {
        if (angosto && t % 10) continue;
        el('text', { x: sx(t), y: m.arr + ph + 18, 'class': 'marca-eje', 'text-anchor': 'middle', 'aria-hidden': 'true' }, svg).textContent = t.toFixed(2);
      }
      el('rect', { x: m.izq, y: m.arr, width: pw, height: ph, 'class': 'marco', 'aria-hidden': 'true' }, svg);
      el('text', { x: m.izq + pw / 2, y: H - 6, 'class': 'titulo-eje', 'text-anchor': 'middle', 'aria-hidden': 'true' }, svg).textContent = 'Tiempo (horas)';
      el('text', { 'class': 'titulo-eje', 'text-anchor': 'middle', 'aria-hidden': 'true', transform: 'translate(13 ' + (m.arr + ph / 2) + ') rotate(-90)' }, svg).textContent = 'Flujo (l/s)';
      // Sucesos: líneas punteadas numeradas
      var suc = el('g', { 'class': 'sucesos', 'aria-hidden': 'true' }, svg);
      DATOS.sucesos.forEach(function (s, k) {
        el('line', { x1: sx(s[0]), x2: sx(s[0]), y1: m.arr - 4, y2: m.arr + ph, 'class': 'suceso' }, suc);
        var cx = sx(s[0]), cy = m.arr - 14 - (k % 2) * 0;
        el('circle', { cx: cx, cy: cy, r: 8, 'class': 'suceso-num' }, suc);
        el('text', { x: cx, y: cy + 3.5, 'text-anchor': 'middle', 'class': 'suceso-txt' }, suc).textContent = k + 1;
      });
      var grupos = DATOS.series.map(function (s, i) {
        var g = el('g', { 'class': 'serie serie-' + (2 - i), 'aria-hidden': 'true' }, svg);
        el('path', { d: s.valores.map(function (v, j) { return (j ? 'L' : 'M') + sx(j / 6).toFixed(1) + ' ' + sy(v).toFixed(1); }).join(''), 'class': 'linea' }, g);
        return g;
      });
      var guia = el('line', { y1: m.arr, y2: m.arr + ph, 'class': 'guia', visibility: 'hidden', 'aria-hidden': 'true' }, svg);
      var puntos = DATOS.series.map(function (s, i) { return el('circle', { r: 4.5, 'class': 'marca punto-l3 serie-' + (2 - i), visibility: 'hidden', 'aria-hidden': 'true' }, svg); });
      var actual = -1;
      function activar(j) {
        if (!visibles.some(Boolean)) return;
        actual = j;
        var x = sx(j / 6);
        guia.setAttribute('x1', x); guia.setAttribute('x2', x); guia.setAttribute('visibility', 'visible');
        var c = document.createDocumentFragment(), yArr = Infinity;
        h('div', { 'class': 'titulo' }, c, 'Tiempo ' + hora(j));
        DATOS.series.forEach(function (s, i) {
          puntos[i].setAttribute('visibility', visibles[i] ? 'visible' : 'hidden');
          if (!visibles[i]) return;
          puntos[i].setAttribute('cx', x); puntos[i].setAttribute('cy', sy(s.valores[j]));
          var f = h('div', { 'class': 'fila serie-' + (2 - i) }, c);
          var mu = el('svg', { viewBox: '0 0 12 12', width: '12', height: '12', 'aria-hidden': 'true' }, f);
          el('circle', { cx: 6, cy: 6, r: 4, 'class': 'marca' }, mu);
          h('span', { 'class': 'nombre' }, f, s.nombre);
          h('span', { 'class': 'valor' }, f, num(s.valores[j]));
          yArr = Math.min(yArr, sy(s.valores[j]));
        });
        globo.innerHTML = ''; globo.appendChild(c); globo.hidden = false;
        var esc = lienzo.clientWidth / W, gw = globo.offsetWidth, gh = globo.offsetHeight;
        var px = x * esc + 14; if (px + gw > lienzo.clientWidth - 4) px = x * esc - 14 - gw;
        globo.style.left = Math.max(4, px) + 'px';
        globo.style.top = Math.max(4, yArr * esc - gh - 10) + 'px';
      }
      function quitar() {
        actual = -1; guia.setAttribute('visibility', 'hidden'); globo.hidden = true;
        puntos.forEach(function (p) { p.setAttribute('visibility', 'hidden'); });
      }
      function indice(e) {
        var r = svg.getBoundingClientRect();
        var t = ((e.clientX - r.left) * (W / r.width) - m.izq) / pw * 48;
        return Math.max(0, Math.min(N - 1, Math.round(t * 6)));
      }
      svg.addEventListener('pointermove', function (e) { activar(indice(e)); });
      svg.addEventListener('pointerdown', function (e) { activar(indice(e)); });
      svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') quitar(); });
      svg.addEventListener('blur', quitar);
      svg.addEventListener('keydown', function (e) {
        var j = actual < 0 ? 0 : actual;
        var k = { ArrowRight: j + 1, ArrowLeft: j - 1, PageUp: j + 6, PageDown: j - 6, Home: 0, End: N - 1 }[e.key];
        if (k == null) return;
        e.preventDefault();
        activar(Math.max(0, Math.min(N - 1, k)));
      });
      function aplicar() {
        grupos.forEach(function (g, i) { g.style.display = visibles[i] ? '' : 'none'; });
        if (actual >= 0 && visibles.some(Boolean)) activar(actual); else quitar();
      }
      aplicar();
      return { aplicar: aplicar };
    }
    dibujo = dibujar();
    if ('ResizeObserver' in window) {
      var ancho = lienzo.clientWidth;
      new ResizeObserver(function () {
        if (lienzo.clientWidth === ancho) return;
        ancho = lienzo.clientWidth;
        requestAnimationFrame(function () { dibujo = dibujar() || dibujo; });
      }).observe(lienzo);
    }

    // Sucesos, como en el original
    var ol = h('ol', { 'class': 'grafica-sucesos' }, caja);
    DATOS.sucesos.forEach(function (s) {
      var li = h('li', null, ol);
      h('span', { 'class': 'hora' }, li, '≈ ' + s[0].toFixed(1) + ' h');
      li.appendChild(document.createTextNode(' ' + s[1]));
    });
    h('p', { 'class': 'grafica-nota' }, caja, 'En el original, el intervalo de 0 a 17.8 h, antes del sismo, se rotula «Sevicio normal» (así, con errata).');

    // Tabla de datos (se arma al abrirla)
    var det = h('details', { 'class': 'grafica-datos' }, caja);
    h('summary', null, det, 'Datos de la gráfica (cada 10 minutos)');
    det.addEventListener('toggle', function () {
      if (!det.open || det.querySelector('table')) return;
      var t = h('table', null, det), tr = h('tr', null, h('thead', null, t));
      ['Tiempo', 'Demanda normal (L/s)', 'Demanda por sismo (L/s)'].forEach(function (x) { h('th', { scope: 'col' }, tr, x); });
      var tb = h('tbody', null, t);
      for (var j = 0; j < N; j++) {
        var r = h('tr', null, tb);
        h('th', { scope: 'row' }, r, hora(j));
        h('td', null, r, DATOS.series[0].valores[j].toFixed(1));
        h('td', null, r, DATOS.series[1].valores[j].toFixed(1));
      }
      h('p', { 'class': 'grafica-nota' }, det, 'Valores medidos en el PDF original (polilíneas vectoriales), a una décima de L/s.');
    });
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('.grafica-lienzo')) return;
    document.querySelectorAll('[data-grafica^="l3-"] .grafica-globo').forEach(function (g) { g.hidden = true; });
  });

  function iniciar() {
    document.querySelectorAll('.grafica-libro[data-grafica="l3-2-8"]').forEach(function (c) {
      if (c.dataset.lista) return;
      c.dataset.lista = '1';
      armar(c);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
