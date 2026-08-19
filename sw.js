// -----------------------------------------------------------------------------
// Service Worker de TableSense AI — PWA instalable.
// -----------------------------------------------------------------------------
// Objetivo realista para esta app: permitir que se pueda "Añadir a pantalla
// de inicio" (iOS/Android) y que la interfaz cargue rápido en visitas
// repetidas. NO pretende que la app funcione totalmente offline: la cámara,
// la detección y los datos reales necesitan red (Supabase) y las librerías
// de visión artificial se cargan desde CDN. Por eso solo se cachea el
// "app shell" (HTML/CSS/JS/iconos propios), nunca las llamadas a Supabase ni
// los recursos de terceros.

const CACHE_NAME = "tablesense-shell-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/style.css",
  "/manifest.json",
  "/js/app.js",
  "/js/auth.js",
  "/js/supabaseClient.js",
  "/js/tablesRepo.js",
  "/js/historyRepo.js",
  "/js/detection.js",
  "/js/analyticsEngine.js",
  "/js/statusConstants.js",
  "/js/demoEngine.js",
  "/js/realEngine.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Solo gestionamos peticiones propias (mismo origen). Todo lo demás
  // (Supabase, CDNs de Chart.js/TensorFlow.js) va directo a red.
  if (url.origin !== self.location.origin) return;

  // Nunca cachear el archivo de configuración: debe reflejar siempre las
  // variables de entorno del último build.
  if (url.pathname.endsWith("/js/config.js")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
