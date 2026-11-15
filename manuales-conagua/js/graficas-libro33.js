/*
 * Gráficas interactivas del Libro 33 (MAPAS, Conagua).
 * Sin librerías externas; usa SVG y HTML con variables del tema.
 * Ilustraciones: 2-2, 3-3, 3-4, 3-5, 3-6, 5-4, 5-5 y 7-5.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function html(tag, attrs, parent, txt) {
    var n = document.createElement(tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (txt != null) n.textContent = txt;
    if (parent) parent.appendChild(n);
    return n;
  }

  function svgText(parent, x, y, txt, cls, extra) {
    var t = el('text', Object.assign({ x: x, y: y, 'class': cls }, extra || {}), parent);
    t.textContent = txt;
    return t;
  }

  var GRAFICAS = {
    '2-2': {
      tipo: 'xy',
      titulo: 'Velocidad de utilización del sustrato contra concentración de DQOsb',
      x: { titulo: 'Concentración de sustrato, mg DQOsb/L', min: 0, max: 50, paso: 10, dec: 0 },
      y: { titulo: 'Velocidad -rsu (mg/L·d)', min: 0, max: 700, paso: 100, dec: 0 },
      nota: 'k = 6.6 mg DQOsb/mg SSV·d, X = 100 mg SSV/L, Ks = 5 mg DQOsb/L',
      series: [{
        nombre: 'Modelo de saturación',
        puntos: [0, 2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(function (s) {
          return [s, +(6.6 * 100 * s / (5 + s)).toFixed(1)];
        })
      }]
    },
    '3-3': {
      tipo: 'xy',
      titulo: 'Determinación de k',
      x: { titulo: 'DBOs (Se) (kg/m³)', min: 0.010, max: 0.035, paso: 0.005, dec: 3 },
      y: { titulo: 'q (kg DBO consumida / kg SSVLM·d)', min: 0, max: 1.40, paso: 0.20, dec: 2 },
      nota: 'y = 37.762x + 0.1627 (R² = 0.99927)',
      tendencia: [[0.013, 37.762 * 0.013 + 0.1627], [0.030, 37.762 * 0.030 + 0.1627]],
      series: [{
        nombre: 'Reactores piloto',
        puntos: [[0.013, 0.44], [0.016, 0.56], [0.021, 0.79], [0.030, 1.29]]
      }]
    },
    '3-4': {
      tipo: 'xy',
      titulo: 'Velocidad de consumo de oxígeno por reactor piloto',
      x: { titulo: 'Tiempo (min)', min: 0, max: 16, paso: 2, dec: 0 },
      y: { titulo: 'OD (mg/L)', min: 0, max: 9, paso: 1, dec: 2 },
      series: [
        { nombre: 'R1', puntos: [[0,6.90],[1,5.50],[2,5.20],[3,4.90],[4,4.60],[5,4.30],[6,4.00],[7,3.70],[8,3.40],[9,3.10],[10,2.80],[11,2.50],[12,2.20],[13,1.90],[14,1.60],[15,1.30]] },
        { nombre: 'R2', puntos: [[0,7.40],[1,6.00],[2,5.75],[3,5.50],[4,5.25],[5,5.00],[6,4.75],[7,4.50],[8,4.25],[9,4.00],[10,3.75],[11,3.50],[12,3.25],[13,3.00],[14,2.75],[15,2.50]] },
        { nombre: 'R3', puntos: [[0,7.80],[1,6.40],[2,6.18],[3,5.95],[4,5.73],[5,5.50],[6,5.28],[7,5.06],[8,4.83],[9,4.61],[10,4.38],[11,4.16],[12,3.94],[13,3.71],[14,3.49],[15,3.26]] },
        { nombre: 'R4', puntos: [[0,8.10],[1,6.70],[2,6.49],[3,6.29],[4,6.08],[5,5.87],[6,5.67],[7,5.46],[8,5.25],[9,5.04],[10,4.84],[11,4.63],[12,4.42],[13,4.22],[14,4.01],[15,3.80]] }
      ]
    },
    '3-5': {
      tipo: 'xy',
      titulo: 'Determinación de los coeficientes a y b',
      x: { titulo: 'q (kg DBO consumida / kg SSVLM·d)', min: 0, max: 1.40, paso: 0.20, dec: 2 },
      y: { titulo: 'Ro (kg O₂ / kg SSVLM·d)', min: 0, max: 0.120, paso: 0.020, dec: 3 },
      nota: 'y = 0.0298x + 0.0683 (R² = 0.99918)',
      tendencia: [[0.44, 0.0298 * 0.44 + 0.0683], [1.29, 0.0298 * 1.29 + 0.0683]],
      series: [{
        nombre: 'Reactores piloto',
        puntos: [[0.44, 0.088], [0.56, 0.091], [0.79, 0.097], [1.29, 0.107]]
      }]
    },
    '3-6': {
      tipo: 'xy',
      titulo: 'Determinación de Y y kd',
      x: { titulo: 'q (kg DBO consumida / kg SSVLM·d)', min: 0, max: 1.50, paso: 0.50, dec: 2 },
      y: { titulo: 'μ (kg SSVLM producidos / kg SSVLM·d)', min: -0.020, max: 0.040, paso: 0.010, dec: 3 },
      nota: 'Regresión ajustada con puntos experimentales',
      tendencia: [[0.44, 0.006], [1.29, 0.034]],
      series: [{
        nombre: 'Reactores piloto',
        puntos: [[0.44, 0.006], [0.56, 0.011], [0.79, 0.021], [1.29, 0.034]]
      }]
    },
    '5-4': {
      tipo: 'porcentajes',
      titulo: 'Aplicación de los BRM en el tratamiento de aguas residuales',
      grupos: [{
        subtitulo: 'Distribución por aplicación (%)',
        items: [
          { nombre: 'Industrias', valor: 27 },
          { nombre: 'Domésticas', valor: 27 },
          { nombre: 'Reutilización en edificios', valor: 24 },
          { nombre: 'Municipales', valor: 13 },
          { nombre: 'Lixiviados', valor: 9 }
        ]
      }]
    },
    '5-5': {
      tipo: 'porcentajes',
      titulo: 'Tipos de BRM en el tratamiento de aguas residuales',
      grupos: [
        {
          subtitulo: 'Agua residual municipal (%)',
          items: [
            { nombre: 'Sumergida + fibra hueca', valor: 67 },
            { nombre: 'Sumergida + multitubos', valor: 22 },
            { nombre: 'Exterior y fibra hueca', valor: 11 }
          ]
        },
        {
          subtitulo: 'Agua residual industrial (%)',
          items: [
            { nombre: 'Sumergida + fibra hueca', valor: 39 },
            { nombre: 'Sumergida + placa plana', valor: 31 },
            { nombre: 'Exterior + multitubos', valor: 26 },
            { nombre: 'Exterior + placa plana', valor: 4 }
          ]
        }
      ]
    },
    '7-5': {
      tipo: 'xy',
      titulo: 'Porcentaje de partículas eliminadas contra tiempo de retención',
      x: { titulo: 'Tiempo de retención (min)', min: 0, max: 60, paso: 10, dec: 0 },
      y: { titulo: 'Remoción (%)', min: 0, max: 100, paso: 20, dec: 2 },
      series: [{
        nombre: 'Remoción vs tiempo',
        puntos: [[4.0, 31.04], [7.5, 41.42], [10.0, 48.49], [24.5, 57.75], [50.0, 65.83]]
      }]
    }
  };

  function renderXY(cont, cfg) {
    var W = 620, H = 310;
    var pad = { l: 64, r: 24, t: 24, b: 48 };
    var pw = W - pad.l - pad.r;
    var ph = H - pad.t - pad.b;

    function sx(v) { return pad.l + ((v - cfg.x.min) / (cfg.x.max - cfg.x.min)) * pw; }
    function sy(v) { return pad.t + ph - ((v - cfg.y.min) / (cfg.y.max - cfg.y.min)) * ph; }

    var activas = cfg.series.map(function () { return true; });
    if (cfg.series.length > 1) {
      var ley = html('div', { 'class': 'grafica-leyenda' }, cont);
      cfg.series.forEach(function (s, idx) {
        var btn = html('button', {
          type: 'button',
          'class': 'grafica-serie serie-' + (idx + 1),
          'aria-pressed': 'true'
        }, ley);
        var mu = el('svg', { width: 14, height: 14, viewBox: '0 0 14 14', 'class': 'grafica-muestra', 'aria-hidden': 'true' }, btn);
        el('circle', { cx: 7, cy: 7, r: 4, 'class': 'marca' }, mu);
        html('span', null, btn, s.nombre);
        btn.addEventListener('click', function () {
          activas[idx] = !activas[idx];
          btn.setAttribute('aria-pressed', activas[idx] ? 'true' : 'false');
          var g = svg.querySelector('.serie-g-' + idx);
          if (g) g.style.display = activas[idx] ? '' : 'none';
        });
      });
    }

    var lienzo = html('div', { 'class': 'grafica-lienzo' }, cont);
    var svg = el('svg', {
      'class': 'grafica-svg',
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': cfg.titulo
    }, lienzo);

    var gRet = el('g', { 'class': 'reticula' }, svg);
    for (var xv = cfg.x.min; xv <= cfg.x.max + 1e-9; xv += cfg.x.paso) {
      var xx = sx(xv);
      el('line', { x1: xx, y1: pad.t, x2: xx, y2: pad.t + ph }, gRet);
      svgText(svg, xx, pad.t + ph + 16, xv.toFixed(cfg.x.dec), 'marca-eje', { 'text-anchor': 'middle' });
    }
    for (var yv = cfg.y.min; yv <= cfg.y.max + 1e-9; yv += cfg.y.paso) {
      var yy = sy(yv);
      el('line', { x1: pad.l, y1: yy, x2: pad.l + pw, y2: yy }, gRet);
      svgText(svg, pad.l - 8, yy + 4, yv.toFixed(cfg.y.dec), 'marca-eje', { 'text-anchor': 'end' });
    }

    el('rect', { x: pad.l, y: pad.t, width: pw, height: ph, 'class': 'marco' }, svg);
    svgText(svg, pad.l + pw / 2, H - 8, cfg.x.titulo, 'titulo-eje', { 'text-anchor': 'middle' });
    svgText(svg, 16, pad.t + ph / 2, cfg.y.titulo, 'titulo-eje', {
      'text-anchor': 'middle',
      transform: 'rotate(-90 16 ' + (pad.t + ph / 2) + ')'
    });

    if (cfg.tendencia) {
      var dT = cfg.tendencia.map(function (p, i) {
        return (i === 0 ? 'M' : 'L') + sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1);
      }).join(' ');
      el('path', { d: dT, 'class': 'tendencia' }, svg);
    }

    if (cfg.nota) {
      svgText(svg, pad.l + 10, pad.t + 18, cfg.nota, 'ecuacion-nota');
    }

    var globo = html('div', { 'class': 'grafica-globo', hidden: '' }, lienzo);

    cfg.series.forEach(function (s, idx) {
      var g = el('g', { 'class': 'serie-' + (idx + 1) + ' serie-g-' + idx }, svg);
      var d = s.puntos.map(function (p, i) {
        return (i === 0 ? 'M' : 'L') + sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1);
      }).join(' ');
      el('path', { d: d, 'class': 'linea' }, g);
      s.puntos.forEach(function (p) {
        var cx = sx(p[0]), cy = sy(p[1]);
        var c = el('circle', {
          cx: cx, cy: cy, r: 4,
          'class': 'punto marca',
          tabindex: '0',
          'aria-label': s.nombre + ': ' + p[0] + ', ' + p[1]
        }, g);
        function mostrar() {
          globo.hidden = false;
          globo.textContent = s.nombre + ' (' + p[0] + ', ' + p[1] + ')';
          globo.style.left = Math.min(82, Math.max(8, (cx / W) * 100)) + '%';
          globo.style.top = Math.max(6, (cy / H) * 100 - 12) + '%';
        }
        function ocultar() { globo.hidden = true; }
        c.addEventListener('mouseenter', mostrar);
        c.addEventListener('focus', mostrar);
        c.addEventListener('mouseleave', ocultar);
        c.addEventListener('blur', ocultar);
      });
    });

    var det = html('details', { 'class': 'grafica-tabla-datos' }, cont);
    html('summary', null, det, 'Datos de la gráfica');
    var wrap = html('div', { 'class': 'tabla' }, det);
    var tab = html('table', null, wrap);
    var thead = html('thead', null, tab);
    var trH = html('tr', null, thead);
    html('th', { scope: 'col' }, trH, 'Serie');
    html('th', { scope: 'col' }, trH, cfg.x.titulo);
    html('th', { scope: 'col' }, trH, cfg.y.titulo);
    var tbody = html('tbody', null, tab);
    cfg.series.forEach(function (s) {
      s.puntos.forEach(function (p) {
        var tr = html('tr', null, tbody);
        html('td', null, tr, s.nombre);
        html('td', { 'class': 'n' }, tr, String(p[0]));
        html('td', { 'class': 'n' }, tr, String(p[1]));
      });
    });
  }

  function renderPorcentajes(cont, cfg) {
    cfg.grupos.forEach(function (g) {
      html('p', { 'class': 'subtitulo-graf' }, cont, g.subtitulo);
      g.items.forEach(function (it, idx) {
        var fila = html('div', { 'class': 'barra-pie serie-' + ((idx % 5) + 1) }, cont);
        var izq = html('div', null, fila);
        html('div', { style: 'font-size:.86rem;margin-bottom:2px' }, izq, it.nombre);
        var fondo = html('div', { 'class': 'barra-fondo' }, izq);
        html('div', { 'class': 'barra-relleno', style: 'width:' + it.valor + '%' }, fondo);
        html('strong', { style: 'font-family:var(--font-mono);font-size:.86rem' }, fila, it.valor + ' %');
      });
    });
  }

  document.querySelectorAll('.grafica-libro[data-grafica]').forEach(function (cont) {
    var id = cont.getAttribute('data-grafica');
    var cfg = GRAFICAS[id];
    if (!cfg) return;
    var nav = html('nav', { 'aria-label': 'Gráfica interactiva ' + id }, cont);
    if (cfg.tipo === 'xy') renderXY(nav, cfg);
    else if (cfg.tipo === 'porcentajes') renderPorcentajes(nav, cfg);
  });
})();
