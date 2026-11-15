/*
 * Gráficas interactivas del Libro 20 (MAPAS, Conagua):
 * - l20-3-5: Ilustración 3.5 Pendientes mínimas recomendadas para v = 0.6 m/s a tubo lleno
 * - l20-3-12: Ilustración 3.12 Elementos hidráulicos de la sección circular
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro20.css.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  // Calculo exacto de pendiente minima (milesimas) para v = 0.6 m/s a tubo lleno:
  // S = 1000 * (0.6 * n / (D_m / 4)^(2/3))^2
  var DIAMS = [15, 20, 25, 30, 38, 45, 50, 60, 76, 91, 100, 122, 152, 183, 213, 244, 274, 305];
  function calcPendientes(n) {
    return DIAMS.map(function (dcm) {
      var rh = (dcm / 100) / 4;
      var s = 1000 * Math.pow((0.6 * n) / Math.pow(rh, 2 / 3), 2);
      return Number(s.toFixed(4));
    });
  }

  // Calculo exacto de elementos hidraulicos de seccion circular (y/D de 0.00 a 1.00)
  var YDS = [];
  for (var k = 0; k <= 20; k++) YDS.push(Number((k * 0.05).toFixed(2)));
  function calcCircular(tipo) {
    return YDS.map(function (yd) {
      if (yd <= 0) return 0;
      if (yd >= 1) return 1;
      var th = 2 * Math.acos(1 - 2 * yd);
      var area = (th - Math.sin(th)) / (2 * Math.PI);
      var pm = th / (2 * Math.PI);
      var rh = 1 - Math.sin(th) / th;
      var vel = Math.pow(rh, 2 / 3);
      var q = area * vel;
      if (tipo === 'pm') return Number(pm.toFixed(4));
      if (tipo === 'area') return Number(area.toFixed(4));
      if (tipo === 'q') return Number(q.toFixed(4));
      if (tipo === 'rh') return Number(rh.toFixed(4));
      return Number(vel.toFixed(4));
    });
  }

  var GRAFICAS = {
    'l20-3-5': {
      titulo: 'Ilustración 3.5. Pendientes mínimas recomendadas para v = 0.6 m/s a tubo lleno.',
      logX: true,
      logY: true,
      x: { min: 10, max: 400, marcas: [10, 20, 30, 50, 100, 200, 300, 400], etiquetas: [10, 100], titulo: 'Diámetro (cm)', prefijo: 'D = ', sufijo: ' cm' },
      y: { min: 0.01, max: 10, marcas: [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10], etiquetas: [0.01, 0.1, 1, 10], dec: 3, decEje: 2, titulo: 'Pendiente mínima (milésimas)', sufijo: ' ‰' },
      xs: DIAMS,
      series: [
        { id: 'n009', nombre: 'n = 0.009', valores: calcPendientes(0.009) },
        { id: 'n010', nombre: 'n = 0.010', valores: calcPendientes(0.010) },
        { id: 'n011', nombre: 'n = 0.011', valores: calcPendientes(0.011) },
        { id: 'n012', nombre: 'n = 0.012', valores: calcPendientes(0.012) },
        { id: 'n013', nombre: 'n = 0.013', valores: calcPendientes(0.013) },
        { id: 'n014', nombre: 'n = 0.014', valores: calcPendientes(0.014) },
        { id: 'n015', nombre: 'n = 0.015', valores: calcPendientes(0.015) }
      ]
    },
    'l20-3-12': {
      titulo: 'Ilustración 3.12. Elementos hidráulicos de la sección circular.',
      x: { min: 0, max: 1.0, maxEje: 1.0, marcas: [0, 0.2, 0.4, 0.6, 0.8, 1.0], pasoRet: 0.1, titulo: 'Relación entre el tirante y el diámetro (y/D)', prefijo: 'y/D = ', sufijo: '' },
      y: { min: 0, max: 1.3, paso: 0.2, dec: 3, decEje: 1, titulo: 'Relación respecto a sección llena', sufijo: '' },
      xs: YDS,
      series: [
        { id: 'pm', nombre: 'Perímetro mojado', valores: calcCircular('pm') },
        { id: 'area', nombre: 'Sección', valores: calcCircular('area') },
        { id: 'q', nombre: 'Caudal', valores: calcCircular('q') },
        { id: 'rh', nombre: 'Radio hidráulico', valores: calcCircular('rh') },
        { id: 'vel', nombre: 'Velocidad', valores: calcCircular('vel') }
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

    var visibles = cfg.series.map(function () { return true; });
    if (cfg.series.length > 1) {
      var ley = h('div', { 'class': 'grafica-leyenda' }, caja);
      cfg.series.forEach(function (s, si) {
        var btn = h('button', {
          type: 'button',
          'class': 'grafica-serie serie-' + (si + 1),
          'aria-pressed': 'true'
        }, ley);
        var m = el('svg', { width: 16, height: 10, viewBox: '0 0 16 10', 'class': 'grafica-muestra', 'aria-hidden': 'true' }, btn);
        el('line', { x1: 1, y1: 5, x2: 15, y2: 5, stroke: 'var(--c)', 'stroke-width': 2.2 }, m);
        el('circle', { cx: 8, cy: 5, r: 2.5, fill: 'var(--c)' }, m);
        h('span', {}, btn, s.nombre);
        btn.addEventListener('click', function () {
          visibles[si] = !visibles[si];
          btn.setAttribute('aria-pressed', visibles[si] ? 'true' : 'false');
          dibujar();
        });
      });
    }

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
      var m = { izq: 58, der: 18, arr: 16, abj: 44 };
      var aw = W - m.izq - m.der, ah = H - m.arr - m.abj;
      var xMin = cfg.x.min, xMax = cfg.x.maxEje != null ? cfg.x.maxEje : cfg.x.max;
      var yMin = cfg.y.min, yMax = cfg.y.max;

      function px(xv) {
        if (cfg.logX) {
          return m.izq + ((Math.log10(xv) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin))) * aw;
        }
        return m.izq + ((xv - xMin) / (xMax - xMin)) * aw;
      }
      function py(yv) {
        if (cfg.logY) {
          return m.arr + (1 - (Math.log10(yv) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin))) * ah;
        }
        return m.arr + (1 - (yv - yMin) / (yMax - yMin)) * ah;
      }

      var gRet = el('g', { 'class': 'reticula' }, svg);
      var gEjes = el('g', { 'class': 'ejes' }, svg);

      if (cfg.logY) {
        cfg.y.marcas.forEach(function (yv) {
          var yy = py(yv);
          el('line', { x1: m.izq, y1: yy, x2: W - m.der, y2: yy }, gRet);
          if (cfg.y.etiquetas.indexOf(yv) !== -1) {
            el('text', { x: m.izq - 6, y: yy + 3.5, 'text-anchor': 'end', 'class': 'marca-eje' }, gEjes).textContent = yv.toFixed(cfg.y.decEje);
          }
        });
      } else {
        for (var yv = yMin; yv <= yMax + 1e-6; yv += cfg.y.paso) {
          var yy = py(yv);
          el('line', { x1: m.izq, y1: yy, x2: W - m.der, y2: yy }, gRet);
          el('text', { x: m.izq - 6, y: yy + 3.5, 'text-anchor': 'end', 'class': 'marca-eje' }, gEjes).textContent = yv.toFixed(cfg.y.decEje);
        }
      }

      if (cfg.x.pasoRet) {
        for (var xv = xMin; xv <= xMax + 1e-6; xv += cfg.x.pasoRet) {
          el('line', { x1: px(xv), y1: m.arr, x2: px(xv), y2: H - m.abj }, gRet);
        }
      }
      cfg.x.marcas.forEach(function (xv) {
        var xx = px(xv);
        el('line', { x1: xx, y1: m.arr, x2: xx, y2: H - m.abj, 'class': cfg.logX ? '' : 'eje' }, gRet);
        if (!cfg.x.etiquetas || cfg.x.etiquetas.indexOf(xv) !== -1) {
          el('text', { x: xx, y: H - m.abj + 15, 'text-anchor': 'middle', 'class': 'marca-eje' }, gEjes).textContent = String(xv);
        }
      });

      el('rect', { x: m.izq, y: m.arr, width: aw, height: ah, 'class': 'marco' }, svg);
      el('text', { x: m.izq + aw / 2, y: H - 6, 'text-anchor': 'middle', 'class': 'titulo-eje' }, gEjes).textContent = cfg.x.titulo;
      var ty = m.arr + ah / 2;
      el('text', { x: 15, y: ty, 'text-anchor': 'middle', transform: 'rotate(-90 15 ' + ty + ')', 'class': 'titulo-eje' }, gEjes).textContent = cfg.y.titulo;

      var guia = el('line', { x1: m.izq, y1: m.arr, x2: m.izq, y2: H - m.abj, 'class': 'guia', hidden: '' }, svg);
      var aros = [];

      cfg.series.forEach(function (s, si) {
        if (!visibles[si]) return;
        var gS = el('g', { 'class': 'serie serie-' + (si + 1) }, svg);
        var ptsArr = [];
        cfg.xs.forEach(function (xv, i) {
          if (s.valores[i] != null) {
            ptsArr.push(px(xv).toFixed(1) + ',' + py(s.valores[i]).toFixed(1));
          }
        });
        if (ptsArr.length > 1) {
          el('polyline', { points: ptsArr.join(' '), 'class': 'linea' }, gS);
        }
        cfg.xs.forEach(function (xv, i) {
          if (s.valores[i] != null) {
            el('circle', { cx: px(xv), cy: py(s.valores[i]), r: 2.8, 'class': 'marca' }, gS);
          }
        });
        var aro = el('circle', { cx: 0, cy: 0, r: 5.5, 'class': 'aro serie-' + (si + 1), hidden: '' }, svg);
        aros.push({ si: si, el: aro });
      });

      var idx = -1;
      function mostrar(i) {
        if (i < 0 || i >= N) { ocultar(); return; }
        idx = i;
        var xv = cfg.xs[i];
        var xx = px(xv);
        guia.setAttribute('x1', xx);
        guia.setAttribute('x2', xx);
        guia.removeAttribute('hidden');
        var lines = [cfg.x.prefijo + xv + cfg.x.sufijo];
        aros.forEach(function (a) {
          var yv = cfg.series[a.si].valores[i];
          if (yv == null) {
            a.el.setAttribute('hidden', '');
          } else {
            a.el.setAttribute('cx', xx);
            a.el.setAttribute('cy', py(yv));
            a.el.removeAttribute('hidden');
            lines.push(cfg.series[a.si].nombre + ': ' + yv.toFixed(cfg.y.dec) + cfg.y.sufijo);
          }
        });
        globo.textContent = lines.join(' · ');
        globo.hidden = false;
        var gw = globo.offsetWidth || 160;
        var gx = Math.min(Math.max(xx - gw / 2, 4), W - gw - 4);
        globo.style.left = gx + 'px';
        globo.style.top = '4px';
      }
      function ocultar() {
        idx = -1;
        guia.setAttribute('hidden', '');
        aros.forEach(function (a) { a.el.setAttribute('hidden', ''); });
        globo.hidden = true;
      }

      var zona = el('rect', { x: m.izq, y: m.arr, width: aw, height: ah, 'class': 'zona' }, svg);
      zona.addEventListener('pointermove', function (e) {
        var r = svg.getBoundingClientRect();
        var mx = (e.clientX - r.left) * (W / r.width);
        var best = 0, bd = 1e9;
        for (var i = 0; i < N; i++) {
          var d = Math.abs(px(cfg.xs[i]) - mx);
          if (d < bd) { bd = d; best = i; }
        }
        mostrar(best);
      });
      zona.addEventListener('pointerleave', ocultar);
      svg.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); mostrar(idx < 0 ? 0 : Math.min(N - 1, idx + 1)); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); mostrar(idx < 0 ? N - 1 : Math.max(0, idx - 1)); }
        else if (e.key === 'Escape') { ocultar(); }
      });
    }

    dibujar();
    if (window.ResizeObserver) {
      new ResizeObserver(dibujar).observe(lienzo);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.grafica-libro[data-grafica]').forEach(function (caja) {
      var id = caja.getAttribute('data-grafica');
      if (GRAFICAS[id]) armarGrafica(caja, GRAFICAS[id]);
    });
  });
})();
