/*
 * Gráficas interactivas del Libro 16 (MAPAS, Conagua):
 * - l16-9-3: Ilustración 9.3 Secuencia de descarga típica de tableros de mediana tensión
 * - l16-9-4: Ilustración 9.4 Secuencia de carga o de descarga
 * - l16-9-5: Ilustración 9.5 Curva características típicas de descarga a 20 °C (68 °F)
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro16.css.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var GRAFICAS = {
    'l16-9-3': {
      titulo: 'Ilustración 9.3. Secuencia de descarga típica de tableros de mediana tensión.',
      x: { min: 0, max: 100, maxEje: 100, marcas: [0, 15, 85, 100], pasoRet: 20, titulo: 'Tiempo (%)', prefijo: 't = ', sufijo: ' %' },
      y: { min: 0, max: 100, paso: 20, dec: 0, decEje: 0, titulo: 'Corriente relativa (%)', sufijo: ' %' },
      xs: [0, 14.9, 15, 84.9, 85, 100],
      series: [
        { id: 'perfil', nombre: 'Perfil de descarga', valores: [85, 85, 25, 25, 85, 85] }
      ]
    },
    'l16-9-4': {
      titulo: 'Ilustración 9.4. Secuencia de carga o de descarga.',
      x: { min: 0, max: 500, maxEje: 500, marcas: [0, 100, 200, 300, 400, 500], pasoRet: 100, titulo: 'Tiempo (min)', prefijo: 'T = ', sufijo: ' min' },
      y: { min: 0, max: 100, paso: 20, dec: 0, decEje: 0, titulo: 'Corriente (A)', sufijo: ' A' },
      xs: [0, 1, 1.1, 479, 479.1, 500],
      series: [
        { id: 'corriente', nombre: 'Corriente de descarga', valores: [85, 85, 15, 15, 85, 85] }
      ]
    },
    'l16-9-5': {
      titulo: 'Ilustración 9.5. Curva características típicas de descarga a 20 °C (68 °F).',
      x: { min: 0, max: 100, maxEje: 100, marcas: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], pasoRet: 10, titulo: 'Porcentaje de capacidad (%)', prefijo: 'Capacidad = ', sufijo: ' %' },
      y: { min: 0.6, max: 1.4, paso: 0.1, dec: 2, decEje: 1, titulo: 'Volts / celda', sufijo: ' V' },
      xs: [0.88, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 100],
      series: [
        { id: 'c01', nombre: '0.1 C5A', valores: [1.35, 1.32, 1.30, 1.29, 1.28, 1.27, 1.26, 1.25, 1.23, 1.19, 1.13, 1.07, 1.00] },
        { id: 'c02', nombre: '0.2 C5A', valores: [1.34, 1.30, 1.28, 1.27, 1.26, 1.25, 1.24, 1.23, 1.21, 1.16, 1.09, 0.99, null] },
        { id: 'c05', nombre: '0.5 C5A', valores: [1.31, 1.27, 1.24, 1.22, 1.21, 1.20, 1.18, 1.17, 1.14, 1.07, 0.92, null, null] },
        { id: 'c10', nombre: '1.0 C5A', valores: [1.28, 1.22, 1.19, 1.16, 1.14, 1.12, 1.09, 1.06, 1.01, 0.85, null, null, null] },
        { id: 'c20', nombre: '2.0 C5A', valores: [1.20, 1.12, 1.06, 1.01, 0.96, 0.91, 0.86, 0.80, 0.61, null, null, null, null] }
      ]
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

  function armarGrafica(caja, cfg) {
    caja.textContent = '';
    caja.classList.add('grafica--lineas');

    var visibles = cfg.series.map(function () { return true; });
    if (cfg.series.length > 1) {
      var ley = h('div', { 'class': 'grafica-leyenda' }, caja);
      cfg.series.forEach(function (s, si) {
        var btn = h('button', {
          type: 'button',
          'class': 'grafica-serie serie-' + (si + 1),
          'aria-pressed': 'true'
        }, ley);
        var m = el('svg', { width: 16, height: 10, viewBox: '0 0 16 10', 'class': 'grafica-muestra', 'aria-hidden': 'true' }, btn);
        el('line', { x1: 1, y1: 5, x2: 15, y2: 5, stroke: 'var(--c)', 'stroke-width': 2.2 }, m);
        el('circle', { cx: 8, cy: 5, r: 2.5, fill: 'var(--c)' }, m);
        h('span', {}, btn, s.nombre);
        btn.addEventListener('click', function () {
          visibles[si] = !visibles[si];
          btn.setAttribute('aria-pressed', visibles[si] ? 'true' : 'false');
          dibujar();
        });
      });
    }

    var lienzo = h('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = h('div', { 'class': 'grafica-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);
    var N = cfg.xs.length;

    function dibujar() {
      var W = Math.round(lienzo.clientWidth) || 640;
      var angosto = W < 500, H = angosto ? 250 : 310;
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
      var m = { izq: 54, der: 18, arr: 16, abj: 44 };
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
        el('text', { x: m.izq - 6, y: yy + 3.5, 'text-anchor': 'end', 'class': 'marca-eje' }, gEjes).textContent = yv.toFixed(cfg.y.decEje);
      }
      if (cfg.x.pasoRet) {
        for (var xv = xMin; xv <= xMax + 1e-6; xv += cfg.x.pasoRet) {
          el('line', { x1: px(xv), y1: m.arr, x2: px(xv), y2: H - m.abj }, gRet);
        }
      }
      cfg.x.marcas.forEach(function (xv) {
        var xx = px(xv);
        el('line', { x1: xx, y1: m.arr, x2: xx, y2: H - m.abj, 'class': 'eje' }, gRet);
        el('text', { x: xx, y: H - m.abj + 15, 'text-anchor': 'middle', 'class': 'marca-eje' }, gEjes).textContent = String(xv);
      });
      el('rect', { x: m.izq, y: m.arr, width: aw, height: ah, 'class': 'marco' }, svg);
      el('text', { x: m.izq + aw / 2, y: H - 6, 'text-anchor': 'middle', 'class': 'titulo-eje' }, gEjes).textContent = cfg.x.titulo;
      var ty = m.arr + ah / 2;
      el('text', { x: 15, y: ty, 'text-anchor': 'middle', transform: 'rotate(-90 15 ' + ty + ')', 'class': 'titulo-eje' }, gEjes).textContent = cfg.y.titulo;

      var guia = el('line', { x1: m.izq, y1: m.arr, x2: m.izq, y2: H - m.abj, 'class': 'guia', hidden: '' }, svg);
      var aros = [];

      cfg.series.forEach(function (s, si) {
        if (!visibles[si]) return;
        var gS = el('g', { 'class': 'serie serie-' + (si + 1) }, svg);
        var ptsArr = [];
        cfg.xs.forEach(function (xv, i) {
          if (s.valores[i] != null) {
            ptsArr.push(px(xv).toFixed(1) + ',' + py(s.valores[i]).toFixed(1));
          }
        });
        if (ptsArr.length > 1) {
          el('polyline', { points: ptsArr.join(' '), 'class': 'linea' }, gS);
        }
        cfg.xs.forEach(function (xv, i) {
          if (s.valores[i] != null) {
            el('circle', { cx: px(xv), cy: py(s.valores[i]), r: 3.0, 'class': 'marca' }, gS);
          }
        });
        var aro = el('circle', { cx: 0, cy: 0, r: 5.5, 'class': 'aro serie-' + (si + 1), hidden: '' }, svg);
        aros.push({ si: si, el: aro });
      });

      var idx = -1;
      function mostrar(i) {
        if (i < 0 || i >= N) { ocultar(); return; }
        idx = i;
        var xv = cfg.xs[i];
        var xx = px(xv);
        guia.setAttribute('x1', xx);
        guia.setAttribute('x2', xx);
        guia.removeAttribute('hidden');
        var lines = [cfg.x.prefijo + xv + cfg.x.sufijo];
        aros.forEach(function (a) {
          var yv = cfg.series[a.si].valores[i];
          if (yv == null) {
            a.el.setAttribute('hidden', '');
          } else {
            a.el.setAttribute('cx', xx);
            a.el.setAttribute('cy', py(yv));
            a.el.removeAttribute('hidden');
            lines.push(cfg.series[a.si].nombre + ': ' + yv.toFixed(cfg.y.dec) + cfg.y.sufijo);
          }
        });
        globo.textContent = lines.join(' · ');
        globo.hidden = false;
        var gw = globo.offsetWidth || 160;
        var gx = Math.min(Math.max(xx - gw / 2, 4), W - gw - 4);
        globo.style.left = gx + 'px';
        globo.style.top = '4px';
      }
      function ocultar() {
        idx = -1;
        guia.setAttribute('hidden', '');
        aros.forEach(function (a) { a.el.setAttribute('hidden', ''); });
        globo.hidden = true;
      }

      var zona = el('rect', { x: m.izq, y: m.arr, width: aw, height: ah, 'class': 'zona' }, svg);
      zona.addEventListener('pointermove', function (e) {
        var r = svg.getBoundingClientRect();
        var mx = (e.clientX - r.left) * (W / r.width);
        var xv = xMin + ((mx - m.izq) / aw) * (xMax - xMin);
        var best = 0, bd = 1e9;
        for (var i = 0; i < N; i++) {
          var d = Math.abs(cfg.xs[i] - xv);
          if (d < bd) { bd = d; best = i; }
        }
        mostrar(best);
      });
      zona.addEventListener('pointerleave', ocultar);
      svg.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); mostrar(idx < 0 ? 0 : Math.min(N - 1, idx + 1)); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); mostrar(idx < 0 ? N - 1 : Math.max(0, idx - 1)); }
        else if (e.key === 'Escape') { ocultar(); }
      });
    }

    dibujar();
    if (window.ResizeObserver) {
      new ResizeObserver(dibujar).observe(lienzo);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.grafica-libro[data-grafica]').forEach(function (caja) {
      var id = caja.getAttribute('data-grafica');
      if (GRAFICAS[id]) armarGrafica(caja, GRAFICAS[id]);
    });
  });
})();
