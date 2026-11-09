// ============================================================
//  Llaves de la sesión del sitio (zona general)
// ============================================================
//
// El sitio es estático y el repositorio es público: no hay servidor que
// revise contraseñas. Por eso «iniciar sesión» significa obtener una
// llave, y lo privado se publica cifrado con ella.
//
//   K     = llave del sitio (32 bytes aleatorios). Nunca se publica.
//   KEK_u = PBKDF2-SHA256(contraseña_u, sal_u, 600 000 iteraciones)
//
// datos/acceso.json guarda, por usuario, K envuelta con su KEK
// (AES-256-GCM). Sin una contraseña válida, K es inalcanzable.
//
// Con K se descifran los fragmentos privados de cualquier página:
//
//   fragmento.enc = "WRF1" ‖ iv (12 bytes) ‖ AES-256-GCM(K_f, gzip(texto))
//   K_f           = HKDF-SHA256(K, info = "wr-fragmentos")
//
// y cada proyecto puede pedir su propia llave derivada (para envolver
// la llave de sus datos, como hace el catálogo):
//
//   K_p = HKDF-SHA256(K, info = "wr-proyecto:" ‖ id)
//
// El mismo módulo corre en el navegador y en Node ≥ 20.

const subtle = globalThis.crypto.subtle;
const codificador = new TextEncoder();
const decodificador = new TextDecoder();

export const FORMATO = "sitio-wr-acceso";
export const ITERACIONES = 600_000;
export const MAGIA_FRAGMENTO = "WRF1";
const MAGIA = codificador.encode(MAGIA_FRAGMENTO);
const LARGO_IV = 12;
const PREFIJO_USUARIO = "sitio-wr:";

export class ErrorAcceso extends Error {
  constructor() {
    super("Usuario o contraseña incorrectos");
    this.name = "ErrorAcceso";
  }
}

// ---- Codificación ----

export const aHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

// Solo para valores cortos (llaves, sales, vectores de inicialización)
export const aB64 = (bytes) => btoa(String.fromCharCode(...bytes));
export const deB64 = (texto) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

export const aleatorio = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));
export const nuevaLlave = () => aleatorio(32);

// ---- Compresión ----

async function transformar(bytes, flujo) {
  const salida = new Blob([bytes]).stream().pipeThrough(flujo);
  return new Uint8Array(await new Response(salida).arrayBuffer());
}

const comprimir = (bytes) => transformar(bytes, new CompressionStream("gzip"));
const descomprimir = (bytes) => transformar(bytes, new DecompressionStream("gzip"));

// ---- Primitivas ----

const llaveAES = (bytes, usos) => subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, usos);

// HKDF-SHA256 de 32 bytes a partir de la llave del sitio
export async function derivar(llave, info) {
  const base = await subtle.importKey("raw", llave, "HKDF", false, ["deriveBits"]);
  const bits = await subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: codificador.encode(info) },
    base,
    256,
  );
  return new Uint8Array(bits);
}

// Llave propia de un proyecto (p. ej. para envolver la llave de sus datos)
export const llaveProyecto = (llave, id) => derivar(llave, `wr-proyecto:${id}`);

// Huella corta de la llave: permite comparar llaves sin revelarlas
export async function huella(llave) {
  return aHex(new Uint8Array(await subtle.digest("SHA-256", llave))).slice(0, 16);
}

// ---- Usuarios ----

export const normalizarUsuario = (usuario) => String(usuario ?? "").normalize("NFKC").trim().toLowerCase();

// acceso.json no guarda nombres de usuario, solo este resumen
export async function idUsuario(usuario) {
  const resumen = await subtle.digest("SHA-256", codificador.encode(PREFIJO_USUARIO + normalizarUsuario(usuario)));
  return aHex(new Uint8Array(resumen));
}

export async function derivarKEK(contrasena, sal, iteraciones = ITERACIONES) {
  const base = await subtle.importKey(
    "raw",
    codificador.encode(String(contrasena).normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: iteraciones },
    base,
    256,
  );
  return new Uint8Array(bits);
}

// Entrada de acceso.json para un usuario: K envuelta con su contraseña
export async function entradaUsuario(llave, usuario, contrasena, iteraciones = ITERACIONES) {
  const id = await idUsuario(usuario);
  const sal = aleatorio(16);
  const kek = await derivarKEK(contrasena, sal, iteraciones);
  const iv = aleatorio(LARGO_IV);
  const envuelta = new Uint8Array(
    await subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: codificador.encode(id) },
      await llaveAES(kek, ["encrypt"]),
      llave,
    ),
  );
  return { id, entrada: { sal: aB64(sal), iteraciones, iv: aB64(iv), llave: aB64(envuelta) } };
}

// Inicio de sesión: devuelve K o lanza ErrorAcceso
export async function entrar(acceso, usuario, contrasena) {
  const id = await idUsuario(usuario);
  const entrada = acceso?.usuarios?.[id];
  const iteraciones = entrada?.iteraciones ?? acceso?.kdf?.iteraciones ?? ITERACIONES;
  // Si el usuario no existe se deriva de todos modos, para que el tiempo
  // de respuesta no delate qué usuarios existen.
  const kek = await derivarKEK(contrasena, entrada ? deB64(entrada.sal) : aleatorio(16), iteraciones);
  if (!entrada) throw new ErrorAcceso();
  let llave;
  try {
    llave = new Uint8Array(
      await subtle.decrypt(
        { name: "AES-GCM", iv: deB64(entrada.iv), additionalData: codificador.encode(id) },
        await llaveAES(kek, ["decrypt"]),
        deB64(entrada.llave),
      ),
    );
  } catch {
    throw new ErrorAcceso();
  }
  if (acceso.huella && (await huella(llave)) !== acceso.huella) throw new ErrorAcceso();
  return llave;
}

// ---- Fragmentos privados ----

export const esFragmento = (bytes) => bytes.length > MAGIA.length + LARGO_IV && MAGIA.every((b, i) => bytes[i] === b);

export async function cifrarFragmento(texto, llave) {
  const iv = aleatorio(LARGO_IV);
  const plano = await comprimir(codificador.encode(texto));
  const kf = await llaveAES(await derivar(llave, "wr-fragmentos"), ["encrypt"]);
  const cifrado = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv, additionalData: MAGIA }, kf, plano));
  const salida = new Uint8Array(MAGIA.length + LARGO_IV + cifrado.length);
  salida.set(MAGIA, 0);
  salida.set(iv, MAGIA.length);
  salida.set(cifrado, MAGIA.length + LARGO_IV);
  return salida;
}

export async function descifrarFragmento(datos, llave) {
  const bytes = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
  if (!esFragmento(bytes)) throw new Error("No es un fragmento cifrado del sitio");
  const iv = bytes.subarray(MAGIA.length, MAGIA.length + LARGO_IV);
  const kf = await llaveAES(await derivar(llave, "wr-fragmentos"), ["decrypt"]);
  const plano = await subtle.decrypt(
    { name: "AES-GCM", iv, additionalData: MAGIA },
    kf,
    bytes.subarray(MAGIA.length + LARGO_IV),
  );
  return decodificador.decode(await descomprimir(new Uint8Array(plano)));
}
