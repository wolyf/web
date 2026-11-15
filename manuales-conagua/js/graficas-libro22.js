/*
 * Gráficas interactivas del Libro 22 (MAPAS, Conagua):
 * - 1-15: Variación del peso del generador según la tensión y la velocidad
 * - 2-6:  Capacidad instalada en MegaWatts de energía eólica a nivel mundial
 * - 2-8:  Tasa de crecimiento de la energía eólica en diferentes regiones
 * - 2-34: Curva de potencia de un aerogenerador
 * - 2-44: Perfil de velocidad del viento para a = 1/7
 * - 3-10: Generación de gas metano (febrero 1998 a junio 1999)
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var COLORES = ['#2563eb', '#d97706', '#059669', '#dc2626', '#7c3aed', '#0891b2'];

  function el(tag, attrs, texto) {
    var n = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    }
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function fmtNum(v) {
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  var SERIES_CFG = {
    '1-15': {
      aria: 'Ilustración 1.15 Variación del peso del generador según la tensión y la velocidad',
      xMin: 0, xMax: 5000, xStep: 1000, xLabel: 'Tensión de generación (V)',
      yMin: 6000, yMax: 11600, yStep: 800, yLabel: 'Peso del generador (kg)',
      series: [
        { nombre: '600 r/min', pts: [[500, 8248], [4215, 10632]] },
        { nombre: '720 r/min', pts: [[500, 7600], [4215, 8592]] },
        { nombre: '900 r/min', pts: [[500, 7020], [4215, 7448]] },
        { nombre: '1 200 r/min', pts: [[500, 6790], [4215, 6415]] }
      ]
    },
    '2-6': {
      aria: 'Ilustración 2.6 Capacidad instalada en MegaWatts de energía eólica a nivel mundial',
      xMin: 1996, xMax: 2012, xStep: 2, xLabel: 'Año',
      yMin: 0, yMax: 300000, yStep: 50000, yLabel: 'Capacidad instalada (MW)',
      series: [
        {
          nombre: 'Capacidad mundial (MW)',
          pts: [
            [1996, 6100], [1997, 7480], [1998, 9667], [1999, 13700],
            [2000, 18039], [2001, 24322], [2002, 31181], [2003, 39295],
            [2004, 47681], [2005, 59012], [2006, 74112], [2007, 93919],
            [2008, 120894], [2009, 159742], [2010, 196944], [2011, 236749],
            [2012, 282275]
          ]
        }
      ]
    },
    '2-34': {
      aria: 'Ilustración 2.34 Curva de potencia de un aerogenerador',
      xMin: 4, xMax: 18, xStep: 1, xLabel: 'Velocidad del viento (m/s)',
      yMin: 0, yMax: 2000, yStep: 500, yLabel: 'Potencia (kW)',
      series: [
        {
          nombre: 'Potencia eléctrica (kW)',
          pts: [
            [4, 101], [5, 193], [6, 345], [7, 552], [8, 809],
            [9, 1170], [10, 1524], [11, 1822], [12, 1953], [13, 1984],
            [14, 1984], [15, 1999], [16, 2000], [17, 2000], [18, 2000]
          ]
        }
      ]
    },
    '2-44': {
      aria: 'Ilustración 2.44 Perfil de velocidad del viento para a = 1/7',
      xMin: 0, xMax: 15, xStep: 3, xLabel: 'Velocidad del viento (m/s)',
      yMin: 0, yMax: 55, yStep: 10, yLabel: 'Altura (m)',
      series: [
        {
          nombre: 'Velocidad vs altura',
          pts: [[0, 0], [9.1, 5], [10, 10], [11, 20], [11.7, 30], [12.2, 40], [12.6, 50]]
        }
      ]
    },
    '3-10': {
      aria: 'Ilustración 3.10 Generación de gas metano',
      xMin: 0, xMax: 16, xStep: 4, xLabel: 'Mes (Feb-98 a Jun-99)',
      xTicks: ['Feb-98', 'Jun-98', 'Oct-98', 'Feb-99', 'Jun-99'],
      yMin: 0, yMax: 1400000, yStep: 200000, yLabel: 'Metano (m³/mes)',
      series: [
        {
          nombre: 'Metano producido (m³/mes)',
          pts: [
            [0, 772000], [1, 923000], [2, 1166000], [3, 1065000], [4, 750000],
            [5, 684000], [6, 780000], [7, 872000], [8, 996000], [9, 1270000],
            [10, 1299000], [11, 1299000], [12, 1007000], [13, 940000],
            [14, 747000], [15, 860000], [16, 821000]
          ]
        }
      ]
    }
  };

  var BARRAS_2_8 = {
    aria: 'Ilustración 2.8 Tasa de crecimiento de la energía eólica en diferentes regiones',
    items: [
      { region: 'América Central y Sudamérica', valor: 56.6 },
      { region: 'Oceanía y el Pacífico', valor: 12.3 },
      { region: 'Norteamérica', valor: 26.6 },
      { region: 'África', valor: 7.1 },
      { region: 'Asia', valor: 19.4 },
      { region: 'Europa', valor: 13.5 }
    ]
  };

  function renderBarras(host) {
    var W = 600, H = 260;
    var mL = 190, mR = 45, mT = 18, mB = 40;
    var pW = W - mL - mR, pH = H - mT - mB;
    var svg = el('svg', { class: 'grafica-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': BARRAS_2_8.aria });
    var globo = document.createElement('div');
    globo.className = 'gl22-globo';
    globo.textContent = '';

    var grid = el('g', { class: 'gl22-reticula' });
    var ejes = el('g', { class: 'gl22-ejes' });
    [0, 10, 20, 30, 40, 50, 60].forEach(function (v) {
      var x = mL + (v / 60) * pW;
      grid.appendChild(el('line', { x1: x, y1: mT, x2: x, y2: H - mB }));
      ejes.appendChild(el('text', { class: 'gl22-etiq', x: x, y: H - mB + 15, 'text-anchor': 'middle' }, String(v)));
    });
    ejes.appendChild(el('line', { x1: mL, y1: mT, x2: mL, y2: H - mB }));
    ejes.appendChild(el('line', { x1: mL, y1: H - mB, x2: W - mR, y2: H - mB }));
    ejes.appendChild(el('text', { class: 'gl22-titulo-eje', x: mL + pW / 2, y: H - 6, 'text-anchor': 'middle' }, 'Tasa de crecimiento (%)'));
    svg.appendChild(grid);
    svg.appendChild(ejes);

    var n = BARRAS_2_8.items.length;
    var bh = (pH / n) * 0.68;
    BARRAS_2_8.items.forEach(function (it, i) {
      var y = mT + (i + 0.16) * (pH / n);
      var w = (it.valor / 60) * pW;
      var col = COLORES[i % COLORES.length];
      var rect = el('rect', {
        class: 'gl22-barra', x: mL, y: y, width: w, height: bh, rx: 3, fill: col, tabindex: '0',
        'aria-label': it.region + ': ' + it.valor + ' %'
      });
      var show = function () { globo.textContent = it.region + ': ' + it.valor + ' %'; };
      rect.addEventListener('mouseenter', show);
      rect.addEventListener('focus', show);
      svg.appendChild(rect);
      svg.appendChild(el('text', { class: 'gl22-etiq', x: mL - 8, y: y + bh / 2 + 4, 'text-anchor': 'end' }, it.region));
      svg.appendChild(el('text', { class: 'gl22-etiq', x: mL + w + 5, y: y + bh / 2 + 4 }, it.valor + ' %'));
    });

    host.appendChild(svg);
    host.appendChild(globo);
  }

  function renderLinea(host, key) {
    var cfg = SERIES_CFG[key];
    if (!cfg) return;
    var W = 600, H = 300;
    var mL = 68, mR = 24, mT = 18, mB = 46;
    var pW = W - mL - mR, pH = H - mT - mB;

    function xPx(x) { return mL + ((x - cfg.xMin) / (cfg.xMax - cfg.xMin)) * pW; }
    function yPx(y) { return mT + (1 - (y - cfg.yMin) / (cfg.yMax - cfg.yMin)) * pH; }

    var svg = el('svg', { class: 'grafica-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': cfg.aria });
    var globo = document.createElement('div');
    globo.className = 'gl22-globo';
    globo.textContent = '';

    var grid = el('g', { class: 'gl22-reticula' });
    var ejes = el('g', { class: 'gl22-ejes' });
    for (var yv = cfg.yMin; yv <= cfg.yMax + 0.001; yv += cfg.yStep) {
      var yy = yPx(yv);
      grid.appendChild(el('line', { x1: mL, y1: yy, x2: W - mR, y2: yy }));
      ejes.appendChild(el('text', { class: 'gl22-etiq', x: mL - 7, y: yy + 3.5, 'text-anchor': 'end' }, fmtNum(Math.round(yv))));
    }
    for (var xv = cfg.xMin, idx = 0; xv <= cfg.xMax + 0.001; xv += cfg.xStep, idx++) {
      var xx = xPx(xv);
      grid.appendChild(el('line', { x1: xx, y1: mT, x2: xx, y2: H - mB }));
      var lab = cfg.xTicks ? (cfg.xTicks[idx] || '') : String(Math.round(xv));
      ejes.appendChild(el('text', { class: 'gl22-etiq', x: xx, y: H - mB + 15, 'text-anchor': 'middle' }, lab));
    }
    ejes.appendChild(el('line', { x1: mL, y1: mT, x2: mL, y2: H - mB }));
    ejes.appendChild(el('line', { x1: mL, y1: H - mB, x2: W - mR, y2: H - mB }));
    ejes.appendChild(el('text', { class: 'gl22-titulo-eje', x: mL + pW / 2, y: H - 6, 'text-anchor': 'middle' }, cfg.xLabel));
    ejes.appendChild(el('text', { class: 'gl22-titulo-eje', x: 14, y: mT + pH / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (mT + pH / 2) + ')' }, cfg.yLabel));
    svg.appendChild(grid);
    svg.appendChild(ejes);

    var leyenda = document.createElement('div');
    leyenda.className = 'gl22-leyenda';

    cfg.series.forEach(function (ser, sIdx) {
      var col = COLORES[sIdx % COLORES.length];
      var grp = el('g', {});
      var dStr = ser.pts.map(function (pt, i) {
        return (i === 0 ? 'M' : 'L') + xPx(pt[0]).toFixed(1) + ' ' + yPx(pt[1]).toFixed(1);
      }).join(' ');
      grp.appendChild(el('path', { class: 'gl22-linea', d: dStr, stroke: col }));
      ser.pts.forEach(function (pt) {
        var c = el('circle', {
          class: 'gl22-punto', cx: xPx(pt[0]).toFixed(1), cy: yPx(pt[1]).toFixed(1),
          r: 3.6, stroke: col, tabindex: '0',
          'aria-label': ser.nombre + ' (' + pt[0] + ', ' + fmtNum(pt[1]) + ')'
        });
        var show = function () {
          globo.textContent = ser.nombre + ': (' + fmtNum(pt[0]) + ', ' + fmtNum(pt[1]) + ')';
        };
        c.addEventListener('mouseenter', show);
        c.addEventListener('focus', show);
        grp.appendChild(c);
      });
      svg.appendChild(grp);

      if (cfg.series.length > 1) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gl22-ley-btn';
        btn.setAttribute('aria-pressed', 'true');
        btn.innerHTML = '<span class="gl22-ley-muestra" style="background:' + col + '"></span>' + ser.nombre;
        btn.addEventListener('click', function () {
          var vis = btn.getAttribute('aria-pressed') === 'true';
          btn.setAttribute('aria-pressed', vis ? 'false' : 'true');
          grp.style.display = vis ? 'none' : '';
        });
        leyenda.appendChild(btn);
      }
    });

    if (leyenda.childNodes.length) host.appendChild(leyenda);
    host.appendChild(svg);
    host.appendChild(globo);
  }

  function init() {
    document.querySelectorAll('.grafica-libro[data-grafica]').forEach(function (host) {
      var key = host.getAttribute('data-grafica');
      if (key === '2-8') renderBarras(host);
      else if (SERIES_CFG[key]) renderLinea(host, key);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
