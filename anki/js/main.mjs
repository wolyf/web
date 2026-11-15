// Arranque del Anki personal: pasa a la interfaz la sesión real del sitio y registra el service
// worker (PWA: abrir sin red una vez visitado en línea). js/tema.js ya cargó js/sesion.mjs; este
// import es el mismo módulo.
import { sesion } from "../../js/sesion.mjs";
import { montar } from "./app.mjs";

const raiz = document.getElementById("anki-raiz");
if (raiz) montar(raiz, { sesion });

// El service worker exige contexto seguro (https, o localhost para probar). Si falla, la página
// funciona igual: solo se pierde el arranque sin red.
const contextoSeguro = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
if ("serviceWorker" in navigator && contextoSeguro) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch((error) => console.warn("Anki: sin service worker:", error.message));
  });
}
