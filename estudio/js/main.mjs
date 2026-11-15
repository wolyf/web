// Arranque del Espacio de estudio: cada página dice cuál es en <body data-pagina="…">.
// js/tema.js ya cargó js/sesion.mjs; este import es el mismo módulo.
import { sesion } from "../../js/sesion.mjs";
import { cargarDatos, crearConexion, montarInicio, montarLectura, montarMateria } from "./app.mjs";

const doc = document;
const raiz = doc.getElementById("estudio-raiz");
const pagina = doc.body.dataset.pagina;

if (raiz && pagina) {
  const base = new URL("../datos/", import.meta.url);
  const urlAcceso = new URL("../../datos/acceso.json", import.meta.url);
  try {
    const datos = await cargarDatos(base);
    const conexion = crearConexion({ sesion, urlAcceso });
    const contexto = { doc, datos, conexion, sesion };
    if (pagina === "inicio") montarInicio(raiz, contexto);
    else if (pagina === "materia") montarMateria(raiz, { ...contexto, id: new URLSearchParams(location.search).get("m") ?? "" });
    else if (pagina === "lectura") montarLectura(raiz, { ...contexto, materia: doc.body.dataset.materia, fuente: doc.body.dataset.fuente });
  } catch (error) {
    console.warn("Estudio:", error);
    raiz.textContent = "No se pudieron cargar los datos del espacio de estudio.";
  }
}
