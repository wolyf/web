// Arranque del Anki personal: pasa a la interfaz la sesión real del sitio.
// (js/tema.js ya cargó js/sesion.mjs; este import es el mismo módulo.)
import { sesion } from "../../js/sesion.mjs";
import { montar } from "./app.mjs";

const raiz = document.getElementById("anki-raiz");
if (raiz) montar(raiz, { sesion });
