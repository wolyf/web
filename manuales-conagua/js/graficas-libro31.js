/*
 * Gráficas interactivas del Libro 31 (MAPAS, Conagua):
 * Ilustraciones 1.4, 2.1, 2.2, 3.14, 3.15, 3.16, 3.18, 3.19 y A.2.
 *
 * Sin dependencias; usa ../css/graficas.css y ../css/graficas-libro31.css.
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

  var DATOS = {
    'l31-1-4': {
      tipo: 'lineas',
      titulo: 'Población de México de 1950 a 2010',
      xLabel: 'Año',
      yLabel: 'Millones de habitantes',
      xMin: 1950, xMax: 2010, xTicks: [1950, 1960, 1970, 1980, 1990, 2000, 2010],
      yMin: 0, yMax: 120, yTicks: [0, 20, 40, 60, 80, 100, 120],
      unidad: ' M hab',
      series: [
        { nombre: 'Total', cls: 'serie-1', pts: [[1950,25.82],[1955,34.99],[1960,41.68],[1965,48.36],[1970,57.69],[1975,67.02],[1980,74.27],[1985,81.51],[1990,86.46],[1995,91.41],[2000,97.69],[2005,103.49],[2010,113.11]] },
        { nombre: 'Urbano', cls: 'serie-2', pts: [[1950,11.02],[1955,17.76],[1960,23.10],[1965,28.43],[1970,36.45],[1975,44.47],[1980,51.34],[1985,58.21],[1990,62.73],[1995,67.25],[2000,72.98],[2005,79.20],[2010,86.89]] },
        { nombre: 'Rural', cls: 'serie-3', pts: [[1950,14.80],[1955,17.23],[1960,18.58],[1965,19.93],[1970,21.24],[1975,22.55],[1980,22.93],[1985,23.30],[1990,23.73],[1995,24.16],[2000,24.71],[2005,24.28],[2010,26.23]] }
      ]
    },
    'l31-2-1': {
      tipo: 'lineas',
      titulo: 'Evolución diaria tipo del caudal de agua residual urbana',
      xLabel: 'Hora',
      yLabel: 'Caudal (m³/h)',
      xMin: 0, xMax: 24, xTicks: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
      yMin: 0, yMax: 900, yTicks: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900],
      unidad: ' m³/h',
      media: 475,
      series: [
        { nombre: 'Caudal horario', cls: 'serie-1', pts: [[0,386.4],[1,310.1],[2,240.3],[3,178.3],[4,129.7],[5,106.7],[6,138.4],[7,279.0],[8,534.1],[9,703.8],[10,794.8],[11,806.1],[12,755.7],[13,665.2],[14,569.3],[15,482.6],[16,443.3],[17,446.4],[18,490.9],[19,594.8],[20,692.7],[21,699.8],[22,613.9],[23,513.5],[24,411.3]] }
      ]
    },
    'l31-2-2': {
      tipo: 'lineas',
      titulo: 'Relación entre Fp y Qmed',
      xLabel: 'Qmed (m³/h)',
      yLabel: 'Fp',
      xMin: 0, xMax: 4000, xTicks: [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000],
      yMin: 1.4, yMax: 2.2, yTicks: [1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2],
      unidad: '',
      series: [
        { nombre: 'Factor de punta (Fp)', cls: 'serie-1', pts: [[100,2.13],[200,1.88],[300,1.80],[400,1.74],[500,1.71],[750,1.64],[1000,1.60],[1500,1.55],[2000,1.52],[2500,1.50],[3000,1.49],[3500,1.48],[4000,1.47]] }
      ]
    },
    'l31-3-14': {
      tipo: 'dispersion',
      titulo: 'Pérdida de carga dentro del biofiltro',
      xLabel: 'Tiempo (días de operación)',
      yLabel: 'Pérdida de carga (m columna de agua)',
      xMin: 0, xMax: 200, xTicks: [0, 25, 50, 75, 100, 125, 150, 175, 200],
      yMin: 0, yMax: 25, yTicks: [0, 5, 10, 15, 20, 25],
      unidad: ' m',
      regimenes: [[50, 'Cambio de MF']],
      series: [
        { nombre: 'Pérdida de carga (m)', cls: 'serie-1', pts: [[4.9,2.72],[11.5,4.18],[18.5,3.72],[25.5,6.3],[27.6,11.42],[32,9.16],[33.1,9.7],[34.2,10.76],[35.1,17.39],[36.3,20.11],[37.4,16.46],[40.2,13.03],[47.9,17.21],[55.8,4.47],[57.5,5.33],[59,4.69],[64.3,5.78],[66.3,6.07],[72.5,4.69],[75.9,10.08],[77,6.27],[78.9,3.5],[80.4,3.72],[81.1,5.08],[83.6,14.67],[85.1,4.26],[86.3,5.2],[87.6,4.18],[89.1,6.2],[89.8,6.58],[91.5,6.2],[91.7,4.69],[92.9,3.22],[94.2,4.18],[95.8,4.65],[96.6,6.88],[97.9,5.25],[100,6.2],[102.1,7.33],[109.9,10.69],[110.3,6.9],[113.5,6.86],[117.1,5.91],[118.4,7.2],[120.3,7.33],[122.6,7.91],[124.1,9.87],[127.6,7.48],[130.2,6.03],[132.2,4.9],[135.3,4.74],[138.2,5.08],[139.2,9.79],[141.9,4.74],[143.5,10.62],[145.1,3.87],[147.5,6.46],[149.6,4.74],[156.5,9.79],[159.7,11.9],[161.4,9.71],[164.4,15.65],[165.3,8.21],[175.2,5.48]] }
      ]
    },
    'l31-3-15': {
      tipo: 'lineas',
      titulo: 'Comportamiento de la DQO residual respecto a la COS aplicada',
      xLabel: 'Tiempo (días de operación)',
      yLabel: 'DQO efluente (mg/L)',
      xMin: 0, xMax: 180, xTicks: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180],
      yMin: 0, yMax: 4000, yTicks: [0, 1000, 2000, 3000, 4000],
      unidad: ' mg/L',
      regimenes: [[40, '1.41 | 0.65'], [62, '0.65 | 0.55']],
      series: [
        { nombre: 'DQO efluente', cls: 'serie-1', pts: [[11.9,1327],[19.3,3030],[26.2,3416],[40.2,2717],[61.2,1338],[69,909],[91.9,2569],[97.7,502],[117.3,491],[133.1,189],[146.8,74],[158.3,0],[160.9,230],[164.2,491],[171.6,1],[174.5,209]] }
      ]
    },
    'l31-3-16': {
      tipo: 'lineas',
      titulo: 'DBO remanente del efluente respecto a la COS aplicada',
      xLabel: 'Tiempo (días de operación)',
      yLabel: 'DBO efluente (mg/L)',
      xMin: 0, xMax: 180, xTicks: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180],
      yMin: 0, yMax: 200, yTicks: [0, 50, 100, 150, 200],
      unidad: ' mg/L',
      regimenes: [[40, '0.821'], [62, '0.320']],
      series: [
        { nombre: 'DBO efluente', cls: 'serie-2', pts: [[11.2,3.6],[18.3,73.4],[25.1,47],[38.6,70.6],[60.6,1],[68.2,0.6],[91.2,1.9],[97.1,1.5],[117.2,0],[132.1,4.1],[146.4,2.3],[158.3,1.9],[159.8,4.5],[164.1,1],[171.3,1],[174.2,7.6],[179.2,7.1]] }
      ]
    },
    'l31-3-18': {
      tipo: 'lineas',
      titulo: 'Concentración de DQO del efluente en 2 biofiltros',
      xLabel: 'Tiempo (días de operación)',
      yLabel: 'DQO (mg/L)',
      xMin: 0, xMax: 200, xTicks: [0, 25, 50, 75, 100, 125, 150, 175, 200],
      yMin: 0, yMax: 6500, yTicks: [0, 1200, 2400, 3600, 4800, 6000],
      unidad: ' mg/L',
      series: [
        { nombre: '3.4 m³ aire/(m²·h) (81 %)', cls: 'serie-1', pts: [[3.3,2009],[5.8,765],[11.6,6121],[17.5,5017],[26.2,5017],[34.6,2580],[43.1,2129],[56.9,1749],[64.5,930],[97.7,2332],[121.1,3323],[147.4,3710],[155.6,3240],[165.1,3240],[171.3,3037]] },
        { nombre: '9.4 m³ aire/(m²·h) (97 %)', cls: 'serie-2', pts: [[3.1,381],[5.8,1315],[12.8,1200],[18.8,2779],[24.9,3710],[62.1,2580],[67.3,1552],[99,930],[115.2,607],[139.4,305],[148.7,144],[156.9,492],[162.9,721],[172.6,569]] }
      ]
    },
    'l31-3-19': {
      tipo: 'lineas',
      titulo: 'Concentración de N-NH4+ en 2 biofiltros',
      xLabel: 'Tiempo (días de operación)',
      yLabel: 'N-NH4+ (mg/L)',
      xMin: 0, xMax: 200, xTicks: [0, 25, 50, 75, 100, 125, 150, 175, 200],
      yMin: 0, yMax: 6000, yTicks: [0, 1200, 2400, 3600, 4800, 6000],
      unidad: ' mg/L',
      series: [
        { nombre: '3.4 m³ aire/(m²·h) (59.8 %)', cls: 'serie-1', pts: [[3.3,348],[8.9,653],[17,401],[33.2,4140],[41.1,4986],[60.4,5483],[65.9,5404],[81.2,2318],[89.3,2005],[96.6,2074],[119.9,1926],[133.7,1848],[147.9,1577],[155.3,1569],[163.1,1665],[167.6,1787],[173.1,1760]] },
        { nombre: '9.4 m³ aire/(m²·h) (99.7 %)', cls: 'serie-2', pts: [[3.4,261],[9.3,287],[23.1,339],[32.9,426],[60.6,505],[68.8,295],[89.6,149],[96.7,261],[105.2,193],[119.5,153],[126.5,149],[141.4,131],[155.9,157],[164.7,159],[173,150]] }
      ]
    },
    'l31-a-2': {
      tipo: 'barras',
      titulo: 'Rubro de gastos de inversión para la construcción de un biodigestor',
      items: [
        { nombre: 'Obra civil', valor: 43 },
        { nombre: 'Generador de electricidad', valor: 23 },
        { nombre: 'Sistema de calefacción', valor: 17 },
        { nombre: 'Técnica de tratamiento de sustratos', valor: 13 },
        { nombre: 'Gastos de planificación', valor: 4 }
      ]
    }
  };

  function armarXY(caja, cfg) {
    caja.textContent = '';
    caja.classList.add('grafica--lineas');
    var visibles = cfg.series.map(function () { return true; });
    var leyenda = h('div', { 'class': 'grafica-leyenda', role: 'group', 'aria-label': 'Series de la gráfica' }, caja);
    var lienzo = h('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = h('div', { 'class': 'grafica-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);
    var dibujo = null;

    cfg.series.forEach(function (s, i) {
      var b = h('button', { type: 'button', 'class': 'grafica-serie ' + s.cls, 'aria-pressed': 'true' }, leyenda);
      var m = el('svg', { viewBox: '0 0 28 14', width: '28', height: '14', 'aria-hidden': 'true', 'class': 'grafica-muestra' }, b);
      el('line', { x1: 1, y1: 7, x2: 27, y2: 7, 'class': 'linea' }, m);
      h('span', null, b, s.nombre);
      b.addEventListener('click', function () {
        visibles[i] = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(visibles[i]));
        if (dibujo) dibujo.aplicar();
      });
    });

    function dibujar() {
      var W = Math.round(lienzo.clientWidth);
      if (!W) return null;
      var angosto = W < 500, H = angosto ? 280 : 340;
      lienzo.querySelectorAll('svg').forEach(function (n) { n.remove(); });
      globo.hidden = true;

      var pad = { t: 22, r: 20, b: 44, l: 58 };
      var gw = W - pad.l - pad.r, gh = H - pad.t - pad.b;
      var sx = function (x) { return pad.l + ((x - cfg.xMin) / (cfg.xMax - cfg.xMin)) * gw; };
      var sy = function (y) { return pad.t + (1 - (y - cfg.yMin) / (cfg.yMax - cfg.yMin)) * gh; };

      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, 'class': 'grafica-svg', role: 'img', 'aria-label': cfg.titulo, tabindex: '0' }, lienzo);
      var rej = el('g', { 'class': 'rejilla' }, svg);
      cfg.yTicks.forEach(function (yv) {
        var y = sy(yv);
        el('line', { x1: pad.l, y1: y, x2: pad.l + gw, y2: y }, rej);
        var txt = el('text', { x: pad.l - 7, y: y + 3.5, 'text-anchor': 'end', 'class': 'eje-tick' }, svg);
        txt.textContent = String(yv);
      });
      cfg.xTicks.forEach(function (xv, idx) {
        if (angosto && cfg.xTicks.length > 8 && idx % 2 === 1) return;
        var x = sx(xv);
        el('line', { x1: x, y1: pad.t, x2: x, y2: pad.t + gh }, rej);
        var txt = el('text', { x: x, y: pad.t + gh + 16, 'text-anchor': 'middle', 'class': 'eje-tick' }, svg);
        txt.textContent = String(xv);
      });
      el('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: pad.t + gh, 'class': 'eje' }, svg);
      el('line', { x1: pad.l, y1: pad.t + gh, x2: pad.l + gw, y2: pad.t + gh, 'class': 'eje' }, svg);

      var tx = el('text', { x: pad.l + gw / 2, y: H - 6, 'text-anchor': 'middle', 'class': 'eje-titulo' }, svg);
      tx.textContent = cfg.xLabel;
      var ty = el('text', { x: 14, y: pad.t + gh / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (pad.t + gh / 2) + ')', 'class': 'eje-titulo' }, svg);
      ty.textContent = cfg.yLabel;

      if (cfg.media != null) {
        var ym = sy(cfg.media);
        el('line', { x1: pad.l, y1: ym, x2: pad.l + gw, y2: ym, 'class': 'linea-media' }, svg);
        var tm = el('text', { x: pad.l + 8, y: ym - 5, 'class': 'txt-regimen' }, svg);
        tm.textContent = 'Caudal medio (' + cfg.media + ')';
      }
      if (cfg.regimenes) {
        cfg.regimenes.forEach(function (rg) {
          var xr = sx(rg[0]);
          el('line', { x1: xr, y1: pad.t, x2: xr, y2: pad.t + gh, 'class': 'marca-regimen' }, svg);
          var tr = el('text', { x: xr + 4, y: pad.t + 12, 'class': 'txt-regimen' }, svg);
          tr.textContent = rg[1];
        });
      }

      var capas = [];
      cfg.series.forEach(function (s) {
        var g = el('g', { 'class': s.cls }, svg);
        if (cfg.tipo === 'lineas') {
          var d = s.pts.map(function (pt, idx) {
            return (idx === 0 ? 'M' : 'L') + sx(pt[0]).toFixed(1) + ',' + sy(pt[1]).toFixed(1);
          }).join(' ');
          el('path', { d: d, 'class': 'linea', fill: 'none' }, g);
        }
        s.pts.forEach(function (pt) {
          var cx = sx(pt[0]), cy = sy(pt[1]);
          var c = el('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: cfg.tipo === 'dispersion' ? 3.2 : 3.5, 'class': 'punto-dato' }, g);
          c.addEventListener('mouseenter', function () {
            globo.textContent = s.nombre + ': (' + pt[0] + ', ' + pt[1] + cfg.unidad + ')';
            globo.hidden = false;
            globo.style.left = Math.min(Math.max(cx, 60), W - 80) + 'px';
            globo.style.top = Math.max(cy - 12, 16) + 'px';
          });
          c.addEventListener('mouseleave', function () { globo.hidden = true; });
        });
        capas.push(g);
      });

      function aplicar() {
        capas.forEach(function (g, i) { g.style.display = visibles[i] ? '' : 'none'; });
      }
      aplicar();
      return { aplicar: aplicar };
    }

    dibujo = dibujar();
    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { dibujo = dibujar(); }, 120);
    });
  }

  function armarBarras(caja, cfg) {
    caja.textContent = '';
    var lienzo = h('div', { 'class': 'grafica-lienzo' }, caja);
    var globo = h('div', { 'class': 'grafica-globo', role: 'status', 'aria-live': 'polite', hidden: '' }, lienzo);
    function dibujar() {
      var W = Math.round(lienzo.clientWidth);
      if (!W) return;
      var pad = { t: 18, r: 44, b: 28, l: W < 480 ? 150 : 230 };
      var rowH = 34, H = pad.t + pad.b + cfg.items.length * rowH;
      var gw = Math.max(80, W - pad.l - pad.r);
      lienzo.querySelectorAll('svg').forEach(function (n) { n.remove(); });
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, 'class': 'grafica-svg', role: 'img', 'aria-label': cfg.titulo }, lienzo);
      cfg.items.forEach(function (it, i) {
        var y = pad.t + i * rowH;
        var bw = (it.valor / 50) * gw;
        var lbl = el('text', { x: pad.l - 8, y: y + 18, 'text-anchor': 'end', 'class': 'eje-tick' }, svg);
        lbl.textContent = it.nombre;
        var rect = el('rect', { x: pad.l, y: y + 5, width: bw.toFixed(1), height: 20, rx: 4, 'class': 'serie-1 punto-dato' }, svg);
        var val = el('text', { x: pad.l + bw + 6, y: y + 19, 'class': 'eje-tick' }, svg);
        val.textContent = it.valor + ' %';
        rect.addEventListener('mouseenter', function () {
          globo.textContent = it.nombre + ': ' + it.valor + ' %';
          globo.hidden = false;
          globo.style.left = Math.min(pad.l + bw / 2, W - 80) + 'px';
          globo.style.top = Math.max(y, 12) + 'px';
        });
        rect.addEventListener('mouseleave', function () { globo.hidden = true; });
      });
    }
    dibujar();
    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(dibujar, 120);
    });
  }

  function iniciar() {
    document.querySelectorAll('.grafica-libro[data-grafica]').forEach(function (caja) {
      var id = caja.getAttribute('data-grafica');
      var cfg = DATOS[id];
      if (!cfg) return;
      if (cfg.tipo === 'barras') armarBarras(caja, cfg);
      else armarXY(caja, cfg);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
