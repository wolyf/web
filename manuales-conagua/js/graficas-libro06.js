/*
 * Gráficas interactivas del Libro 6 (MAPAS, Conagua):
 * - l6-1-5: Ilustración 1.5 Curva típica de esfuerzo-deformación del acero estructural A36
 * - l6-1-6: Ilustración 1.6 Curva esfuerzo-deformación del concreto a compresión
 * - l6-3-5: Ilustración 3.5 Espectro de diseño para la zona I
 * - l6-3-10: Ilustración 3.10 Descripción de las partes que conforman el espectro de diseño
 * - l6-6-3: Ilustración 6.3 Espectro de diseño para la zona IIIa (NTC-DF, Sismo)
 * - l6-6-25: Ilustración 6.25 Espectro de diseño para la zona IIIa (NTC-DF, Sismo)
 * - l6-8-4: Ilustración 8.4 Curvas para calcular el coeficiente de cargas Cd (Juárez y Rico, 1974)
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro06.css.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function espectro(a0, c, ta, tb, r, tmax, paso) {
    var xs = [], ys = [];
    for (var t = 0; t <= tmax + 1e-9; t += paso) {
      var tt = Math.round(t * 1000) / 1000;
      var a;
      if (tt < ta) a = a0 + (c - a0) * (tt / ta);
      else if (tt <= tb) a = c;
      else a = c * Math.pow(tb / tt, r);
      xs.push(tt);
      ys.push(Math.round(a * 10000) / 10000);
    }
    return { xs: xs, ys: ys };
  }

  function marston(kmu, hmax, paso) {
    var xs = [], ys = [];
    for (var h = 0; h <= hmax + 1e-9; h += paso) {
      var hh = Math.round(h * 10) / 10;
      var cd = (1 - Math.exp(-2 * kmu * hh)) / (2 * kmu);
      xs.push(hh);
      ys.push(Math.round(cd * 1000) / 1000);
    }
    return { xs: xs, ys: ys };
  }

  var esp35 = espectro(0.04, 0.16, 0.2, 1.35, 1.0, 2.0, 0.05);
  var esp310 = espectro(0.04, 0.16, 0.2, 0.6, 0.5, 6.0, 0.2);
  var esp6 = espectro(0.15, 0.60, 0.53, 1.80, 2.0, 6.0, 0.2);

  var GRAFICAS = {
    'l6-1-5': {
      titulo: 'Ilustración 1.5. Curva típica de esfuerzo-deformación del acero estructural A36 (White, et. al., 1980).',
      x: { min: 0, max: 0.040, paso: 0.010, dec: 3, titulo: 'Deformación unitaria (cm/cm)' },
      y: { min: 0, max: 5600, paso: 1400, dec: 0, titulo: 'Esfuerzo (kg/cm²)', sufijo: ' kg/cm²' },
      series: [{
        nombre: 'Acero A36',
        cls: 'serie-1',
        puntos: [
          [0.000, 0], [0.001, 2100], [0.0013, 2730], [0.0015, 2530],
          [0.005, 2530], [0.010, 2530], [0.015, 2750], [0.020, 3350],
          [0.025, 3820], [0.030, 4040], [0.035, 3920], [0.038, 3650]
        ]
      }]
    },
    'l6-1-6': {
      titulo: 'Ilustración 1.6. Curva esfuerzo-deformación del concreto a compresión (White, et. al., 1980).',
      x: { min: 0, max: 0.004, paso: 0.001, dec: 3, titulo: 'Deformación unitaria (cm/cm)' },
      y: { min: 0, max: 250, paso: 50, dec: 0, titulo: 'Esfuerzo de ruptura (kg/cm²)', sufijo: ' kg/cm²' },
      series: [{
        nombre: 'Concreto a compresión',
        cls: 'serie-1',
        puntos: [
          [0.0000, 0], [0.0004, 88], [0.0008, 160], [0.0012, 210],
          [0.0016, 240], [0.0020, 250], [0.0025, 242], [0.0030, 222],
          [0.0035, 192], [0.0040, 155]
        ]
      }]
    },
    'l6-3-5': {
      titulo: 'Ilustración 3.5. Espectro de diseño para la zona I.',
      x: { min: 0, max: 2.0, paso: 0.5, dec: 2, titulo: 'T (s)' },
      y: { min: 0, max: 0.18, paso: 0.02, dec: 3, titulo: 'a (S/g)', sufijo: ' g' },
      series: [{
        nombre: 'Zona I (c = 0.16, a₀ = 0.04)',
        cls: 'serie-1',
        puntos: esp35.xs.map(function (x, i) { return [x, esp35.ys[i]]; })
      }]
    },
    'l6-3-10': {
      titulo: 'Ilustración 3.10. Descripción de las partes que conforman el espectro de diseño.',
      x: { min: 0, max: 6.0, paso: 1.0, dec: 1, titulo: 'T (s)' },
      y: { min: 0, max: 0.18, paso: 0.02, dec: 3, titulo: 'a (s/g)', sufijo: ' g' },
      series: [{
        nombre: 'Espectro (Ta = 0.2 s, Tb = 0.6 s, r = 0.5)',
        cls: 'serie-1',
        puntos: esp310.xs.map(function (x, i) { return [x, esp310.ys[i]]; })
      }]
    },
    'l6-6-3': {
      titulo: 'Ilustración 6.3. Espectro de diseño para la zona IIIa (calculado de acuerdo con las NTC-DF, Sismo).',
      x: { min: 0, max: 6.0, paso: 1.0, dec: 1, titulo: 'T (s)' },
      y: { min: 0, max: 0.70, paso: 0.10, dec: 3, titulo: 'a (S/g)', sufijo: ' g' },
      series: [{
        nombre: 'Zona IIIa NTC-DF (c = 0.60, a₀ = 0.15)',
        cls: 'serie-1',
        puntos: esp6.xs.map(function (x, i) { return [x, esp6.ys[i]]; })
      }]
    },
    'l6-6-25': {
      titulo: 'Ilustración 6.25. Espectro de diseño para la zona IIIa (calculado de acuerdo con las NTC-DF, Sismo).',
      x: { min: 0, max: 6.0, paso: 1.0, dec: 1, titulo: 'T (s)' },
      y: { min: 0, max: 0.70, paso: 0.10, dec: 3, titulo: 'a (S/g)', sufijo: ' g' },
      series: [{
        nombre: 'Zona IIIa NTC-DF (c = 0.60, a₀ = 0.15)',
        cls: 'serie-1',
        puntos: esp6.xs.map(function (x, i) { return [x, esp6.ys[i]]; })
      }]
    },
    'l6-8-4': {
      titulo: 'Ilustración 8.4. Curvas para calcular el coeficiente de cargas Cd (adaptado de Juárez y Rico, 1974).',
      x: { min: 0, max: 5.0, paso: 1.0, dec: 2, titulo: 'Valores de Cd' },
      y: { min: 0, max: 15, paso: 1, dec: 1, titulo: 'Valores de H/Bd', sufijo: '' },
      xyInvertido: true,
      series: [
        { nombre: '1. Materiales granulares sin cohesión', cls: 'serie-1', kmu: 0.1924 },
        { nombre: '2. Arena y grava', cls: 'serie-2', kmu: 0.165 },
        { nombre: '3. Suelo vegetal saturado', cls: 'serie-3', kmu: 0.150 },
        { nombre: '4. Arcilla', cls: 'serie-4', kmu: 0.130 },
        { nombre: '5. Arcilla saturada', cls: 'serie-5', kmu: 0.110 }
      ].map(function (s) {
        var m = marston(s.kmu, 15, 0.5);
        return {
          nombre: s.nombre,
          cls: s.cls,
          puntos: m.ys.map(function (cd, i) { return [cd, m.xs[i]]; })
        };
      })
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

    var ocultas = {};
    if (cfg.series.length > 1) {
      var leg = h('div', { 'class': 'grafica-leyenda' }, caja);
      cfg.series.forEach(function (s, idx) {
        var btn = h('button', {
          type: 'button',
          'class': 'grafica-leyenda__item ' + s.cls,
          'aria-pressed': 'true'
        }, leg);
        h('span', { 'class': 'grafica-leyenda__muestra' }, btn);
        h('span', {}, btn, s.nombre);
        btn.addEventListener('click', function () {
          ocultas[idx] = !ocultas[idx];
          btn.setAttribute('aria-pressed', ocultas[idx] ? 'false' : 'true');
          btn.classList.toggle('is-off', !!ocultas[idx]);
          dibujar();
        });
      });
    }

    var lienzo = h('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = h('div', { 'class': 'grafica-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);

    function dibujar() {
      var W = Math.round(lienzo.clientWidth) || 640;
      var angosto = W < 500;
      var H = angosto ? 270 : 330;
      var pad = { t: 18, r: 18, b: 44, l: 56 };
      var gw = W - pad.l - pad.r;
      var gh = H - pad.t - pad.b;

      lienzo.querySelectorAll('svg').forEach(function (n) { n.remove(); });
      globo.hidden = true;

      var svg = el('svg', {
        'class': 'grafica-svg',
        viewBox: '0 0 ' + W + ' ' + H,
        role: 'img',
        'aria-label': cfg.titulo,
        tabindex: '0'
      }, lienzo);

      function sx(v) { return pad.l + ((v - cfg.x.min) / (cfg.x.max - cfg.x.min)) * gw; }
      function sy(v) { return pad.t + gh - ((v - cfg.y.min) / (cfg.y.max - cfg.y.min)) * gh; }

      // Retícula horizontal
      for (var yv = cfg.y.min; yv <= cfg.y.max + 1e-9; yv += cfg.y.paso) {
        var yy = sy(yv);
        el('line', { x1: pad.l, y1: yy, x2: pad.l + gw, y2: yy, 'class': yv === cfg.y.min ? 'eje' : 'reticula' }, svg);
        var ty = el('text', { x: pad.l - 7, y: yy + 3.5, 'text-anchor': 'end', 'class': 'etiqueta' }, svg);
        ty.textContent = yv.toFixed(cfg.y.dec === 0 ? 0 : Math.min(2, cfg.y.dec));
      }
      // Retícula vertical
      for (var xv = cfg.x.min; xv <= cfg.x.max + 1e-9; xv += cfg.x.paso) {
        var xx = sx(xv);
        el('line', { x1: xx, y1: pad.t, x2: xx, y2: pad.t + gh, 'class': xv === cfg.x.min ? 'eje' : 'reticula' }, svg);
        var tx = el('text', { x: xx, y: pad.t + gh + 16, 'text-anchor': 'middle', 'class': 'etiqueta' }, svg);
        tx.textContent = xv.toFixed(cfg.x.dec === 0 ? 0 : Math.min(3, cfg.x.dec));
      }

      // Títulos de ejes
      var lblX = el('text', { x: pad.l + gw / 2, y: H - 6, 'text-anchor': 'middle', 'class': 'etiqueta' }, svg);
      lblX.textContent = cfg.x.titulo;
      var lblY = el('text', {
        x: 14, y: pad.t + gh / 2,
        'text-anchor': 'middle',
        transform: 'rotate(-90 14 ' + (pad.t + gh / 2) + ')',
        'class': 'etiqueta'
      }, svg);
      lblY.textContent = cfg.y.titulo;

      // Curvas
      cfg.series.forEach(function (s, idx) {
        if (ocultas[idx]) return;
        var d = s.puntos.map(function (p, i) {
          return (i === 0 ? 'M' : 'L') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1);
        }).join(' ');
        el('path', { d: d, fill: 'none', 'class': 'linea ' + s.cls }, svg);
      });

      var guia = el('line', { x1: 0, y1: pad.t, x2: 0, y2: pad.t + gh, 'class': 'guia', hidden: '' }, svg);
      var punto = el('circle', { r: 4, 'class': 'punto-activo serie-1', hidden: '' }, svg);

      var refPts = cfg.series[0].puntos;
      var selIdx = -1;

      function mostrar(px, py, sIdx) {
        var p = cfg.series[sIdx].puntos[px];
        if (!p) return;
        var cx = sx(p[0]), cy = sy(p[1]);
        guia.setAttribute('x1', cx);
        guia.setAttribute('x2', cx);
        guia.removeAttribute('hidden');
        punto.setAttribute('cx', cx);
        punto.setAttribute('cy', cy);
        punto.setAttribute('class', 'punto-activo ' + cfg.series[sIdx].cls);
        punto.removeAttribute('hidden');
        globo.innerHTML = '<strong>' + cfg.series[sIdx].nombre + '</strong><br>' +
          cfg.x.titulo + ': ' + p[0].toFixed(cfg.x.dec) + '<br>' +
          cfg.y.titulo + ': ' + p[1].toFixed(cfg.y.dec) + (cfg.y.sufijo || '');
        globo.style.left = Math.min(W - 180, Math.max(8, cx + 10)) + 'px';
        globo.style.top = Math.max(8, cy - 42) + 'px';
        globo.hidden = false;
      }

      svg.addEventListener('pointermove', function (ev) {
        var rect = svg.getBoundingClientRect();
        var mx = (ev.clientX - rect.left) * (W / rect.width);
        var my = (ev.clientY - rect.top) * (H / rect.height);
        var bestDist = 1e9, bestP = 0, bestS = 0;
        cfg.series.forEach(function (s, sIdx) {
          if (ocultas[sIdx]) return;
          s.puntos.forEach(function (p, pIdx) {
            var dx = sx(p[0]) - mx, dy = sy(p[1]) - my;
            var d2 = dx * dx + dy * dy;
            if (d2 < bestDist) { bestDist = d2; bestP = pIdx; bestS = sIdx; }
          });
        });
        mostrar(bestP, bestS, bestS);
      });
      svg.addEventListener('pointerleave', function () {
        guia.setAttribute('hidden', '');
        punto.setAttribute('hidden', '');
        globo.hidden = true;
      });
      svg.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowRight') { selIdx = Math.min(refPts.length - 1, selIdx + 1); }
        else if (ev.key === 'ArrowLeft') { selIdx = Math.max(0, selIdx - 1); }
        else if (ev.key === 'Home') { selIdx = 0; }
        else if (ev.key === 'End') { selIdx = refPts.length - 1; }
        else return;
        ev.preventDefault();
        mostrar(selIdx, 0, 0);
      });
    }

    dibujar();
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { dibujar(); });
      ro.observe(lienzo);
    }

    // Tabla de datos accesible en <details>
    var det = h('details', { 'class': 'grafica-datos' }, caja);
    h('summary', {}, det, 'Datos de la gráfica');
    var wrap = h('div', { 'class': 'tabla', tabindex: '0' }, det);
    var tb = h('table', {}, wrap);
    var thead = h('thead', {}, tb);
    var trH = h('tr', {}, thead);
    h('th', { scope: 'col' }, trH, cfg.x.titulo);
    cfg.series.forEach(function (s) {
      h('th', { scope: 'col' }, trH, cfg.series.length > 1 ? s.nombre : cfg.y.titulo);
    });
    var tbody = h('tbody', {}, tb);
    var nRows = cfg.series[0].puntos.length;
    for (var i = 0; i < nRows; i++) {
      var tr = h('tr', {}, tbody);
      h('td', { 'class': 'n' }, tr, cfg.series[0].puntos[i][0].toFixed(cfg.x.dec));
      cfg.series.forEach(function (s) {
        var pt = s.puntos[i];
        h('td', { 'class': 'n' }, tr, pt ? pt[1].toFixed(cfg.y.dec) : '');
      });
    }
  }

  function iniciar() {
    document.querySelectorAll('.grafica-libro[data-grafica]').forEach(function (caja) {
      var id = caja.getAttribute('data-grafica');
      if (GRAFICAS[id]) armarGrafica(caja, GRAFICAS[id]);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
