/*
 * Gráficas interactivas del Libro 28 (MAPAS, Conagua):
 * - l28-2-3: Ilustración 2.3 Requerimientos de nutrientes
 * - l28-2-4: Ilustración 2.4 Alcalinidad de bicarbonato, % CO2 y pH
 * - l28-2-5: Ilustración 2.5 Porcentaje de H2S y HS- según pH
 * - l28-2-6: Ilustración 2.6 Volumen del reactor (TRH = 4 h, rv = 15)
 * - l28-2-7: Ilustración 2.7 Volumen del reactor (Hr = 6 m, rv = 5, 10, 15, 20)
 * - l28-2-8: Ilustración 2.8 TRS requerido según temperatura
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro28.css.
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

  function makeGlobo(host) {
    var g = document.createElement('div');
    g.className = 'grafica-globo';
    g.hidden = true;
    host.appendChild(g);
    return g;
  }

  function bindPoint(node, globo, texto) {
    var show = function () {
      globo.hidden = false;
      globo.textContent = texto;
    };
    node.addEventListener('mouseenter', show);
    node.addEventListener('focus', show);
    node.addEventListener('mouseleave', function () { globo.hidden = true; });
    node.addEventListener('blur', function () { globo.hidden = true; });
  }

  // Ilustración 2.3: Requerimientos de nutrientes (DQO/N vs kg DQO / kg SSV d)
  function render23(host) {
    var W = 640, H = 370;
    var M = { l: 74, r: 24, t: 24, b: 54 };
    var pw = W - M.l - M.r, ph = H - M.t - M.b;
    var sx = function (x) { return M.l + (x / 1.4) * pw; };
    var sy = function (y) { return M.t + ph - (y / 2700) * ph; };

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'grafica-svg', role: 'img', tabindex: '0',
      'aria-label': 'Ilustración 2.3 Requerimientos de nutrientes para el tratamiento anaerobio a varias tasas de carga orgánica' }, host);

    [500, 1000, 1500, 2000, 2500].forEach(function (v) {
      var py = sy(v);
      el('line', { x1: M.l, y1: py, x2: W - M.r, y2: py, stroke: 'var(--border)', 'stroke-dasharray': '4 4' }, svg);
      var ty = el('text', { x: M.l - 8, y: py + 4, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 11 }, svg);
      ty.textContent = v.toLocaleString('es-MX').replace(/,/g, ' ') + ':7';
    });
    [0, 0.5, 1.0].forEach(function (v) {
      var px = sx(v);
      if (v > 0) el('line', { x1: px, y1: M.t, x2: px, y2: H - M.b, stroke: 'var(--border)', 'stroke-dasharray': '4 4' }, svg);
      var tx = el('text', { x: px, y: H - M.b + 16, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 }, svg);
      tx.textContent = v === 0 ? '0' : v.toFixed(1);
    });
    el('rect', { x: M.l, y: M.t, width: pw, height: ph, fill: 'none', stroke: 'var(--border-strong)', 'stroke-width': 1.2 }, svg);

    // Mínimo teórico (~370:7)
    el('line', { x1: M.l, y1: sy(370), x2: W - M.r, y2: sy(370), stroke: 'var(--text-strong)', 'stroke-width': 2, 'stroke-dasharray': '6 5' }, svg);
    var lm = el('text', { x: sx(0.22), y: sy(370) + 14, fill: 'var(--text-strong)', 'font-size': 11 }, svg);
    lm.textContent = 'Mínimo teórico';

    var pts = [
      [0.25, 2500], [0.35, 1955], [0.45, 1410], [0.56, 804],
      [0.65, 580], [0.75, 480], [0.85, 430], [0.99, 407], [1.24, 378]
    ];
    var dStr = pts.map(function (p, i) { return (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1); }).join(' ');
    el('path', { d: dStr, fill: 'none', stroke: 'var(--grafica-serie-1)', 'stroke-width': 2.6 }, svg);

    var tx = el('text', { x: M.l + pw / 2, y: H - 12, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12 }, svg);
    tx.textContent = 'Carga orgánica (kg DQO / kg SSV d)';
    var ty = el('text', { x: 18, y: M.t + ph / 2, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12, transform: 'rotate(-90 18 ' + (M.t + ph / 2) + ')' }, svg);
    ty.textContent = 'Relación en la alimentación (DQO/N)';

    var globo = makeGlobo(host);
    pts.forEach(function (p) {
      var c = el('circle', { cx: sx(p[0]), cy: sy(p[1]), r: 4.5, fill: 'var(--grafica-serie-1)', stroke: 'var(--surface)', 'stroke-width': 1.5, tabindex: '0' }, svg);
      bindPoint(c, globo, p[0].toFixed(2) + ' kg DQO/(kg SSV·d) -> DQO/N = ' + Math.round(p[1]) + ':7');
    });
  }

  // Ilustración 2.4: Alcalinidad de bicarbonato vs % CO2 y pH
  function render24(host) {
    var W = 640, H = 380;
    var M = { l: 64, r: 24, t: 24, b: 54 };
    var pw = W - M.l - M.r, ph = H - M.t - M.b;
    // X logarítmico: 250 a 25 000 mg/L
    var lMin = Math.log10(250), lMax = Math.log10(25000);
    var sx = function (alc) { return M.l + ((Math.log10(alc) - lMin) / (lMax - lMin)) * pw; };
    var sy = function (co2) { return M.t + ph - (co2 / 50) * ph; };

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'grafica-svg', role: 'img', tabindex: '0',
      'aria-label': 'Ilustración 2.4 Relación de la alcalinidad de bicarbonato, el porcentaje de CO2 y el pH del reactor' }, host);

    [0, 10, 20, 30, 40, 50].forEach(function (v) {
      var py = sy(v);
      el('line', { x1: M.l, y1: py, x2: W - M.r, y2: py, stroke: 'var(--border)', 'stroke-dasharray': v === 0 || v === 50 ? null : '4 4' }, svg);
      var ty = el('text', { x: M.l - 8, y: py + 4, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 11 }, svg);
      ty.textContent = String(v);
    });
    [250, 500, 1000, 2500, 5000, 10000, 25000].forEach(function (v) {
      var px = sx(v);
      el('line', { x1: px, y1: M.t, x2: px, y2: H - M.b, stroke: 'var(--border)', 'stroke-dasharray': '4 4' }, svg);
      var tx = el('text', { x: px, y: H - M.b + 16, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 10.5 }, svg);
      tx.textContent = v >= 1000 ? (v / 1000) + ' 000' : String(v);
    });

    // Zona normal de operación: Alc 1000..5000, CO2 25..45 %
    el('rect', {
      x: sx(1000), y: sy(45), width: sx(5000) - sx(1000), height: sy(25) - sy(45),
      fill: 'var(--accent-soft)', stroke: 'var(--accent)', 'stroke-dasharray': '4 3', 'stroke-width': 1.2
    }, svg);
    var lz = el('text', { x: (sx(1000) + sx(5000)) / 2, y: sy(37), 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 10.5, 'font-weight': 600 }, svg);
    lz.textContent = 'Límites normales';

    // Equilibrio carbonatos a 35 °C, 1 atm: Alc = K * (P_CO2) * 10^(pH)
    // Calibrado con el gráfico: a CO2 = 30%, pH 6.6 -> Alc ~ 550 mg/L; pH 7.0 -> ~1380; pH 7.4 -> ~3470
    var K = 550 / (30 * Math.pow(10, 6.6 - 6.0)); // ~4.607
    var phs = [6.0, 6.2, 6.4, 6.6, 6.8, 7.0, 7.2, 7.4, 7.6, 7.8, 8.0, 8.2, 8.4, 8.6, 8.8];
    var globo = makeGlobo(host);
    phs.forEach(function (phVal, idx) {
      var pts = [];
      for (var co2 = 2; co2 <= 50; co2 += 2) {
        var alc = K * co2 * Math.pow(10, phVal - 6.0);
        if (alc >= 250 && alc <= 25000) pts.push([alc, co2]);
      }
      if (pts.length < 2) return;
      var dStr = pts.map(function (p, i) { return (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1); }).join(' ');
      el('path', { d: dStr, fill: 'none', stroke: 'var(--grafica-serie-1)', 'stroke-width': 1.8 }, svg);
      var mid = pts[Math.floor(pts.length * 0.55)];
      var lbl = el('text', { x: sx(mid[0]) - 6, y: sy(mid[1]) - 4, fill: 'var(--text-strong)', 'font-size': 9.5 }, svg);
      lbl.textContent = phVal.toFixed(1);
      var hit = el('circle', { cx: sx(mid[0]), cy: sy(mid[1]), r: 4, fill: 'var(--grafica-serie-1)', stroke: 'var(--surface)', 'stroke-width': 1.2, tabindex: '0' }, svg);
      bindPoint(hit, globo, 'pH ' + phVal.toFixed(1) + ': ' + Math.round(mid[0]) + ' mg/L CaCO3 a ' + mid[1] + ' % CO2');
    });

    el('rect', { x: M.l, y: M.t, width: pw, height: ph, fill: 'none', stroke: 'var(--border-strong)', 'stroke-width': 1.2 }, svg);
    var tx = el('text', { x: M.l + pw / 2, y: H - 12, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12 }, svg);
    tx.textContent = 'Alcalinidad de bicarbonato (mg/L como CaCO3)';
    var ty = el('text', { x: 18, y: M.t + ph / 2, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12, transform: 'rotate(-90 18 ' + (M.t + ph / 2) + ')' }, svg);
    ty.textContent = 'CO2 en el gas del digestor (%)';
  }

  // Ilustración 2.5: Porcentaje de H2S y HS- vs pH (30 °C y 40 °C)
  function render25(host) {
    var W = 640, H = 370;
    var M = { l: 58, r: 58, t: 24, b: 52 };
    var pw = W - M.l - M.r, ph = H - M.t - M.b;
    var sx = function (pH) { return M.l + ((pH - 4) / 6) * pw; };
    var sy = function (pct) { return M.t + ph - (pct / 100) * ph; };

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'grafica-svg', role: 'img', tabindex: '0',
      'aria-label': 'Ilustración 2.5 Porcentaje de sulfuro de hidrógeno presente como H2S y HS- en función del pH' }, host);

    [0, 20, 40, 60, 80, 100].forEach(function (v) {
      var py = sy(v);
      el('line', { x1: M.l, y1: py, x2: W - M.r, y2: py, stroke: 'var(--border)', 'stroke-dasharray': v === 0 || v === 100 ? null : '4 4' }, svg);
      var t1 = el('text', { x: M.l - 8, y: py + 4, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 11 }, svg);
      t1.textContent = String(v);
      var t2 = el('text', { x: W - M.r + 8, y: py + 4, 'text-anchor': 'start', fill: 'var(--muted)', 'font-size': 11 }, svg);
      t2.textContent = String(100 - v);
    });
    [4, 5, 6, 7, 8, 9, 10].forEach(function (v) {
      var px = sx(v);
      el('line', { x1: px, y1: M.t, x2: px, y2: H - M.b, stroke: 'var(--border)', 'stroke-dasharray': '4 4' }, svg);
      var tx = el('text', { x: px, y: H - M.b + 16, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 }, svg);
      tx.textContent = String(v);
    });
    el('rect', { x: M.l, y: M.t, width: pw, height: ph, fill: 'none', stroke: 'var(--border-strong)', 'stroke-width': 1.2 }, svg);

    var s30 = [[4,99.9],[5,98.9],[5.5,97.2],[6,92.7],[6.5,81.5],[7,60.3],[7.18,50.0],[7.5,33.8],[8,15.2],[8.5,5.4],[9,1.7],[9.5,0.6],[10,0.4]];
    var s40 = [[4,100],[5,99.8],[5.5,98.6],[6,95.6],[6.5,87.0],[7,68.5],[7.36,50.0],[7.5,42.3],[8,20.3],[8.5,8.0],[9,2.5],[9.5,0.7],[10,0.4]];
    var series = [
      { id: '30C', label: '30 °C', color: 'var(--grafica-serie-1)', pts: s30 },
      { id: '40C', label: '40 °C', color: 'var(--grafica-serie-2)', pts: s40 }
    ];

    var globo = makeGlobo(host);
    var leyenda = document.createElement('div');
    leyenda.className = 'grafica-leyenda';
    host.appendChild(leyenda);

    series.forEach(function (sr) {
      var g = el('g', {}, svg);
      var dStr = sr.pts.map(function (p, i) { return (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1); }).join(' ');
      el('path', { d: dStr, fill: 'none', stroke: sr.color, 'stroke-width': 2.5 }, g);
      sr.pts.forEach(function (p) {
        var c = el('circle', { cx: sx(p[0]), cy: sy(p[1]), r: 4, fill: sr.color, stroke: 'var(--surface)', 'stroke-width': 1.2, tabindex: '0' }, g);
        bindPoint(c, globo, sr.label + ', pH ' + p[0].toFixed(2) + ': H2S = ' + p[1].toFixed(1) + ' %, HS- = ' + (100 - p[1]).toFixed(1) + ' %');
      });
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'true');
      btn.innerHTML = '<span class="muestra" style="background:' + sr.color + '"></span>' + sr.label;
      btn.addEventListener('click', function () {
        var on = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', on ? 'false' : 'true');
        g.style.display = on ? 'none' : '';
      });
      leyenda.appendChild(btn);
    });

    var tx = el('text', { x: M.l + pw / 2, y: H - 12, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12 }, svg);
    tx.textContent = 'pH';
    var ty1 = el('text', { x: 16, y: M.t + ph / 2, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 11.5, transform: 'rotate(-90 16 ' + (M.t + ph / 2) + ')' }, svg);
    ty1.textContent = 'Porcentaje H2S (%)';
    var ty2 = el('text', { x: W - 14, y: M.t + ph / 2, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 11.5, transform: 'rotate(-90 ' + (W - 14) + ' ' + (M.t + ph / 2) + ')' }, svg);
    ty2.textContent = 'Porcentaje HS- (%)';
  }

  // Ilustración 2.6: Volumen del reactor (TRH = 4 h, Q = 250 m3/h, rv = 15 kg DQO/m3 d)
  function render26(host) {
    var W = 640, H = 370;
    var M = { l: 68, r: 24, t: 24, b: 52 };
    var pw = W - M.l - M.r, ph = H - M.t - M.b;
    var sx = function (c) { return M.l + (c / 5) * pw; };
    var sy = function (v) { return M.t + ph - (v / 2000) * ph; };

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'grafica-svg', role: 'img', tabindex: '0',
      'aria-label': 'Ilustración 2.6 Cálculo del volumen requerido del reactor (UASB) por carga hidráulica u orgánica' }, host);

    [0, 500, 1000, 1500, 2000].forEach(function (v) {
      var py = sy(v);
      el('line', { x1: M.l, y1: py, x2: W - M.r, y2: py, stroke: 'var(--border)', 'stroke-dasharray': v === 0 || v === 2000 ? null : '4 4' }, svg);
      var ty = el('text', { x: M.l - 8, y: py + 4, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 11 }, svg);
      ty.textContent = v >= 1000 ? (v === 2000 ? '2 000' : v === 1500 ? '1 500' : '1 000') : String(v);
    });
    [0, 1, 2, 3, 4, 5].forEach(function (c) {
      var px = sx(c);
      if (c > 0) el('line', { x1: px, y1: M.t, x2: px, y2: H - M.b, stroke: 'var(--border)', 'stroke-dasharray': '4 4' }, svg);
      var tx = el('text', { x: px, y: H - M.b + 16, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 }, svg);
      tx.textContent = String(c);
    });
    el('rect', { x: M.l, y: M.t, width: pw, height: ph, fill: 'none', stroke: 'var(--border-strong)', 'stroke-width': 1.2 }, svg);

    // Línea vertical de transición C = 2.5 kg DQO/m3
    el('line', { x1: sx(2.5), y1: sy(1000), x2: sx(2.5), y2: sy(0), stroke: 'var(--text-strong)', 'stroke-dasharray': '5 4', 'stroke-width': 1.5 }, svg);

    var pts = [[0, 1000], [1, 1000], [2, 1000], [2.5, 1000], [3, 1200], [4, 1600], [5, 2000]];
    var dStr = pts.map(function (p, i) { return (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1); }).join(' ');
    el('path', { d: dStr, fill: 'none', stroke: 'var(--grafica-serie-1)', 'stroke-width': 2.6 }, svg);

    var l1 = el('text', { x: sx(1.25), y: sy(350), 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12, 'font-style': 'italic' }, svg);
    l1.textContent = 'Vr = φ Q';
    var l2 = el('text', { x: sx(3.75), y: sy(350), 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12, 'font-style': 'italic' }, svg);
    l2.textContent = 'Vr = C Q / rv';

    var globo = makeGlobo(host);
    pts.forEach(function (p) {
      var c = el('circle', { cx: sx(p[0]), cy: sy(p[1]), r: 4.5, fill: 'var(--grafica-serie-1)', stroke: 'var(--surface)', 'stroke-width': 1.5, tabindex: '0' }, svg);
      bindPoint(c, globo, 'C = ' + p[0] + ' kg DQO/m³ -> Vr = ' + p[1] + ' m³');
    });

    var tx = el('text', { x: M.l + pw / 2, y: H - 12, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12 }, svg);
    tx.textContent = 'Concentración (kg DQO/m³)';
    var ty = el('text', { x: 18, y: M.t + ph / 2, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12, transform: 'rotate(-90 18 ' + (M.t + ph / 2) + ')' }, svg);
    ty.textContent = 'Volumen del reactor (m³)';
  }

  // Ilustración 2.7: Volumen del reactor para rv = 5, 10, 15, 20 kg DQO/(m3 d)
  function render27(host) {
    var W = 640, H = 370;
    var M = { l: 68, r: 86, t: 24, b: 52 };
    var pw = W - M.l - M.r, ph = H - M.t - M.b;
    var sx = function (c) { return M.l + (c / 5) * pw; };
    var sy = function (v) { return M.t + ph - (v / 2000) * ph; };

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'grafica-svg', role: 'img', tabindex: '0',
      'aria-label': 'Ilustración 2.7 Cálculo del volumen requerido del reactor para distintas cargas orgánicas volumétricas' }, host);

    [0, 500, 1000, 1500, 2000].forEach(function (v) {
      var py = sy(v);
      el('line', { x1: M.l, y1: py, x2: W - M.r, y2: py, stroke: 'var(--border)', 'stroke-dasharray': v === 0 || v === 2000 ? null : '4 4' }, svg);
      var ty = el('text', { x: M.l - 8, y: py + 4, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 11 }, svg);
      ty.textContent = v >= 1000 ? String(v).replace(/(\d)(\d{3})/, '$1 $2') : String(v);
    });
    [0, 1, 2, 3, 4, 5].forEach(function (c) {
      var px = sx(c);
      if (c > 0) el('line', { x1: px, y1: M.t, x2: px, y2: H - M.b, stroke: 'var(--border)', 'stroke-dasharray': '4 4' }, svg);
      var tx = el('text', { x: px, y: H - M.b + 16, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 }, svg);
      tx.textContent = String(c);
    });
    el('rect', { x: M.l, y: M.t, width: pw, height: ph, fill: 'none', stroke: 'var(--border-strong)', 'stroke-width': 1.2 }, svg);

    // Líneas horizontales Vcrit
    [[1000, 'Vcrit = 1 m/h'], [250, 'Vcrit = 6 m/h']].forEach(function (vc) {
      var py = sy(vc[0]);
      el('line', { x1: M.l, y1: py, x2: W - M.r, y2: py, stroke: 'var(--text-strong)', 'stroke-dasharray': '5 4', 'stroke-width': 1.5 }, svg);
      var tl = el('text', { x: W - M.r + 6, y: py + 4, fill: 'var(--text-strong)', 'font-size': 10.5 }, svg);
      tl.textContent = vc[1];
    });

    var rvs = [
      { rv: 5, color: 'var(--grafica-serie-1)', cMax: 2000 / 1200 },
      { rv: 10, color: 'var(--grafica-serie-2)', cMax: 2000 / 600 },
      { rv: 15, color: 'var(--grafica-serie-3)', cMax: 5 },
      { rv: 20, color: 'var(--grafica-serie-4)', cMax: 5 }
    ];
    var globo = makeGlobo(host);
    var leyenda = document.createElement('div');
    leyenda.className = 'grafica-leyenda';
    host.appendChild(leyenda);

    rvs.forEach(function (s) {
      var g = el('g', {}, svg);
      var vEnd = (6000 / s.rv) * s.cMax;
      el('line', { x1: sx(0), y1: sy(0), x2: sx(s.cMax), y2: sy(vEnd), stroke: s.color, 'stroke-width': 2.3 }, g);
      [0, 1, 2, 3, 4, 5].forEach(function (c) {
        if (c > s.cMax + 0.01) return;
        var v = (6000 / s.rv) * c;
        if (v > 2000) return;
        var pt = el('circle', { cx: sx(c), cy: sy(v), r: 3.8, fill: s.color, stroke: 'var(--surface)', 'stroke-width': 1.2, tabindex: '0' }, g);
        bindPoint(pt, globo, 'rv = ' + s.rv + ' kg DQO/(m³·d), C = ' + c + ' kg DQO/m³ -> Vr = ' + Math.round(v) + ' m³');
      });
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'true');
      btn.innerHTML = '<span class="muestra" style="background:' + s.color + '"></span>rv = ' + s.rv;
      btn.addEventListener('click', function () {
        var on = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', on ? 'false' : 'true');
        g.style.display = on ? 'none' : '';
      });
      leyenda.appendChild(btn);
    });

    var tx = el('text', { x: M.l + pw / 2, y: H - 12, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12 }, svg);
    tx.textContent = 'Concentración (kg DQO/m³)';
    var ty = el('text', { x: 18, y: M.t + ph / 2, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12, transform: 'rotate(-90 18 ' + (M.t + ph / 2) + ')' }, svg);
    ty.textContent = 'Volumen del reactor (m³)';
  }

  // Ilustración 2.8: TRS requerido vs Temperatura (°C) con barras de error
  function render28(host) {
    var W = 640, H = 370;
    var M = { l: 64, r: 24, t: 24, b: 52 };
    var pw = W - M.l - M.r, ph = H - M.t - M.b;
    var sx = function (t) { return M.l + ((t - 10) / 35) * pw; };
    var sy = function (trs) { return M.t + ph - (trs / 180) * ph; };

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'grafica-svg', role: 'img', tabindex: '0',
      'aria-label': 'Ilustración 2.8 TRS requerido para el tratamiento de aguas residuales domésticos' }, host);

    for (var y = 0; y <= 180; y += 20) {
      var py = sy(y);
      el('line', { x1: M.l, y1: py, x2: W - M.r, y2: py, stroke: 'var(--border)', 'stroke-dasharray': y === 0 || y === 180 ? null : '4 4' }, svg);
      var ty = el('text', { x: M.l - 8, y: py + 4, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 11 }, svg);
      ty.textContent = String(y);
    }
    [10, 15, 20, 25, 30, 35, 40, 45].forEach(function (t) {
      var px = sx(t);
      if (t > 10 && t < 45) el('line', { x1: px, y1: M.t, x2: px, y2: H - M.b, stroke: 'var(--border)', 'stroke-dasharray': '4 4' }, svg);
      var tx = el('text', { x: px, y: H - M.b + 16, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 }, svg);
      tx.textContent = String(t);
    });
    el('rect', { x: M.l, y: M.t, width: pw, height: ph, fill: 'none', stroke: 'var(--border-strong)', 'stroke-width': 1.2 }, svg);

    var datos = [
      { t: 15, trs: 140, min: 120, max: 160 },
      { t: 20, trs: 100, min: 83, max: 117 },
      { t: 25, trs: 60, min: 47, max: 73 },
      { t: 30, trs: 30, min: 20, max: 40 },
      { t: 35, trs: 20, min: 13, max: 29 },
      { t: 40, trs: 15, min: 10, max: 21 }
    ];
    var dStr = datos.map(function (d, i) { return (i ? 'L' : 'M') + sx(d.t).toFixed(1) + ',' + sy(d.trs).toFixed(1); }).join(' ');
    el('path', { d: dStr, fill: 'none', stroke: 'var(--grafica-serie-6)', 'stroke-width': 2.5 }, svg);

    var globo = makeGlobo(host);
    datos.forEach(function (d) {
      var cx = sx(d.t), cy = sy(d.trs);
      el('line', { x1: cx, y1: sy(d.max), x2: cx, y2: sy(d.min), stroke: 'var(--grafica-serie-1)', 'stroke-width': 1.8 }, svg);
      el('line', { x1: cx - 5, y1: sy(d.max), x2: cx + 5, y2: sy(d.max), stroke: 'var(--grafica-serie-1)', 'stroke-width': 1.8 }, svg);
      el('line', { x1: cx - 5, y1: sy(d.min), x2: cx + 5, y2: sy(d.min), stroke: 'var(--grafica-serie-1)', 'stroke-width': 1.8 }, svg);
      var rombo = el('polygon', {
        points: cx + ',' + (cy - 6) + ' ' + (cx + 6) + ',' + cy + ' ' + cx + ',' + (cy + 6) + ' ' + (cx - 6) + ',' + cy,
        fill: 'var(--surface)', stroke: 'var(--grafica-serie-1)', 'stroke-width': 2, tabindex: '0'
      }, svg);
      bindPoint(rombo, globo, 'T = ' + d.t + ' °C -> TRS = ' + d.trs + ' días (intervalo ' + d.min + ' a ' + d.max + ' d)');
    });

    var tx = el('text', { x: M.l + pw / 2, y: H - 12, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12 }, svg);
    tx.textContent = 'Temperatura (°C)';
    var ty = el('text', { x: 18, y: M.t + ph / 2, 'text-anchor': 'middle', fill: 'var(--text-strong)', 'font-size': 12, transform: 'rotate(-90 18 ' + (M.t + ph / 2) + ')' }, svg);
    ty.textContent = 'TRS para la estabilización de lodos (días)';
  }

  var RENDERERS = {
    'l28-2-3': render23,
    'l28-2-4': render24,
    'l28-2-5': render25,
    'l28-2-6': render26,
    'l28-2-7': render27,
    'l28-2-8': render28
  };

  function init() {
    document.querySelectorAll('.grafica-libro[data-grafica^="l28-"]').forEach(function (host) {
      var fn = RENDERERS[host.dataset.grafica];
      if (fn && !host.dataset.graficaLista) {
        host.dataset.graficaLista = '1';
        fn(host);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
