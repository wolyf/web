/*
 * Gráficas interactivas del Libro 25 (MAPAS, Conagua):
 * - l25-5-2: Ilustración 5.2 Gráfico de distribución de tamaño de partículas
 * - l25-8-1: Ilustración 8.1 Relación de kt y S/So
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro25.css.
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

  function wehnerWilhelm(kt, d) {
    if (kt <= 0) return 100;
    if (d === 0) return 100 * Math.exp(-kt);
    if (!isFinite(d)) return 100 / (1 + kt);
    var a = Math.sqrt(1 + 4 * kt * d);
    var e1 = Math.exp(1 / (2 * d));
    var ea = Math.exp(a / (2 * d));
    var ena = Math.exp(-a / (2 * d));
    var den = (1 + a) * (1 + a) * ea - (1 - a) * (1 - a) * ena;
    return Math.max(0.1, Math.min(100, (100 * 4 * a * e1) / den));
  }

  function render52(host) {
    var W = 640, H = 370;
    var M = { l: 64, r: 24, t: 54, b: 56 };
    var pw = W - M.l - M.r, ph = H - M.t - M.b;

    // Eje X logarítmico invertido: 100 mm -> 0.01 mm
    function sx(d) {
      var u = (2 - Math.log10(d)) / 4; // log10(100)=2, log10(0.01)=-2
      return M.l + u * pw;
    }
    function sy(pct) {
      return M.t + ph - (pct / 100) * ph;
    }

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'grafica-svg',
      role: 'img',
      tabindex: '0',
      'aria-label': 'Ilustración 5.2 Gráfico de distribución de tamaño de partículas'
    }, host);

    // Cuadrícula Y
    for (var y = 0; y <= 100; y += 10) {
      var py = sy(y);
      el('line', { x1: M.l, y1: py, x2: W - M.r, y2: py, stroke: 'var(--border)', 'stroke-width': y === 0 || y === 100 ? 1.2 : 0.6 }, svg);
      var ty = el('text', { x: M.l - 8, y: py + 4, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 11 }, svg);
      ty.textContent = String(y);
    }

    // Eje X logarítmico (100, 10, 1.0, 0.1, 0.01)
    var xMarcas = [100, 10, 1.0, 0.1, 0.01];
    xMarcas.forEach(function (v) {
      var px = sx(v);
      el('line', { x1: px, y1: M.t, x2: px, y2: H - M.b, stroke: 'var(--border)', 'stroke-width': 0.8 }, svg);
      var tx = el('text', { x: px, y: H - M.b + 16, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 }, svg);
      tx.textContent = v >= 10 ? String(v) : v.toFixed(v === 1 ? 1 : v === 0.1 ? 1 : 2);
    });

    // Eje superior: tamices estándar
    var tamices = [
      { d: 75, lbl: '3' }, { d: 50, lbl: '2' }, { d: 25, lbl: '1' }, { d: 19, lbl: '3/4' },
      { d: 9.5, lbl: '3/8' }, { d: 4.75, lbl: '4' }, { d: 2.36, lbl: '8' }, { d: 2.0, lbl: '10' },
      { d: 0.85, lbl: '20' }, { d: 0.425, lbl: '40' }, { d: 0.25, lbl: '60' }, { d: 0.15, lbl: '100' },
      { d: 0.075, lbl: '200' }
    ];
    tamices.forEach(function (t) {
      var px = sx(t.d);
      el('line', { x1: px, y1: M.t - 5, x2: px, y2: M.t, stroke: 'var(--text-strong)', 'stroke-width': 1 }, svg);
      var tt = el('text', { x: px, y: M.t - 9, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 9.5 }, svg);
      tt.textContent = t.lbl;
    });

    var titSup = el('text', { x: M.l + pw / 2, y: 18, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 11.5, 'font-weight': 600 }, svg);
    titSup.textContent = 'Tamaño estándar de tamiz (Número de malla)';

    var titX = el('text', { x: M.l + pw / 2, y: H - 12, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12 }, svg);
    titX.textContent = 'Diámetro de la partícula en mm';

    var titY = el('text', { x: 18, y: M.t + ph / 2, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12, transform: 'rotate(-90 18 ' + (M.t + ph / 2) + ')' }, svg);
    titY.textContent = 'Porcentaje de finura por ancho';

    // Curva de ejemplo de la media (desde el PDF: x=294.4..324.6 -> d aprox 1.28 a 0.56 mm)
    var pts = [
      { d: 1.28, pct: 95 },
      { d: 0.81, pct: 70 },
      { d: 0.56, pct: 3 }
    ];
    var dStr = pts.map(function (p, i) { return (i ? 'L' : 'M') + sx(p.d).toFixed(1) + ',' + sy(p.pct).toFixed(1); }).join(' ');
    el('path', { d: dStr, fill: 'none', stroke: 'var(--grafica-serie-1)', 'stroke-width': 2.5 }, svg);

    var lblCurva = el('text', { x: sx(0.75) + 8, y: sy(52), fill: 'var(--grafica-serie-1)', 'font-size': 11, 'font-weight': 600 }, svg);
    lblCurva.textContent = 'Ejemplo de la media';

    // Puntos interactivos y globo
    var globo = document.createElement('div');
    globo.className = 'grafica-globo';
    globo.hidden = true;
    host.appendChild(globo);

    pts.forEach(function (p) {
      var c = el('circle', { cx: sx(p.d), cy: sy(p.pct), r: 5, fill: 'var(--grafica-serie-1)', stroke: 'var(--surface)', 'stroke-width': 1.5, tabindex: '0' }, svg);
      var mostrar = function () {
        globo.hidden = false;
        globo.textContent = 'd = ' + p.d.toFixed(2) + ' mm | Finura = ' + p.pct + ' %';
      };
      c.addEventListener('mouseenter', mostrar);
      c.addEventListener('focus', mostrar);
      c.addEventListener('mouseleave', function () { globo.hidden = true; });
      c.addEventListener('blur', function () { globo.hidden = true; });
    });

    var navDatos = document.createElement('nav');
    navDatos.setAttribute('aria-label', 'Datos de la gráfica');
    var det = document.createElement('details');
    det.innerHTML = '<summary>Datos de la gráfica</summary><table><thead><tr><th>Diámetro (mm)</th><th>Porcentaje de finura (%)</th></tr></thead><tbody>' +
      pts.map(function (p) { return '<tr><td class="n">' + p.d.toFixed(2) + '</td><td class="n">' + p.pct + '</td></tr>'; }).join('') +
      '</tbody></table>';
    navDatos.appendChild(det);
    host.appendChild(navDatos);
  }

  function render81(host) {
    var W = 640, H = 390;
    var M = { l: 58, r: 24, t: 24, b: 52 };
    var pw = W - M.l - M.r, ph = H - M.t - M.b;

    var dList = [
      { d: 0, lbl: 'd = 0 (Flujo pistón)', cls: 1 },
      { d: 0.0625, lbl: 'd = 0.0625', cls: 2 },
      { d: 0.1, lbl: 'd = 0.1', cls: 3 },
      { d: 0.25, lbl: 'd = 0.25', cls: 4 },
      { d: 0.5, lbl: 'd = 0.5', cls: 5 },
      { d: 1, lbl: 'd = 1', cls: 6 },
      { d: 2, lbl: 'd = 2', cls: 7 },
      { d: 4, lbl: 'd = 4', cls: 8 },
      { d: Infinity, lbl: 'd = ∞ (Mezcla completa)', cls: 9 }
    ];
    var kts = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];

    // Eje X logarítmico S/So de 100 % a 1 % (igual que el nomograma del PDF)
    function sx(s) {
      var u = (2 - Math.log10(Math.max(1, s))) / 2;
      return M.l + u * pw;
    }
    function sy(kt) {
      return M.t + (kt / 6) * ph;
    }

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'grafica-svg',
      role: 'img',
      tabindex: '0',
      'aria-label': 'Ilustración 8.1 Relación de kt y S/So'
    }, host);

    [100, 50, 20, 10, 5, 2, 1].forEach(function (v) {
      var px = sx(v);
      el('line', { x1: px, y1: M.t, x2: px, y2: H - M.b, stroke: 'var(--border)', 'stroke-width': 0.7 }, svg);
      var tx = el('text', { x: px, y: H - M.b + 16, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 }, svg);
      tx.textContent = v + '%';
    });

    [0, 1, 2, 3, 4, 5, 6].forEach(function (k) {
      var py = sy(k);
      el('line', { x1: M.l, y1: py, x2: W - M.r, y2: py, stroke: 'var(--border)', 'stroke-width': 0.7 }, svg);
      var ty = el('text', { x: M.l - 8, y: py + 4, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 11 }, svg);
      ty.textContent = String(k);
    });

    var titX = el('text', { x: M.l + pw / 2, y: H - 10, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12 }, svg);
    titX.textContent = 'Remanente, S/So (%)';
    var titY = el('text', { x: 18, y: M.t + ph / 2, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12, transform: 'rotate(-90 18 ' + (M.t + ph / 2) + ')' }, svg);
    titY.textContent = 'Valor de kt';

    var paths = {};
    dList.forEach(function (item) {
      var pts = [];
      for (var kt = 0; kt <= 6; kt += 0.25) {
        var s = wehnerWilhelm(kt, item.d);
        if (s >= 1) pts.push((pts.length ? 'L' : 'M') + sx(s).toFixed(1) + ',' + sy(kt).toFixed(1));
      }
      paths[item.cls] = el('path', {
        d: pts.join(' '),
        fill: 'none',
        stroke: 'var(--grafica-serie-' + item.cls + ')',
        'stroke-width': 2
      }, svg);
    });

    var ley = document.createElement('div');
    ley.className = 'grafica-leyenda';
    dList.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'true');
      btn.innerHTML = '<span class="muestra" style="background: var(--grafica-serie-' + item.cls + ')"></span>' + item.lbl;
      btn.addEventListener('click', function () {
        var vis = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!vis));
        paths[item.cls].style.display = vis ? 'none' : '';
      });
      ley.appendChild(btn);
    });
    host.appendChild(ley);

    var navDatos = document.createElement('nav');
    navDatos.setAttribute('aria-label', 'Datos de la gráfica');
    var det = document.createElement('details');
    var hdr = '<tr><th>kt</th>' + dList.map(function (i) { return '<th>' + i.lbl.split(' ')[0] + (i.lbl.includes('∞') ? '=∞' : '=' + i.d) + '</th>'; }).join('') + '</tr>';
    var rows = [0, 1, 2, 3, 4, 5, 6].map(function (kt) {
      return '<tr><td class="n">' + kt + '</td>' + dList.map(function (i) {
        return '<td class="n">' + wehnerWilhelm(kt, i.d).toFixed(1) + '%</td>';
      }).join('') + '</tr>';
    }).join('');
    det.innerHTML = '<summary>Datos de la gráfica (S/So en %)</summary><table><thead>' + hdr + '</thead><tbody>' + rows + '</tbody></table>';
    navDatos.appendChild(det);
    host.appendChild(navDatos);
  }

  document.querySelectorAll('.grafica-libro[data-grafica]').forEach(function (host) {
    var id = host.getAttribute('data-grafica');
    if (id === 'l25-5-2') render52(host);
    else if (id === 'l25-8-1') render81(host);
  });
})();
