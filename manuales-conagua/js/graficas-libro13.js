/*
 * Gráficas interactivas del Libro 13 (MAPAS, Conagua):
 * - l13-3-44: Ilustración 3.44 Valores medios de presiones (sin calibrar)
 * - l13-3-45: Ilustración 3.45 Valores medios de presiones (calibrado)
 * - l13-4-12: Ilustración 4.12 Concentración contra distancia a lo largo de la tubería
 * - l13-7-6: Ilustración 7.6 Ajuste de datos para determinar kb
 * - l13-7-10: Ilustración 7.10 Comparación entre los valores observados y los calculados
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro13.css.
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

  var BARRAS = {
    'l13-3-44': {
      titulo: 'Comparison of mean values for pressure (sin calibrar)',
      xTitulo: 'Location',
      yTitulo: 'Presión',
      yMax: 65,
      yPaso: 5,
      dec: 1,
      decEje: 0,
      cats: ['XXXX001134', 'XXXX001151', 'XXXX000850', 'XXXX000811', 'XXXX001056', 'XXXX001127', 'XXXX000837'],
      series: [
        { nombre: 'Computed', color: 'var(--grafica-serie-1)', vals: [6.6, 12.8, 16.8, 27.9, 26.9, 8.4, 12.8] },
        { nombre: 'Observed', color: 'var(--grafica-serie-2)', vals: [3.3, 14.5, 18.1, 51.8, 61.0, 35.2, 38.6] }
      ]
    },
    'l13-3-45': {
      titulo: 'Comparison of mean values for pressure (calibrado)',
      xTitulo: 'Location',
      yTitulo: 'Presión',
      yMax: 32,
      yPaso: 2,
      dec: 1,
      decEje: 0,
      cats: ['XXXX001134', 'XXXX001151', 'XXXX000850', 'XXXX000811', 'XXXX001056', 'XXXX001127', 'XXXX000837'],
      series: [
        { nombre: 'Computed', color: 'var(--grafica-serie-1)', vals: [7.0, 13.1, 17.2, 28.6, 27.8, 8.6, 13.1] },
        { nombre: 'Observed', color: 'var(--grafica-serie-2)', vals: [6.5, 12.4, 16.6, 27.8, 30.1, 10.1, 15.0] }
      ]
    },
    'l13-7-10': {
      titulo: 'Comparación entre los valores observados y los calculados de cloro residual',
      xTitulo: 'Punto de muestreo',
      yTitulo: 'Concentración (mg/L)',
      yMax: 1.6,
      yPaso: 0.2,
      dec: 2,
      decEje: 1,
      cats: ['2', '4', '11', '13', '19', '20', '21', '22', '23', '25', '26', '30', '31', '32', '33', '36', '37'],
      series: [
        { nombre: 'Valor observado', color: 'var(--grafica-serie-1)', vals: [1.23, 1.04, 0.41, 0.58, 0.43, 0.42, 0.69, 0.52, 1.37, 0.41, 0.36, 0.29, 0.89, 1.09, 0.58, 0.47, 0.07] },
        { nombre: 'Valor calculado', color: 'var(--grafica-serie-2)', vals: [1.25, 0.94, 0.50, 0.36, 0.66, 0.56, 0.69, 0.63, 1.37, 0.38, 0.36, 0.32, 0.52, 1.00, 0.32, 0.28, 0.13] }
      ]
    }
  };

  var LINEAS_4_12 = {
    titulo: 'Concentración contra distancia a lo largo de la tubería (Tabla 4.5)',
    x: { min: 0, max: 20000, marcas: [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000], titulo: 'Distancia a lo largo de la tubería (m)' },
    y: { min: 0, max: 12, paso: 2, titulo: 'Concentración' },
    xs: [0, 1800, 3600, 5400, 7200, 9000, 10800, 12600, 14400, 16200, 18000],
    series: [
      { nombre: 'Conservativo', color: 'var(--grafica-serie-1)', vals: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10] },
      { nombre: 'Orden 1', color: 'var(--grafica-serie-2)', vals: [10.00, 7.79, 6.07, 4.72, 3.68, 2.87, 2.23, 1.74, 1.35, 1.05, 0.82] },
      { nombre: 'Orden 0', color: 'var(--grafica-serie-3)', vals: [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0] },
      { nombre: 'cre sat 1', color: 'var(--grafica-serie-4)', vals: [0, 2.21, 3.93, 5.28, 6.32, 7.13, 7.77, 8.26, 8.65, 8.95, 9.18] }
    ]
  };

  var DISP_7_6 = {
    titulo: 'Ajuste de datos para determinar kb: y = 0.8721 e^(-0.0289x), R² = 0.9294',
    x: { min: 0, max: 150, marcas: [0, 50, 100, 150], titulo: 'Tiempo (h)' },
    y: { min: 0, max: 1.0, paso: 0.1, titulo: 'Concentración (mg/L)' },
    puntos: [
      [0.0, 0.85], [0.8, 0.83], [0.8, 0.80], [2.1, 0.76], [2.7, 0.74], [4.4, 0.72],
      [5.2, 0.70], [6.5, 0.69], [7.4, 0.69], [10.3, 0.57], [13.8, 0.57], [16.8, 0.52],
      [19.9, 0.52], [25.7, 0.51], [29.6, 0.42], [32.1, 0.42], [33.4, 0.41], [37.7, 0.38],
      [43.6, 0.36], [48.9, 0.35], [53.8, 0.22], [58.6, 0.18], [63.8, 0.12], [70.7, 0.11],
      [75.8, 0.10], [81.7, 0.10], [105.7, 0.10], [111.5, 0.02]
    ]
  };

  function armarBarras(caja, cfg) {
    caja.textContent = '';
    caja.classList.add('grafica--barras');
    var activas = cfg.series.map(function () { return true; });

    var ley = h('div', { 'class': 'grafica-leyenda' }, caja);
    cfg.series.forEach(function (s, si) {
      var btn = h('button', { type: 'button', 'class': 'grafica-leyenda__item', 'aria-pressed': 'true' }, ley);
      var sw = h('span', { 'class': 'grafica-leyenda__muestra' }, btn);
      sw.style.background = s.color;
      h('span', {}, btn, s.nombre);
      btn.addEventListener('click', function () {
        if (activas.filter(Boolean).length === 1 && activas[si]) return;
        activas[si] = !activas[si];
        btn.setAttribute('aria-pressed', String(activas[si]));
        dibujar();
      });
    });

    var lienzo = h('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = h('div', { 'class': 'grafica-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);
    var N = cfg.cats.length;
    var focoIdx = 0;

    function dibujar() {
      var W = Math.round(lienzo.clientWidth) || 640;
      var angosto = W < 500, H = angosto ? 280 : 330;
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

      var m = { izq: 54, der: 14, arr: 16, abj: angosto && N <= 7 ? 56 : 44 };
      var aw = W - m.izq - m.der, ah = H - m.arr - m.abj;
      var px = function (i) { return m.izq + ((i + 0.5) / N) * aw; };
      var py = function (v) { return m.arr + (1 - v / cfg.yMax) * ah; };

      for (var y = 0; y <= cfg.yMax + 1e-9; y += cfg.yPaso) {
        var yy = py(y);
        el('line', { x1: m.izq, x2: W - m.der, y1: yy, y2: yy, 'class': 'grafica-rejilla' }, svg);
        var txt = el('text', { x: m.izq - 6, y: yy + 3.5, 'text-anchor': 'end', 'class': 'grafica-etiqueta' }, svg);
        txt.textContent = y.toFixed(cfg.decEje);
      }

      el('line', { x1: m.izq, x2: m.izq, y1: m.arr, y2: H - m.abj, 'class': 'grafica-eje' }, svg);
      el('line', { x1: m.izq, x2: W - m.der, y1: H - m.abj, y2: H - m.abj, 'class': 'grafica-eje' }, svg);

      var grpW = aw / N;
      var visIdx = [];
      activas.forEach(function (ok, si) { if (ok) visIdx.push(si); });
      var bw = Math.max(4, Math.min(26, (grpW * 0.72) / visIdx.length));

      cfg.cats.forEach(function (cat, i) {
        var cx = px(i);
        var lbl = el('text', {
          x: cx,
          y: H - m.abj + 14,
          'text-anchor': angosto && N <= 7 ? 'end' : 'middle',
          'class': 'grafica-etiqueta',
          transform: angosto && N <= 7 ? ('rotate(-25 ' + cx + ' ' + (H - m.abj + 14) + ')') : null
        }, svg);
        lbl.textContent = cat;

        var totalW = visIdx.length * bw;
        visIdx.forEach(function (si, k) {
          var v = cfg.series[si].vals[i];
          var bx = cx - totalW / 2 + k * bw;
          var by = py(v);
          var bh = Math.max(1, (H - m.abj) - by);
          var r = el('rect', {
            x: bx.toFixed(1),
            y: by.toFixed(1),
            width: (bw - 1).toFixed(1),
            height: bh.toFixed(1),
            fill: cfg.series[si].color,
            'class': 'grafica-barra'
          }, svg);
          r.addEventListener('mouseenter', function () { mostrar(i); });
        });
      });

      var xt = el('text', { x: m.izq + aw / 2, y: H - 6, 'text-anchor': 'middle', 'class': 'grafica-eje-titulo' }, svg);
      xt.textContent = cfg.xTitulo;
      var yt = el('text', { x: 14, y: m.arr + ah / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (m.arr + ah / 2) + ')', 'class': 'grafica-eje-titulo' }, svg);
      yt.textContent = cfg.yTitulo;

      var guia = el('line', { y1: m.arr, y2: H - m.abj, 'class': 'grafica-guia', hidden: '' }, svg);

      function mostrar(i) {
        focoIdx = Math.max(0, Math.min(N - 1, i));
        var cx = px(focoIdx);
        guia.setAttribute('x1', cx);
        guia.setAttribute('x2', cx);
        guia.removeAttribute('hidden');
        globo.textContent = '';
        h('strong', {}, globo, cfg.cats[focoIdx]);
        cfg.series.forEach(function (s, si) {
          if (!activas[si]) return;
          var d = h('div', {}, globo);
          d.textContent = s.nombre + ': ' + s.vals[focoIdx].toFixed(cfg.dec);
        });
        globo.hidden = false;
        globo.style.left = Math.min(Math.max(8, cx - 75), Math.max(8, W - 180)) + 'px';
        globo.style.top = '8px';
      }

      svg.addEventListener('mouseleave', function () {
        guia.setAttribute('hidden', '');
        globo.hidden = true;
      });
      svg.addEventListener('mousemove', function (ev) {
        var rect = svg.getBoundingClientRect();
        var mx = ((ev.clientX - rect.left) / rect.width) * W;
        var idx = Math.floor(((mx - m.izq) / aw) * N);
        if (idx >= 0 && idx < N) mostrar(idx);
      });
      svg.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); mostrar((focoIdx + 1) % N); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); mostrar((focoIdx - 1 + N) % N); }
      });
    }

    dibujar();
    if (window.ResizeObserver) {
      new ResizeObserver(dibujar).observe(lienzo);
    }
  }

  function armarLineas412(caja) {
    var cfg = LINEAS_4_12;
    caja.textContent = '';
    caja.classList.add('grafica--lineas');
    var activas = cfg.series.map(function () { return true; });

    var ley = h('div', { 'class': 'grafica-leyenda' }, caja);
    cfg.series.forEach(function (s, si) {
      var btn = h('button', { type: 'button', 'class': 'grafica-leyenda__item', 'aria-pressed': 'true' }, ley);
      var sw = h('span', { 'class': 'grafica-leyenda__muestra' }, btn);
      sw.style.background = s.color;
      h('span', {}, btn, s.nombre);
      btn.addEventListener('click', function () {
        if (activas.filter(Boolean).length === 1 && activas[si]) return;
        activas[si] = !activas[si];
        btn.setAttribute('aria-pressed', String(activas[si]));
        dibujar();
      });
    });

    var lienzo = h('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = h('div', { 'class': 'grafica-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);
    var N = cfg.xs.length;
    var focoIdx = 0;

    function dibujar() {
      var W = Math.round(lienzo.clientWidth) || 640;
      var angosto = W < 500, H = angosto ? 270 : 320;
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

      var m = { izq: 50, der: 18, arr: 16, abj: 44 };
      var aw = W - m.izq - m.der, ah = H - m.arr - m.abj;
      var px = function (x) { return m.izq + ((x - cfg.x.min) / (cfg.x.max - cfg.x.min)) * aw; };
      var py = function (y) { return m.arr + (1 - (y - cfg.y.min) / (cfg.y.max - cfg.y.min)) * ah; };

      for (var y = cfg.y.min; y <= cfg.y.max + 1e-9; y += cfg.y.paso) {
        var yy = py(y);
        el('line', { x1: m.izq, x2: W - m.der, y1: yy, y2: yy, 'class': 'grafica-rejilla' }, svg);
        var txt = el('text', { x: m.izq - 6, y: yy + 3.5, 'text-anchor': 'end', 'class': 'grafica-etiqueta' }, svg);
        txt.textContent = String(y);
      }

      cfg.x.marcas.forEach(function (xm, idx) {
        if (angosto && idx % 2 === 1) return;
        var xx = px(xm);
        el('line', { x1: xx, x2: xx, y1: m.arr, y2: H - m.abj, 'class': 'grafica-rejilla' }, svg);
        var t = el('text', { x: xx, y: H - m.abj + 14, 'text-anchor': 'middle', 'class': 'grafica-etiqueta' }, svg);
        t.textContent = String(xm);
      });

      el('line', { x1: m.izq, x2: m.izq, y1: m.arr, y2: H - m.abj, 'class': 'grafica-eje' }, svg);
      el('line', { x1: m.izq, x2: W - m.der, y1: H - m.abj, y2: H - m.abj, 'class': 'grafica-eje' }, svg);

      cfg.series.forEach(function (s, si) {
        if (!activas[si]) return;
        var d = cfg.xs.map(function (xv, i) {
          return (i === 0 ? 'M' : 'L') + px(xv).toFixed(1) + ' ' + py(s.vals[i]).toFixed(1);
        }).join(' ');
        el('path', { d: d, fill: 'none', stroke: s.color, 'stroke-width': 2.2 }, svg);
        cfg.xs.forEach(function (xv, i) {
          el('circle', { cx: px(xv).toFixed(1), cy: py(s.vals[i]).toFixed(1), r: 3.5, fill: s.color }, svg);
        });
      });

      var xt = el('text', { x: m.izq + aw / 2, y: H - 6, 'text-anchor': 'middle', 'class': 'grafica-eje-titulo' }, svg);
      xt.textContent = cfg.x.titulo;
      var yt = el('text', { x: 14, y: m.arr + ah / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (m.arr + ah / 2) + ')', 'class': 'grafica-eje-titulo' }, svg);
      yt.textContent = cfg.y.titulo;

      var guia = el('line', { y1: m.arr, y2: H - m.abj, 'class': 'grafica-guia', hidden: '' }, svg);

      function mostrar(i) {
        focoIdx = Math.max(0, Math.min(N - 1, i));
        var cx = px(cfg.xs[focoIdx]);
        guia.setAttribute('x1', cx);
        guia.setAttribute('x2', cx);
        guia.removeAttribute('hidden');
        globo.textContent = '';
        h('strong', {}, globo, cfg.xs[focoIdx] + ' m');
        cfg.series.forEach(function (s, si) {
          if (!activas[si]) return;
          var d = h('div', {}, globo);
          d.textContent = s.nombre + ': ' + s.vals[focoIdx].toFixed(2);
        });
        globo.hidden = false;
        globo.style.left = Math.min(Math.max(8, cx - 75), Math.max(8, W - 180)) + 'px';
        globo.style.top = '8px';
      }

      svg.addEventListener('mouseleave', function () {
        guia.setAttribute('hidden', '');
        globo.hidden = true;
      });
      svg.addEventListener('mousemove', function (ev) {
        var rect = svg.getBoundingClientRect();
        var mx = ((ev.clientX - rect.left) / rect.width) * W;
        var xv = cfg.x.min + ((mx - m.izq) / aw) * (cfg.x.max - cfg.x.min);
        var best = 0, bestD = Infinity;
        cfg.xs.forEach(function (x, idx) {
          var dd = Math.abs(x - xv);
          if (dd < bestD) { bestD = dd; best = idx; }
        });
        mostrar(best);
      });
      svg.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); mostrar((focoIdx + 1) % N); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); mostrar((focoIdx - 1 + N) % N); }
      });
    }

    dibujar();
    if (window.ResizeObserver) new ResizeObserver(dibujar).observe(lienzo);
  }

  function armarDisp76(caja) {
    var cfg = DISP_7_6;
    caja.textContent = '';
    caja.classList.add('grafica--lineas');

    var ley = h('div', { 'class': 'grafica-leyenda' }, caja);
    var m1 = h('button', { type: 'button', 'class': 'grafica-leyenda__item', 'aria-pressed': 'true' }, ley);
    var sw1 = h('span', { 'class': 'grafica-leyenda__muestra' }, m1);
    sw1.style.background = 'var(--grafica-serie-1)';
    h('span', {}, m1, 'Medido');
    var m2 = h('button', { type: 'button', 'class': 'grafica-leyenda__item', 'aria-pressed': 'true' }, ley);
    var sw2 = h('span', { 'class': 'grafica-leyenda__muestra' }, m2);
    sw2.style.background = 'var(--grafica-serie-2)';
    h('span', {}, m2, 'Ajuste: y = 0.8721 e^(-0.0289x), R² = 0.9294');

    var lienzo = h('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = h('div', { 'class': 'grafica-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);
    var N = cfg.puntos.length;
    var focoIdx = 0;

    function dibujar() {
      var W = Math.round(lienzo.clientWidth) || 640;
      var angosto = W < 500, H = angosto ? 260 : 310;
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

      var m = { izq: 52, der: 18, arr: 16, abj: 44 };
      var aw = W - m.izq - m.der, ah = H - m.arr - m.abj;
      var px = function (x) { return m.izq + (x / cfg.x.max) * aw; };
      var py = function (y) { return m.arr + (1 - y / cfg.y.max) * ah; };

      for (var y = 0; y <= 1.001; y += cfg.y.paso) {
        var yy = py(y);
        el('line', { x1: m.izq, x2: W - m.der, y1: yy, y2: yy, 'class': 'grafica-rejilla' }, svg);
        var txt = el('text', { x: m.izq - 6, y: yy + 3.5, 'text-anchor': 'end', 'class': 'grafica-etiqueta' }, svg);
        txt.textContent = y.toFixed(1);
      }

      cfg.x.marcas.forEach(function (xm) {
        var xx = px(xm);
        var t = el('text', { x: xx, y: H - m.abj + 14, 'text-anchor': 'middle', 'class': 'grafica-etiqueta' }, svg);
        t.textContent = String(xm);
      });

      el('line', { x1: m.izq, x2: m.izq, y1: m.arr, y2: H - m.abj, 'class': 'grafica-eje' }, svg);
      el('line', { x1: m.izq, x2: W - m.der, y1: H - m.abj, y2: H - m.abj, 'class': 'grafica-eje' }, svg);

      var curvaD = [];
      for (var t = 0; t <= 112; t += 2) {
        var yv = 0.8721 * Math.exp(-0.0289 * t);
        curvaD.push((t === 0 ? 'M' : 'L') + px(t).toFixed(1) + ' ' + py(yv).toFixed(1));
      }
      el('path', { d: curvaD.join(' '), fill: 'none', stroke: 'var(--grafica-serie-2)', 'stroke-width': 2 }, svg);

      cfg.puntos.forEach(function (pt, i) {
        var cx = px(pt[0]), cy = py(pt[1]);
        var c = el('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: 3.5, fill: 'var(--grafica-serie-1)' }, svg);
        c.addEventListener('mouseenter', function () { mostrar(i); });
      });

      var xt = el('text', { x: m.izq + aw / 2, y: H - 6, 'text-anchor': 'middle', 'class': 'grafica-eje-titulo' }, svg);
      xt.textContent = cfg.x.titulo;
      var yt = el('text', { x: 14, y: m.arr + ah / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (m.arr + ah / 2) + ')', 'class': 'grafica-eje-titulo' }, svg);
      yt.textContent = cfg.y.titulo;

      var aro = el('circle', { r: 6, 'class': 'aro', style: '--c: var(--grafica-serie-2)', hidden: '' }, svg);

      function mostrar(i) {
        focoIdx = Math.max(0, Math.min(N - 1, i));
        var pt = cfg.puntos[focoIdx];
        var cx = px(pt[0]), cy = py(pt[1]);
        aro.setAttribute('cx', cx);
        aro.setAttribute('cy', cy);
        aro.removeAttribute('hidden');
        var aj = 0.8721 * Math.exp(-0.0289 * pt[0]);
        globo.textContent = '';
        h('strong', {}, globo, 't = ' + pt[0].toFixed(1) + ' h');
        h('div', {}, globo, 'Medido: ' + pt[1].toFixed(2) + ' mg/L');
        h('div', {}, globo, 'Ajuste: ' + aj.toFixed(3) + ' mg/L');
        globo.hidden = false;
        globo.style.left = Math.min(Math.max(8, cx - 70), Math.max(8, W - 170)) + 'px';
        globo.style.top = '8px';
      }

      svg.addEventListener('mouseleave', function () {
        aro.setAttribute('hidden', '');
        globo.hidden = true;
      });
      svg.addEventListener('mousemove', function (ev) {
        var rect = svg.getBoundingClientRect();
        var mx = ((ev.clientX - rect.left) / rect.width) * W;
        var xv = ((mx - m.izq) / aw) * cfg.x.max;
        var best = 0, bestD = Infinity;
        cfg.puntos.forEach(function (pt, idx) {
          var dd = Math.abs(pt[0] - xv);
          if (dd < bestD) { bestD = dd; best = idx; }
        });
        mostrar(best);
      });
      svg.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); mostrar((focoIdx + 1) % N); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); mostrar((focoIdx - 1 + N) % N); }
      });
    }

    dibujar();
    if (window.ResizeObserver) new ResizeObserver(dibujar).observe(lienzo);
  }

  document.querySelectorAll('.grafica-libro[data-grafica]').forEach(function (caja) {
    var id = caja.getAttribute('data-grafica');
    if (BARRAS[id]) armarBarras(caja, BARRAS[id]);
    else if (id === 'l13-4-12') armarLineas412(caja);
    else if (id === 'l13-7-6') armarDisp76(caja);
  });
})();
