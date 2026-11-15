/*
 * Gráficas interactivas del Libro 24 (MAPAS, Conagua):
 * - l24-d-1: Ilustración D.1 Ejemplo de cálculo de la curva granulométrica
 * - l24-h-5: Ilustración H.5 Curva de sedimentación del lodo (Co = 13 890 mg/L)
 * - l24-h-6: Ilustración H.6 Curva de sedimentación del lodo (Co = 4 680 mg/L)
 * - l24-h-7: Ilustración H.7 Curva de sedimentación del lodo (Co = 2 013 mg/L)
 * - l24-h-8: Ilustración H.8 Velocidad de sedimentación
 * - l24-h-9: Ilustración H.9 Tiempo de espesamiento
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro24.css.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var GRAFICAS = {
    'l24-d-1': {
      titulo: 'Ilustración D.1. Ejemplo de cálculo de la curva granulométrica.',
      x: { min: 0, max: 0.65, marcas: [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65], decEje: 2, dec: 3, titulo: 'Abertura (mm)', prefijo: 'd = ', sufijo: ' mm' },
      y: { min: 0, max: 90, marcas: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90], decEje: 0, dec: 2, titulo: 'Peso que pasa (%)', sufijo: ' %' },
      xs: [0.212, 0.250, 0.300, 0.355, 0.425, 0.500, 0.600],
      notas: [
        { x: 0.24, y: 10, texto: 'D10 = 0.24 mm (TE)' },
        { x: 0.50, y: 60, texto: 'D60 = 0.50 mm' }
      ],
      series: [
        { id: 'pasa', nombre: 'Peso que pasa (%)', valores: [3.80, 13.39, 20.34, 31.28, 46.93, 60.57, 77.71] }
      ]
    },
    'l24-h-5': {
      titulo: 'Ilustración H.5. Curva de sedimentación del lodo (Co = 13 890 mg/L).',
      x: { min: 0, max: 120, marcas: [0, 10, 20, 30, 45, 60, 90, 120], decEje: 0, dec: 0, titulo: 'Tiempo (min)', prefijo: 't = ', sufijo: ' min' },
      y: { min: 0, max: 18, marcas: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18], decEje: 0, dec: 2, titulo: 'Altura de la interfase (cm)', sufijo: ' cm' },
      xs: [0, 2, 5, 10, 20, 30, 45, 60, 90, 120],
      series: [
        { id: 'h5', nombre: 'Co = 13 890 mg/L', valores: [16.4, 14.3, 11.9, 11.2, 10.5, 10.2, 9.9, 9.8, 9.5, 9.5] }
      ]
    },
    'l24-h-6': {
      titulo: 'Ilustración H.6. Curva de sedimentación del lodo (Co = 4 680 mg/L).',
      x: { min: 0, max: 120, marcas: [0, 10, 20, 30, 45, 60, 90, 120], decEje: 0, dec: 0, titulo: 'Tiempo (min)', prefijo: 't = ', sufijo: ' min' },
      y: { min: 0, max: 18, marcas: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18], decEje: 0, dec: 2, titulo: 'Altura de la interfase (cm)', sufijo: ' cm' },
      xs: [0, 2, 5, 10, 20, 30, 45, 60, 90, 120],
      series: [
        { id: 'h6', nombre: 'Co = 4 680 mg/L', valores: [16.0, 11.2, 9.5, 8.3, 7.7, 7.5, 7.3, 7.2, 7.15, 7.0] }
      ]
    },
    'l24-h-7': {
      titulo: 'Ilustración H.7. Curva de sedimentación del lodo (Co = 2 013 mg/L).',
      x: { min: 0, max: 120, marcas: [0, 10, 20, 30, 45, 60, 90, 120], decEje: 0, dec: 0, titulo: 'Tiempo (min)', prefijo: 't = ', sufijo: ' min' },
      y: { min: 0, max: 18, marcas: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18], decEje: 0, dec: 2, titulo: 'Altura de la interfase (cm)', sufijo: ' cm' },
      xs: [0, 2, 5, 10, 20, 30, 45, 60, 90, 120],
      series: [
        { id: 'h7', nombre: 'Co = 2 013 mg/L', valores: [16.6, 5.5, 5.0, 4.7, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5] }
      ]
    },
    'l24-h-8': {
      titulo: 'Ilustración H.8. Velocidad de sedimentación.',
      x: { min: 1500, max: 14500, marcas: [2000, 4000, 6000, 8000, 10000, 12000, 14000], decEje: 0, dec: 0, titulo: 'Concentración inicial de sólidos (mg/L)', prefijo: 'Co = ', sufijo: ' mg/L' },
      y: { min: 0, max: 6, marcas: [0, 1, 2, 3, 4, 5, 6], decEje: 0, dec: 2, titulo: 'Vel. de sedimentación (cm/min)', sufijo: ' cm/min' },
      xs: [2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000],
      series: [
        { id: 'vel', nombre: 'Velocidad de sedimentación', valores: [5.55, 3.99, 2.26, 1.28, 1.21, 1.21, 1.15, 1.10, 1.04, 0.97, 0.97, 0.93, 0.93] }
      ]
    },
    'l24-h-9': {
      titulo: 'Ilustración H.9. Tiempo de espesamiento.',
      x: { min: 1500, max: 14500, marcas: [2000, 4600, 7000, 9000, 11000, 14000], decEje: 0, dec: 0, titulo: 'Concentración de sólidos (mg/L)', prefijo: 'C = ', sufijo: ' mg/L' },
      y: { min: 0, max: 35, marcas: [0, 5, 10, 15, 20, 25, 30, 35], decEje: 0, dec: 1, titulo: 'Tiempo de espesamiento (min)', sufijo: ' min' },
      xs: [2000, 4600, 7000, 8000, 9000, 11000, 13000, 14000],
      series: [
        { id: 't', nombre: 'Tiempo de espesamiento', valores: [25.6, 30.9, 24.9, 22.5, 20.0, 15.2, 9.9, 7.4] }
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

    var W = 640, H = 300;
    var M = { l: 60, r: 24, t: 18, b: 48 };
    var PW = W - M.l - M.r, PH = H - M.t - M.b;

    function sx(v) { return M.l + ((v - cfg.x.min) / (cfg.x.max - cfg.x.min)) * PW; }
    function sy(v) { return M.t + PH - ((v - cfg.y.min) / (cfg.y.max - cfg.y.min)) * PH; }

    var marco = h('div', { 'class': 'grafica-marco' }, caja);
    var svg = el('svg', {
      'class': 'grafica-svg',
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': cfg.titulo,
      tabindex: '0'
    }, marco);

    var gRet = el('g', { 'class': 'reticula' }, svg);
    cfg.y.marcas.forEach(function (v) {
      var y = sy(v);
      el('line', { x1: M.l, y1: y, x2: M.l + PW, y2: y }, gRet);
      var tx = el('text', { 'class': 'eje-marca', x: M.l - 7, y: y + 3.5, 'text-anchor': 'end' }, svg);
      tx.textContent = v.toFixed(cfg.y.decEje);
    });
    cfg.x.marcas.forEach(function (v) {
      var x = sx(v);
      el('line', { x1: x, y1: M.t, x2: x, y2: M.t + PH }, gRet);
      var tx = el('text', { 'class': 'eje-marca', x: x, y: M.t + PH + 16, 'text-anchor': 'middle' }, svg);
      tx.textContent = v.toFixed(cfg.x.decEje);
    });

    el('line', { 'class': 'eje', x1: M.l, y1: M.t, x2: M.l, y2: M.t + PH }, svg);
    el('line', { 'class': 'eje', x1: M.l, y1: M.t + PH, x2: M.l + PW, y2: M.t + PH }, svg);

    var txX = el('text', { 'class': 'eje-titulo', x: M.l + PW / 2, y: H - 8, 'text-anchor': 'middle' }, svg);
    txX.textContent = cfg.x.titulo;
    var txY = el('text', {
      'class': 'eje-titulo',
      x: 16,
      y: M.t + PH / 2,
      'text-anchor': 'middle',
      transform: 'rotate(-90 16 ' + (M.t + PH / 2) + ')'
    }, svg);
    txY.textContent = cfg.y.titulo;

    var s0 = cfg.series[0];
    var pts = cfg.xs.map(function (xv, i) { return sx(xv).toFixed(1) + ',' + sy(s0.valores[i]).toFixed(1); }).join(' ');
    var gSer = el('g', { 'class': 'serie serie-1' }, svg);
    el('polyline', { 'class': 'linea', points: pts, fill: 'none' }, gSer);
    cfg.xs.forEach(function (xv, i) {
      el('circle', { 'class': 'punto', cx: sx(xv), cy: sy(s0.valores[i]), r: 3.5 }, gSer);
    });

    var guia = el('line', { 'class': 'guia', x1: 0, y1: M.t, x2: 0, y2: M.t + PH, hidden: '' }, svg);
    var aro = el('circle', { 'class': 'aro serie-1', cx: 0, cy: 0, r: 5.5, hidden: '' }, svg);
    var globo = h('div', { 'class': 'grafica-globo', hidden: '' }, marco);

    var activo = -1;
    function mostrar(idx) {
      if (idx < 0 || idx >= cfg.xs.length) return;
      activo = idx;
      var xv = cfg.xs[idx], yv = s0.valores[idx];
      var px = sx(xv), py = sy(yv);
      guia.setAttribute('x1', px); guia.setAttribute('x2', px); guia.removeAttribute('hidden');
      aro.setAttribute('cx', px); aro.setAttribute('cy', py); aro.removeAttribute('hidden');
      globo.innerHTML = '<strong>' + cfg.x.prefijo + xv.toFixed(cfg.x.dec) + cfg.x.sufijo + '</strong><br>' +
        s0.nombre + ': ' + yv.toFixed(cfg.y.dec) + cfg.y.sufijo;
      globo.removeAttribute('hidden');
      var pctX = (px / W) * 100;
      globo.style.left = Math.min(82, Math.max(18, pctX)) + '%';
      globo.style.top = '8px';
    }
    function ocultar() {
      activo = -1;
      guia.setAttribute('hidden', '');
      aro.setAttribute('hidden', '');
      globo.setAttribute('hidden', '');
    }

    svg.addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect();
      var mx = ((e.clientX - r.left) / r.width) * W;
      var best = 0, bestD = 1e9;
      cfg.xs.forEach(function (xv, i) {
        var d = Math.abs(sx(xv) - mx);
        if (d < bestD) { bestD = d; best = i; }
      });
      mostrar(best);
    });
    svg.addEventListener('pointerleave', ocultar);
    svg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); mostrar(activo < 0 ? 0 : Math.min(cfg.xs.length - 1, activo + 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); mostrar(activo < 0 ? 0 : Math.max(0, activo - 1)); }
      else if (e.key === 'Escape') { ocultar(); }
    });
  }

  function iniciar() {
    document.querySelectorAll('.grafica-libro[data-grafica]').forEach(function (el) {
      var id = el.getAttribute('data-grafica');
      if (GRAFICAS[id]) armarGrafica(el, GRAFICAS[id]);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
