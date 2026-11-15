/*
 * Gráficas interactivas del Libro 23 (MAPAS, Conagua):
 * - 4-1:   Ilustración 4.1 Distribución del ácido hipocloroso y del hipoclorito en agua a diferentes valores de pH
 * - 5-6:   Ilustración 5.6 Efecto del flujo en la dosis de luz UV
 * - 5-14:  Ilustración 5.14 Curva de respuesta de coliformes fecales a diferentes dosis
 * - 5-15:  Ilustración 5.15 Selección de la dosis de desinfección
 * - 5-16:  Ilustración 5.16 Curva que relaciona la intensidad promedio con la transmitancia filtrada del agua
 * - 5-17a: Ilustración 5.17 Efecto del tamaño de partículas (primera serie de ensayos)
 * - 5-17b: Ilustración 5.17 Efecto del tamaño de partículas (segunda serie de ensayos)
 * - 6-11:  Ilustración 6.11 Representación de la velocidad de decremento de ozono
 * - 6-13:  Ilustración 6.13 Representación del log (O3/O30) contra el tiempo, para obtener el coeficiente k'
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro23.css.
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  function hocl(pH, pKa) {
    return +(100 / (1 + Math.pow(10, pH - pKa))).toFixed(2);
  }
  var phs = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11];

  var GRAFICAS = {
    '4-1': {
      aria: 'Ilustración 4.1 Distribución del ácido hipocloroso y del hipoclorito en agua a diferentes valores de pH',
      xMin: 4, xMax: 11, xStep: 1, xLabel: 'pH',
      yMin: 0, yMax: 100, yStep: 10, yLabel: 'HOCl % (Ácido hipocloroso)',
      yRight: true,
      series: [
        {
          id: '20c', nombre: '20 °C (pKa = 7.54)', color: '#1d4ed8',
          pts: phs.map(function (p) { return [p, hocl(p, 7.54)]; })
        },
        {
          id: '0c', nombre: '0 °C (pKa = 7.82)', color: '#0f766e',
          pts: phs.map(function (p) { return [p, hocl(p, 7.82)]; })
        }
      ],
      fmtY: function (v) { return v.toFixed(1) + '% HOCl / ' + (100 - v).toFixed(1) + '% OCl-'; },
      fmtX: function (v) { return 'pH ' + v; }
    },
    '5-6': {
      aria: 'Ilustración 5.6 Efecto del flujo en la dosis de luz UV',
      xMin: 0, xMax: 50, xStep: 10, xLabel: 'Flujo (L/min)',
      yMin: 0, yMax: 50, yStep: 10, yLabel: 'Dosis (mWs/cm²)',
      series: [
        {
          id: 'sin', nombre: 'Flujo sin corto circuito', color: '#1d4ed8',
          pts: [[21.0, 40.0], [25.0, 34.9], [28.0, 23.0], [33.0, 22.1]]
        },
        {
          id: 'con', nombre: 'Flujo con corto circuito', color: '#c81e1e',
          pts: [[16.0, 17.9], [25.0, 17.4], [34.9, 17.4], [40.1, 17.0]]
        }
      ],
      fmtY: function (v) { return v.toFixed(1) + ' mWs/cm²'; },
      fmtX: function (v) { return v.toFixed(1) + ' L/min'; }
    },
    '5-14': {
      aria: 'Ilustración 5.14 Curva de respuesta de coliformes fecales a diferentes dosis',
      xMin: 0, xMax: 60, xStep: 10, xLabel: 'Dosis (mWs/cm²)',
      yMin: 0, yMax: 8, yStep: 1, yLabel: 'Coliformes fecales (UFC/100 ml)',
      yLog10: true,
      series: [
        {
          id: 's1', nombre: 'Ensayo 1', color: '#1d4ed8',
          pts: [[0.0, 7.37], [6.0, 5.58], [12.0, 3.91], [24.1, 3.43], [48.0, 3.15]]
        },
        {
          id: 's2', nombre: 'Ensayo 2', color: '#7e22ce',
          pts: [[0.0, 7.31], [6.2, 5.54], [12.2, 3.36], [24.4, 2.11], [48.9, 1.77]]
        },
        {
          id: 's3', nombre: 'Ensayo 3', color: '#b45309',
          pts: [[0.0, 7.17], [6.5, 5.27], [12.9, 3.12], [26.0, 2.67], [52.0, 2.36]]
        }
      ],
      fmtY: function (v) { return '10^' + v.toFixed(2) + ' (' + Math.round(Math.pow(10, v)).toLocaleString('es-MX') + ' UFC/100 ml)'; },
      fmtX: function (v) { return v.toFixed(1) + ' mWs/cm²'; }
    },
    '5-15': {
      aria: 'Ilustración 5.15 Selección de la dosis de desinfección',
      xMin: 0, xMax: 60, xStep: 10, xLabel: 'Dosis (mWs/cm²)',
      yMin: 0, yMax: 8, yStep: 1, yLabel: 'Coliformes fecales (UFC/100 ml)',
      yLog10: true,
      hLine: { y: 3, label: 'Límite normativo (10³ UFC/100 ml)' },
      series: [
        {
          id: 's1', nombre: 'Ensayo 1', color: '#1d4ed8',
          pts: [[0.0, 7.37], [6.0, 5.58], [12.0, 3.91], [24.1, 3.43], [48.0, 3.15]]
        },
        {
          id: 's2', nombre: 'Ensayo 2', color: '#7e22ce',
          pts: [[0.0, 7.31], [6.2, 5.54], [12.2, 3.36], [24.4, 2.11], [48.9, 1.77]]
        },
        {
          id: 's3', nombre: 'Ensayo 3', color: '#b45309',
          pts: [[0.0, 7.17], [6.5, 5.27], [12.9, 3.12], [26.0, 2.67], [52.0, 2.36]]
        }
      ],
      fmtY: function (v) { return '10^' + v.toFixed(2) + ' (' + Math.round(Math.pow(10, v)).toLocaleString('es-MX') + ' UFC/100 ml)'; },
      fmtX: function (v) { return v.toFixed(1) + ' mWs/cm²'; }
    },
    '5-16': {
      aria: 'Ilustración 5.16 Curva que relaciona la intensidad promedio con la transmitancia filtrada del agua',
      xMin: 0, xMax: 100, xStep: 20, xLabel: 'Transmitancia filtrada (%)',
      yMin: 0, yMax: 16, yStep: 4, yLabel: 'Intensidad UV (mW/cm²)',
      series: [
        {
          id: 'uv', nombre: 'Intensidad promedio UV', color: '#c81e1e',
          pts: [[40.1, 3.22], [45.0, 3.57], [50.2, 4.02], [55.0, 4.56], [59.9, 5.18], [65.1, 5.99], [69.9, 6.97], [75.1, 8.13], [79.9, 9.83], [90.0, 14.48]]
        }
      ],
      fmtY: function (v) { return v.toFixed(2) + ' mW/cm²'; },
      fmtX: function (v) { return v.toFixed(1) + ' %'; }
    },
    '5-17a': {
      aria: 'Ilustración 5.17 Efecto del tamaño de partículas (lote 1)',
      xMin: 0, xMax: 60, xStep: 10, xLabel: 'Dosis (mWs/cm²)',
      yMin: 0, yMax: 8, yStep: 1, yLabel: 'Coliformes fecales (UFC/100 ml)',
      yLog10: true,
      series: [
        {
          id: 'ep', nombre: 'Efluente primario (6% T, 37 mg/L SST, 18 µm DTP)', color: '#1d4ed8',
          pts: [[0.0, 7.10], [6.2, 5.62], [12.3, 3.82], [24.8, 3.12], [49.7, 2.76]]
        },
        {
          id: 'ms', nombre: 'Efluente filtro medio sintético (5% T, 10 mg/L SST, 12 µm DTP)', color: '#7e22ce',
          pts: [[0.0, 7.10], [5.8, 5.37], [11.6, 3.79], [23.1, 2.31], [46.5, 1.16]]
        },
        {
          id: 'fa', nombre: 'Efluente filtro de arena (8% T, 29 mg/L SST, 13 µm DTP)', color: '#b45309',
          pts: [[0.0, 7.00], [6.7, 5.33], [13.4, 3.53], [26.8, 2.73], [53.6, 1.88]]
        }
      ],
      fmtY: function (v) { return '10^' + v.toFixed(2) + ' UFC/100 ml'; },
      fmtX: function (v) { return v.toFixed(1) + ' mWs/cm²'; }
    },
    '5-17b': {
      aria: 'Ilustración 5.17 Efecto del tamaño de partículas (lote 2)',
      xMin: 0, xMax: 60, xStep: 10, xLabel: 'Dosis (mWs/cm²)',
      yMin: 0, yMax: 8, yStep: 1, yLabel: 'Coliformes fecales (UFC/100 ml)',
      yLog10: true,
      series: [
        {
          id: 'ep', nombre: 'Efluente primario (6% T, 48 mg/L SST, 18 µm DTP)', color: '#1d4ed8',
          pts: [[0.0, 7.37], [6.0, 5.60], [12.1, 3.93], [24.0, 3.41], [48.0, 3.13]]
        },
        {
          id: 'ms', nombre: 'Filtro de medio sintético (7% T, 18 mg/L SST, 11 µm DTP)', color: '#7e22ce',
          pts: [[0.0, 7.34], [6.0, 5.53], [12.2, 3.34], [24.4, 2.08], [48.9, 1.77]]
        },
        {
          id: 'fa', nombre: 'Filtro de arena (8% T, 25 mg/L SST, 12 µm DTP)', color: '#b45309',
          pts: [[0.0, 7.16], [6.5, 5.25], [13.0, 3.13], [25.9, 2.68], [52.0, 2.33]]
        }
      ],
      fmtY: function (v) { return '10^' + v.toFixed(2) + ' UFC/100 ml'; },
      fmtX: function (v) { return v.toFixed(1) + ' mWs/cm²'; }
    },
    '6-11': {
      aria: 'Ilustración 6.11 Representación de la velocidad de decremento de ozono',
      xMin: 25, xMax: 40, xStep: 5, xLabel: 'Tiempo (minutos)',
      yMin: -1.0, yMax: 0.2, yStep: 0.2, yLabel: 'ln O3 / (O3)o',
      series: [
        {
          id: 'ajuste', nombre: 'Recta de ajuste', color: '#c81e1e',
          pts: [[25.5, 0.08], [40.0, -0.82]]
        },
        {
          id: 'obs', nombre: 'Mediciones', color: '#1d4ed8', soloPuntos: true,
          pts: [[29.5, -0.02], [29.5, -0.34], [32.0, -0.28], [34.5, -0.46], [35.5, -0.62], [37.5, -0.71], [39.5, -0.86]]
        }
      ],
      fmtY: function (v) { return v.toFixed(2); },
      fmtX: function (v) { return v.toFixed(1) + ' min'; }
    },
    '6-13': {
      aria: 'Ilustración 6.13 Representación del log (O3/O30) contra el tiempo, para obtener el coeficiente k\'',
      xMin: 30, xMax: 50, xStep: 5, xLabel: 'Tiempo (minutos)',
      yMin: -1.5, yMax: 0.0, yStep: 0.5, yLabel: 'ln O3 / (O30)',
      series: [
        {
          id: 'ajuste', nombre: 'Recta de decaimiento', color: '#c81e1e',
          pts: [[36.0, -0.50], [48.0, -1.25]]
        }
      ],
      fmtY: function (v) { return v.toFixed(2); },
      fmtX: function (v) { return v.toFixed(1) + ' min'; }
    }
  };

  function el(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) n.setAttribute(k, attrs[k]);
    }
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function renderGrafica(cont, cfg) {
    var W = 620, H = 310;
    var M = { t: 20, r: cfg.yRight ? 58 : 24, b: 44, l: 64 };
    var PW = W - M.l - M.r;
    var PH = H - M.t - M.b;

    function sx(x) { return M.l + ((x - cfg.xMin) / (cfg.xMax - cfg.xMin)) * PW; }
    function sy(y) { return M.t + PH - ((y - cfg.yMin) / (cfg.yMax - cfg.yMin)) * PH; }

    var leyenda = document.createElement('div');
    leyenda.className = 'l23-leyenda';
    var globo = document.createElement('div');
    globo.className = 'l23-globo';
    globo.setAttribute('aria-live', 'polite');

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': cfg.aria,
      style: 'width:100%;height:auto;display:block;'
    });

    // Retícula y etiquetas Y
    for (var y = cfg.yMin; y <= cfg.yMax + 1e-6; y += cfg.yStep) {
      var yy = sy(y);
      svg.appendChild(el('line', { x1: M.l, y1: yy, x2: W - M.r, y2: yy, class: 'l23-reticula' }));
      var labY = cfg.yLog10 ? ('10^' + Math.round(y)) : (Math.abs(y) < 1e-6 ? '0' : (cfg.yStep < 1 ? y.toFixed(1) : String(Math.round(y))));
      svg.appendChild(el('text', { x: M.l - 8, y: yy + 3.5, 'text-anchor': 'end', class: 'l23-etiq' }, labY));
      if (cfg.yRight) {
        svg.appendChild(el('text', { x: W - M.r + 8, y: yy + 3.5, 'text-anchor': 'start', class: 'l23-etiq' }, String(Math.round(100 - y))));
      }
    }

    // Retícula y etiquetas X
    for (var x = cfg.xMin; x <= cfg.xMax + 1e-6; x += cfg.xStep) {
      var xx = sx(x);
      svg.appendChild(el('line', { x1: xx, y1: M.t, x2: xx, y2: H - M.b, class: 'l23-reticula' }));
      svg.appendChild(el('text', { x: xx, y: H - M.b + 16, 'text-anchor': 'middle', class: 'l23-etiq' }, String(x)));
    }

    // Ejes
    svg.appendChild(el('line', { x1: M.l, y1: M.t, x2: M.l, y2: H - M.b, class: 'l23-ejes' }));
    svg.appendChild(el('line', { x1: M.l, y1: H - M.b, x2: W - M.r, y2: H - M.b, class: 'l23-ejes' }));

    // Títulos de ejes
    svg.appendChild(el('text', {
      x: M.l + PW / 2, y: H - 8, 'text-anchor': 'middle', class: 'l23-titulo-eje'
    }, cfg.xLabel));
    svg.appendChild(el('text', {
      x: 16, y: M.t + PH / 2, 'text-anchor': 'middle',
      transform: 'rotate(-90 16 ' + (M.t + PH / 2) + ')', class: 'l23-titulo-eje'
    }, cfg.yLabel));
    if (cfg.yRight) {
      svg.appendChild(el('text', {
        x: W - 12, y: M.t + PH / 2, 'text-anchor': 'middle',
        transform: 'rotate(-90 ' + (W - 12) + ' ' + (M.t + PH / 2) + ')', class: 'l23-titulo-eje'
      }, 'OCl- % (Ion hipoclorito)'));
    }

    // Línea horizontal de referencia (p. ej. 5.15)
    if (cfg.hLine) {
      var hy = sy(cfg.hLine.y);
      svg.appendChild(el('line', {
        x1: M.l, y1: hy, x2: W - M.r, y2: hy,
        stroke: '#dc2626', 'stroke-width': '1.6', 'stroke-dasharray': '6 4'
      }));
      svg.appendChild(el('text', {
        x: W - M.r - 4, y: hy - 5, 'text-anchor': 'end', fill: '#dc2626', class: 'l23-etiq'
      }, cfg.hLine.label));
    }

    var grupos = {};
    cfg.series.forEach(function (s) {
      var g = el('g', { 'data-serie': s.id });
      if (!s.soloPuntos) {
        var d = s.pts.map(function (pt, idx) {
          return (idx === 0 ? 'M' : 'L') + sx(pt[0]).toFixed(1) + ',' + sy(pt[1]).toFixed(1);
        }).join(' ');
        g.appendChild(el('path', {
          d: d, fill: 'none', stroke: s.color, 'stroke-width': '2.2',
          'stroke-linejoin': 'round', 'stroke-linecap': 'round'
        }));
      }
      s.pts.forEach(function (pt) {
        var c = el('circle', {
          cx: sx(pt[0]).toFixed(1), cy: sy(pt[1]).toFixed(1), r: '4',
          fill: s.color, stroke: 'var(--surface, #fff)', 'stroke-width': '1.5',
          class: 'l23-punto', tabindex: '0',
          'aria-label': s.nombre + ': ' + cfg.fmtX(pt[0]) + ', ' + cfg.fmtY(pt[1])
        });
        function mostrar() {
          globo.textContent = s.nombre + ': ' + cfg.fmtX(pt[0]) + ' -> ' + cfg.fmtY(pt[1]);
        }
        c.addEventListener('mouseenter', mostrar);
        c.addEventListener('focus', mostrar);
        c.addEventListener('click', mostrar);
        g.appendChild(c);
      });
      svg.appendChild(g);
      grupos[s.id] = g;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'true');
      var muestra = document.createElement('span');
      muestra.className = 'l23-muestra';
      muestra.style.background = s.color;
      btn.appendChild(muestra);
      btn.appendChild(document.createTextNode(s.nombre));
      btn.addEventListener('click', function () {
        var vis = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', vis ? 'false' : 'true');
        grupos[s.id].style.display = vis ? 'none' : '';
      });
      leyenda.appendChild(btn);
    });

    cont.appendChild(leyenda);
    cont.appendChild(globo);
    cont.appendChild(svg);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var nodes = document.querySelectorAll('.grafica-libro[data-grafica]');
    for (var i = 0; i < nodes.length; i++) {
      var id = nodes[i].getAttribute('data-grafica');
      if (GRAFICAS[id]) renderGrafica(nodes[i], GRAFICAS[id]);
    }
  });
})();
