/* Graficas interactivas del Libro 10: Ilustraciones 4.2 y 4.8 */
(function () {
  var DATOS_4_2 = [
    { d: 12, const: 3.58560825, ener: 18.30992543, total: 21.89553368 },
    { d: 14, const: 4.24141750, ener: 16.87748502, total: 21.11890252 },
    { d: 16, const: 5.38201278, ener: 16.26220539, total: 21.64421817 },
    { d: 18, const: 6.50021947, ener: 15.96761264, total: 22.46783211 },
    { d: 20, const: 7.10014341, ener: 15.81425327, total: 22.91439668 },
    { d: 24, const: 8.50061370, ener: 15.67881248, total: 24.17942618 }
  ];

  var SERIES_4_2 = [
    { key: 'const', nombre: 'Costo construcción', color: '#3b82f6' },
    { key: 'ener', nombre: 'Costo energía', color: '#ea580c' },
    { key: 'total', nombre: 'Total a valor presente', color: '#64748b' }
  ];

  var DATOS_4_8 = [
    { t: 0, q: 75 },
    { t: 5, q: 100 },
    { t: 10, q: 125 },
    { t: 15, q: 150 },
    { t: 20, q: 175 },
    { t: 25, q: 200 },
    { t: 30, q: 225 }
  ];

  function elSvg(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function posTip(tip, svg, W, H, px, py) {
    var rect = svg.getBoundingClientRect();
    var left = (px / W) * rect.width;
    var top = (py / H) * rect.height - 38;
    tip.style.left = Math.max(4, Math.min(rect.width - 190, left - 70)) + 'px';
    tip.style.top = Math.max(4, top) + 'px';
    tip.classList.add('visible');
  }

  function dibujar42(cont) {
    var W = 640, H = 360;
    var m = { top: 26, right: 24, bottom: 52, left: 58 };
    var pw = W - m.left - m.right;
    var ph = H - m.top - m.bottom;
    var xMin = 12, xMax = 24;
    var yMin = 0, yMax = 30;

    var wrap = document.createElement('div');
    wrap.className = 'grafica10-wrap';

    var leyenda = document.createElement('div');
    leyenda.className = 'grafica10-leyenda';
    wrap.appendChild(leyenda);

    var tip = document.createElement('div');
    tip.className = 'grafica10-tip';
    wrap.appendChild(tip);

    var svg = elSvg('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'grafica-svg',
      role: 'img',
      'aria-label': 'Costos a valor presente para diámetros de tubería de 12 a 24 pulgadas'
    });

    function sx(v) { return m.left + ((v - xMin) / (xMax - xMin)) * pw; }
    function sy(v) { return m.top + ((yMax - v) / (yMax - yMin)) * ph; }

    for (var y = 0; y <= 30; y += 5) {
      var py = sy(y);
      svg.appendChild(elSvg('line', {
        x1: m.left, y1: py, x2: W - m.right, y2: py,
        class: y === 0 ? 'grafica10-eje' : 'grafica10-reticula'
      }));
      var ly = elSvg('text', {
        x: m.left - 8, y: py + 4,
        'text-anchor': 'end',
        class: 'grafica10-etiq'
      });
      ly.textContent = String(y);
      svg.appendChild(ly);
    }

    var notaEsc = elSvg('text', {
      x: m.left + 8, y: m.top + 14,
      class: 'grafica10-anot'
    });
    notaEsc.textContent = '× 10⁶ pesos';
    svg.appendChild(notaEsc);

    for (var x = 12; x <= 24; x += 2) {
      var px = sx(x);
      svg.appendChild(elSvg('line', {
        x1: px, y1: m.top, x2: px, y2: H - m.bottom,
        class: x === 12 ? 'grafica10-eje' : 'grafica10-reticula'
      }));
      var lx = elSvg('text', {
        x: px, y: H - m.bottom + 18,
        'text-anchor': 'middle',
        class: 'grafica10-etiq'
      });
      lx.textContent = String(x);
      svg.appendChild(lx);
    }

    var tx = elSvg('text', {
      x: m.left + pw / 2, y: H - 10,
      'text-anchor': 'middle',
      class: 'grafica10-titulo-eje'
    });
    tx.textContent = 'Diámetros de la tubería (pulgadas)';
    svg.appendChild(tx);

    var ty = elSvg('text', {
      x: 18, y: m.top + ph / 2,
      'text-anchor': 'middle',
      transform: 'rotate(-90 18 ' + (m.top + ph / 2) + ')',
      class: 'grafica10-titulo-eje'
    });
    ty.textContent = 'Costos (pesos)';
    svg.appendChild(ty);

    SERIES_4_2.forEach(function (s) {
      var g = elSvg('g', { 'data-serie': s.key });
      var pts = DATOS_4_2.map(function (d) {
        return sx(d.d).toFixed(1) + ',' + sy(d[s.key]).toFixed(1);
      });
      g.appendChild(elSvg('polyline', {
        points: pts.join(' '),
        class: 'grafica10-linea',
        stroke: s.color
      }));

      DATOS_4_2.forEach(function (d) {
        var cx = sx(d.d), cy = sy(d[s.key]);
        var c = elSvg('circle', {
          cx: cx.toFixed(1), cy: cy.toFixed(1), r: 4.3,
          class: 'grafica10-punto',
          stroke: s.color,
          tabindex: '0',
          role: 'button',
          'aria-label': s.nombre + ', ' + d.d + ' pulgadas: $' + d[s.key].toFixed(2) + ' millones'
        });
        function ver() {
          tip.textContent = d.d + '" · ' + s.nombre + ': $' + d[s.key].toFixed(2) + ' M';
          posTip(tip, svg, W, H, cx, cy);
        }
        function ocultar() { tip.classList.remove('visible'); }
        c.addEventListener('mouseenter', ver);
        c.addEventListener('focus', ver);
        c.addEventListener('mouseleave', ocultar);
        c.addEventListener('blur', ocultar);
        g.appendChild(c);
      });
      svg.appendChild(g);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'grafica10-btn';
      btn.setAttribute('aria-pressed', 'true');
      var muestra = document.createElement('span');
      muestra.className = 'grafica10-muestra';
      muestra.style.backgroundColor = s.color;
      btn.appendChild(muestra);
      btn.appendChild(document.createTextNode(s.nombre));
      btn.addEventListener('click', function () {
        var activo = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', activo ? 'false' : 'true');
        g.style.display = activo ? 'none' : '';
      });
      leyenda.appendChild(btn);
    });

    wrap.appendChild(svg);
    cont.appendChild(wrap);
  }

  function dibujar48(cont) {
    var W = 640, H = 340;
    var m = { top: 20, right: 24, bottom: 52, left: 62 };
    var pw = W - m.left - m.right;
    var ph = H - m.top - m.bottom;
    var xMin = 0, xMax = 30;
    var yMin = 0, yMax = 300;

    var wrap = document.createElement('div');
    wrap.className = 'grafica10-wrap';

    var tip = document.createElement('div');
    tip.className = 'grafica10-tip';
    wrap.appendChild(tip);

    var svg = elSvg('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'grafica-svg',
      role: 'img',
      'aria-label': 'Crecimiento de la demanda en función del tiempo de 0 a 30 años'
    });

    function sx(v) { return m.left + ((v - xMin) / (xMax - xMin)) * pw; }
    function sy(v) { return m.top + ((yMax - v) / (yMax - yMin)) * ph; }

    for (var y = 0; y <= 300; y += 50) {
      var py = sy(y);
      svg.appendChild(elSvg('line', {
        x1: m.left, y1: py, x2: W - m.right, y2: py,
        class: y === 0 ? 'grafica10-eje' : 'grafica10-reticula'
      }));
      if (y > 0) {
        var ly = elSvg('text', {
          x: m.left - 8, y: py + 4,
          'text-anchor': 'end',
          class: 'grafica10-etiq'
        });
        ly.textContent = String(y);
        svg.appendChild(ly);
      }
    }

    for (var x = 0; x <= 30; x += 5) {
      var px = sx(x);
      svg.appendChild(elSvg('line', {
        x1: px, y1: m.top, x2: px, y2: H - m.bottom,
        class: x === 0 ? 'grafica10-eje' : 'grafica10-reticula'
      }));
      var lx = elSvg('text', {
        x: px, y: H - m.bottom + 18,
        'text-anchor': 'middle',
        class: 'grafica10-etiq'
      });
      lx.textContent = String(x);
      svg.appendChild(lx);
    }

    var tx = elSvg('text', {
      x: m.left + pw / 2, y: H - 10,
      'text-anchor': 'middle',
      class: 'grafica10-titulo-eje'
    });
    tx.textContent = 'Tiempo (años)';
    svg.appendChild(tx);

    var ty = elSvg('text', {
      x: 18, y: m.top + ph / 2,
      'text-anchor': 'middle',
      transform: 'rotate(-90 18 ' + (m.top + ph / 2) + ')',
      class: 'grafica10-titulo-eje'
    });
    ty.textContent = 'Flujo máximo (m³/h)';
    svg.appendChild(ty);

    var a1 = elSvg('text', { x: sx(1), y: sy(256), class: 'grafica10-anot' });
    a1.textContent = 'Tubería 91.4 cm de diámetro';
    svg.appendChild(a1);

    var a2 = elSvg('text', { x: sx(1), y: sy(28), class: 'grafica10-anot' });
    a2.textContent = 'Tubería 60.9 cm de diámetro';
    svg.appendChild(a2);

    var pts = DATOS_4_8.map(function (d) {
      return sx(d.t).toFixed(1) + ',' + sy(d.q).toFixed(1);
    });
    svg.appendChild(elSvg('polyline', {
      points: pts.join(' '),
      class: 'grafica10-linea',
      stroke: 'var(--accent)'
    }));

    var lblDem = elSvg('text', {
      x: sx(14.5), y: sy(156),
      transform: 'rotate(-20 ' + sx(14.5).toFixed(1) + ' ' + sy(156).toFixed(1) + ')',
      'text-anchor': 'middle',
      class: 'grafica10-anot'
    });
    lblDem.textContent = 'Demanda';
    svg.appendChild(lblDem);

    DATOS_4_8.forEach(function (d) {
      var cx = sx(d.t), cy = sy(d.q);
      var c = elSvg('circle', {
        cx: cx.toFixed(1), cy: cy.toFixed(1), r: 4.3,
        class: 'grafica10-punto',
        stroke: 'var(--accent)',
        tabindex: '0',
        role: 'button',
        'aria-label': 'Año ' + d.t + ': ' + d.q + ' m³/h'
      });
      function ver() {
        tip.textContent = 'Año ' + d.t + ' · Demanda = ' + d.q + ' m³/h';
        posTip(tip, svg, W, H, cx, cy);
      }
      function ocultar() { tip.classList.remove('visible'); }
      c.addEventListener('mouseenter', ver);
      c.addEventListener('focus', ver);
      c.addEventListener('mouseleave', ocultar);
      c.addEventListener('blur', ocultar);
      svg.appendChild(c);
    });

    wrap.appendChild(svg);
    cont.appendChild(wrap);
  }

  function iniciar() {
    var lista = document.querySelectorAll('.grafica-libro[data-grafica]');
    for (var i = 0; i < lista.length; i++) {
      var cont = lista[i];
      var id = cont.getAttribute('data-grafica');
      if (id === '4-2') dibujar42(cont);
      else if (id === '4-8') dibujar48(cont);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
