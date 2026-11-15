#!/usr/bin/env node
// Genera los iconos de la PWA a partir de la cara de Darwin del sitio (img/darwin-cara.svg).
// Uso: node anki/herramientas/iconos.mjs      (necesita Playwright; los PNG se versionan en anki/img/)
//
// Pixel art: cada celda del SVG (11 × 11) se escala por un entero para que quede nítida.
//   icono-192.png, icono-512.png        propósito «any» (con margen)
//   icono-maskable-512.png              propósito «maskable» (zona segura del 80 %)
//   apple-touch-icon.png (180)          iOS no admite SVG ni transparencia
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FONDO = "#f8f4e6"; // --bg del tema claro (css/base.css)
const ICONOS = [
  { archivo: "icono-192.png", lado: 192, celda: 15 },
  { archivo: "icono-512.png", lado: 512, celda: 40 },
  { archivo: "icono-maskable-512.png", lado: 512, celda: 33 },
  { archivo: "apple-touch-icon.png", lado: 180, celda: 14 },
];

function cargarPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require("playwright");
  } catch {
    const global = execSync("npm root -g").toString().trim();
    return require(require.resolve("playwright", { paths: [global] }));
  }
}

const svg = fs.readFileSync(path.join(RAIZ, "img", "darwin-cara.svg"));
const origen = `data:image/svg+xml;base64,${svg.toString("base64")}`;
const { chromium } = cargarPlaywright();
const navegador = await chromium.launch();
fs.mkdirSync(path.join(RAIZ, "anki", "img"), { recursive: true });
for (const { archivo, lado, celda } of ICONOS) {
  const pagina = await navegador.newPage({ viewport: { width: lado, height: lado }, deviceScaleFactor: 1 });
  await pagina.setContent(`<body style="margin:0;background:${FONDO}"><div style="width:${lado}px;height:${lado}px;display:grid;place-items:center"><img src="${origen}" style="width:${celda * 11}px;height:${celda * 11}px;image-rendering:pixelated"></div></body>`);
  await pagina.screenshot({ path: path.join(RAIZ, "anki", "img", archivo), clip: { x: 0, y: 0, width: lado, height: lado } });
  await pagina.close();
  console.log(`✓ anki/img/${archivo} (${lado}×${lado})`);
}
await navegador.close();
