/*
 * Gráficas interactivas del Libro 15 (MAPAS, Conagua):
 * - l15-4-2: Ilustración 4.2 Curva del sistema con 100 % de apertura de la válvula
 * - l15-4-5: Ilustración 4.5 Ejemplo de puntos obtenidos sobre una gráfica Q-H
 * - l15-4-6: Ilustración 4.6 Ejemplo de Curva Q-H
 * - l15-10-3: Ilustración 10.3 Curva de la bomba correspondiente a un impulsor (carga)
 * - l15-10-4: Ilustración 10.4 Curva de la bomba correspondiente a un impulsor (Eficiencia)
 * - l15-10-5: Ilustración 10.5 Curva de la bomba correspondiente a un impulsor (NPSH3)
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro15.css.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var GRAFICAS = {
    'l15-4-2': {
      titulo: 'Ilustración 4.2. Curva del sistema con 100 % de apertura de la válvula.',
      x: { min: 0, max: 600, maxEje: 600, marcas: [0, 100, 200, 300, 400, 500, 600], pasoRet: 50, titulo: 'Gasto (L/s)', prefijo: 'Q = ', sufijo: ' L/s' },
      y: { min: 0, max: 60, paso: 10, dec: 1, decEje: 0, titulo: 'Carga total (m)', sufijo: ' m' },
      xs: [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600],
      series: [
        { id: 'nuevo', nombre: 'H con tubo nuevo', valores: [13.3, 13.6, 14.1, 15.0, 16.5, 17.9, 19.8, 22.3, 24.7, 27.5, 31.1, 35.0, 39.2] },
        { id: 'usado', nombre: 'H con tubo usado', valores: [13.3, 13.4, 14.2, 15.7, 17.7, 20.1, 23.1, 26.8, 30.7, 35.5, 40.5, 46.6, 53.1] },
        { id: 'estatica', nombre: 'Carga estática', valores: [13.3, 13.3, 13.3, 13.3, 13.3, 13.3, 13.3, 13.3, 13.3, 13.3, 13.3, 13.3, 13.3] }
      ]
    },
    'l15-4-5': {
      titulo: 'Ilustración 4.5. Ejemplo de puntos obtenidos sobre una gráfica Q-H.',
      soloPuntos: true,
      x: { min: 0, max: 8, maxEje: 8, marcas: [0, 1, 2, 3, 4, 5, 6, 7, 8], pasoRet: 1, titulo: 'Gasto (m³/h)', prefijo: 'Q = ', sufijo: ' m³/h' },
      y: { min: 0, max: 140, paso: 20, dec: 0, decEje: 0, titulo: 'Altura dinámica total (m)', sufijo: ' m' },
      xs: [0, 1, 2, 3, 4, 5, 6, 7],
      series: [
        { id: 'puntos', nombre: 'Puntos de ensayo Q-H', valores: [130, 128, 124, 116, 106, 89, 64, 36] }
      ]
    },
    'l15-4-6': {
      titulo: 'Ilustración 4.6. Ejemplo de Curva Q-H.',
      x: { min: 0, max: 8, maxEje: 8, marcas: [0, 1, 2, 3, 4, 5, 6, 7, 8], pasoRet: 1, titulo: 'Gasto (m³/h)', prefijo: 'Q = ', sufijo: ' m³/h' },
      y: { min: 0, max: 140, paso: 20, dec: 0, decEje: 0, titulo: 'Altura dinámica total (m)', sufijo: ' m' },
      xs: [0, 1, 2, 3, 4, 5, 6, 7],
      series: [
        { id: 'curva', nombre: 'Curva Q-H', valores: [130, 128, 124, 116, 106, 89, 64, 36] }
      ]
    },
    'l15-10-3': {
      titulo: 'Ilustración 10.3. Curva de la bomba correspondiente a un impulsor (carga).',
      x: { min: 0, max: 0.35, maxEje: 0.35, marcas: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35], pasoRet: 0.05, titulo: 'Gasto (m³/s)', prefijo: 'Q = ', sufijo: ' m³/s' },
      y: { min: 0, max: 35, paso: 5, dec: 1, decEje: 0, titulo: 'Carga (m)', sufijo: ' m' },
      xs: [0, 0.1, 0.2, 0.3],
      series: [
        { id: 'carga', nombre: 'Carga por impulsor', valores: [30, 28, 20, 6] }
      ]
    },
    'l15-10-4': {
      titulo: 'Ilustración 10.4. Curva de la bomba correspondiente a un impulsor (Eficiencia).',
      x: { min: 0, max: 0.35, maxEje: 0.35, marcas: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35], pasoRet: 0.05, titulo: 'Gasto (m³/s)', prefijo: 'Q = ', sufijo: ' m³/s' },
      y: { min: 0, max: 80, paso: 10, dec: 1, decEje: 0, titulo: 'Eficiencia (%)', sufijo: ' %' },
      xs: [0, 0.1, 0.2, 0.22, 0.3],
      series: [
        { id: 'eficiencia', nombre: 'Eficiencia', valores: [0, 50, 74, 75, 69] }
      ]
    },
    'l15-10-5': {
      titulo: 'Ilustración 10.5. Curva de la bomba correspondiente a un impulsor (NPSH3).',
      x: { min: 0, max: 0.35, maxEje: 0.35, marcas: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35], pasoRet: 0.05, titulo: 'Gasto (m³/s)', prefijo: 'Q = ', sufijo: ' m³/s' },
      y: { min: 4, max: 10, paso: 1, dec: 2, decEje: 0, titulo: 'NPSH3 (m)', sufijo: ' m' },
      xs: [0.05, 0.1, 0.16, 0.2, 0.25, 0.3],
      series: [
        { id: 'npsh3', nombre: 'NPSH3', valores: [5.0, 5.25, 5.7, 6.0, 6.8, 9.0] }
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
        var pts = cfg.xs.map(function (xv, i) { return px(xv).toFixed(1) + ',' + py(s.valores[i]).toFixed(1); }).join(' ');
        if (!cfg.soloPuntos) {
          el('polyline', { points: pts, 'class': 'linea' }, gS);
        }
        cfg.xs.forEach(function (xv, i) {
          el('circle', { cx: px(xv), cy: py(s.valores[i]), r: cfg.soloPuntos ? 4 : 3.2, 'class': 'marca' }, gS);
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
          a.el.setAttribute('cx', xx);
          a.el.setAttribute('cy', py(yv));
          a.el.removeAttribute('hidden');
          lines.push(cfg.series[a.si].nombre + ': ' + yv.toFixed(cfg.y.dec) + cfg.y.sufijo);
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
