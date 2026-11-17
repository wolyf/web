#!/usr/bin/env node
// Valida el texto de trabajo del tablero antes de sellarlo (no necesita credenciales).
//
//   node tablero/herramientas/validar.mjs
//
// Los elementos viven en .privado/tablero/datos/tablero.html (JSON; ignorado por git). Flujo para
// cambiarlos: editar ese archivo, validarlo con este comando y sellarlo con
// «npm run sesion -- sellar tablero» (genera tablero/datos/tablero.enc, que es lo que se sube).
// En una sesión nueva ese archivo no existe: «npm run sesion -- abrir tablero» lo recupera.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as N from "../js/nucleo.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ARCHIVO = path.join(RAIZ, ".privado", "tablero", "datos", "tablero.html");

export function zonasReales() {
  const registro = JSON.parse(fs.readFileSync(path.join(RAIZ, "proyectos.json"), "utf8"));
  return [N.GENERAL, ...Object.keys(registro.proyectos)];
}

// → { errores, total } o null si no hay texto de trabajo
export function validarArchivo(archivo = ARCHIVO) {
  if (!fs.existsSync(archivo)) return null;
  let datos;
  try {
    datos = JSON.parse(fs.readFileSync(archivo, "utf8"));
  } catch (e) {
    return { errores: [`no es JSON válido: ${e.message}`], total: 0 };
  }
  return { errores: N.validar(datos, zonasReales()), total: datos.items?.length ?? 0 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = validarArchivo();
  if (!r) {
    console.error("✗ No hay texto de trabajo: corre «npm run sesion -- abrir tablero» (necesita SITIO_USUARIO y SITIO_CONTRASENA).");
    process.exit(1);
  }
  if (r.errores.length) {
    for (const e of r.errores) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log(`✓ ${r.total} elemento(s) válidos. Siguiente: npm run sesion -- sellar tablero`);
}
