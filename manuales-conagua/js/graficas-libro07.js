/* Grafica interactiva del Libro 7: Ilustracion 4.41 (Factor de correccion para perdidas en curvas) */
(function () {
  var DATOS_4_41 = [
    { ang: 0, factor: 0.00 },
    { ang: 10, factor: 0.21 },
    { ang: 20, factor: 0.38 },
    { ang: 30, factor: 0.52 },
    { ang: 40, factor: 0.65 },
    { ang: 50, factor: 0.74 },
    { ang: 60, factor: 0.83 },
    { ang: 70, factor: 0.91 },
    { ang: 80, factor: 0.97 },
    { ang: 90, factor: 1.03 },
    { ang: 100, factor: 1.08 },
    { ang: 110, factor: 1.12 },
    { ang: 115, factor: 1.14 }
  ];

  function elSvg(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function dibujarCurva441(cont) {
    var W = 640, H = 340;
    var m = { top: 20, right: 24, bottom: 52, left: 62 };
    var pw = W - m.left - m.right;
    var ph = H - m.top - m.bottom;
    var xMin = 0, xMax = 120;
    var yMin = 0, yMax = 1.2;

    var wrap = document.createElement('div');
    wrap.className = 'grafica07-wrap';

    var tip = document.createElement('div');
    tip.className = 'grafica07-tip';
    wrap.appendChild(tip);

    var svg = elSvg('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'grafica-svg',
      role: 'img',
      'aria-label': 'Factor de correccion para las perdidas en curvas segun el angulo central de 0 a 120 grados'
    });

    function sx(v) { return m.left + ((v - xMin) / (xMax - xMin)) * pw; }
    function sy(v) { return m.top + ((yMax - v) / (yMax - yMin)) * ph; }

    for (var y = 0; y <= 1.201; y += 0.2) {
      var py = sy(y);
      svg.appendChild(elSvg('line', {
        x1: m.left, y1: py, x2: W - m.right, y2: py,
        class: y === 0 ? 'grafica07-eje' : 'grafica07-reticula'
      }));
      var lblY = elSvg('text', {
        x: m.left - 8, y: py + 4,
        'text-anchor': 'end',
        class: 'grafica07-etiq'
      });
      lblY.textContent = y.toFixed(1);
      svg.appendChild(lblY);
    }

    for (var x = 0; x <= 120; x += 20) {
      var px = sx(x);
      svg.appendChild(elSvg('line', {
        x1: px, y1: m.top, x2: px, y2: H - m.bottom,
        class: x === 0 ? 'grafica07-eje' : 'grafica07-reticula'
      }));
      var lblX = elSvg('text', {
        x: px, y: H - m.bottom + 18,
        'text-anchor': 'middle',
        class: 'grafica07-etiq'
      });
      lblX.textContent = String(x);
      svg.appendChild(lblX);
    }

    var titX = elSvg('text', {
      x: m.left + pw / 2, y: H - 10,
      'text-anchor': 'middle',
      class: 'grafica07-titulo-eje'
    });
    titX.textContent = 'Ángulo central de la curva en grados';
    svg.appendChild(titX);

    var titY = elSvg('text', {
      x: 18, y: m.top + ph / 2,
      'text-anchor': 'middle',
      transform: 'rotate(-90 18 ' + (m.top + ph / 2) + ')',
      class: 'grafica07-titulo-eje'
    });
    titY.textContent = 'Factor de corrección';
    svg.appendChild(titY);

    var pts = [];
    for (var i = 0; i < DATOS_4_41.length; i++) {
      var d = DATOS_4_41[i];
      pts.push(sx(d.ang).toFixed(1) + ',' + sy(d.factor).toFixed(1));
    }

    svg.appendChild(elSvg('polyline', {
      points: pts.join(' '),
      class: 'grafica07-linea'
    }));

    function mostrarTip(d, px, py) {
      tip.textContent = d.ang + '° · Factor = ' + d.factor.toFixed(2);
      var rect = svg.getBoundingClientRect();
      var left = (px / W) * rect.width;
      var top = (py / H) * rect.height - 34;
      tip.style.left = Math.max(4, Math.min(rect.width - 150, left - 60)) + 'px';
      tip.style.top = Math.max(4, top) + 'px';
      tip.classList.add('visible');
    }

    function ocultarTip() {
      tip.classList.remove('visible');
    }

    for (var j = 0; j < DATOS_4_41.length; j++) {
      (function (d, px, py) {
        var c = elSvg('circle', {
          cx: px, cy: py, r: 4.2,
          tabindex: '0',
          class: 'grafica07-punto',
          'aria-label': 'Angulo ' + d.ang + ' grados, factor ' + d.factor.toFixed(2)
        });
        c.addEventListener('mouseenter', function () { mostrarTip(d, px, py); });
        c.addEventListener('focus', function () { mostrarTip(d, px, py); });
        c.addEventListener('mouseleave', ocultarTip);
        c.addEventListener('blur', ocultarTip);
        svg.appendChild(c);
      })(DATOS_4_41[j], sx(DATOS_4_41[j].ang), sy(DATOS_4_41[j].factor));
    }

    wrap.appendChild(svg);
    cont.appendChild(wrap);
  }

  function iniciar() {
    var nodes = document.querySelectorAll('.grafica-libro[data-grafica="4-41"]');
    for (var i = 0; i < nodes.length; i++) {
      if (!nodes[i].dataset.iniciada) {
        nodes[i].dataset.iniciada = '1';
        dibujarCurva441(nodes[i]);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
