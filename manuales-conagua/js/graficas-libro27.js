/*
 * Gráficas interactivas del Libro 27 (MAPAS, Conagua):
 * Ilustraciones 2.14, 2.15, 2.16, 3.7, 3.8, 3.9, 3.13, 4.2, 5.1 y 6.5.
 * Sin librerías; usa ../css/graficas.css y ../css/graficas-libro27.css.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var DATA = {"2-14": [{"nombre": "D/uL = 0.01", "pts": [[0.198, -0.017], [0.295, 0.032], [0.503, 0.219], [0.677, 0.582], [0.859, 1.109], [1.049, 1.17], [1.332, 0.514], [1.576, 0.193], [1.872, 0.023], [2.099, -0.005]]}, {"nombre": "D/uL = 0.05", "pts": [[0.098, -0.018], [0.198, 0.055], [0.418, 0.259], [0.611, 0.545], [0.798, 0.847], [1.082, 0.923], [1.429, 0.475], [1.602, 0.256], [1.902, 0.09], [2.289, -0.005]]}, {"nombre": "D/uL = 0.1", "pts": [[0.038, -0.009], [0.152, 0.26], [0.407, 0.513], [1.0, 0.472], [1.642, 0.269], [2.111, 0.129], [2.819, 0.048]]}, {"nombre": "D/uL = 0.5", "pts": [[-0.019, 0.016], [0.006, 0.122], [0.161, 0.315], [0.549, 0.376], [0.962, 0.279], [1.339, 0.149], [1.981, 0.044], [2.542, -0.003], [2.628, -0.001], [2.658, -0.007]]}, {"nombre": "D/uL = 1", "pts": [[-0.023, -0.019], [-0.02, 0.105], [0.014, 0.239], [0.175, 0.287], [0.658, 0.194], [1.55, 0.045], [2.686, -0.001]]}], "2-15": [{"nombre": "Flujo completamente mezclado (Bact/100 mL)", "dashed": false, "pts": [[-0.02, 58291.0], [-0.02, 58106.0], [0.02, 58476.0], [0.02, 58291.0], [0.02, 58476.0], [29.96, 58106.0], [29.96, 58476.0]]}, {"nombre": "Flujo pistón (Bact/100 mL, ×10⁵)", "dashed": true, "pts": [[1.6, 83058.0], [1.64, 86491.0], [1.7, 79587.0], [1.77, 74157.0], [2.1, 70992.0], [2.91, 67143.0], [3.7, 66195.0], [4.93, 64887.0], [5.76, 64757.0], [5.8, 64944.0], [5.8, 68124.0], [5.96, 69483.0], [6.51, 76471.0], [6.75, 77610.0], [7.57, 84100.0], [7.77, 85319.0], [7.84, 79316.0], [7.85, 85258.0], [7.96, 77882.0], [8.41, 70786.0], [8.69, 69823.0], [10.15, 66326.0], [10.5, 66420.0], [11.94, 65568.0], [11.98, 65376.0], [12.03, 68454.0], [12.5, 74571.0], [12.63, 76993.0], [13.4, 82504.0], [13.65, 84749.0], [14.06, 84559.0], [14.14, 84821.0], [14.16, 86530.0], [14.18, 77422.0], [14.33, 76042.0], [14.98, 69266.0], [15.29, 68581.0], [16.88, 65953.0], [17.24, 66044.0], [18.93, 64806.0], [19.08, 65686.0], [19.56, 72792.0], [19.6, 74309.0], [20.42, 80796.0], [20.53, 82248.0], [21.37, 82979.0], [21.41, 78532.0], [21.46, 86999.0], [21.47, 87111.0], [21.48, 80031.0], [21.87, 71497.0], [22.0, 70082.0], [23.54, 66966.0], [23.86, 66295.0], [25.34, 66078.0], [25.43, 65874.0], [25.45, 69871.0], [25.62, 71213.0], [26.26, 78042.0], [26.68, 80097.0], [27.22, 84175.0]]}], "2-16": [{"nombre": "Flujo pistón", "dashed": false, "pts": [[0.17, 63.17], [1.76, 62.47], [5.79, 62.47], [6.43, 63.64], [7.55, 63.64], [8.67, 62.47], [12.77, 62.47], [13.42, 63.64], [14.64, 63.64], [15.47, 62.47], [19.86, 62.47], [20.47, 63.64], [21.77, 63.64], [22.6, 62.47], [26.92, 62.47], [27.6, 63.64], [28.75, 63.64], [29.62, 62.47], [30.44, 63.17]]}, {"nombre": "Flujo completamente mezclado", "dashed": true, "pts": [[0.89, 64.98], [0.89, 63.7], [5.79, 64.18], [6.43, 62.95], [8.11, 65.04], [13.09, 64.18], [13.89, 62.95], [15.47, 65.04], [20.47, 64.18], [21.12, 62.95], [22.6, 65.04], [26.92, 64.18], [27.6, 62.95], [29.36, 65.04]]}], "3-7": {"series": [{"nombre": "Ecuación 3.48 (Cs = 40.35 · 1.099^T)", "pts": [[-16, 8.9], [-14, 10.8], [-12, 13.0], [-10, 15.7], [-8, 19.0], [-6, 22.9], [-4, 27.7], [-2, 33.4], [0, 40.4], [2, 48.7], [4, 58.9], [6, 71.1], [8, 85.9], [10, 103.7], [12, 125.3], [14, 151.3], [16, 182.7], [18, 220.7], [20, 266.6], [22, 322.0], [24, 388.9], [26, 469.7], [28, 567.3], [30, 685.1], [32, 827.5]], "tipo": "linea"}, {"nombre": "Ecuación 3.49 (Cs,máx = 20T - 20)", "pts": [[1, 0], [4, 60], [7, 120], [10, 180], [13, 240], [16, 300], [19, 360], [22, 420], [25, 480]], "tipo": "linea"}, {"nombre": "Datos grupo superior", "pts": [[-2.9, 31.0], [-2.9, 31.0], [1.1, 63.0], [1.1, 63.0], [1.5, 33.0], [1.5, 33.0], [3.4, 51.0], [3.4, 51.0], [8.5, 155.0], [8.5, 155.0], [8.7, 127.0], [8.7, 127.0], [10.7, 193.0], [10.7, 193.0], [13.2, 173.0], [13.2, 173.0], [17.8, 470.0], [17.8, 470.0], [18.8, 506.0], [18.8, 506.0], [19.6, 534.0], [19.6, 534.0], [22.2, 461.0], [22.2, 461.0], [22.7, 494.0], [22.7, 494.0], [23.9, 659.0], [23.9, 659.0], [24.3, 801.0], [24.3, 801.0], [25.6, 763.0], [25.6, 763.0], [25.8, 409.0], [25.8, 409.0], [26.3, 461.0], [26.3, 461.0], [26.8, 799.0], [26.8, 799.0], [31.5, 892.0], [31.5, 892.0], [34.2, 968.0], [34.2, 968.0]], "tipo": "puntos"}, {"nombre": "Datos grupo inferior", "pts": [[4.6, 28.0], [6.1, 48.0], [8.4, 76.0], [10.6, 99.0], [11.2, 136.0], [11.6, 30.0], [12.5, 119.0], [13.6, 60.0], [14.6, 144.0], [16.1, 83.0], [16.4, 26.0], [17.2, 161.0], [18.1, 56.0], [18.9, 191.0], [19.7, 24.0], [20.3, 102.0], [21.5, 72.0], [21.7, 47.0], [21.7, 223.0], [21.9, 13.0], [22.6, 126.0], [24.3, 27.0], [24.5, 65.0], [24.8, 96.0], [26.4, 156.0], [26.8, 120.0], [27.3, 19.0], [27.5, 93.0], [27.6, 47.0], [28.1, 327.0], [28.6, 296.0], [29.0, 142.0], [30.8, 315.0], [31.0, 166.0], [31.3, 58.0], [33.6, 180.0]], "tipo": "puntos"}]}, "3-9": [{"nombre": "DQO del metano producido (Anaerobia)", "pts": [[-9.0, -63.0], [137.0, -33.0], [470.0, 66.0], [792.0, 236.0], [839.0, 284.0], [943.0, 418.0], [1033.0, 609.0]]}, {"nombre": "DQO total removida (Aerobia)", "pts": [[-9.0, -63.0], [1022.0, 983.0]]}], "3-13": [{"nombre": "Chlorella", "dashed": true, "pts": [[0.03, 0.0], [0.03, 7667.7], [0.03, 0.0], [0.21, 6435.6], [0.21, 4783.6], [0.21, 3437.1], [0.21, 2387.3], [0.21, 888.1], [0.21, 658.3], [0.21, 473.0], [0.21, 328.5], [0.21, 238.7], [0.21, 107.5], [0.21, 87.0], [0.21, 97.0], [0.21, 76.4], [0.21, 44.5], [0.21, 35.4], [0.21, 23.1], [0.21, 14.0], [0.29, 5572.0], [0.29, 4049.1], [0.29, 2078.7], [0.29, 2942.5], [0.29, 768.9], [0.29, 558.8], [0.29, 286.0], [0.29, 205.5], [0.29, 76.5], [0.29, 102.3], [0.29, 92.4], [0.29, 81.9], [0.29, 71.2], [0.29, 50.0], [0.29, 39.4], [0.29, 30.3], [0.29, 17.9], [0.29, 8.8], [0.29, 406.1], [1.36, 0.8], [2.66, 0.8], [3.91, 0.8], [5.17, 0.8], [6.46, 0.8], [7.72, 0.8], [9.01, 0.8], [10.26, 0.2], [11.5, 0.0], [12.74, 0.0], [14.06, 0.0], [15.43, 0.0]]}, {"nombre": "Oocystis", "dashed": true, "pts": [[0.03, 39.4], [1.36, 45.8], [2.87, 14.0], [3.91, 23.1], [5.17, 16.3], [6.33, 21.9], [7.85, 21.9], [9.01, 21.9], [10.26, 26.8]]}, {"nombre": "Ankistrodesmus", "dashed": true, "pts": [[0.11, 28.8], [0.4, 24.6], [1.25, 19.3], [2.56, 24.5], [5.1, 85.9], [6.46, 81.4]]}, {"nombre": "Micractinium", "dashed": true, "pts": [[6.46, 81.4], [7.72, 28.2], [9.08, 12.6], [10.41, 0.0]]}, {"nombre": "Euglena", "dashed": true, "pts": [[0.39, 0.0], [0.84, 1.9], [1.2, 3.6], [1.34, 4.1], [2.66, 60.0], [3.77, 69.4], [6.46, 81.4]]}, {"nombre": "Spirulina", "dashed": true, "pts": [[0.03, 0.0], [1.2, 11.2], [2.59, 19.1], [3.91, 28.2], [5.1, 39.4], [6.52, 61.4], [7.69, 70.8], [9.01, 74.5], [10.41, 48.8], [11.55, 45.0], [12.83, 39.4], [14.11, 0.0]]}], "4-2": {"top": [{"nombre": "Amasado", "pts": [[14.57, 1.92e-07], [15.71, 2.11e-07], [18.37, 3.34e-07], [21.11, 9.59e-07], [21.45, 1.1e-06], [22.83, 1.28e-06], [25.64, 9.59e-07]]}, {"nombre": "Estática", "pts": [[19.64, 4.88e-07], [20.21, 5.8e-07], [21.77, 7.58e-07], [23.91, 7.3e-07]]}], "bot": [{"nombre": "Amasado", "pts": [[14.12, 1622.2], [16.96, 1663.8], [20.14, 1661.0], [25.6, 1569.8]]}, {"nombre": "Amasado", "pts": [[13.71, 1955.4], [14.18, 1955.4], [14.18, 1900.5], [14.18, 1875.3], [14.18, 1821.4], [14.18, 1799.3], [14.3, 1692.2], [14.3, 1671.4], [14.3, 1652.5], [14.3, 1632.7], [14.3, 1613.2], [14.3, 1594.2], [15.71, 1742.4], [17.64, 1742.4], [19.58, 1742.4], [21.51, 1742.4], [23.44, 1742.4], [25.37, 1742.4], [27.3, 1742.4]]}, {"nombre": "Amasado", "pts": [[13.07, 1529.2], [13.1, 1527.4], [13.1, 1531.0], [13.16, 1526.1], [13.16, 1532.3], [13.25, 1525.7], [13.25, 1532.7], [13.33, 1526.1], [13.33, 1532.3], [13.4, 1527.4], [13.4, 1531.0], [13.42, 1529.2], [14.58, 1628.9], [14.6, 1627.2], [14.6, 1630.8], [14.66, 1625.8], [14.66, 1632.0], [14.75, 1625.4], [14.75, 1632.5], [14.83, 1625.8], [14.83, 1632.0], [14.9, 1627.2], [14.9, 1630.8], [14.92, 1628.9], [16.05, 1921.8], [16.08, 1920.0], [16.08, 1923.5], [16.14, 1918.7], [16.14, 1924.9], [16.22, 1918.2], [16.22, 1925.4], [16.25, 1673.1], [16.28, 1671.2], [16.28, 1674.8], [16.31, 1918.7], [16.31, 1924.9], [16.34, 1670.0], [16.34, 1676.2], [16.37, 1920.0], [16.37, 1923.5], [16.4, 1921.8], [16.43, 1669.5], [16.43, 1676.6], [16.51, 1670.0], [16.51, 1676.2], [16.57, 1671.2], [16.57, 1674.8], [16.6, 1673.1], [18.6, 1669.5], [18.63, 1667.7], [18.63, 1671.2], [18.65, 1899.0], [18.67, 1897.2], [18.67, 1900.8], [18.69, 1666.4], [18.69, 1672.6], [18.74, 1895.9], [18.74, 1902.1], [18.78, 1665.9], [18.78, 1673.1], [18.82, 1895.5], [18.82, 1902.6], [18.86, 1666.4], [18.86, 1672.6], [18.91, 1895.9], [18.91, 1902.1], [18.92, 1667.7], [18.92, 1671.2], [18.95, 1669.5], [18.97, 1897.2], [18.97, 1900.8], [19.0, 1899.0], [19.71, 1839.6], [19.73, 1837.9], [19.73, 1841.5], [19.8, 1836.5], [19.8, 1842.7], [19.88, 1836.1], [19.88, 1843.2], [19.93, 1648.9], [19.96, 1647.1], [19.96, 1650.7], [19.97, 1836.5], [19.97, 1842.7], [20.02, 1645.8], [20.02, 1652.0], [20.03, 1837.9], [20.03, 1841.5], [20.06, 1839.6], [20.06, 1839.6], [20.11, 1645.3], [20.11, 1652.5], [20.2, 1645.8], [20.2, 1652.0], [20.26, 1647.1], [20.26, 1650.7], [20.28, 1648.9], [20.57, 1657.2], [20.6, 1655.5], [20.6, 1658.9], [20.66, 1654.1], [20.66, 1660.3], [20.75, 1653.6], [20.75, 1660.8], [20.83, 1654.1], [20.83, 1660.3], [20.89, 1809.8], [20.9, 1655.5], [20.9, 1658.9], [20.91, 1808.1], [20.91, 1811.6], [20.92, 1657.2], [20.92, 1646.5], [20.95, 1644.7], [20.95, 1648.3], [20.98, 1806.8], [20.98, 1812.9], [21.01, 1643.5], [21.01, 1649.6], [21.06, 1806.3], [21.06, 1813.4], [21.1, 1643.0], [21.1, 1650.1], [21.15, 1806.8], [21.15, 1812.9], [21.19, 1643.5], [21.19, 1649.6], [21.21, 1808.1], [21.21, 1811.6], [21.24, 1809.8], [21.25, 1644.7], [21.25, 1648.3], [21.27, 1646.5], [21.95, 1632.7], [21.96, 1630.9], [21.96, 1634.5], [22.03, 1629.6], [22.03, 1635.8], [22.04, 1770.4], [22.06, 1768.6], [22.06, 1772.2], [22.11, 1629.1], [22.11, 1636.2], [22.11, 1619.1], [22.12, 1767.3], [22.12, 1773.5], [22.14, 1617.3], [22.14, 1620.8], [22.2, 1629.6], [22.2, 1635.8], [22.2, 1616.0], [22.2, 1622.2], [22.21, 1766.8], [22.21, 1774.0], [22.26, 1630.9], [22.26, 1634.5], [22.29, 1632.7], [22.29, 1615.5], [22.29, 1622.6], [22.3, 1767.3], [22.3, 1773.5], [22.36, 1768.6], [22.36, 1772.2], [22.38, 1770.4], [22.38, 1616.0], [22.38, 1622.2], [22.44, 1617.3], [22.44, 1620.8], [22.46, 1619.1]]}, {"nombre": "Amasado", "pts": [[15.74, 1575.9], [15.74, 1569.8], [17.71, 1569.8], [19.63, 1569.8], [21.6, 1569.8], [23.51, 1569.8], [25.48, 1569.8], [27.4, 1569.8]]}, {"nombre": "Sr = 100%", "pts": [[22.04, 1708.4], [24.66, 1633.9], [26.96, 1585.8], [27.9, 1569.8]]}]}, "5-1": [{"nombre": "4 Módulos de 15 L/s, c/u", "pts": [[-0.0, 10.5], [-0.0, -0.0], [-0.0, 70.0], [2.0, -0.0], [4.0, -0.0], [6.0, -0.0], [8.0, -0.0], [10.0, -0.0], [12.0, -0.0], [14.0, -0.0], [16.0, -0.0], [18.0, -0.0], [20.0, 10.5], [20.0, 60.2], [20.0, 50.4], [20.0, 40.4], [20.0, 30.5], [20.0, 20.5]]}, {"nombre": "3 Módulos de 20 L/s, c/u", "pts": [[-0.2, 39.1], [-0.1, 40.4], [-0.0, 39.1], [-0.0, 41.8], [-0.0, 39.1], [0.1, 40.4], [0.2, 39.1], [0.8, 39.1], [0.9, 40.4], [1.0, 41.8], [1.0, 39.1], [1.1, 40.4], [1.2, 39.1], [1.9, 39.1], [2.0, 40.4], [2.1, 41.8], [2.1, 39.1], [2.2, 40.4], [2.3, 39.1], [2.9, 39.1], [3.0, 40.4], [3.1, 41.8], [3.1, 39.1], [3.2, 40.4], [3.3, 39.1], [4.0, 39.1], [4.1, 40.4], [4.2, 41.8], [4.2, 39.1], [4.3, 40.4], [4.4, 39.1], [4.9, 39.1], [5.0, 40.4], [5.1, 41.8], [5.1, 39.1], [5.2, 40.4], [5.3, 39.1], [5.9, 39.1], [6.0, 40.4], [6.1, 41.8], [6.1, 39.1], [6.2, 40.4], [6.3, 39.1], [6.9, 39.1], [7.0, 40.4], [7.1, 41.8], [7.1, 39.1], [7.2, 40.4], [7.3, 39.1], [7.8, 58.8], [7.9, 60.2], [8.0, 61.5], [8.0, 58.8], [8.1, 60.2], [8.2, 58.8], [8.8, 58.8], [8.9, 60.2], [9.0, 61.5], [9.0, 58.8], [9.1, 60.2], [9.2, 58.8], [9.8, 58.8], [9.9, 60.2], [10.0, 61.5], [10.0, 58.8], [10.1, 60.2], [10.2, 58.8], [10.8, 58.8], [10.9, 60.2], [11.0, 61.5], [11.0, 58.8], [11.1, 60.2], [11.2, 58.8]]}, {"nombre": "4 Módulos de 15 L/s, c/u", "pts": [[-0.1, 44.2], [0.2, 46.6], [0.2, 44.2], [1.2, 46.6], [1.2, 44.2], [2.2, 46.6], [2.2, 44.2], [3.2, 46.6], [3.2, 44.2], [4.2, 46.6], [4.2, 44.2], [5.2, 46.6], [5.2, 44.2], [6.2, 46.6], [6.2, 44.2], [7.2, 46.6], [7.2, 44.2], [8.2, 46.6], [8.2, 44.2], [9.2, 46.6], [9.2, 44.2], [10.2, 46.6], [10.2, 44.2], [11.2, 46.6], [11.2, 44.2]]}], "6-5": [{"nombre": "Efluente secundario", "dashed": true, "pts": [[2.5, 2.12], [4.4, 7.26], [5.3, 2.79], [6.3, 3.93], [8.6, 1.06], [9.9, 2.26], [10.4, 1.27], [11.6, 1.66], [12.5, 1.06], [13.2, 1.66], [14.3, 1.66], [15.1, 2.79], [15.8, 1.06], [16.6, 1.66], [17.7, 1.76], [18.6, 1.06], [19.6, 1.06], [20.5, 1.06], [21.5, 1.27], [22.0, 0.92], [23.0, 0.74], [24.1, 11.15], [25.0, 1.35], [25.7, 6.25], [26.7, 1.35], [27.5, 1.35], [28.3, 1.59], [29.1, 0.74], [30.3, 0.5], [31.4, 0.62], [32.2, 0.74], [33.0, 0.98], [33.8, 2.34], [34.5, 5.61], [36.4, 0.5], [37.3, 0.71], [38.2, 0.71], [39.1, 0.6], [40.1, 0.71], [40.4, 0.71], [41.0, 1.03], [41.6, 0.66], [42.6, 0.5], [43.5, 1.35], [44.4, 2.31], [45.3, 1.22], [46.1, 0.18], [46.8, 0.84], [48.0, 0.87], [49.1, 0.84], [49.8, 1.22], [50.7, 0.92], [51.6, 1.22], [52.2, 8.09], [52.9, 10.46], [53.9, 13.2], [55.0, 8.09]]}, {"nombre": "Efluente secundario", "dashed": true, "pts": [[5.3, 3.05], [6.2, 2.79], [8.9, 1.06], [9.6, 3.57], [10.6, 2.67], [11.6, 2.92], [12.6, 3.19], [13.3, 3.12], [14.1, 1.92], [15.1, 1.66], [16.0, 2.32], [16.0, 1.79], [16.8, 2.05], [18.0, 2.79], [18.7, 2.18], [19.8, 1.47], [20.5, 2.32], [21.4, 3.19], [22.1, 3.76], [23.0, 2.52], [24.0, 7.16], [25.0, 3.89], [25.8, 4.28], [26.8, 4.65], [27.5, 4.17], [28.3, 2.18], [29.4, 1.1], [31.0, 2.18], [31.9, 7.95], [32.8, 3.4], [33.9, 3.16], [34.5, 3.8], [35.7, 3.48], [36.7, 0.75], [37.3, 2.18], [38.4, 1.2], [39.1, 0.75], [39.9, 2.6], [40.9, 1.2], [52.4, 1.75], [53.2, 3.58], [53.8, 8.8], [55.0, 7.16], [57.7, 1.43], [58.4, 3.4], [59.5, 0.88], [60.4, 0.4], [62.9, 1.32], [63.2, 0.76], [64.2, 1.57], [66.4, 1.18], [67.4, 2.21], [68.2, 1.59], [69.2, 2.21], [70.2, 0.61], [71.0, 3.84], [71.7, 2.0], [72.7, 1.04], [73.9, 1.9], [74.7, 2.71]]}]};

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

  function interpY(pts, x) {
    if (!pts.length) return null;
    if (x <= pts[0][0]) return pts[0][1];
    if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    for (var i = 1; i < pts.length; i++) {
      if (pts[i][0] >= x) {
        var x0 = pts[i - 1][0], y0 = pts[i - 1][1];
        var x1 = pts[i][0], y1 = pts[i][1];
        if (x1 === x0) return y1;
        return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      }
    }
    return pts[pts.length - 1][1];
  }

  function renderXY(host, cfg) {
    var W = 640, H = cfg.H || 360;
    var M = { l: cfg.ml || 64, r: cfg.mr || 24, t: 36, b: 52 };
    var pw = W - M.l - M.r, ph = H - M.t - M.b;

    function sx(x) {
      if (cfg.logX) {
        var u = (Math.log10(x) - Math.log10(cfg.xMin)) / (Math.log10(cfg.xMax) - Math.log10(cfg.xMin));
        return M.l + u * pw;
      }
      return M.l + ((x - cfg.xMin) / (cfg.xMax - cfg.xMin)) * pw;
    }
    function sy(y) {
      if (cfg.logY) {
        var u = (Math.log10(y) - Math.log10(cfg.yMin)) / (Math.log10(cfg.yMax) - Math.log10(cfg.yMin));
        return cfg.invertY ? M.t + u * ph : M.t + ph - u * ph;
      }
      return M.t + ph - ((y - cfg.yMin) / (cfg.yMax - cfg.yMin)) * ph;
    }
    function invX(px) {
      var u = Math.max(0, Math.min(1, (px - M.l) / pw));
      if (cfg.logX) {
        return Math.pow(10, Math.log10(cfg.xMin) + u * (Math.log10(cfg.xMax) - Math.log10(cfg.xMin)));
      }
      return cfg.xMin + u * (cfg.xMax - cfg.xMin);
    }

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'grafica-svg',
      role: 'img',
      tabindex: '0',
      'aria-label': cfg.aria
    });

    var gRet = el('g', { class: 'reticula' }, svg);
    cfg.xTicks.forEach(function (tk) {
      var val = typeof tk === 'object' ? tk.v : tk;
      var lab = typeof tk === 'object' ? tk.l : String(tk);
      var x = sx(val);
      el('line', { x1: x, y1: M.t, x2: x, y2: M.t + ph }, gRet);
      var t = el('text', { x: x, y: M.t + ph + 18, 'text-anchor': 'middle', class: 'marca-eje' }, svg);
      t.textContent = lab;
    });
    cfg.yTicks.forEach(function (tk) {
      var val = typeof tk === 'object' ? tk.v : tk;
      var lab = typeof tk === 'object' ? tk.l : String(tk);
      var y = sy(val);
      el('line', { x1: M.l, y1: y, x2: M.l + pw, y2: y }, gRet);
      var t = el('text', { x: M.l - 8, y: y + 4, 'text-anchor': 'end', class: 'marca-eje' }, svg);
      t.textContent = lab;
    });

    el('rect', { x: M.l, y: M.t, width: pw, height: ph, class: 'marco' }, svg);

    var tx = el('text', { x: M.l + pw / 2, y: H - 10, 'text-anchor': 'middle', class: 'titulo-eje' }, svg);
    tx.textContent = cfg.xLabel;
    var ty = el('text', {
      x: 16, y: M.t + ph / 2,
      'text-anchor': 'middle',
      transform: 'rotate(-90 16 ' + (M.t + ph / 2) + ')',
      class: 'titulo-eje'
    }, svg);
    ty.textContent = cfg.yLabel;

    var gSeries = el('g', null, svg);
    var seriesNodes = [];
    var active = cfg.series.map(function () { return true; });

    cfg.series.forEach(function (s, idx) {
      var g = el('g', { 'data-serie': idx }, gSeries);
      var colVar = 'var(--grafica-serie-' + ((idx % 9) + 1) + ')';
      if (s.tipo === 'puntos') {
        s.pts.forEach(function (p) {
          el('circle', {
            cx: sx(p[0]).toFixed(1),
            cy: sy(p[1]).toFixed(1),
            r: '3.2',
            fill: colVar,
            'fill-opacity': '0.82'
          }, g);
        });
      } else {
        var d = s.pts.map(function (p, i) {
          var px = sx(p[0]), py = sy(p[1]);
          return (i === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1);
        }).join(' ');
        var pAttrs = {
          d: d,
          fill: 'none',
          stroke: colVar,
          'stroke-width': s.w || '2.1',
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round'
        };
        if (s.dashed) pAttrs['stroke-dasharray'] = '6 4';
        el('path', pAttrs, g);
      }
      seriesNodes.push(g);
    });

    var guia = el('line', { x1: M.l, y1: M.t, x2: M.l, y2: M.t + ph, class: 'guia', visibility: 'hidden' }, svg);
    var lienzo = document.createElement('div');
    lienzo.className = 'grafica-lienzo';
    lienzo.appendChild(svg);

    var globo = document.createElement('div');
    globo.className = 'grafica-globo';
    globo.hidden = true;
    lienzo.appendChild(globo);
    host.appendChild(lienzo);

    function showAt(xVal) {
      var px = sx(xVal);
      if (px < M.l || px > M.l + pw) return;
      guia.setAttribute('x1', px.toFixed(1));
      guia.setAttribute('x2', px.toFixed(1));
      guia.setAttribute('visibility', 'visible');

      var lines = ['<strong>' + (cfg.fmtX ? cfg.fmtX(xVal) : xVal.toFixed(2)) + '</strong>'];
      cfg.series.forEach(function (s, idx) {
        if (!active[idx] || s.tipo === 'puntos') return;
        var yVal = s.fn ? s.fn(xVal) : interpY(s.pts, xVal);
        if (yVal != null && isFinite(yVal)) {
          lines.push('<span>' + s.nombre + ': ' + (cfg.fmtY ? cfg.fmtY(yVal) : yVal.toFixed(2)) + '</span>');
        }
      });
      globo.innerHTML = lines.join('<br>');
      globo.hidden = false;
      var pct = ((px - M.l) / pw) * 100;
      globo.style.left = Math.min(82, Math.max(8, pct)) + '%';
      globo.style.top = '8px';
    }

    function hideGlobo() {
      guia.setAttribute('visibility', 'hidden');
      globo.hidden = true;
    }

    var cursorX = (cfg.xMin + cfg.xMax) / 2;
    svg.addEventListener('pointermove', function (e) {
      var rect = svg.getBoundingClientRect();
      var px = ((e.clientX - rect.left) / rect.width) * W;
      if (px >= M.l && px <= M.l + pw) {
        cursorX = invX(px);
        showAt(cursorX);
      } else {
        hideGlobo();
      }
    });
    svg.addEventListener('pointerleave', hideGlobo);
    svg.addEventListener('keydown', function (e) {
      var step = (cfg.xMax - cfg.xMin) / 25;
      if (e.key === 'ArrowRight') { e.preventDefault(); cursorX = Math.min(cfg.xMax, cursorX + step); showAt(cursorX); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); cursorX = Math.max(cfg.xMin, cursorX - step); showAt(cursorX); }
      else if (e.key === 'Escape') { hideGlobo(); }
    });

    if (cfg.series.length > 1) {
      var ley = document.createElement('div');
      ley.className = 'grafica-leyenda';
      cfg.series.forEach(function (s, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-pressed', 'true');
        var dot = document.createElement('span');
        dot.className = 'muestra';
        dot.style.background = 'var(--grafica-serie-' + ((idx % 9) + 1) + ')';
        btn.appendChild(dot);
        btn.appendChild(document.createTextNode(s.nombre));
        btn.addEventListener('click', function () {
          active[idx] = !active[idx];
          btn.setAttribute('aria-pressed', String(active[idx]));
          seriesNodes[idx].style.display = active[idx] ? '' : 'none';
        });
        ley.appendChild(btn);
      });
      host.appendChild(ley);
    }

    if (cfg.nota) {
      var pNota = document.createElement('p');
      pNota.className = 'grafica-nota';
      pNota.textContent = cfg.nota;
      host.appendChild(pNota);
    }

    // Tabla de datos dentro de <nav> para no alterar bloquesDOM()
    var navDatos = document.createElement('nav');
    navDatos.setAttribute('aria-label', 'Datos de la gráfica');
    var det = document.createElement('details');
    var rows = [];
    cfg.series.forEach(function (s) {
      var step = Math.max(1, Math.floor(s.pts.length / 12));
      for (var i = 0; i < s.pts.length; i += step) {
        var p = s.pts[i];
        rows.push('<tr><td>' + s.nombre + '</td><td class="n">' + p[0] + '</td><td class="n">' + p[1] + '</td></tr>');
      }
    });
    det.innerHTML = '<summary>Datos de la gráfica</summary><table><thead><tr><th>Serie</th><th>' + cfg.xLabel + '</th><th>' + cfg.yLabel + '</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>';
    navDatos.appendChild(det);
    host.appendChild(navDatos);
  }

  function render38(host) {
    var ds = [
      { d: 0, nombre: 'Flujo pistón (d = 0)' },
      { d: 0.0625, nombre: 'd = 0.0625' },
      { d: 0.1, nombre: 'd = 0.1' },
      { d: 0.25, nombre: 'd = 0.25' },
      { d: 0.5, nombre: 'd = 0.5' },
      { d: 1, nombre: 'd = 1' },
      { d: 2, nombre: 'd = 2' },
      { d: 4, nombre: 'd = 4' },
      { d: Infinity, nombre: 'Mezcla completa (d = ∞)' }
    ];
    var series = ds.map(function (item) {
      var pts = [];
      for (var kt = 0.5; kt <= 8.2; kt += 0.25) {
        var pct = wehnerWilhelm(kt, item.d);
        if (pct >= 1.8 && pct <= 62) pts.push([Number(pct.toFixed(2)), Number(kt.toFixed(2))]);
      }
      return { nombre: item.nombre, pts: pts };
    });
    renderXY(host, {
      aria: 'Relación entre kt y el porcentaje de remoción Se/Si (Wehner y Wilhelm)',
      xMin: 2, xMax: 65, logX: true,
      yMin: 1, yMax: 8.4,
      xTicks: [2, 4, 6, 8, 10, 20, 40, 60],
      yTicks: [2, 4, 6, 8],
      xLabel: '% de remoción Se/Si',
      yLabel: 'Valor de kt',
      fmtX: function (v) { return 'Se/Si = ' + v.toFixed(1) + ' %'; },
      fmtY: function (v) { return 'kt = ' + v.toFixed(2); },
      series: series
    });
  }

  function init() {
    var hosts = document.querySelectorAll('.grafica-libro[data-grafica]');
    hosts.forEach(function (host) {
      var id = host.getAttribute('data-grafica');
      if (id === 'l27-2-14') {
        renderXY(host, {
          aria: 'Curvas de concentración contra tiempo adimensional para flujo pistón disperso',
          xMin: 0, xMax: 2.8, yMin: 0, yMax: 1.8,
          xTicks: [0, 0.5, 1.0, 1.5, 2.0, 2.5], yTicks: [0, 0.5, 1.0, 1.5],
          xLabel: 't / τ (tiempo adimensional)', yLabel: 'C / C₀',
          series: DATA['2-14']
        });
      } else if (id === 'l27-2-15') {
        renderXY(host, {
          aria: 'Comparación de coliformes fecales en flujo completamente mezclado y flujo pistón',
          xMin: 0, xMax: 30, yMin: 58000, yMax: 92000,
          xTicks: [0, 5, 10, 15, 20, 25, 30], yTicks: [60000, 70000, 80000, 90000],
          xLabel: 'Día', yLabel: 'Bact / 100 mL (mezcla completa)',
          series: DATA['2-15']
        });
      } else if (id === 'l27-2-16') {
        renderXY(host, {
          aria: 'Comparación de DBO en flujo completamente mezclado y flujo pistón',
          xMin: 0, xMax: 30, yMin: 62, yMax: 65.2,
          xTicks: [0, 5, 10, 15, 20, 25, 30], yTicks: [62, 63, 64, 65],
          xLabel: 'Día', yLabel: 'DBO (mg/L)',
          series: DATA['2-16']
        });
      } else if (id === 'l27-3-7') {
        renderXY(host, {
          aria: 'Carga superficial permisible en función de la temperatura',
          xMin: -18, xMax: 36, yMin: 0, yMax: 1000,
          xTicks: [-15, 0, 15, 30], yTicks: [0, 200, 400, 600, 800, 1000],
          xLabel: 'Temperatura (°C)', yLabel: 'Carga superficial (kg DBO / ha d)',
          fmtX: function (t) { return t.toFixed(1) + ' °C (' + (t * 9 / 5 + 32).toFixed(1) + ' °F)'; },
          series: DATA['3-7'].series
        });
      } else if (id === 'l27-3-8') {
        render38(host);
      } else if (id === 'l27-3-9') {
        renderXY(host, {
          aria: 'DQO total removida contra carga orgánica',
          xMin: 0, xMax: 1000, yMin: 0, yMax: 1000,
          xTicks: [100, 300, 500, 700, 900], yTicks: [100, 300, 500, 700, 900],
          xLabel: 'Carga (kg / ha d)', yLabel: 'DQO removida (kg / ha d)',
          series: DATA['3-9']
        });
      } else if (id === 'l27-3-13') {
        var meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        renderXY(host, {
          aria: 'Variación estacional del conteo de algas',
          xMin: 0, xMax: 11.5, yMin: 0, yMax: 4500,
          xTicks: meses.map(function (m, i) { return { v: i, l: m }; }),
          yTicks: [0, 1000, 2000, 3000, 4000],
          xLabel: 'Meses', yLabel: 'Conteo de algas (células/mm³)',
          fmtX: function (v) { return meses[Math.max(0, Math.min(11, Math.round(v)))]; },
          series: DATA['3-13']
        });
      } else if (id === 'l27-4-2') {
        renderXY(host, {
          aria: 'Conductividad hidráulica k en función del contenido de agua W',
          xMin: 13, xMax: 27, yMin: 4e-8, yMax: 1.5e-6, logY: true, invertY: true,
          xTicks: [13, 15, 17, 19, 21, 23, 25, 27],
          yTicks: [{ v: 5e-8, l: '5×10⁻⁸' }, { v: 1e-7, l: '1×10⁻⁷' }, { v: 5e-7, l: '5×10⁻⁷' }, { v: 1e-6, l: '1×10⁻⁶' }],
          xLabel: 'W (%)', yLabel: 'k (cm/s)',
          fmtY: function (v) { return v.toExponential(2) + ' cm/s'; },
          series: DATA['4-2'].top
        });
        renderXY(host, {
          aria: 'Peso volumétrico seco en función del contenido de agua W',
          H: 260,
          xMin: 13, xMax: 27, yMin: 1580, yMax: 1720,
          xTicks: [13, 15, 17, 19, 21, 23, 25, 27], yTicks: [1600, 1640, 1680, 1720],
          xLabel: 'W (%)', yLabel: 'γd (kg/m³)',
          series: DATA['4-2'].bot
        });
      } else if (id === 'l27-5-1') {
        renderXY(host, {
          aria: 'Crecimiento modular del gasto de aguas residuales en el horizonte de diseño',
          xMin: 0, xMax: 20, yMin: 0, yMax: 70,
          xTicks: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20], yTicks: [0, 10, 20, 30, 40, 50, 60, 70],
          xLabel: 'Año', yLabel: 'Gasto (L/s)',
          series: DATA['5-1']
        });
      } else if (id === 'l27-6-5') {
        renderXY(host, {
          aria: 'Evolución de nitrógeno total Kjeldahl (NYK) en efluente secundario y de laguna',
          xMin: 0, xMax: 100, yMin: 0, yMax: 21,
          xTicks: [
            { v: 0, l: 'Ago-81' }, { v: 14, l: 'Sep-82' }, { v: 26, l: 'Oct-83' },
            { v: 38, l: 'Nov-83' }, { v: 50, l: 'Dic-83' }, { v: 62, l: 'Ene-87' },
            { v: 74, l: 'Feb-88' }, { v: 86, l: 'Abr-89' }, { v: 98, l: 'Jun-91' }
          ],
          yTicks: [0, 5, 10, 15, 20],
          xLabel: 'Mes / año', yLabel: 'NYK (mg/L)',
          series: DATA['6-5']
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
