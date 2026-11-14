/*
 * Gráficas interactivas del Libro 4 (MAPAS, Conagua):
 * - l4-1-1: Ilustración 1.1 Proyecciones de la población 2010-2050
 * - l4-2-2: Ilustración 2.2 Coeficientes de variación horaria para distintas ciudades de México
 * - l4-2-3: Ilustración 2.3 Coeficientes de variación horaria para pequeñas comunidades
 * - l4-2-4: Ilustración 2.4 Coeficientes de variación horaria para la ciudad de México
 * - l4-3-2: Ilustración 3.2 Características del flujo con una sección circular parcialmente llena
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro04.css.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var SERIES_X = {
    'l4-1-1': {
      titulo: 'Ilustración 1.1. Proyecciones de la población 2010-2050, en millones de habitantes.',
      x: { min: 2010, max: 2050, paso: 5, titulo: 'Año', prefijo: 'Año ', sufijo: '' },
      y: { min: 100, max: 160, paso: 10, dec: 1, titulo: 'Millones de habitantes', sufijo: ' millones' },
      xs: [
        2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019,
        2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029,
        2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039,
        2040, 2041, 2042, 2043, 2044, 2045, 2046, 2047, 2048, 2049, 2050
      ],
      valores: [
        114.2, 115.6, 117.0, 118.3, 119.7, 120.9, 122.2, 123.5, 124.7, 125.9,
        127.0, 128.2, 129.3, 130.4, 131.5, 132.5, 133.6, 134.6, 135.6, 136.5,
        137.5, 138.4, 139.2, 140.1, 140.9, 141.7, 142.5, 143.3, 144.0, 144.7,
        145.4, 146.1, 146.7, 147.3, 147.9, 148.4, 149.0, 149.5, 150.0, 150.4, 150.8
      ],
      nombre: 'Población proyectada',
      tabla: true,
      notaTabla: 'Valores medidos en el trazo vectorial del PDF original (un vértice por año de 2010 a 2050), redondeados a una décima de millón.'
    },
    'l4-2-2': {
      titulo: 'Ilustración 2.2. Coeficientes de variación horaria para distintas ciudades de México.',
      x: { min: 0, max: 23, maxEje: 23, marcas: [0, 5, 10, 15, 20], pasoRet: 2.5, titulo: 'Tiempo (horas)', prefijo: 'Hora ', sufijo: ':00 h' },
      y: { min: 0, max: 2.0, paso: 0.25, dec: 3, decEje: 2, titulo: 'q / qmed', sufijo: '' },
      xs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
      valores: [0.606, 0.616, 0.633, 0.637, 0.651, 0.828, 0.938, 1.199, 1.307, 1.372, 1.343, 1.329, 1.288, 1.266, 1.216, 1.201, 1.196, 1.151, 1.121, 1.056, 0.901, 0.784, 0.710, 0.651],
      nombre: 'q / qmed (ciudades)'
    },
    'l4-2-3': {
      titulo: 'Ilustración 2.3. Coeficientes de variación horaria para pequeñas comunidades.',
      x: { min: 0, max: 23, maxEje: 23, marcas: [0, 5, 10, 15, 20], pasoRet: 2.5, titulo: 'Tiempo (horas)', prefijo: 'Hora ', sufijo: ':00 h' },
      y: { min: 0, max: 2.0, paso: 0.25, dec: 2, decEje: 2, titulo: 'q / qmed', sufijo: '' },
      xs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
      valores: [0.45, 0.45, 0.45, 0.45, 0.45, 0.60, 0.90, 1.35, 1.50, 1.50, 1.50, 1.40, 1.20, 1.40, 1.40, 1.30, 1.30, 1.20, 1.00, 1.00, 0.90, 0.90, 0.80, 0.60],
      nombre: 'q / qmed (pequeñas comunidades)'
    },
    'l4-2-4': {
      titulo: 'Ilustración 2.4. Coeficientes de variación horaria para la ciudad de México.',
      x: { min: 0, max: 23, maxEje: 23, marcas: [0, 5, 10, 15, 20], pasoRet: 2.5, titulo: 'Tiempo (horas)', prefijo: 'Hora ', sufijo: ':00 h' },
      y: { min: 0, max: 2.0, paso: 0.25, dec: 3, decEje: 2, titulo: 'q / qmed', sufijo: '' },
      xs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
      valores: [0.570, 0.560, 0.550, 0.560, 0.580, 0.650, 0.800, 1.000, 1.300, 1.425, 1.475, 1.500, 1.495, 1.430, 1.350, 1.250, 1.175, 1.125, 1.100, 1.075, 1.000, 0.780, 0.650, 0.600],
      nombre: 'q / qmed (ciudad de México)',
      nota: 'En el PDF original, las marcas del eje horizontal tienen intercambiados el 10 y el 20 (aparecen como 0, 5, 20, 15, 10).'
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

  function armarSerieX(caja, cfg) {
    caja.textContent = '';
    caja.classList.add('grafica--lineas');
    var lienzo = h('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = h('div', { 'class': 'grafica-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);
    var N = cfg.xs.length;

    function dibujar() {
      var W = Math.round(lienzo.clientWidth) || 640;
      var angosto = W < 500, H = angosto ? 260 : 320;
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
      var m = { izq: 54, der: 16, arr: 16, abj: 44 };
      var pw = W - m.izq - m.der, ph = H - m.arr - m.abj;
      var sx = function (x) { return m.izq + (x - cfg.x.min) / (cfg.x.max - cfg.x.min) * pw; };
      var sy = function (y) { return m.arr + (cfg.y.max - y) / (cfg.y.max - cfg.y.min) * ph; };

      var ret = el('g', { 'class': 'reticula', 'aria-hidden': 'true' }, svg);
      var decY = cfg.y.decEje != null ? cfg.y.decEje : 0;
      for (var y = cfg.y.min; y <= cfg.y.max + 1e-9; y += cfg.y.paso) {
        el('line', { x1: m.izq, x2: m.izq + pw, y1: sy(y), y2: sy(y) }, ret);
        el('text', { x: m.izq - 8, y: sy(y) + 4, 'class': 'marca-eje', 'text-anchor': 'end', 'aria-hidden': 'true' }, svg).textContent = y.toFixed(decY);
      }

      if (cfg.x.pasoRet) {
        for (var xr = cfg.x.min; xr <= cfg.x.max + 1e-9; xr += cfg.x.pasoRet) {
          el('line', { x1: sx(xr), x2: sx(xr), y1: m.arr, y2: m.arr + ph }, ret);
        }
      }
      var marcasX = cfg.x.marcas || [];
      if (!marcasX.length) {
        for (var xm = cfg.x.min; xm <= cfg.x.max + 1e-9; xm += cfg.x.paso) {
          marcasX.push(xm);
          el('line', { x1: sx(xm), x2: sx(xm), y1: m.arr, y2: m.arr + ph }, ret);
        }
      }
      marcasX.forEach(function (xm, idx) {
        if (angosto && marcasX.length > 7 && idx % 2 === 1) return;
        el('text', { x: sx(xm), y: m.arr + ph + 18, 'class': 'marca-eje', 'text-anchor': 'middle', 'aria-hidden': 'true' }, svg).textContent = String(xm);
      });

      el('rect', { x: m.izq, y: m.arr, width: pw, height: ph, 'class': 'marco', 'aria-hidden': 'true' }, svg);
      el('text', { x: m.izq + pw / 2, y: H - 6, 'class': 'titulo-eje', 'text-anchor': 'middle', 'aria-hidden': 'true' }, svg).textContent = cfg.x.titulo;
      el('text', { 'class': 'titulo-eje', 'text-anchor': 'middle', 'aria-hidden': 'true', transform: 'translate(14 ' + (m.arr + ph / 2) + ') rotate(-90)' }, svg).textContent = cfg.y.titulo;

      var gSerie = el('g', { 'class': 'serie serie-1', 'aria-hidden': 'true' }, svg);
      var dPath = cfg.xs.map(function (xv, j) {
        return (j ? 'L' : 'M') + sx(xv).toFixed(1) + ' ' + sy(cfg.valores[j]).toFixed(1);
      }).join('');
      el('path', { d: dPath, 'class': 'linea' }, gSerie);

      var guia = el('line', { y1: m.arr, y2: m.arr + ph, 'class': 'guia', visibility: 'hidden', 'aria-hidden': 'true' }, svg);
      var punto = el('circle', { r: 4.5, 'class': 'marca punto-activo serie-1', visibility: 'hidden', 'aria-hidden': 'true' }, svg);
      var actual = -1;

      function activar(j) {
        actual = j;
        var xv = cfg.xs[j], yv = cfg.valores[j];
        var px = sx(xv), py = sy(yv);
        guia.setAttribute('x1', px); guia.setAttribute('x2', px); guia.setAttribute('visibility', 'visible');
        punto.setAttribute('cx', px); punto.setAttribute('cy', py); punto.setAttribute('visibility', 'visible');
        var frag = document.createDocumentFragment();
        h('div', { 'class': 'titulo' }, frag, cfg.x.prefijo + xv + cfg.x.sufijo);
        var fila = h('div', { 'class': 'fila serie-1' }, frag);
        var mu = el('svg', { viewBox: '0 0 12 12', width: '12', height: '12', 'aria-hidden': 'true' }, fila);
        el('circle', { cx: 6, cy: 6, r: 4, 'class': 'marca' }, mu);
        h('span', { 'class': 'nombre' }, fila, cfg.nombre);
        h('span', { 'class': 'valor' }, fila, yv.toFixed(cfg.y.dec) + cfg.y.sufijo);
        globo.innerHTML = ''; globo.appendChild(frag); globo.hidden = false;
        var esc = (lienzo.clientWidth || W) / W, gw = globo.offsetWidth, gh = globo.offsetHeight;
        var left = px * esc + 12;
        if (left + gw > (lienzo.clientWidth || W) - 4) left = px * esc - 12 - gw;
        globo.style.left = Math.max(4, left) + 'px';
        globo.style.top = Math.max(4, py * esc - gh - 10) + 'px';
      }

      function quitar() {
        actual = -1;
        guia.setAttribute('visibility', 'hidden');
        punto.setAttribute('visibility', 'hidden');
        globo.hidden = true;
      }

      function indice(e) {
        var r = svg.getBoundingClientRect();
        var xRel = ((e.clientX - r.left) * (W / r.width) - m.izq) / pw;
        var j = Math.round(xRel * (N - 1));
        return Math.max(0, Math.min(N - 1, j));
      }

      svg.addEventListener('pointermove', function (e) { activar(indice(e)); });
      svg.addEventListener('pointerdown', function (e) { activar(indice(e)); });
      svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') quitar(); });
      svg.addEventListener('blur', quitar);
      svg.addEventListener('keydown', function (e) {
        var j = actual < 0 ? 0 : actual;
        var k = { ArrowRight: j + 1, ArrowLeft: j - 1, PageUp: j + 5, PageDown: j - 5, Home: 0, End: N - 1 }[e.key];
        if (k == null) return;
        e.preventDefault();
        activar(Math.max(0, Math.min(N - 1, k)));
      });
    }

    dibujar();
    if ('ResizeObserver' in window) {
      var ancho = lienzo.clientWidth;
      new ResizeObserver(function () {
        if (lienzo.clientWidth === ancho) return;
        ancho = lienzo.clientWidth;
        requestAnimationFrame(dibujar);
      }).observe(lienzo);
    }

    if (cfg.nota) {
      h('p', { 'class': 'grafica-nota' }, caja, cfg.nota);
    }

    if (cfg.tabla) {
      var det = h('details', { 'class': 'grafica-datos' }, caja);
      h('summary', null, det, 'Datos de la gráfica (2010 a 2050)');
      var t = h('table', null, det);
      var trH = h('tr', null, h('thead', null, t));
      h('th', { scope: 'col' }, trH, 'Año');
      h('th', { scope: 'col' }, trH, 'Millones de habitantes');
      var tb = h('tbody', null, t);
      for (var j = 0; j < N; j++) {
        var r = h('tr', null, tb);
        h('th', { scope: 'row' }, r, String(cfg.xs[j]));
        h('td', null, r, cfg.valores[j].toFixed(cfg.y.dec));
      }
      if (cfg.notaTabla) h('p', { 'class': 'grafica-nota' }, det, cfg.notaTabla);
    }
  }

  /* ---- Ilustración 3.2: sección circular parcialmente llena ---- */
  function armarCircular(caja) {
    caja.textContent = '';
    caja.classList.add('grafica--lineas');

    // Generar 51 niveles de tirante y/D = 0.00, 0.02, ..., 1.00
    var yds = [];
    for (var k = 0; k <= 50; k++) yds.push(+(k * 0.02).toFixed(2));

    var series = [
      { nombre: 'Perímetro mojado', cls: 'serie-1', trazo: 'linea--raya-punto', vals: [] },
      { nombre: 'Sección', cls: 'serie-2', trazo: '', vals: [] },
      { nombre: 'Caudal', cls: 'serie-3', trazo: '', aros: true, vals: [] },
      { nombre: 'Radio hidráulico', cls: 'serie-4', trazo: 'linea--raya-dos-puntos', vals: [] },
      { nombre: 'Velocidad', cls: 'serie-5', trazo: 'linea--puntos', vals: [] }
    ];

    yds.forEach(function (yd) {
      if (yd <= 0) {
        series.forEach(function (s) { s.vals.push(0); });
        return;
      }
      var th = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * yd)));
      var pRel = th / Math.PI;
      var aRel = (th - 0.5 * Math.sin(2 * th)) / Math.PI;
      var rhRel = aRel / pRel;
      var vRel = Math.pow(rhRel, 2 / 3);
      var qRel = aRel * vRel;
      series[0].vals.push(pRel);
      series[1].vals.push(aRel);
      series[2].vals.push(qRel);
      series[3].vals.push(rhRel);
      series[4].vals.push(vRel);
    });

    var visibles = [true, true, true, true, true];
    var leyenda = h('div', { 'class': 'grafica-leyenda', role: 'group', 'aria-label': 'Curvas hidráulicas' }, caja);
    var lienzo = h('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = h('div', { 'class': 'grafica-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);
    var dibujo = null;

    series.forEach(function (s, i) {
      var b = h('button', { type: 'button', 'class': 'grafica-serie ' + s.cls, 'aria-pressed': 'true' }, leyenda);
      var m = el('svg', { viewBox: '0 0 28 14', width: '28', height: '14', 'aria-hidden': 'true', 'class': 'grafica-muestra' }, b);
      el('line', { x1: 1, y1: 7, x2: 27, y2: 7, 'class': ('linea ' + s.trazo).trim() }, m);
      if (s.aros) el('circle', { cx: 14, cy: 7, r: 2.6, 'class': 'aro' }, m);
      h('span', null, b, s.nombre);
      b.addEventListener('click', function () {
        visibles[i] = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(visibles[i]));
        if (dibujo) dibujo.aplicar();
      });
    });

    function dibujar() {
      var W = Math.round(lienzo.clientWidth) || 640;
      var angosto = W < 500, H = angosto ? 300 : 360;
      lienzo.querySelectorAll('svg').forEach(function (n) { n.remove(); });
      globo.hidden = true;
      var svg = el('svg', {
        viewBox: '0 0 ' + W + ' ' + H,
        width: '100%',
        height: H,
        'class': 'grafica-svg',
        tabindex: '0',
        role: 'img',
        'aria-label': 'Ilustración 3.2. Características del flujo con una sección circular parcialmente llena. Use las flechas para recorrer la relación tirante entre diámetro de 0.00 a 1.00.'
      });
      lienzo.insertBefore(svg, globo);
      var m = { izq: 54, der: 18, arr: 16, abj: 46 };
      var pw = W - m.izq - m.der, ph = H - m.arr - m.abj;
      var sx = function (x) { return m.izq + (x / 1.2) * pw; };
      var sy = function (y) { return m.arr + (1.0 - y) * ph; };

      var ret = el('g', { 'class': 'reticula', 'aria-hidden': 'true' }, svg);
      for (var gi = 0; gi <= 10; gi++) {
        var yv = gi / 10;
        el('line', { x1: m.izq, x2: m.izq + pw, y1: sy(yv), y2: sy(yv) }, ret);
        if (gi % 2 === 0 && gi > 0) {
          el('text', { x: m.izq - 8, y: sy(yv) + 4, 'class': 'marca-eje', 'text-anchor': 'end', 'aria-hidden': 'true' }, svg).textContent = yv.toFixed(1);
        }
      }
      for (var xi = 0; xi <= 12; xi++) {
        var xv = xi / 10;
        el('line', { x1: sx(xv), x2: sx(xv), y1: m.arr, y2: m.arr + ph }, ret);
        if (xi % 2 === 0) {
          el('text', { x: sx(xv), y: m.arr + ph + 18, 'class': 'marca-eje', 'text-anchor': 'middle', 'aria-hidden': 'true' }, svg).textContent = xv.toFixed(1);
        }
      }

      el('rect', { x: m.izq, y: m.arr, width: pw, height: ph, 'class': 'marco', 'aria-hidden': 'true' }, svg);
      el('text', { x: m.izq + pw / 2, y: H - 6, 'class': 'titulo-eje', 'text-anchor': 'middle', 'aria-hidden': 'true' }, svg).textContent = 'Relación entre el caudal dado y el caudal a sección plena';
      el('text', { 'class': 'titulo-eje', 'text-anchor': 'middle', 'aria-hidden': 'true', transform: 'translate(14 ' + (m.arr + ph / 2) + ') rotate(-90)' }, svg).textContent = 'Relación entre el tirante y el diámetro';

      var grupos = series.map(function (s) {
        var g = el('g', { 'class': 'serie ' + s.cls, 'aria-hidden': 'true' }, svg);
        var d = s.vals.map(function (v, j) {
          return (j ? 'L' : 'M') + sx(v).toFixed(1) + ' ' + sy(yds[j]).toFixed(1);
        }).join('');
        el('path', { d: d, 'class': ('linea ' + s.trazo).trim() }, g);
        if (s.aros) {
          for (var j = 3; j < yds.length; j += 3) {
            el('circle', { cx: sx(s.vals[j]).toFixed(1), cy: sy(yds[j]).toFixed(1), r: 2.5, 'class': 'aro' }, g);
          }
        }
        return g;
      });

      var guia = el('line', { x1: m.izq, x2: m.izq + pw, 'class': 'guia', visibility: 'hidden', 'aria-hidden': 'true' }, svg);
      var puntos = series.map(function (s) {
        return el('circle', { r: 4.2, 'class': 'marca punto-activo ' + s.cls, visibility: 'hidden', 'aria-hidden': 'true' }, svg);
      });
      var actual = -1;

      function activar(j) {
        if (!visibles.some(Boolean)) return;
        actual = j;
        var yd = yds[j], py = sy(yd);
        guia.setAttribute('y1', py); guia.setAttribute('y2', py); guia.setAttribute('visibility', 'visible');
        var frag = document.createDocumentFragment();
        h('div', { 'class': 'titulo' }, frag, 'Tirante y / D = ' + yd.toFixed(2));
        var xProm = 0, nVis = 0;
        series.forEach(function (s, i) {
          puntos[i].setAttribute('visibility', visibles[i] ? 'visible' : 'hidden');
          if (!visibles[i]) return;
          var px = sx(s.vals[j]);
          puntos[i].setAttribute('cx', px); puntos[i].setAttribute('cy', py);
          xProm += px; nVis++;
          var f = h('div', { 'class': 'fila ' + s.cls }, frag);
          var mu = el('svg', { viewBox: '0 0 12 12', width: '12', height: '12', 'aria-hidden': 'true' }, f);
          el('circle', { cx: 6, cy: 6, r: 4, 'class': 'marca' }, mu);
          h('span', { 'class': 'nombre' }, f, s.nombre);
          h('span', { 'class': 'valor' }, f, s.vals[j].toFixed(3));
        });
        globo.innerHTML = ''; globo.appendChild(frag); globo.hidden = false;
        var esc = (lienzo.clientWidth || W) / W, gw = globo.offsetWidth, gh = globo.offsetHeight;
        var cx = (xProm / (nVis || 1)) * esc;
        var left = cx + 16;
        if (left + gw > (lienzo.clientWidth || W) - 4) left = cx - 16 - gw;
        globo.style.left = Math.max(4, left) + 'px';
        globo.style.top = Math.max(4, Math.min((H * esc) - gh - 4, py * esc - gh / 2)) + 'px';
      }

      function quitar() {
        actual = -1;
        guia.setAttribute('visibility', 'hidden');
        globo.hidden = true;
        puntos.forEach(function (p) { p.setAttribute('visibility', 'hidden'); });
      }

      function indice(e) {
        var r = svg.getBoundingClientRect();
        var yRel = 1.0 - ((e.clientY - r.top) * (H / r.height) - m.arr) / ph;
        var j = Math.round(yRel * (yds.length - 1));
        return Math.max(0, Math.min(yds.length - 1, j));
      }

      svg.addEventListener('pointermove', function (e) { activar(indice(e)); });
      svg.addEventListener('pointerdown', function (e) { activar(indice(e)); });
      svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') quitar(); });
      svg.addEventListener('blur', quitar);
      svg.addEventListener('keydown', function (e) {
        var j = actual < 0 ? 25 : actual;
        var k = { ArrowUp: j + 1, ArrowRight: j + 1, ArrowDown: j - 1, ArrowLeft: j - 1, PageUp: j + 5, PageDown: j - 5, Home: 0, End: yds.length - 1 }[e.key];
        if (k == null) return;
        e.preventDefault();
        activar(Math.max(0, Math.min(yds.length - 1, k)));
      });

      function aplicar() {
        grupos.forEach(function (g, i) { g.style.display = visibles[i] ? '' : 'none'; });
        if (actual >= 0 && visibles.some(Boolean)) activar(actual); else quitar();
      }
      aplicar();
      return { aplicar: aplicar };
    }

    dibujo = dibujar();
    if ('ResizeObserver' in window) {
      var ancho = lienzo.clientWidth;
      new ResizeObserver(function () {
        if (lienzo.clientWidth === ancho) return;
        ancho = lienzo.clientWidth;
        requestAnimationFrame(function () { dibujo = dibujar() || dibujo; });
      }).observe(lienzo);
    }
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('.grafica-lienzo')) return;
    document.querySelectorAll('.grafica-libro[data-grafica^="l4-"] .grafica-globo').forEach(function (g) { g.hidden = true; });
  });

  function iniciar() {
    document.querySelectorAll('.grafica-libro[data-grafica^="l4-"]').forEach(function (c) {
      if (c.dataset.lista) return;
      c.dataset.lista = '1';
      var id = c.getAttribute('data-grafica');
      if (id === 'l4-3-2') armarCircular(c);
      else if (SERIES_X[id]) armarSerieX(c, SERIES_X[id]);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
