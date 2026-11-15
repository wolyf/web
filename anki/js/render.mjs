// ============================================================
//  Anki personal: texto de tarjeta con fórmulas (núcleo puro)
// ============================================================
//
// El texto de una tarjeta es TEXTO PLANO con fórmulas LaTeX entre delimitadores. Este formato
// queda guardado en las tarjetas, así que no cambia sin migración. Delimitadores:
//
//   $…$     fórmula en línea   (reglas de pandoc, para que «cuesta $5 y $10» siga siendo texto:
//                               tras el «$» de apertura no hay espacio, el «$» de cierre no
//                               va precedido de espacio ni seguido de un dígito)
//   $$…$$   fórmula en bloque
//   \(…\)   en línea, \[…\] en bloque (los de Anki: se aceptan tal cual)
//   \$      un dólar literal
//
// Nada de esto es HTML: quien pinta usa SIEMPRE textContent para el texto y KaTeX para las
// fórmulas (katex.render con trust desactivado). Una fórmula dentro de un hueco de cloze
// ({{c1::$x^2$}}) funciona; un hueco dentro de una fórmula ($x{{c1::2}}$) no.

const esEspacio = (c) => c === undefined || /\s/.test(c);
const esDigito = (c) => c !== undefined && c >= "0" && c <= "9";

// Cierre del «$» abierto en `i`: índice del «$» que cierra, o -1.
function cierreEnLinea(texto, i) {
  if (esEspacio(texto[i + 1]) || texto[i + 1] === "$") return -1;
  for (let j = i + 1; j < texto.length; j++) {
    const c = texto[j];
    if (c === "\\") j++;
    else if (c === "$" && !esEspacio(texto[j - 1]) && !esDigito(texto[j + 1])) return j;
  }
  return -1;
}

// → [{ t: "texto", v } | { t: "mat", v, bloque }] en orden; v de «mat» es el LaTeX sin delimitadores.
export function partirMath(texto) {
  const entrada = String(texto ?? "");
  const salida = [];
  let buffer = "";
  const volcar = () => {
    if (buffer) salida.push({ t: "texto", v: buffer });
    buffer = "";
  };
  const formula = (v, bloque) => {
    volcar();
    salida.push({ t: "mat", v, bloque });
  };
  let i = 0;
  while (i < entrada.length) {
    const c = entrada[i];
    if (c === "\\") {
      const sig = entrada[i + 1];
      if (sig === "$") {
        buffer += "$";
        i += 2;
        continue;
      }
      if (sig === "(" || sig === "[") {
        const fin = entrada.indexOf(sig === "(" ? "\\)" : "\\]", i + 2);
        if (fin > i + 2 && entrada.slice(i + 2, fin).trim()) {
          formula(entrada.slice(i + 2, fin), sig === "[");
          i = fin + 2;
          continue;
        }
      }
      buffer += c;
      i++;
      continue;
    }
    if (c === "$") {
      if (entrada[i + 1] === "$") {
        const fin = entrada.indexOf("$$", i + 2);
        if (fin > i + 2 && entrada.slice(i + 2, fin).trim()) {
          formula(entrada.slice(i + 2, fin), true);
          i = fin + 2;
          continue;
        }
      } else {
        const fin = cierreEnLinea(entrada, i);
        if (fin > i + 1) {
          formula(entrada.slice(i + 1, fin), false);
          i = fin + 1;
          continue;
        }
      }
    }
    buffer += c;
    i++;
  }
  volcar();
  return salida;
}

// Mismo texto con los delimitadores de Anki (\(…\) y \[…\]), para exportar. Los dólares
// literales (\$) pasan a «$», que Anki trata como texto.
export function aDelimitadoresAnki(texto) {
  return partirMath(texto)
    .map((s) => (s.t === "texto" ? s.v : s.bloque ? `\\[${s.v}\\]` : `\\(${s.v}\\)`))
    .join("");
}
