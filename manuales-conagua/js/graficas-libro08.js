/*
 * Graficas interactivas del Libro 8 (MAPAS, Conagua):
 * - l8-3-1: Ilustracion 3.1 Diagrama de Collins (meq/L de cationes y aniones)
 * - l8-5-3: Ilustracion 5.3 Curva tipica de analisis por tamiz
 * - l8-6-6: Ilustracion 6.6 Eleccion de la apertura del cedazo con base a la granulometria del filtro
 * - l8-6-9: Ilustracion 6.9 Curvas granulometricas: filtro y muestras del acuifero
 * - l8-8-6: Ilustracion 8.6 Curvas caracteristicas de acuiferos libre y confinado
 * - l8-8-8: Ilustracion 8.8 Anomalia en la curva caracteristica
 * - l8-8-9: Ilustracion 8.9 Grafica de prueba de aforo (abatimiento y caudales)
 *
 * Sin librerias; usa ../css/graficas.css y ../css/graficas-libro08.css.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

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

  function armarLineas(caja, cfg) {
    caja.textContent = '';
    caja.classList.add('grafica--lineas');
    var activa = cfg.series.map(function () { return true; });
    var leyenda = cfg.series.length > 1 ? h('div', { 'class': 'grafica-leyenda' }, caja) : null;
    var lienzo = h('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = h('div', { 'class': 'grafica-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);

    function dibujar() {
      var W = Math.round(lienzo.clientWidth) || 620;
      var H = W < 500 ? 250 : 300;
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

      var m = { izq: 54, der: 18, arr: 18, abj: 44 };
      var pw = W - m.izq - m.der;
      var ph = H - m.arr - m.abj;
      var xMin = cfg.x.min, xMax = cfg.x.max;
      var yMin = cfg.y.min, yMax = cfg.y.max;
      var sx = function (v) { return m.izq + ((v - xMin) / (xMax - xMin)) * pw; };
      var sy = function (v) {
        var frac = (v - yMin) / (yMax - yMin);
        return cfg.y.invertido ? (m.arr + frac * ph) : (m.arr + ph - frac * ph);
      };

      // Reticula
      var gRet = el('g', { 'class': 'reticula' }, svg);
      var gEjes = el('g', { 'class': 'ejes' }, svg);
      for (var yv = yMin; yv <= yMax + 1e-6; yv += cfg.y.paso) {
        var yy = sy(yv);
        el('line', { x1: m.izq, y1: yy, x2: W - m.der, y2: yy }, gRet);
        var lblY = el('text', { x: m.izq - 8, y: yy + 3.5, 'text-anchor': 'end', 'class': 'eje-lbl' }, gEjes);
        lblY.textContent = Number.isInteger(yv) ? String(yv) : yv.toFixed(cfg.y.decEje || 1);
      }
      for (var xv = xMin; xv <= xMax + 1e-6; xv += cfg.x.paso) {
        var xx = sx(xv);
        el('line', { x1: xx, y1: m.arr, x2: xx, y2: m.arr + ph }, gRet);
        var lblX = el('text', { x: xx, y: m.arr + ph + 16, 'text-anchor': 'middle', 'class': 'eje-lbl' }, gEjes);
        lblX.textContent = String(Math.round(xv * 100) / 100);
      }

      var tx = el('text', { x: m.izq + pw / 2, y: H - 6, 'text-anchor': 'middle', 'class': 'eje-titulo' }, gEjes);
      tx.textContent = cfg.x.titulo;
      var ty = el('text', {
        x: 14, y: m.arr + ph / 2,
        'text-anchor': 'middle',
        transform: 'rotate(-90 14 ' + (m.arr + ph / 2) + ')',
        'class': 'eje-titulo'
      }, gEjes);
      ty.textContent = cfg.y.titulo;

      // Series
      cfg.series.forEach(function (s, idx) {
        if (!activa[idx]) return;
        var gS = el('g', { 'class': 'serie-' + (idx + 1) }, svg);
        var d = s.pts.map(function (pt, k) {
          return (k === 0 ? 'M' : 'L') + sx(pt[0]).toFixed(1) + ' ' + sy(pt[1]).toFixed(1);
        }).join(' ');
        el('path', {
          d: d,
          fill: 'none',
          'class': 'linea' + (s.punteada ? ' linea--punteada' : '')
        }, gS);
        s.pts.forEach(function (pt) {
          el('circle', { cx: sx(pt[0]), cy: sy(pt[1]), r: 3, 'class': 'punto' }, gS);
        });
      });

      // Guia y punto activo
      var guia = el('line', { x1: 0, y1: m.arr, x2: 0, y2: m.arr + ph, 'class': 'guia', hidden: '' }, svg);
      var punto = el('circle', { cx: 0, cy: 0, r: 4.5, 'class': 'punto-activo', hidden: '' }, svg);

      // Todos los puntos ordenados por x para navegacion
      var flat = [];
      cfg.series.forEach(function (s, idx) {
        if (!activa[idx]) return;
        s.pts.forEach(function (pt) {
          flat.push({ x: pt[0], y: pt[1], serie: s.nombre, idx: idx });
        });
      });
      flat.sort(function (a, b) { return a.x - b.x; });
      var curIdx = 0;

      function mostrar(item) {
        if (!item) return;
        var px = sx(item.x), py = sy(item.y);
        guia.setAttribute('x1', px);
        guia.setAttribute('x2', px);
        guia.removeAttribute('hidden');
        punto.setAttribute('cx', px);
        punto.setAttribute('cy', py);
        punto.setAttribute('class', 'punto-activo serie-' + (item.idx + 1));
        punto.removeAttribute('hidden');
        globo.hidden = false;
        globo.textContent = item.serie + ': ' + cfg.x.titulo + ' = ' + item.x + ', ' + cfg.y.titulo + ' = ' + item.y;
        globo.style.left = Math.min(Math.max(px, 60), W - 120) + 'px';
        globo.style.top = Math.max(py - 32, 4) + 'px';
      }

      svg.addEventListener('pointermove', function (ev) {
        if (!flat.length) return;
        var rect = svg.getBoundingClientRect();
        var mx = ((ev.clientX - rect.left) / rect.width) * W;
        var my = ((ev.clientY - rect.top) / rect.height) * H;
        var best = null, bestD = 1e9;
        flat.forEach(function (it, i) {
          var dx = sx(it.x) - mx, dy = sy(it.y) - my;
          var dist = dx * dx + dy * dy;
          if (dist < bestD) { bestD = dist; best = it; curIdx = i; }
        });
        if (best) mostrar(best);
      });
      svg.addEventListener('pointerleave', function () {
        guia.setAttribute('hidden', '');
        punto.setAttribute('hidden', '');
        globo.hidden = true;
      });
      svg.addEventListener('keydown', function (ev) {
        if (!flat.length) return;
        if (ev.key === 'ArrowRight') { ev.preventDefault(); curIdx = (curIdx + 1) % flat.length; mostrar(flat[curIdx]); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); curIdx = (curIdx - 1 + flat.length) % flat.length; mostrar(flat[curIdx]); }
      });
    }

    if (leyenda) {
      cfg.series.forEach(function (s, idx) {
        var btn = h('button', { type: 'button', 'class': 'serie-' + (idx + 1), 'aria-pressed': 'true' }, leyenda);
        h('span', { 'class': 'muestra', 'aria-hidden': 'true' }, btn);
        btn.appendChild(document.createTextNode(' ' + s.nombre));
        btn.addEventListener('click', function () {
          activa[idx] = !activa[idx];
          btn.setAttribute('aria-pressed', String(activa[idx]));
          dibujar();
        });
      });
    }

    dibujar();
    if (window.ResizeObserver) {
      new ResizeObserver(dibujar).observe(lienzo);
    }

    if (cfg.tabla) {
      var det = h('details', { 'class': 'grafica-datos' }, caja);
      h('summary', {}, det, 'Datos de la gráfica');
      var tbl = h('table', {}, det);
      var thead = h('thead', {}, tbl);
      var trH = h('tr', {}, thead);
      h('th', {}, trH, 'Serie');
      h('th', {}, trH, cfg.x.titulo);
      h('th', {}, trH, cfg.y.titulo);
      var tbody = h('tbody', {}, tbl);
      cfg.series.forEach(function (s) {
        s.pts.forEach(function (pt) {
          var tr = h('tr', {}, tbody);
          h('td', {}, tr, s.nombre);
          h('td', { 'class': 'n' }, tr, String(pt[0]));
          h('td', { 'class': 'n' }, tr, String(pt[1]));
        });
      });
    }
  }

  function armarCollins(caja) {
    caja.textContent = '';
    var lienzo = h('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = h('div', { 'class': 'grafica-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);
    var muestras = [
      { nombre: 'Muestra 1', cat: [['Ca²⁺', 2, '#5b84b1'], ['Mg²⁺', 2, '#f29f4b'], ['Na⁺+K⁺', 10, '#f7cf6b']], ani: [['HCO₃⁻+CO₃²⁻', 14.5, '#1d4f91'], ['SO₄²⁻', 0.3, '#d62728'], ['Cl⁻', 0.2, '#cfd6dc']] },
      { nombre: 'Muestra 2', cat: [['Ca²⁺', 22, '#5b84b1'], ['Mg²⁺', 12, '#f29f4b'], ['Na⁺+K⁺', 82, '#f7cf6b']], ani: [['HCO₃⁻+CO₃²⁻', 42, '#1d4f91'], ['SO₄²⁻', 50, '#d62728'], ['Cl⁻', 24, '#cfd6dc']] },
      { nombre: 'Muestra 3', cat: [['Ca²⁺', 1, '#5b84b1'], ['Mg²⁺', 3, '#f29f4b'], ['Na⁺+K⁺', 3, '#f7cf6b']], ani: [['HCO₃⁻+CO₃²⁻', 5, '#1d4f91'], ['SO₄²⁻', 0.5, '#d62728'], ['Cl⁻', 1.5, '#cfd6dc']] }
    ];
    function dibujar() {
      var W = Math.round(lienzo.clientWidth) || 600, H = 280;
      lienzo.querySelectorAll('svg').forEach(function (n) { n.remove(); });
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H, 'class': 'grafica-svg', role: 'img', 'aria-label': 'Diagrama de Collins: concentración en meq/L para 3 muestras' });
      lienzo.insertBefore(svg, globo);
      var m = { izq: 50, der: 16, arr: 16, abj: 34 };
      var pw = W - m.izq - m.der, ph = H - m.arr - m.abj;
      var sy = function (v) { return m.arr + ph - (v / 120) * ph; };
      var gRet = el('g', { 'class': 'reticula' }, svg);
      var gEjes = el('g', { 'class': 'ejes' }, svg);
      for (var yv = 0; yv <= 120; yv += 20) {
        var yy = sy(yv);
        el('line', { x1: m.izq, y1: yy, x2: W - m.der, y2: yy }, gRet);
        var tx = el('text', { x: m.izq - 6, y: yy + 3.5, 'text-anchor': 'end', 'class': 'eje-lbl' }, gEjes);
        tx.textContent = String(yv);
      }
      var ty = el('text', { x: 14, y: m.arr + ph / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (m.arr + ph / 2) + ')', 'class': 'eje-titulo' }, gEjes);
      ty.textContent = 'Concentración (meq/l)';
      var bw = Math.min(48, pw / 9);
      muestras.forEach(function (mu, i) {
        var cx = m.izq + (i + 0.5) * (pw / 3);
        var lx = el('text', { x: cx, y: H - 10, 'text-anchor': 'middle', 'class': 'eje-lbl' }, gEjes);
        lx.textContent = mu.nombre;
        [mu.cat, mu.ani].forEach(function (col, cIdx) {
          var acc = 0;
          var x0 = cx + (cIdx === 0 ? -bw - 2 : 2);
          col.forEach(function (seg) {
            var yTop = sy(acc + seg[1]), yBot = sy(acc);
            var r = el('rect', { x: x0, y: yTop, width: bw, height: Math.max(1, yBot - yTop), fill: seg[2], stroke: 'var(--border-strong)', 'stroke-width': 0.8 }, svg);
            r.addEventListener('pointerenter', function () {
              globo.hidden = false;
              globo.textContent = mu.nombre + ' · ' + seg[0] + ': ' + seg[1] + ' meq/L';
              globo.style.left = Math.min(Math.max(x0, 40), W - 140) + 'px';
              globo.style.top = Math.max(yTop - 28, 4) + 'px';
            });
            acc += seg[1];
          });
        });
      });
    }
    dibujar();
    if (window.ResizeObserver) new ResizeObserver(dibujar).observe(lienzo);
    var det = h('details', { 'class': 'grafica-datos' }, caja);
    h('summary', {}, det, 'Datos de la gráfica');
    var tbl = h('table', {}, det);
    var trH = h('tr', {}, h('thead', {}, tbl));
    ['Muestra', 'Ca²⁺', 'Mg²⁺', 'Na⁺+K⁺', 'HCO₃⁻+CO₃²⁻', 'SO₄²⁻', 'Cl⁻'].forEach(function (c) { h('th', {}, trH, c); });
    var tb = h('tbody', {}, tbl);
    muestras.forEach(function (mu) {
      var tr = h('tr', {}, tb);
      h('td', {}, tr, mu.nombre);
      mu.cat.concat(mu.ani).forEach(function (s) { h('td', { 'class': 'n' }, tr, String(s[1])); });
    });
  }

  var GRAFICAS = {
    'l8-5-3': {
      titulo: 'Ilustración 5.3 Curva típica de análisis por tamiz',
      x: { min: 0, max: 100, paso: 10, titulo: 'Tamaño de grano en milésimas de pulgada' },
      y: { min: 0, max: 100, paso: 10, titulo: 'Porcentaje acumulado retenido (%)' },
      series: [{ nombre: 'Porcentaje retenido', pts: [[8, 94], [12, 82], [16, 70], [23, 47], [35, 28], [45, 17], [60, 14], [80, 11], [100, 9]] }],
      tabla: true
    },
    'l8-6-6': {
      titulo: 'Ilustración 6.6 Elección de la apertura del cedazo con base a la granulometría del filtro',
      x: { min: 0, max: 130, paso: 10, titulo: 'Apertura de la ranura y medida del grano (milésima de pulgada)' },
      y: { min: 0, max: 100, paso: 10, titulo: 'Porciento acumulativo numérico' },
      series: [
        { nombre: 'Graduación de la formación', pts: [[2, 100], [10, 88], [14, 65], [16, 40], [18, 16], [22, 6], [30, 0]] },
        { nombre: 'Graduación del filtro', pts: [[50, 100], [60, 92], [70, 75], [75, 50], [80, 22], [85, 6], [90, 0]] }
      ],
      tabla: true
    },
    'l8-6-9': {
      titulo: 'Ilustración 6.9 Curvas granulométricas: filtro y muestras del acuífero',
      x: { min: 0, max: 100, paso: 10, titulo: 'Tamaño del grano (milésima de pulgada)' },
      y: { min: 0, max: 100, paso: 10, titulo: 'Porciento acumulativo retenido' },
      series: [
        { nombre: 'Muestra fina del acuífero', pts: [[0, 100], [6, 60], [8, 40], [13, 17], [18, 7], [22, 0]] },
        { nombre: 'Muestra media del acuífero', pts: [[0, 100], [7, 90], [9, 80], [13, 50], [17, 32], [24, 14], [34, 0]] },
        { nombre: 'Límite fino del filtro', pts: [[0, 100], [16, 90], [23, 72], [33, 37], [46, 10], [65, 0]] },
        { nombre: 'Límite grueso del filtro', pts: [[16, 100], [23, 88], [33, 53], [46, 26], [65, 8], [72, 0]], punteada: true }
      ],
      tabla: true
    },
    'l8-8-6': {
      titulo: 'Ilustración 8.6 Curvas características de acuíferos libre y confinado',
      x: { min: 0, max: 30, paso: 10, titulo: 'Abatimiento s (m)' },
      y: { min: 0, max: 20000, paso: 5000, titulo: 'Caudal Q (m³/día)' },
      series: [
        { nombre: 'Acuífero libre', pts: [[0, 0], [5, 8200], [10, 14500], [15, 18500], [20, 20000]] },
        { nombre: 'Acuífero confinado', pts: [[0, 0], [10, 8800], [20, 17600], [25, 20500]] }
      ],
      tabla: true
    },
    'l8-8-8': {
      titulo: 'Ilustración 8.8 Anomalía en la curva característica',
      x: { min: 0, max: 30, paso: 4, titulo: 'Abatimiento SP (m)' },
      y: { min: 0, max: 7000, paso: 1000, titulo: 'Caudal Q (m³/día)' },
      series: [
        { nombre: 'Zona lineal teórica', pts: [[0, 0], [4, 4200], [6.5, 7000]] },
        { nombre: 'Curva característica real', pts: [[0, 0], [4, 1750], [8, 2500], [12, 3100], [16, 3550], [20, 4000], [24, 4400], [28, 4800], [30, 5000]] }
      ],
      tabla: true
    },
    'l8-8-9': {
      titulo: 'Ilustración 8.9 Gráfica de prueba de aforo (abatimiento)',
      x: { min: 0, max: 24, paso: 2, titulo: 'Tiempo de extracción (h)' },
      y: { min: 0, max: 3, paso: 1, invertido: true, titulo: 'Abatimiento (m)' },
      series: [
        { nombre: 'Abatimiento (m) [Q = 30, 85, 100, 140 m³/h]', pts: [[0, 0], [2, 0.37], [6, 0.37], [6, 1.25], [12, 1.25], [12, 1.75], [18, 1.75], [18, 2.62], [24, 2.62]] }
      ],
      tabla: true
    }
  };

  function iniciar() {
    document.querySelectorAll('.grafica-libro[data-grafica]').forEach(function (caja) {
      var id = caja.getAttribute('data-grafica');
      if (id === 'l8-3-1') {
        armarCollins(caja);
      } else if (GRAFICAS[id]) {
        armarLineas(caja, GRAFICAS[id]);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
