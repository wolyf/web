/*
 * Gráficas interactivas del Libro 2 (MAPAS, Conagua).
 *
 * Recrea en SVG, sin librerías, las gráficas del libro con datos legibles:
 * 3.1, 2.9, 4.21, 4.26, 4.28, 4.34, A.13 y H.4. Los datos se leyeron de los
 * trazos vectoriales del PDF original (posición de cada marcador convertida
 * con la escala de los ejes) o de las etiquetas de valor; cada gráfica lo
 * aclara en su nota.
 *
 * Uso: <div class="grafica-libro" data-grafica="l2-3-1"></div> y este script
 * con defer. Dibuja la gráfica, una leyenda con botones para ocultar o mostrar
 * series (si hay más de una), un globo con los valores (cursor, toque o
 * teclado) y, debajo, la tabla de datos dentro de <details>.
 * Estilos: ../css/graficas.css (comunes) y ../css/graficas-libro02.css.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var DATOS = {"3-1":{"tipo":"barras","titulo":"Producción de agua potable (l/s), 2001 a 2009","x":{"titulo":"Año","nombre":"Año"},"y":{"titulo":"l/s","unidad":"l/s","min":0,"max":2500,"paso":500,"decimales":0},"etiquetas":["2001","2002","2003","2004","2005","2006","2007","2008","2009"],"series":[{"nombre":"Caudal","valores":[2477,2285,2348,2256,1952,1733,2019,1837,1849]}],"nota":"Valores de las etiquetas de las barras en el PDF original."},"2-9":{"tipo":"lineas","titulo":"VPN = f(t), escenario 1","x":{"titulo":"Años","nombre":"Año","min":1,"max":57,"paso":4},"y":{"titulo":"VPN","unidad":"","min":0,"max":3000000000.0,"paso":500000000.0,"decimales":0,"miles":true},"xs":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57],"series":[{"nombre":"VPN","valores":[2400000000.0,0,1400000000.0,1760000000.0,2090000000.0,960000000.0,290000000.0,430000000.0,900000000.0,890000000.0,430000000.0,1080000000.0,500000000.0,0,1290000000.0,1400000000.0,1000000000.0,870000000.0,790000000.0,800000000.0,680000000.0,680000000.0,620000000.0,560000000.0,500000000.0,350000000.0,350000000.0,340000000.0,260000000.0,250000000.0,200000000.0,170000000.0,170000000.0,140000000.0,110000000.0,60000000.0,80000000.0,80000000.0,50000000.0,40000000.0,20000000.0,20000000.0,10000000.0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}],"nota":"Valores leídos de los 57 marcadores del PDF original, redondeados a decenas de millones (precisión de lectura de unos ±15 millones); los que quedan apenas bajo el eje se anotan como 0."},"4-21":{"tipo":"lineas","titulo":"Gasto a tratar en la PTAR y modulación","x":{"titulo":"Año","nombre":"Año","min":2005,"max":2030,"paso":5},"y":{"titulo":"Gasto","unidad":"","min":200,"max":1600,"paso":200,"decimales":0},"xs":[2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030],"series":[{"nombre":"Gasto a tratar PTAR","valores":[383,486,573,715,835,887,888,916,946,1012,1011,1058,1084,1104,1158,1203,1281,1350,1411,1437,1465,1465,1465,1465,1465,1462],"discontinua":true},{"nombre":"Modulación","valores":[746,746,746,746,994,994,994,994,994,994,1241,1241,1244,1244,1244,1244,1502,1502,1502,1502,1502,1502,1502,1502,1502,1498],"marcador":"cuadro"}],"nota":"Valores leídos de los marcadores del PDF original (precisión de lectura de unos ±5). El original no indica la unidad del eje vertical."},"H-4":{"tipo":"lineas","titulo":"Gasto a tratar en la PTAR y modulación","x":{"titulo":"Año","nombre":"Año","min":2005,"max":2030,"paso":5},"y":{"titulo":"Gasto","unidad":"","min":100,"max":1600,"paso":200,"decimales":0},"xs":[2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030],"series":[{"nombre":"Gasto a tratar PTAR","valores":[384,497,573,724,840,895,895,922,964,1017,1017,1045,1079,1115,1161,1218,1284,1353,1412,1440,1467,1467,1467,1467,1467,1467],"discontinua":true},{"nombre":"Modulación","valores":[751,751,751,751,1000,1000,1000,1000,1000,1000,1245,1245,1245,1245,1245,1245,1499,1499,1499,1499,1499,1499,1499,1499,1499,1499],"marcador":"cuadro"}],"nota":"Valores leídos de los marcadores del PDF original (precisión de lectura de unos ±5). El original no indica la unidad del eje vertical. En el eje vertical del original la marca de 1 000.00 aparece como «100.00»."},"4-26":{"tipo":"puntos","titulo":"Daños registrados ($ estimados)","x":{"titulo":"Caudal (m³/s)","nombre":"Caudal","unidad":"m³/s","min":0,"max":600,"paso":100},"y":{"titulo":"Daños ($)","unidad":"$","min":0,"max":50000000.0,"paso":10000000.0,"decimales":0,"miles":true},"series":[{"nombre":"Daños registrados","puntos":[[225,10000000.0],[275,25500000.0],[305,28000000.0],[345,28000000.0],[390,24500000.0],[430,31000000.0],[475,37500000.0],[500,39000000.0],[510,35500000.0]]}],"nota":"Valores leídos de los marcadores del PDF original: caudal redondeado a 5 m³/s y daños a 500 000 pesos."},"4-28":{"tipo":"lineas-xy","titulo":"Caudales máximos anuales en función de la probabilidad de ocurrencia","x":{"titulo":"Probabilidad (1/Tr)","nombre":"Probabilidad","min":0,"max":1.2,"paso":0.2,"decimales":2},"y":{"titulo":"Q (m³/s)","unidad":"m³/s","min":0,"max":800,"paso":100,"decimales":0},"series":[{"nombre":"Q máximo anual","puntos":[[0.02,700],[0.03,580],[0.05,420],[0.2,220],[1.01,200]]}],"nota":"Valores leídos de los marcadores del PDF original (probabilidad a dos decimales y caudal a 5 m³/s)."},"4-34":{"tipo":"lineas-xy","titulo":"Curva de daños vs probabilidad de ocurrencia","x":{"titulo":"Probabilidad de Ocurrencia","nombre":"Probabilidad","min":0,"max":1.2,"paso":0.2,"decimales":2},"y":{"titulo":"Daños","unidad":"$","min":0,"max":50000000.0,"paso":10000000.0,"decimales":0,"miles":true},"series":[{"nombre":"Daños","puntos":[[0.01,47500000.0],[0.02,41500000.0],[0.04,33000000.0],[0.2,15500000.0],[1.0,500000.0]],"discontinua":true}],"nota":"Valores leídos de los marcadores del PDF original (daños redondeados a 500 000 pesos). En el original, el área bajo la curva entre 0.2 y 0.8 está rayada: «Área de beneficio (daños evitados)»."},"A-13":{"tipo":"lineas-xy","titulo":"Función Precio - Demanda","x":{"titulo":"Consumo","nombre":"Consumo","min":14,"max":24,"paso":1,"decimales":1},"y":{"titulo":"Precio","unidad":"","min":0,"max":17,"paso":1,"decimales":1},"series":[{"nombre":"Precio","puntos":[[14.9,15.6],[15.5,14.0],[15.8,13.0],[16.2,12.0],[16.6,11.0],[17.0,10.0],[17.6,9.0],[18.2,8.0],[18.9,7.0],[19.8,6.0],[20.9,4.9],[22.2,3.9],[23.0,3.4]]}],"nota":"Valores leídos de los 13 marcadores del PDF original, a un decimal."}};

  function el(etq, attrs, padre) {
    var n = document.createElementNS(NS, etq);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(n);
    return n;
  }
  function html(etq, attrs, padre, texto) {
    var n = document.createElement(etq);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (texto != null) n.textContent = texto;
    if (padre) padre.appendChild(n);
    return n;
  }
  function texto(padre, x, y, contenido, clase, extra) {
    var t = el('text', Object.assign({ x: x, y: y, 'class': clase }, extra || {}), padre);
    t.textContent = contenido;
    return t;
  }

  // Números con espacio como separador de miles (como el original)
  function numero(v, dec) {
    if (v == null) return '·';
    var s = Math.abs(v).toFixed(dec || 0).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + s.join('.');
  }
  function corto(v) {
    var a = Math.abs(v);
    if (a >= 1e9) return numero(v / 1e9, a % 1e9 ? 1 : 0) + ' mil M';
    if (a >= 1e6) return numero(v / 1e6, a % 1e6 ? 1 : 0) + ' M';
    return numero(v, 0);
  }
  function conUnidad(v, eje) {
    var t = numero(v, eje.decimales || 0);
    if (eje.unidad === '$') return '$ ' + t;
    return eje.unidad ? t + ' ' + eje.unidad : t;
  }

  var contador = 0;

  function dibujar(caja, d) {
    var id = 'g' + (++contador);
    var series = d.series.map(function (s, i) {
      var pts = s.puntos ? s.puntos.slice() : d.xs ? d.xs.map(function (x, j) { return [x, s.valores[j]]; }) :
        s.valores.map(function (v, j) { return [j, v]; });
      return { nombre: s.nombre, pts: pts, visible: true, clase: 'serie-' + (i + 1), discontinua: s.discontinua, marcador: s.marcador };
    });
    var barras = d.tipo === 'barras';

    // Leyenda
    var leyenda = html('div', { 'class': 'grafica-leyenda', role: 'group', 'aria-label': 'Series' }, caja);
    if (series.length > 1) {
      series.forEach(function (s) {
        var b = html('button', { type: 'button', 'class': 'grafica-serie ' + s.clase, 'aria-pressed': 'true' }, leyenda);
        var m = el('svg', { 'class': 'grafica-muestra', width: 18, height: 10, 'aria-hidden': 'true' }, b);
        el('line', { x1: 1, y1: 5, x2: 17, y2: 5, 'class': 'linea' + (s.discontinua ? ' discontinua' : '') }, m);
        html('span', {}, b, s.nombre);
        b.addEventListener('click', function () {
          s.visible = !s.visible;
          b.setAttribute('aria-pressed', String(s.visible));
          s.grupo.setAttribute('visibility', s.visible ? 'visible' : 'hidden');
        });
      });
    } else leyenda.remove();

    var lienzo = html('div', { 'class': 'grafica-lienzo' }, caja);
    // El ancho del dibujo sigue al de la caja: el texto conserva su tamaño en celular
    var W = Math.max(300, Math.min(720, Math.round(caja.clientWidth) || 640));
    var H = W < 500 ? 280 : 330, m = { t: 14, r: 14, b: 52, l: d.y.miles ? (W < 500 ? 84 : 92) : 54 };
    var angosto = W < 500;
    var svg = el('svg', { 'class': 'grafica-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': d.titulo + '. Datos en la tabla de abajo.' }, lienzo);
    var X = d.x, Y = d.y;
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var n = barras ? d.etiquetas.length : 0;
    function px(x) { return barras ? m.l + (x + 0.5) * iw / n : m.l + (x - X.min) / (X.max - X.min) * iw; }
    function py(y) { return m.t + ih - (y - Y.min) / (Y.max - Y.min) * ih; }

    var ret = el('g', { 'class': 'reticula', 'aria-hidden': 'true' }, svg);
    for (var y = Y.min; y <= Y.max + 1e-9; y += Y.paso) {
      el('line', { x1: m.l, x2: W - m.r, y1: py(y), y2: py(y) }, ret);
      texto(svg, m.l - 6, py(y) + 4, Y.miles ? (angosto ? corto(y) : numero(y, 0)) : numero(y, (Y.paso % 1) ? 1 : 0), 'marca-eje', { 'text-anchor': 'end', 'aria-hidden': 'true' });
    }
    if (barras) {
      d.etiquetas.forEach(function (e, i) { texto(svg, px(i), H - m.b + 16, angosto ? "'" + e.slice(-2) : e, 'marca-eje', { 'text-anchor': 'middle', 'aria-hidden': 'true' }); });
    } else {
      var cada = angosto && (X.max - X.min) / X.paso > 7 ? 2 : 1, k = 0;
      for (var x = X.min; x <= X.max + 1e-9; x += X.paso, k++) {
        el('line', { x1: px(x), x2: px(x), y1: m.t, y2: m.t + ih }, ret);
        if (k % cada === 0) texto(svg, px(x), H - m.b + 16, numero(x, (X.paso % 1) ? (X.decimales || 1) : 0), 'marca-eje', { 'text-anchor': 'middle', 'aria-hidden': 'true' });
      }
    }
    el('rect', { x: m.l, y: m.t, width: iw, height: ih, 'class': 'marco' }, svg);
    texto(svg, m.l + iw / 2, H - 10, X.titulo, 'titulo-eje', { 'text-anchor': 'middle', 'aria-hidden': 'true' });
    texto(svg, 12, m.t + ih / 2, Y.titulo, 'titulo-eje', { 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (m.t + ih / 2) + ')', 'aria-hidden': 'true' });

    var guia = el('line', { 'class': 'guia', y1: m.t, y2: m.t + ih, visibility: 'hidden' }, svg);
    var globo = html('div', { 'class': 'grafica-globo', hidden: '' }, lienzo);
    var marcas = [];

    series.forEach(function (s) {
      var g = el('g', { 'class': s.clase, role: 'list', 'aria-label': s.nombre }, svg);
      s.grupo = g;
      if (barras) {
        var bw = iw / n * 0.56;
        s.pts.forEach(function (p) {
          var b = el('g', { 'class': 'barra', tabindex: '0', role: 'listitem',
            'aria-label': d.etiquetas[p[0]] + ': ' + conUnidad(p[1], Y) }, g);
          el('rect', { x: px(p[0]) - iw / n / 2, y: m.t, width: iw / n, height: ih, 'class': 'zona' }, b);
          el('rect', { x: px(p[0]) - bw / 2, y: py(p[1]), width: bw, height: py(Y.min) - py(p[1]), rx: 2, 'class': 'marca' }, b);
          texto(b, px(p[0]), py(p[1]) - 5, angosto ? corto(p[1]) : numero(p[1], 0), 'valor-barra', { 'text-anchor': 'middle', 'aria-hidden': 'true' });
          marcas.push({ nodo: b, x: p[0], s: s, p: p });
        });
        return;
      }
      var pts = s.pts.filter(function (p) { return p[1] != null; });
      if (d.tipo !== 'puntos') {
        el('path', { d: pts.map(function (p, i) { return (i ? 'L' : 'M') + px(p[0]).toFixed(1) + ' ' + py(p[1]).toFixed(1); }).join(''),
          'class': 'linea' + (s.discontinua ? ' discontinua' : ''), 'aria-hidden': 'true' }, g);
      }
      pts.forEach(function (p) {
        var etq = (X.nombre || 'x') + ' ' + numero(p[0], X.decimales || 0) + ': ' + conUnidad(p[1], Y);
        var c = s.marcador === 'cuadro'
          ? el('rect', { x: px(p[0]) - 4, y: py(p[1]) - 4, width: 8, height: 8, 'class': 'marca punto', tabindex: '0', role: 'listitem', 'aria-label': s.nombre + ', ' + etq }, g)
          : el('circle', { cx: px(p[0]), cy: py(p[1]), r: d.tipo === 'puntos' ? 5 : (pts.length > 30 ? 3 : 4.2), 'class': 'marca punto', tabindex: '0', role: 'listitem', 'aria-label': s.nombre + ', ' + etq }, g);
        marcas.push({ nodo: c, x: p[0], s: s, p: p });
      });
    });

    function mostrar(mk) {
      marcas.forEach(function (o) { o.nodo.classList.toggle('activo', o === mk); });
      globo.innerHTML = '';
      var t = html('div', { 'class': 'titulo' }, globo, barras ? d.etiquetas[mk.x] : (X.nombre || '') + ' ' + numero(mk.x, X.decimales || 0) + (X.unidad ? ' ' + X.unidad : ''));
      // en gráficas con eje x compartido, todas las series visibles en ese x
      var mismas = d.xs ? marcas.filter(function (o) { return o.x === mk.x && o.s.visible; }) : [mk];
      mismas.forEach(function (o) {
        var f = html('div', { 'class': 'fila' + (o === mk ? ' enfocada' : '') + ' ' + o.s.clase }, globo);
        var mu = el('svg', { width: 10, height: 10, 'aria-hidden': 'true' }, f);
        el('circle', { cx: 5, cy: 5, r: 4, 'class': 'marca' }, mu);
        html('span', { 'class': 'nombre' }, f, o.s.nombre);
        html('span', { 'class': 'valor' }, f, conUnidad(o.p[1], Y));
      });
      globo.hidden = false;
      var cx = barras ? px(mk.x) : px(mk.p[0]);
      guia.setAttribute('x1', cx); guia.setAttribute('x2', cx); guia.setAttribute('visibility', barras ? 'hidden' : 'visible');
      var r = svg.getBoundingClientRect(), k = r.width / W;
      var gx = cx * k, gy = py(mk.p[1]) * k;
      var ancho = globo.offsetWidth;
      globo.style.left = Math.max(0, Math.min(r.width - ancho, gx + (gx > r.width / 2 ? -ancho - 12 : 12))) + 'px';
      globo.style.top = Math.max(0, gy - globo.offsetHeight - 8) + 'px';
    }
    function ocultar() {
      globo.hidden = true; guia.setAttribute('visibility', 'hidden');
      marcas.forEach(function (o) { o.nodo.classList.remove('activo'); });
    }
    marcas.forEach(function (mk) {
      mk.nodo.addEventListener('focus', function () { mostrar(mk); });
      mk.nodo.addEventListener('blur', ocultar);
    });
    // Cursor o toque: el marcador visible más cercano
    svg.addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect(), k = W / r.width;
      var x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
      var mejor = null, dm = Infinity;
      marcas.forEach(function (o) {
        if (!o.s.visible) return;
        var dx = (barras ? px(o.x) : px(o.p[0])) - x, dy = barras ? 0 : py(o.p[1]) - y;
        var dd = dx * dx + dy * dy * (d.xs ? 0.05 : 1);
        if (dd < dm) { dm = dd; mejor = o; }
      });
      if (mejor && dm < 60 * 60) mostrar(mejor); else ocultar();
    });
    svg.addEventListener('pointerleave', ocultar);

    // Tabla de datos
    var det = html('details', { 'class': 'grafica-datos' }, caja);
    html('summary', {}, det, 'Datos de la gráfica');
    var tabla = html('table', {}, det);
    var cab = html('tr', {}, html('thead', {}, tabla));
    html('th', { scope: 'col' }, cab, barras ? X.nombre : (X.nombre || 'x'));
    var tb = html('tbody', {}, tabla);
    if (barras || d.xs) {
      series.forEach(function (s) { html('th', { scope: 'col' }, cab, s.nombre + (Y.unidad && Y.unidad !== '$' ? ' (' + Y.unidad + ')' : Y.unidad === '$' ? ' ($)' : '')); });
      var xs = barras ? d.etiquetas : d.xs;
      xs.forEach(function (xv, j) {
        var tr = html('tr', {}, tb);
        html('th', { scope: 'row' }, tr, String(xv));
        series.forEach(function (s) { html('td', {}, tr, numero(s.pts[j][1], Y.decimales || 0)); });
      });
    } else {
      html('th', { scope: 'col' }, cab, Y.titulo);
      series.forEach(function (s) {
        s.pts.forEach(function (p) {
          var tr = html('tr', {}, tb);
          html('th', { scope: 'row' }, tr, numero(p[0], X.decimales || 0));
          html('td', {}, tr, numero(p[1], Y.decimales || 0));
        });
      });
    }
    if (d.nota) html('p', { 'class': 'grafica-nota' }, det, d.nota);
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('.grafica-lienzo')) return;
    document.querySelectorAll('.grafica-libro[data-grafica^="l2-"] .grafica-globo').forEach(function (g) { g.hidden = true; });
  });

  function iniciar() {
    document.querySelectorAll('.grafica-libro[data-grafica^="l2-"]').forEach(function (caja) {
      var d = DATOS[caja.getAttribute('data-grafica').slice(3)];
      if (!d || caja.dataset.lista) return;
      caja.dataset.lista = '1';
      dibujar(caja, d);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
