/* Grafica interactiva del Libro 5: Ilustracion 1.33 (Perfil de nivelacion) */
(function () {
  var DATOS_1_33 = [
    { cad: '0+000.00', x: 0, elev: 45.400 },
    { cad: '0+020.00', x: 20, elev: 45.501 },
    { cad: '0+040.00', x: 40, elev: 45.181 },
    { cad: '0+060.00', x: 60, elev: 45.750 },
    { cad: '0+080.00', x: 80, elev: 45.000 },
    { cad: '0+100.00', x: 100, elev: 44.996 },
    { cad: '0+120.00', x: 120, elev: 44.804 },
    { cad: '0+140.00', x: 140, elev: 44.708 },
    { cad: '0+160.00', x: 160, elev: 45.207 }
  ];

  function elSvg(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function dibujarPerfil(cont) {
    var W = 680, H = 260;
    var m = { top: 20, right: 24, bottom: 72, left: 48 };
    var pw = W - m.left - m.right;
    var ph = H - m.top - m.bottom;
    var yMin = 30, yMax = 60;

    var wrap = document.createElement('div');
    wrap.className = 'grafica05-wrap';

    var tip = document.createElement('div');
    tip.className = 'grafica05-tip';
    wrap.appendChild(tip);

    var svg = elSvg('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'grafica-svg',
      role: 'img',
      'aria-label': 'Perfil de nivelacion con cadenamientos a cada 20 metros, de 0+000.00 a 0+160.00'
    });

    function sx(i) { return m.left + (i / (DATOS_1_33.length - 1)) * pw; }
    function sy(v) { return m.top + ((yMax - v) / (yMax - yMin)) * ph; }

    for (var y = yMin; y <= yMax; y += 5) {
      var py = sy(y);
      svg.appendChild(elSvg('line', {
        x1: m.left, y1: py, x2: W - m.right, y2: py,
        class: y === yMin ? 'grafica05-eje' : 'grafica05-reticula'
      }));
      var lbl = elSvg('text', {
        x: m.left - 8, y: py + 4,
        'text-anchor': 'end',
        class: 'grafica05-etiq'
      });
      lbl.textContent = String(y);
      svg.appendChild(lbl);
    }

    svg.appendChild(elSvg('line', {
      x1: m.left, y1: m.top, x2: m.left, y2: H - m.bottom,
      class: 'grafica05-eje'
    }));

    var pts = [];
    for (var i = 0; i < DATOS_1_33.length; i++) {
      var d = DATOS_1_33[i];
      var px = sx(i);
      var py = sy(d.elev);
      pts.push(px.toFixed(1) + ',' + py.toFixed(1));

      svg.appendChild(elSvg('line', {
        x1: px, y1: m.top, x2: px, y2: H - m.bottom,
        class: 'grafica05-reticula'
      }));

      var tx = elSvg('text', {
        x: px, y: H - m.bottom + 14,
        'text-anchor': 'end',
        transform: 'rotate(-55 ' + px + ' ' + (H - m.bottom + 14) + ')',
        class: 'grafica05-etiq'
      });
      tx.textContent = d.cad;
      svg.appendChild(tx);
    }

    svg.appendChild(elSvg('polyline', {
      points: pts.join(' '),
      class: 'grafica05-linea'
    }));

    function mostrarTip(d, px, py) {
      tip.textContent = d.cad + ' · Elev = ' + d.elev.toFixed(3) + ' m';
      var rect = svg.getBoundingClientRect();
      var left = (px / W) * rect.width;
      var top = (py / H) * rect.height - 34;
      tip.style.left = Math.max(4, Math.min(rect.width - 170, left - 70)) + 'px';
      tip.style.top = Math.max(4, top) + 'px';
      tip.classList.add('visible');
    }

    function ocultarTip() {
      tip.classList.remove('visible');
    }

    for (var j = 0; j < DATOS_1_33.length; j++) {
      (function (d, px, py) {
        var c = elSvg('circle', {
          cx: px, cy: py, r: 4.5,
          tabindex: '0',
          class: 'grafica05-punto',
          'aria-label': 'Cadenamiento ' + d.cad + ', elevacion ' + d.elev.toFixed(3) + ' metros'
        });
        c.addEventListener('mouseenter', function () { mostrarTip(d, px, py); });
        c.addEventListener('focus', function () { mostrarTip(d, px, py); });
        c.addEventListener('mouseleave', ocultarTip);
        c.addEventListener('blur', ocultarTip);
        svg.appendChild(c);
      })(DATOS_1_33[j], sx(j), sy(DATOS_1_33[j].elev));
    }

    wrap.appendChild(svg);
    cont.appendChild(wrap);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var els = document.querySelectorAll('.grafica-libro[data-grafica="1-33"]');
    for (var i = 0; i < els.length; i++) dibujarPerfil(els[i]);
  });
})();
