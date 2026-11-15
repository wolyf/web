/*
 * Gráfica interactiva del Libro 17 (MAPAS, Conagua):
 * - l17-2-10: Ilustración 2.10 Temperatura para las distintas clases de aislamiento
 *
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro17.css.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var DATOS_2_10 = [
    { clase: 'Y', maxC: 90, ambC: 40, elevC: 50 },
    { clase: 'A', maxC: 105, ambC: 40, elevC: 65 },
    { clase: 'B', maxC: 130, ambC: 40, elevC: 90 },
    { clase: 'F', maxC: 155, ambC: 40, elevC: 115 },
    { clase: 'H', maxC: 180, ambC: 40, elevC: 140 }
  ];

  function el(tag, attrs, texto) {
    var n = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        n.setAttribute(k, attrs[k]);
      });
    }
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function render210(host) {
    var W = 560;
    var H = 300;
    var mL = 56;
    var mR = 24;
    var mT = 24;
    var mB = 46;
    var pW = W - mL - mR;
    var pH = H - mT - mB;
    var yMax = 180;

    function yPx(v) {
      return mT + pH * (1 - v / yMax);
    }

    var svg = el('svg', {
      class: 'grafica-svg',
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      tabindex: '0',
      'aria-label': 'Ilustración 2.10 Temperatura máxima por clase de aislamiento (Y: 90 °C, A: 105 °C, B: 130 °C, F: 155 °C, H: 180 °C)'
    });

    // Retícula horizontal cada 20 °C
    for (var v = 0; v <= yMax; v += 20) {
      var y = yPx(v);
      svg.appendChild(el('line', {
        class: v === 0 ? 'eje' : 'reticula',
        x1: mL, y1: y.toFixed(1), x2: W - mR, y2: y.toFixed(1)
      }));
      svg.appendChild(el('text', {
        class: 'eje-etiq',
        x: mL - 8, y: (y + 3.5).toFixed(1),
        'text-anchor': 'end'
      }, String(v)));
    }

    svg.appendChild(el('line', {
      class: 'eje',
      x1: mL, y1: mT, x2: mL, y2: mT + pH
    }));

    svg.appendChild(el('text', {
      class: 'eje-titulo',
      x: 16, y: mT + pH / 2,
      transform: 'rotate(-90 16 ' + (mT + pH / 2) + ')',
      'text-anchor': 'middle'
    }, 'Temperatura en °C'));

    svg.appendChild(el('text', {
      class: 'eje-titulo',
      x: mL + pW / 2, y: H - 8,
      'text-anchor': 'middle'
    }, 'Clase de aislamiento'));

    var glob = document.createElement('div');
    glob.className = 'grafica-globo';
    glob.hidden = true;

    var paso = pW / DATOS_2_10.length;
    var bw = Math.min(44, paso * 0.48);
    var grupos = [];

    function activar(idx) {
      grupos.forEach(function (g, i) {
        g.classList.toggle('activo', i === idx);
      });
      if (idx < 0) {
        glob.hidden = true;
        return;
      }
      var d = DATOS_2_10[idx];
      glob.innerHTML = '<strong>Clase ' + d.clase + '</strong>: máx. ' + d.maxC + ' °C (ambiente ' + d.ambC + ' °C + elevación permisible ' + d.elevC + ' °C)';
      glob.hidden = false;
    }

    DATOS_2_10.forEach(function (d, i) {
      var cx = mL + paso * (i + 0.5);
      var x0 = cx - bw / 2;
      var y0 = yPx(0);
      var yAmb = yPx(d.ambC);
      var yMaxBar = yPx(d.maxC);

      var g = el('g', { class: 'barra-grupo' });
      g.appendChild(el('rect', {
        class: 'barra-base',
        x: x0.toFixed(1), y: yAmb.toFixed(1),
        width: bw.toFixed(1), height: (y0 - yAmb).toFixed(1)
      }));
      g.appendChild(el('rect', {
        class: 'barra-elev',
        x: x0.toFixed(1), y: yMaxBar.toFixed(1),
        width: bw.toFixed(1), height: (yAmb - yMaxBar).toFixed(1)
      }));
      g.appendChild(el('text', {
        class: 'barra-valor',
        x: cx.toFixed(1), y: (yMaxBar - 6).toFixed(1)
      }, String(d.maxC)));
      g.appendChild(el('text', {
        class: 'eje-etiq',
        x: cx.toFixed(1), y: (y0 + 16).toFixed(1),
        'text-anchor': 'middle'
      }, d.clase));

      g.addEventListener('mouseenter', function () { activar(i); });
      g.addEventListener('click', function () { activar(i); });
      svg.appendChild(g);
      grupos.push(g);
    });

    svg.addEventListener('mouseleave', function () { activar(-1); });
    var idxTec = -1;
    svg.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight') {
        ev.preventDefault();
        idxTec = (idxTec + 1) % DATOS_2_10.length;
        activar(idxTec);
      } else if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        idxTec = (idxTec - 1 + DATOS_2_10.length) % DATOS_2_10.length;
        activar(idxTec);
      } else if (ev.key === 'Escape') {
        idxTec = -1;
        activar(-1);
      }
    });

    var ley = document.createElement('div');
    ley.className = 'grafica-leyenda';
    ley.innerHTML =
      '<button type="button" class="leyenda-item"><span class="leyenda-muestra leyenda-muestra--base"></span>Temperatura ambiente base (40 °C)</button>' +
      '<button type="button" class="leyenda-item"><span class="leyenda-muestra leyenda-muestra--elev"></span>Elevación permisible de temperatura</button>';

    host.innerHTML = '';
    host.appendChild(ley);
    host.appendChild(svg);
    host.appendChild(glob);
  }

  function iniciar() {
    var hosts = document.querySelectorAll('.grafica-libro[data-grafica="l17-2-10"]');
    hosts.forEach(render210);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
