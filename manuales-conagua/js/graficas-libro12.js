/*
 * Gráficas interactivas del Libro 12 (MAPAS, Conagua):
 * - l12-3-9: Ilustración 3.9 Variación horaria de la demanda para la ciudad de México
 * - l12-3-10: Ilustración 3.10 Coeficientes de variación horaria para distintas ciudades de México
 * - l12-3-11: Ilustración 3.11 Coeficientes de variación horaria para pequeñas comunidades
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro12.css.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var SERIES_X = {
    'l12-3-9': {
      titulo: 'Ilustración 3.9. Variación horaria de la demanda para la ciudad de México.',
      x: { min: 0, max: 24, maxEje: 24, marcas: [0, 5, 10, 15, 20], pasoRet: 1, titulo: 'Tiempo (horas)', prefijo: 'Hora ', sufijo: ':00 h' },
      y: { min: 0, max: 1.6, paso: 0.2, dec: 3, decEje: 1, titulo: 'Coeficiente de variación (q / qmed)', sufijo: '' },
      xs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
      valores: [0.570, 0.560, 0.550, 0.560, 0.580, 0.650, 0.800, 1.000, 1.300, 1.425, 1.475, 1.500, 1.495, 1.430, 1.350, 1.250, 1.175, 1.125, 1.100, 1.075, 1.000, 0.780, 0.650, 0.600, 0.570],
      nombre: 'q / qmed (ciudad de México)',
      nota: 'Se grafican los 24 valores de la Tabla 3.11 (y se cierra el ciclo en la hora 24 con el valor de la hora 0). En el dibujo del PDF original, la curva aparece desfasada respecto a los valores tabulados en la Tabla 3.11.'
    },
    'l12-3-10': {
      titulo: 'Ilustración 3.10. Coeficientes de variación horaria para distintas ciudades de México.',
      x: { min: 0, max: 24, maxEje: 24, marcas: [0, 5, 10, 15, 20], pasoRet: 1, titulo: 'Tiempo (horas)', prefijo: 'Hora ', sufijo: ':00 h' },
      y: { min: 0, max: 1.6, paso: 0.2, dec: 3, decEje: 1, titulo: 'Coeficiente de variación (q / qmed)', sufijo: '' },
      xs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
      valores: [0.606, 0.616, 0.633, 0.637, 0.651, 0.828, 0.938, 1.199, 1.307, 1.372, 1.343, 1.329, 1.288, 1.266, 1.216, 1.201, 1.196, 1.151, 1.121, 1.056, 0.901, 0.784, 0.710, 0.651, 0.606],
      nombre: 'q / qmed (distintas ciudades)'
    },
    'l12-3-11': {
      titulo: 'Ilustración 3.11. Coeficientes de variación horaria para pequeñas comunidades.',
      x: { min: 0, max: 24, maxEje: 24, marcas: [0, 5, 10, 15, 20], pasoRet: 1, titulo: 'Tiempo (horas)', prefijo: 'Hora ', sufijo: ':00 h' },
      y: { min: 0, max: 1.6, paso: 0.2, dec: 2, decEje: 1, titulo: 'Coeficiente de variación (q / qmed)', sufijo: '' },
      xs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
      valores: [0.45, 0.45, 0.45, 0.45, 0.45, 0.60, 0.90, 1.35, 1.50, 1.50, 1.50, 1.40, 1.20, 1.40, 1.40, 1.30, 1.30, 1.20, 1.00, 1.00, 0.90, 0.90, 0.80, 0.60, 0.45],
      nombre: 'q / qmed (pequeñas comunidades)'
    }
  };

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

  function armarSerieX(caja, cfg) {
    caja.textContent = '';
    caja.classList.add('grafica--lineas');
    var lienzo = h('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = h('div', { 'class': 'grafica-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);
    var N = cfg.xs.length;

    function dibujar() {
      var W = Math.round(lienzo.clientWidth) || 640;
      var angosto = W < 500, H = angosto ? 260 : 320;
      lienzo.querySelectorAll('svg').forEach(function (n) { n.remove(); });
      globo.hidden = true;
      var svg = el('svg', {
        viewBox: '0 0 ' + W + ' ' + H,
        width: '100%',
        height: H,
        'class': 'grafica-svg',
        tabindex: '0',
        role: 'img',
        'aria-label': cfg.titulo + ' Use las flechas izquierda y derecha para recorrer los valores.'
      });
      lienzo.insertBefore(svg, globo);
      var m = { izq: 58, der: 16, arr: 16, abj: 44 };
      var aw = W - m.izq - m.der, ah = H - m.arr - m.abj;
      var xMin = cfg.x.min, xMax = cfg.x.maxEje != null ? cfg.x.maxEje : cfg.x.max;
      var yMin = cfg.y.min, yMax = cfg.y.max;
      function px(xv) { return m.izq + ((xv - xMin) / (xMax - xMin)) * aw; }
      function py(yv) { return m.arr + (1 - (yv - yMin) / (yMax - yMin)) * ah; }

      var gRet = el('g', { 'class': 'reticula' }, svg);
      var gEjes = el('g', { 'class': 'ejes' }, svg);
      for (var yv = yMin; yv <= yMax + 1e-6; yv += cfg.y.paso) {
        var yy = py(yv);
        el('line', { x1: m.izq, y1: yy, x2: W - m.der, y2: yy }, gRet);
        el('text', { x: m.izq - 6, y: yy + 3.5, 'text-anchor': 'end' }, gEjes).textContent = yv.toFixed(cfg.y.decEje);
      }
      if (cfg.x.pasoRet) {
        for (var xv = xMin; xv <= xMax + 1e-6; xv += cfg.x.pasoRet) {
          el('line', { x1: px(xv), y1: m.arr, x2: px(xv), y2: H - m.abj }, gRet);
        }
      }
      cfg.x.marcas.forEach(function (xv) {
        var xx = px(xv);
        el('line', { x1: xx, y1: m.arr, x2: xx, y2: H - m.abj, 'class': 'eje' }, gRet);
        el('text', { x: xx, y: H - m.abj + 15, 'text-anchor': 'middle' }, gEjes).textContent = String(xv);
      });
      el('line', { x1: m.izq, y1: m.arr, x2: m.izq, y2: H - m.abj, 'class': 'eje' }, gEjes);
      el('line', { x1: m.izq, y1: H - m.abj, x2: W - m.der, y2: H - m.abj, 'class': 'eje' }, gEjes);
      el('text', { x: m.izq + aw / 2, y: H - 8, 'text-anchor': 'middle', 'class': 'eje-titulo' }, gEjes).textContent = cfg.x.titulo;
      var yt = el('text', { x: 14, y: m.arr + ah / 2, 'text-anchor': 'middle', 'class': 'eje-titulo', transform: 'rotate(-90 14 ' + (m.arr + ah / 2) + ')' }, gEjes);
      yt.textContent = cfg.y.titulo;

      var pts = cfg.xs.map(function (xv, i) { return px(xv).toFixed(1) + ',' + py(cfg.valores[i]).toFixed(1); }).join(' ');
      el('polyline', { fill: 'none', points: pts, 'class': 'linea serie-1' }, svg);
      var gPts = el('g', { 'class': 'serie-1' }, svg);
      cfg.xs.forEach(function (xv, i) {
        el('circle', { cx: px(xv), cy: py(cfg.valores[i]), r: 3, 'class': 'aro' }, gPts);
      });

      var guia = el('line', { x1: 0, y1: m.arr, x2: 0, y2: H - m.abj, 'class': 'guia', hidden: '' }, svg);
      var pAct = el('circle', { cx: 0, cy: 0, r: 5, 'class': 'punto-activo serie-1', fill: 'var(--grafica-serie-1)', hidden: '' }, svg);

      var idx = -1;
      function mostrar(i) {
        if (i < 0 || i >= N) return;
        idx = i;
        var xv = cfg.xs[i], yv = cfg.valores[i];
        var cx = px(xv), cy = py(yv);
        guia.setAttribute('x1', cx);
        guia.setAttribute('x2', cx);
        guia.removeAttribute('hidden');
        pAct.setAttribute('cx', cx);
        pAct.setAttribute('cy', cy);
        pAct.removeAttribute('hidden');
        globo.textContent = '';
        h('strong', null, globo, cfg.x.prefijo + xv + cfg.x.sufijo);
        h('div', null, globo, cfg.nombre + ': ' + yv.toFixed(cfg.y.dec));
        globo.hidden = false;
        var gw = globo.offsetWidth || 160;
        var left = cx + 12 + gw > W - m.der ? cx - gw - 12 : cx + 12;
        if (left < m.izq) left = m.izq;
        globo.style.left = left + 'px';
        globo.style.top = Math.max(m.arr, Math.min(H - m.abj - 46, cy - 22)) + 'px';
      }
      function ocultar() {
        idx = -1;
        guia.setAttribute('hidden', '');
        pAct.setAttribute('hidden', '');
        globo.hidden = true;
      }

      svg.addEventListener('pointermove', function (ev) {
        var r = svg.getBoundingClientRect();
        var xRel = ((ev.clientX - r.left) / r.width) * W;
        var best = 0, bestD = Infinity;
        for (var i = 0; i < N; i++) {
          var d = Math.abs(px(cfg.xs[i]) - xRel);
          if (d < bestD) { bestD = d; best = i; }
        }
        mostrar(best);
      });
      svg.addEventListener('pointerleave', ocultar);
      svg.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); mostrar(idx < 0 ? 0 : Math.min(N - 1, idx + 1)); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); mostrar(idx < 0 ? N - 1 : Math.max(0, idx - 1)); }
        else if (ev.key === 'Escape') { ocultar(); }
      });
    }

    dibujar();
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function () { dibujar(); });
      ro.observe(lienzo);
    }
  }

  function iniciar() {
    document.querySelectorAll('.grafica-libro[data-grafica]').forEach(function (caja) {
      var id = caja.getAttribute('data-grafica');
      if (SERIES_X[id]) armarSerieX(caja, SERIES_X[id]);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
