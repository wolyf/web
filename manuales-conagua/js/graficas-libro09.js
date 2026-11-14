/*
 * Gráficas interactivas del Libro 9 (Sistemas de Medición del Agua, MAPAS, Conagua):
 * - l9-4-1:  Ilustración 4.1 Ejemplo de curva de errores de un medidor clase B
 * - l9-4-5:  Ilustración 4.5 Ejemplo de pérdida de carga ocasionada por los medidores de velocidad
 * - l9-4-10: Ilustración 4.10 Pérdida de carga para medidores deprimógenos (Cepis, 1985)
 * - l9-4-17: Ilustración 4.17 Variación de la exactitud de los medidores con la antigüedad
 * - l9-11-14: Ilustración 11.14 Cobertura promedio de medición de consumos (PIGOO, 2015)
 * - l9-11-27: Ilustración 11.27 Curva de comportamiento típico de un medidor de agua
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro09.css.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
      }
    }
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function hEl(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function dibujarLineas(cont, cfg) {
    var W = 680, H = 330;
    var M = { t: 26, r: 24, b: 48, l: 58 };
    var pw = W - M.l - M.r, ph = H - M.t - M.b;

    function sx(x) { return M.l + ((x - cfg.xmin) / (cfg.xmax - cfg.xmin)) * pw; }
    function sy(y) { return M.t + ph - ((y - cfg.ymin) / (cfg.ymax - cfg.ymin)) * ph; }

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'grafica-svg',
      tabindex: '0',
      role: 'img',
      'aria-label': cfg.titulo
    });

    // Rejilla
    var gGrid = el('g', { class: 'rejilla' });
    cfg.xticks.forEach(function (xv) {
      var x = sx(xv);
      gGrid.appendChild(el('line', { x1: x, y1: M.t, x2: x, y2: M.t + ph }));
      gGrid.appendChild(el('text', { x: x, y: M.t + ph + 16, 'text-anchor': 'middle', class: 'eje-tick' }, String(xv)));
    });
    cfg.yticks.forEach(function (yv) {
      var y = sy(yv);
      gGrid.appendChild(el('line', { x1: M.l, y1: y, x2: M.l + pw, y2: y }));
      gGrid.appendChild(el('text', { x: M.l - 8, y: y + 4, 'text-anchor': 'end', class: 'eje-tick' }, cfg.yfmt ? cfg.yfmt(yv) : String(yv)));
    });
    svg.appendChild(gGrid);

    // Ejes
    var gEjes = el('g', { class: 'ejes' });
    gEjes.appendChild(el('line', { x1: M.l, y1: M.t + ph, x2: M.l + pw, y2: M.t + ph }));
    gEjes.appendChild(el('line', { x1: M.l, y1: M.t, x2: M.l, y2: M.t + ph }));
    gEjes.appendChild(el('text', { x: M.l + pw / 2, y: H - 8, 'text-anchor': 'middle', class: 'eje-titulo' }, cfg.xlabel));
    gEjes.appendChild(el('text', {
      x: 15, y: M.t + ph / 2, 'text-anchor': 'middle',
      transform: 'rotate(-90 15 ' + (M.t + ph / 2) + ')',
      class: 'eje-titulo'
    }, cfg.ylabel));
    svg.appendChild(gEjes);

    // Líneas de referencia opcionales
    if (cfg.refs) {
      cfg.refs.forEach(function (rf) {
        var pts = rf.pts.map(function (p) { return sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1); }).join(' ');
        svg.appendChild(el('polyline', { points: pts, fill: 'none', class: 'linea-ref' }));
      });
    }

    // Series
    var paths = [];
    var visibles = cfg.series.map(function () { return true; });
    cfg.series.forEach(function (s, idx) {
      var g = el('g', { class: 'serie serie-' + (idx + 1) });
      var d = s.pts.map(function (p, i) {
        return (i === 0 ? 'M' : 'L') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1);
      }).join(' ');
      var path = el('path', { d: d, fill: 'none', stroke: 'var(--c)', 'stroke-width': '2.3' });
      g.appendChild(path);
      if (s.puntos) {
        s.pts.forEach(function (p) {
          g.appendChild(el('circle', { cx: sx(p[0]).toFixed(1), cy: sy(p[1]).toFixed(1), r: '3.8', fill: 'var(--c)' }));
        });
      }
      svg.appendChild(g);
      paths.push(g);
    });

    // Marcador activo y globo
    var lineaH = el('line', { x1: M.l, y1: M.t, x2: M.l, y2: M.t + ph, class: 'guia', visibility: 'hidden' });
    svg.appendChild(lineaH);
    var puntosActivos = cfg.series.map(function (_, idx) {
      var c = el('circle', { r: '4.5', class: 'punto-activo serie-' + (idx + 1), fill: 'var(--c)', visibility: 'hidden' });
      svg.appendChild(c);
      return c;
    });

    var globo = hEl('div', 'grafica-globo');
    globo.hidden = true;

    function interp(pts, xv) {
      if (xv < pts[0][0] || xv > pts[pts.length - 1][0]) return null;
      for (var i = 0; i < pts.length - 1; i++) {
        if (xv >= pts[i][0] && xv <= pts[i + 1][0]) {
          var t = (xv - pts[i][0]) / (pts[i + 1][0] - pts[i][0] || 1);
          return pts[i][1] + t * (pts[i + 1][1] - pts[i][1]);
        }
      }
      return pts[pts.length - 1][1];
    }

    var curX = (cfg.xmin + cfg.xmax) / 2;
    function mostrar(xv) {
      xv = Math.max(cfg.xmin, Math.min(cfg.xmax, xv));
      curX = xv;
      var px = sx(xv);
      lineaH.setAttribute('x1', px);
      lineaH.setAttribute('x2', px);
      lineaH.setAttribute('visibility', 'visible');
      var lines = [cfg.xlabel + ': ' + (Math.round(xv * 100) / 100)];
      cfg.series.forEach(function (s, idx) {
        if (!visibles[idx]) {
          puntosActivos[idx].setAttribute('visibility', 'hidden');
          return;
        }
        var yv = interp(s.pts, xv);
        if (yv === null) {
          puntosActivos[idx].setAttribute('visibility', 'hidden');
          return;
        }
        puntosActivos[idx].setAttribute('cx', px);
        puntosActivos[idx].setAttribute('cy', sy(yv));
        puntosActivos[idx].setAttribute('visibility', 'visible');
        lines.push(s.nombre + ': ' + (Math.round(yv * 100) / 100));
      });
      globo.textContent = lines.join(' | ');
      globo.hidden = false;
    }

    function ocultar() {
      lineaH.setAttribute('visibility', 'hidden');
      puntosActivos.forEach(function (c) { c.setAttribute('visibility', 'hidden'); });
      globo.hidden = true;
    }

    svg.addEventListener('pointermove', function (ev) {
      var rect = svg.getBoundingClientRect();
      var xSvg = ((ev.clientX - rect.left) / rect.width) * W;
      var xv = cfg.xmin + ((xSvg - M.l) / pw) * (cfg.xmax - cfg.xmin);
      mostrar(xv);
    });
    svg.addEventListener('pointerleave', ocultar);
    svg.addEventListener('keydown', function (ev) {
      var step = (cfg.xmax - cfg.xmin) / 20;
      if (ev.key === 'ArrowRight') { ev.preventDefault(); mostrar(curX + step); }
      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); mostrar(curX - step); }
      else if (ev.key === 'Escape') { ocultar(); }
    });

    // Leyenda interactiva
    if (cfg.series.length > 1) {
      var ley = hEl('div', 'grafica-leyenda');
      cfg.series.forEach(function (s, idx) {
        var btn = hEl('button', 'leyenda-btn serie-' + (idx + 1));
        btn.type = 'button';
        btn.setAttribute('aria-pressed', 'true');
        var sw = hEl('span', 'leyenda-muestra');
        btn.appendChild(sw);
        btn.appendChild(document.createTextNode(s.nombre));
        btn.addEventListener('click', function () {
          visibles[idx] = !visibles[idx];
          btn.setAttribute('aria-pressed', visibles[idx] ? 'true' : 'false');
          paths[idx].style.display = visibles[idx] ? '' : 'none';
        });
        ley.appendChild(btn);
      });
      cont.appendChild(ley);
    }

    cont.appendChild(svg);
    cont.appendChild(globo);
  }

  function dibujarBarras(cont, cfg) {
    var W = 680, H = 330;
    var M = { t: 26, r: 20, b: 48, l: 52 };
    var pw = W - M.l - M.r, ph = H - M.t - M.b;
    var n = cfg.cats.length;
    var gw = pw / n;

    function sy(y) { return M.t + ph - (y / cfg.ymax) * ph; }

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'grafica-svg',
      tabindex: '0',
      role: 'img',
      'aria-label': cfg.titulo
    });

    var gGrid = el('g', { class: 'rejilla' });
    cfg.yticks.forEach(function (yv) {
      var y = sy(yv);
      gGrid.appendChild(el('line', { x1: M.l, y1: y, x2: M.l + pw, y2: y }));
      gGrid.appendChild(el('text', { x: M.l - 8, y: y + 4, 'text-anchor': 'end', class: 'eje-tick' }, yv + '%'));
    });
    svg.appendChild(gGrid);

    var gEjes = el('g', { class: 'ejes' });
    gEjes.appendChild(el('line', { x1: M.l, y1: M.t + ph, x2: M.l + pw, y2: M.t + ph }));
    gEjes.appendChild(el('line', { x1: M.l, y1: M.t, x2: M.l, y2: M.t + ph }));
    gEjes.appendChild(el('text', { x: M.l + pw / 2, y: H - 8, 'text-anchor': 'middle', class: 'eje-titulo' }, cfg.xlabel));
    gEjes.appendChild(el('text', {
      x: 15, y: M.t + ph / 2, 'text-anchor': 'middle',
      transform: 'rotate(-90 15 ' + (M.t + ph / 2) + ')',
      class: 'eje-titulo'
    }, cfg.ylabel));
    svg.appendChild(gEjes);

    var globo = hEl('div', 'grafica-globo');
    globo.hidden = true;

    var visibles = cfg.series.map(function () { return true; });
    var gruposSeries = cfg.series.map(function (_, idx) {
      var g = el('g', { class: 'serie serie-' + (idx + 1) });
      svg.appendChild(g);
      return g;
    });

    var bw = Math.min(16, (gw - 10) / cfg.series.length);
    cfg.cats.forEach(function (cat, i) {
      var cx = M.l + (i + 0.5) * gw;
      svg.appendChild(el('text', { x: cx, y: M.t + ph + 16, 'text-anchor': 'middle', class: 'eje-tick' }, cat));
      cfg.series.forEach(function (s, si) {
        var val = s.vals[i];
        if (val === null) return;
        var x = cx - (cfg.series.length * bw) / 2 + si * bw;
        var y = sy(val);
        var rect = el('rect', {
          x: x.toFixed(1), y: y.toFixed(1),
          width: (bw - 2).toFixed(1), height: (M.t + ph - y).toFixed(1),
          fill: 'var(--c)', rx: '2'
        });
        rect.addEventListener('pointerenter', function () {
          globo.textContent = cat + ' · ' + s.nombre + ': ' + val + '%';
          globo.hidden = false;
        });
        rect.addEventListener('pointerleave', function () { globo.hidden = true; });
        gruposSeries[si].appendChild(rect);
      });
    });

    var ley = hEl('div', 'grafica-leyenda');
    cfg.series.forEach(function (s, idx) {
      var btn = hEl('button', 'leyenda-btn serie-' + (idx + 1));
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'true');
      btn.appendChild(hEl('span', 'leyenda-muestra'));
      btn.appendChild(document.createTextNode(s.nombre));
      btn.addEventListener('click', function () {
        visibles[idx] = !visibles[idx];
        btn.setAttribute('aria-pressed', visibles[idx] ? 'true' : 'false');
        gruposSeries[idx].style.display = visibles[idx] ? '' : 'none';
      });
      ley.appendChild(btn);
    });
    cont.appendChild(ley);
    cont.appendChild(svg);
    cont.appendChild(globo);
  }

  var GRAFICAS = {
    'l9-4-1': function (c) {
      dibujarLineas(c, {
        titulo: 'Ejemplo de curva de errores de un medidor clase B',
        xmin: 0, xmax: 1200, ymin: -5, ymax: 5,
        xticks: [0, 200, 400, 600, 800, 1000, 1200],
        yticks: [-5, -3, -2, -1, 0, 1, 2, 3, 5],
        yfmt: function (v) { return v + '%'; },
        xlabel: 'Gasto (L/h)',
        ylabel: 'Error (%)',
        refs: [
          { pts: [[120, 5], [120, 2], [1200, 2]] },
          { pts: [[120, -5], [120, -2], [1200, -2]] }
        ],
        series: [
          {
            nombre: 'Curva de error',
            pts: [[105, -1.15], [250, -0.92], [450, -0.72], [750, -0.55], [1130, -0.35]]
          },
          {
            nombre: 'Puntos de prueba',
            puntos: true,
            pts: [[105, -1.0], [455, -1.15], [1130, 0.0]]
          }
        ]
      });
    },
    'l9-4-5': function (c) {
      dibujarLineas(c, {
        titulo: 'Ejemplo de pérdida de carga ocasionada por los medidores de velocidad',
        xmin: 0, xmax: 300, ymin: 0, ymax: 200,
        xticks: [0, 50, 100, 150, 200, 250, 300],
        yticks: [0, 50, 100, 150, 200],
        xlabel: 'Caudal (m³/h)',
        ylabel: 'Pérdida de carga (cm)',
        series: [
          { nombre: '50 mm', pts: [[0, 0], [10, 18], [20, 52], [30, 105], [40, 180]] },
          { nombre: '65 mm', pts: [[0, 0], [15, 16], [30, 45], [50, 110], [65, 180]] },
          { nombre: '80 mm', pts: [[0, 0], [25, 18], [50, 58], [70, 112], [85, 158]] },
          { nombre: '100 mm', pts: [[0, 0], [40, 18], [75, 50], [100, 88], [120, 128]] },
          { nombre: '125 mm', pts: [[0, 0], [50, 12], [100, 42], [135, 76], [160, 112]] },
          { nombre: '160 mm', pts: [[0, 0], [80, 14], [150, 42], [200, 72], [240, 106]] }
        ]
      });
    },
    'l9-4-10': function (c) {
      dibujarLineas(c, {
        titulo: 'Pérdida de carga para medidores deprimógenos (Cepis, 1985)',
        xmin: 0, xmax: 1.0, ymin: 0, ymax: 100,
        xticks: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
        yticks: [0, 20, 40, 60, 80, 100],
        xlabel: 'Relación B = d/D',
        ylabel: 'Pérdida permanente (%)',
        series: [
          { nombre: 'Placa de orificio', pts: [[0.10, 99], [0.20, 94], [0.30, 89], [0.40, 84], [0.50, 77], [0.60, 68], [0.70, 54], [0.80, 39]] },
          { nombre: 'Tobera', pts: [[0.30, 81], [0.40, 70], [0.50, 59], [0.60, 49], [0.73, 37]] },
          { nombre: 'Venturi corto', pts: [[0.25, 26], [0.30, 21], [0.40, 18], [0.50, 16.5], [0.60, 16], [0.78, 15.8]] },
          { nombre: 'Venturi largo', pts: [[0.25, 13], [0.35, 10.5], [0.50, 10.2], [0.65, 11], [0.78, 12.5]] },
          { nombre: 'Tubo Dall', pts: [[0.47, 7], [0.55, 5.5], [0.65, 3.8], [0.75, 2.2], [0.82, 2]] }
        ]
      });
    },
    'l9-4-17': function (c) {
      dibujarLineas(c, {
        titulo: 'Variación de la exactitud de los medidores con la antigüedad',
        xmin: 0, xmax: 20, ymin: -12, ymax: 12,
        xticks: [0, 5, 10, 15, 20],
        yticks: [-12, -10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10, 12],
        yfmt: function (v) { return v + '%'; },
        xlabel: 'Edad (años)',
        ylabel: 'Tolerancia (%)',
        series: [
          { nombre: 'Diafragma (+)', pts: [[0, 5], [20, 10]] },
          { nombre: 'Diafragma (-)', pts: [[0, -5], [20, -10]] },
          { nombre: 'Ultrasónico (+)', pts: [[0, 1], [20, 4]] },
          { nombre: 'Ultrasónico (-)', pts: [[0, -1], [20, -4]] },
          { nombre: 'Electromagnético (+)', pts: [[0, 0.5], [20, 3]] },
          { nombre: 'Electromagnético (-)', pts: [[0, -0.5], [20, -3]] }
        ]
      });
    },
    'l9-11-14': function (c) {
      dibujarBarras(c, {
        titulo: 'Cobertura promedio de medición de consumos (PIGOO, 2015)',
        ymax: 80,
        yticks: [0, 20, 40, 60, 80],
        xlabel: 'Año',
        ylabel: 'Micromedición (%)',
        cats: ['2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013'],
        series: [
          { nombre: 'Micromedición (%) (PIGOO)', vals: [60.0, 60.0, 53.5, 56.7, 58.1, 57.2, 57.8, 57.2, 56.7, 54.7, 56.7, 53.7] },
          { nombre: 'Micromedición (%) (CONAGUA)', vals: [null, 65.6, 58.8, 60.9, 56.7, 50.9, 48.9, 50.7, 54.7, 44.8, 49.9, 57.8] }
        ]
      });
    },
    'l9-11-27': function (c) {
      dibujarLineas(c, {
        titulo: 'Curva de comportamiento típico de un medidor de agua (1/2", Clase B y C)',
        xmin: 0, xmax: 3000, ymin: -5, ymax: 5,
        xticks: [0, 500, 1000, 1500, 2000, 2500, 3000],
        yticks: [-5, -2, 0, 2, 5],
        yfmt: function (v) { return v + '%'; },
        xlabel: 'Caudal (L/h)',
        ylabel: 'Error (%)',
        refs: [
          { pts: [[15, 5], [120, 5], [120, 2], [3000, 2]] },
          { pts: [[15, -5], [120, -5], [120, -2], [3000, -2]] }
        ],
        series: [
          { nombre: 'Velocidad "B"', pts: [[30, -1.0], [100, 2.4], [300, 0.7], [1000, -0.4], [2000, -0.1], [3000, 0.3]] },
          { nombre: 'Velocidad "C"', pts: [[15, -0.9], [60, 2.5], [150, 0.8], [500, -0.2], [1500, -0.4], [3000, 0.7]] },
          { nombre: 'Volumétrico "B"', pts: [[30, -0.3], [120, 1.8], [800, 1.1], [1500, 0.4], [2200, -0.2], [3000, -0.4]] },
          { nombre: 'Volumétrico "C"', pts: [[15, -2.2], [120, 1.5], [800, 0.8], [1500, 0.2], [2200, -0.3], [3000, -0.7]] }
        ]
      });
    }
  };

  function iniciar() {
    var nodos = document.querySelectorAll('.grafica-libro[data-grafica]');
    for (var i = 0; i < nodos.length; i++) {
      var n = nodos[i];
      var id = n.getAttribute('data-grafica');
      if (GRAFICAS[id]) GRAFICAS[id](n);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
