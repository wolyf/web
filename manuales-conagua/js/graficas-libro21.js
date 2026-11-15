/*
 * Gráficas interactivas del Libro 21 (MAPAS, Conagua):
 * - l21-3-8:  Ilustración 3.8 Perfil de la línea entre la cámara colectora 1 y la estación de vacío
 * - l21-3-16: Ilustración 3.16 Perfil de la línea entre el cárcamo de bombeo y la descarga
 * - l21-3-23: Ilustración 3.23 Perfil del terreno para la línea principal
 * - l21-3-30: Ilustración 3.30 Perfil de la línea a presión
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro21.css.
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var DATOS = {"3-8":[[0.0,736.53],[9.9,740.0],[12.77,740.76],[16.22,741.58],[37.78,746.64],[52.12,750.0],[54.55,750.64],[64.93,752.71],[70.55,753.44],[78.05,754.71],[89.76,757.55],[98.87,760.0],[114.21,765.19],[125.93,769.08],[128.29,770.0],[132.05,776.8],[133.91,780.0],[134.34,780.41],[135.85,781.48],[140.78,785.2]],"3-16":[[0.0,736.53],[9.9,740.0],[12.78,740.76],[16.22,741.58],[37.78,746.64],[52.12,750.0],[54.55,750.64],[64.93,752.71],[70.55,753.44],[78.05,754.71],[89.76,757.55],[98.88,760.0],[114.21,765.19],[125.93,769.08],[128.29,770.0],[132.05,776.8],[133.91,780.0],[134.34,780.41],[135.85,781.48],[140.78,785.2]],"3-23":[[1477.9,2058.43],[1405.6,2057.42],[1350.7,2056.75],[1320.7,2056.45],[1311.0,2056.18],[1295.8,2055.87],[1259.4,2055.66],[1242.3,2055.65],[1208.0,2055.22],[1183.6,2055.07],[1162.2,2055.0],[1129.0,2055.1],[1119.4,2055.15],[1081.8,2055.09],[1053.9,2054.63],[968.1,2055.22],[919.7,2055.52],[858.8,2056.05],[851.3,2055.95],[842.0,2055.77],[829.4,2055.21],[720.1,2052.91],[583.9,2051.05],[523.8,2050.32],[499.6,2049.83],[478.2,2049.34],[458.8,2048.88],[428.2,2048.46],[419.5,2048.33],[304.2,2049.59],[279.9,2049.71],[207.1,2050.24],[192.5,2050.28],[133.8,2050.68],[37.7,2050.94]],"3-30":[[0.0,2055.12],[20.0,2054.57],[103.3,2055.22],[133.2,2055.74],[158.9,2055.57],[212.9,2056.06],[217.9,2056.03],[226.6,2055.86],[229.8,2055.78],[241.6,2055.36],[246.4,2055.26],[352.0,2052.91],[483.8,2051.17],[490.6,2051.03],[548.9,2050.33],[565.0,2050.01],[582.0,2049.5],[594.5,2049.34],[607.0,2049.15],[617.2,2048.78],[644.7,2048.47],[650.3,2048.38],[672.2,2048.5],[769.0,2049.6],[789.4,2049.66],[798.7,2049.77],[866.4,2050.24],[871.4,2050.32],[918.6,2050.5],[939.9,2050.68],[1033.3,2051.01]]};

  var CONFIG = {
    '3-8': {
      aria: 'Ilustración 3.8 Perfil de la línea entre la cámara colectora 1 y la estación de vacío',
      xMin: 0, xMax: 140.78, xStep: 20, xLabel: 'Cadenamiento (m)',
      yMin: 730, yMax: 790, yStep: 10, yLabel: 'Elevación (m)',
      invertX: false,
      notas: [
        { x: 0, y: 736.53, t: 'Cámara colectora 1 (736.53 m)', dx: 6, dy: -8, anchor: 'start' },
        { x: 140.78, y: 785.20, t: 'Estación de vacío (785.20 m)', dx: -6, dy: -8, anchor: 'end' }
      ],
      ref: { pts: [[0, 785.2], [140.78, 785.2]], label: 'Cota de descarga / nivel de referencia (z2)' }
    },
    '3-16': {
      aria: 'Ilustración 3.16 Perfil de la línea entre el cárcamo de bombeo y la descarga',
      xMin: 0, xMax: 140.78, xStep: 20, xLabel: 'Cadenamiento (m)',
      yMin: 730, yMax: 800, yStep: 10, yLabel: 'Elevación (m)',
      invertX: false,
      notas: [
        { x: 0, y: 736.53, t: 'Cárcamo de bombeo (736.53 m)', dx: 6, dy: -8, anchor: 'start' },
        { x: 140.78, y: 785.20, t: 'Descarga (785.20 m)', dx: -6, dy: 14, anchor: 'end' }
      ],
      ref: { pts: [[0, 795.0], [140.78, 785.2]], label: 'Línea piezométrica (Z2 + hf)' }
    },
    '3-23': {
      aria: 'Ilustración 3.23 Perfil del terreno para la línea principal',
      xMin: 37.85, xMax: 1477.85, xStep: 200, xLabel: 'Cadenamiento (m)',
      yMin: 2042, yMax: 2060, yStep: 2, yLabel: 'Elevación (m)',
      invertX: true,
      notas: [
        { x: 1477.85, y: 2058.43, t: 'Inicio (2058.43 m)', dx: 6, dy: -8, anchor: 'start' },
        { x: 37.85, y: 2050.94, t: 'Humedal (2050.94 m)', dx: -6, dy: -8, anchor: 'end' }
      ],
      ref: null
    },
    '3-30': {
      aria: 'Ilustración 3.30 Perfil de la línea a presión',
      xMin: 0, xMax: 1033.31, xStep: 200, xLabel: 'Cadenamiento (m)',
      yMin: 2041, yMax: 2060, yStep: 5, yLabel: 'Elevación (m)',
      invertX: false,
      notas: [
        { x: 0, y: 2055.12, t: '0+000.00 (2055.12 m)', dx: 6, dy: -8, anchor: 'start' },
        { x: 1033.31, y: 2051.01, t: '1+033.31 (2051.00 m)', dx: -6, dy: -8, anchor: 'end' }
      ],
      ref: null
    }
  };

  function el(tag, attrs, texto) {
    var n = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    }
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function fmtCad(m) {
    var km = Math.floor(m / 1000);
    var res = (m - km * 1000).toFixed(2);
    while (res.length < 6) res = '0' + res;
    return km + '+' + res;
  }

  function renderPerfil(host, key) {
    var cfg = CONFIG[key];
    var pts = DATOS[key];
    if (!cfg || !pts) return;

    var W = 600, H = 300;
    var mL = 62, mR = 24, mT = 22, mB = 46;
    var pW = W - mL - mR, pH = H - mT - mB;

    function xPx(x) {
      var t = (x - cfg.xMin) / (cfg.xMax - cfg.xMin);
      if (cfg.invertX) t = 1 - t;
      return mL + t * pW;
    }
    function yPx(y) {
      return mT + (1 - (y - cfg.yMin) / (cfg.yMax - cfg.yMin)) * pH;
    }

    var svg = el('svg', {
      class: 'grafica-svg',
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      tabindex: '0',
      'aria-label': cfg.aria
    });

    for (var yv = Math.ceil(cfg.yMin / cfg.yStep) * cfg.yStep; yv <= cfg.yMax; yv += cfg.yStep) {
      var y = yPx(yv);
      svg.appendChild(el('line', { class: 'reticula', x1: mL, y1: y.toFixed(1), x2: W - mR, y2: y.toFixed(1) }));
      svg.appendChild(el('text', { class: 'eje-etiq', x: mL - 8, y: (y + 3.5).toFixed(1), 'text-anchor': 'end' }, String(yv)));
    }

    var xStart = cfg.invertX ? Math.floor(cfg.xMax / cfg.xStep) * cfg.xStep : Math.ceil(cfg.xMin / cfg.xStep) * cfg.xStep;
    var xEnd = cfg.invertX ? cfg.xMin : cfg.xMax;
    for (var xv = xStart; cfg.invertX ? xv >= xEnd : xv <= xEnd; xv += (cfg.invertX ? -cfg.xStep : cfg.xStep)) {
      var x = xPx(xv);
      svg.appendChild(el('line', { class: 'reticula', x1: x.toFixed(1), y1: mT, x2: x.toFixed(1), y2: mT + pH }));
      svg.appendChild(el('text', { class: 'eje-etiq', x: x.toFixed(1), y: mT + pH + 16, 'text-anchor': 'middle' }, String(Math.round(xv))));
    }

    svg.appendChild(el('line', { class: 'eje', x1: mL, y1: mT, x2: mL, y2: mT + pH }));
    svg.appendChild(el('line', { class: 'eje', x1: mL, y1: mT + pH, x2: W - mR, y2: mT + pH }));

    svg.appendChild(el('text', {
      class: 'eje-titulo', x: 16, y: mT + pH / 2,
      transform: 'rotate(-90 16 ' + (mT + pH / 2) + ')', 'text-anchor': 'middle'
    }, cfg.yLabel));
    svg.appendChild(el('text', {
      class: 'eje-titulo', x: mL + pW / 2, y: H - 8, 'text-anchor': 'middle'
    }, cfg.xLabel));

    if (cfg.ref) {
      var dRef = cfg.ref.pts.map(function (p, i) {
        return (i === 0 ? 'M' : 'L') + xPx(p[0]).toFixed(1) + ' ' + yPx(p[1]).toFixed(1);
      }).join(' ');
      svg.appendChild(el('path', { class: 'perfil-rasante', d: dRef }));
    }

    var dTer = pts.map(function (p, i) {
      return (i === 0 ? 'M' : 'L') + xPx(p[0]).toFixed(1) + ' ' + yPx(p[1]).toFixed(1);
    }).join(' ');
    svg.appendChild(el('path', { class: 'perfil-terreno', d: dTer }));

    cfg.notas.forEach(function (n) {
      svg.appendChild(el('text', {
        class: 'perfil-etiq',
        x: (xPx(n.x) + n.dx).toFixed(1),
        y: (yPx(n.y) + n.dy).toFixed(1),
        'text-anchor': n.anchor
      }, n.t));
    });

    var glob = document.createElement('div');
    glob.className = 'grafica-globo';
    glob.hidden = true;

    var circulos = [];
    function activar(idx) {
      circulos.forEach(function (c, i) { c.classList.toggle('activo', i === idx); });
      if (idx < 0 || idx >= pts.length) { glob.hidden = true; return; }
      var pt = pts[idx];
      glob.innerHTML = '<strong>Cad. ' + fmtCad(pt[0]) + '</strong> (' + pt[0].toFixed(1) + ' m) · Elevación: <strong>' + pt[1].toFixed(2) + ' m</strong>';
      glob.hidden = false;
    }

    pts.forEach(function (pt, i) {
      var c = el('circle', {
        class: 'perfil-punto',
        cx: xPx(pt[0]).toFixed(1),
        cy: yPx(pt[1]).toFixed(1),
        r: '3.2'
      });
      c.addEventListener('mouseenter', function () { activar(i); });
      c.addEventListener('mouseleave', function () { activar(-1); });
      c.addEventListener('click', function () { activar(i); });
      svg.appendChild(c);
      circulos.push(c);
    });

    var idxSel = -1;
    svg.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        idxSel = (idxSel + 1) % pts.length;
        activar(idxSel);
      } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        idxSel = (idxSel - 1 + pts.length) % pts.length;
        activar(idxSel);
      } else if (ev.key === 'Escape') {
        idxSel = -1;
        activar(-1);
      }
    });

    host.appendChild(svg);
    host.appendChild(glob);
  }

  function iniciar() {
    document.querySelectorAll('.grafica-libro[data-grafica]').forEach(function (host) {
      var g = host.getAttribute('data-grafica') || '';
      if (g.indexOf('l21-') === 0) g = g.slice(4);
      renderPerfil(host, g);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
