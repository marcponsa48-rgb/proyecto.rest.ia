# TableSense AI

Aplicación real de gestión inteligente de mesas para restaurantes: detección
de presencia de personas por cámara (visión artificial en el navegador),
estados de mesa, historial real, analítica y estimación de oportunidades
económicas — lista para desplegar en Netlify y usar desde ordenador, tablet
o iPhone/Android.

No es una demo ni una prueba de concepto: el **Modo real** usa cuentas de
usuario reales, base de datos real (Supabase/PostgreSQL) y detección de
personas real con TensorFlow.js. El **Modo demo** existe aparte, claramente
señalado en la interfaz, para poder probar la aplicación sin crear una
cuenta ni configurar nada.

---

## 1. Qué necesitas antes de desplegar

- Una cuenta gratuita en [Supabase](https://supabase.com).
- Una cuenta gratuita en [Netlify](https://www.netlify.com).
- Un repositorio Git (GitHub/GitLab/Bitbucket) con este proyecto, o el
  proyecto listo para arrastrar a Netlify Drop.

No hace falta ningún backend propio: Supabase actúa como base de datos y
sistema de autenticación; Netlify sirve los archivos estáticos y ejecuta el
pequeño script de build que inyecta la configuración.

---

## 2. Crear el proyecto en Supabase

1. Entra en [supabase.com](https://supabase.com) → **New project**.
2. Elige nombre, contraseña de base de datos (guárdala) y región. Espera a
   que el proyecto termine de aprovisionarse (1-2 minutos).
3. En el menú lateral, abre **SQL Editor** → **New query**.
4. Copia y pega el contenido completo de [`supabase/schema.sql`](supabase/schema.sql)
   de este repositorio y pulsa **Run**.
5. Comprueba en **Table Editor** que se han creado tres tablas:
   - `restaurants`
   - `tables`
   - `table_sessions`
   y que en cada una aparece **RLS enabled** (Row Level Security). El propio
   script ya crea las políticas necesarias; no hay que añadir nada más a
   mano. En resumen, las políticas garantizan que:
   - Cada usuario solo puede leer/crear/editar/borrar su **propio**
     restaurante (`owner_id = auth.uid()`).
   - Cada usuario solo puede leer/crear/editar/borrar las **mesas** y el
     **historial** que pertenecen a su propio restaurante.
   - Un restaurante nunca puede ver datos de otro, aunque compartan la
     misma base de datos.
6. Ve a **Authentication → Providers** y confirma que **Email** está
   habilitado (lo está por defecto). Si quieres exigir verificación por
   email antes de poder iniciar sesión, actívalo en **Authentication →
   Settings**; si prefieres que los usuarios puedan entrar nada más
   registrarse, desactívalo. Ambas opciones funcionan con esta app.
7. Ve a **Project Settings → API** y copia dos valores (los necesitarás en
   el paso 3):
   - **Project URL** → esto es `SUPABASE_URL`.
   - **anon public key** → esto es `SUPABASE_ANON_KEY`.

   Importante: la `anon key` es pública por diseño (así lo indica el propio
   panel de Supabase) y es segura de incluir en el frontend porque la
   protección real de los datos la da RLS, no el secreto de la clave. **No
   copies nunca la `service_role key`**: esa sí es privada, nunca debe
   usarse en el navegador y esta aplicación no la necesita en ningún punto.

---

## 3. Configurar las variables de entorno en Netlify

1. En Netlify, **Add new site → Import an existing project** y conecta tu
   repositorio (o usa Netlify Drop si prefieres subir la carpeta
   directamente, pero entonces tendrás que generar `js/config.js` a mano
   siguiendo el paso 4b).
2. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `.`
3. Antes de desplegar, ve a **Site configuration → Environment variables**
   y añade exactamente estas dos:

   | Variable            | Valor                                   |
   |---------------------|------------------------------------------|
   | `SUPABASE_URL`      | El *Project URL* copiado en el paso 2.7  |
   | `SUPABASE_ANON_KEY` | La *anon public key* copiada en el paso 2.7 |

4. Despliega (**Deploy site**). El build ejecuta `node build-config.js`,
   que genera `js/config.js` a partir de esas variables — este archivo no
   se sube al repositorio (está en `.gitignore`) porque se regenera en cada
   build.

### 4b. Desarrollo local / despliegue sin CI

Si quieres probarlo en tu ordenador o desplegar sin que Netlify ejecute el
build:

```bash
cp js/config.example.js js/config.js
```

y edita `js/config.js` sustituyendo `__SUPABASE_URL__` y
`__SUPABASE_ANON_KEY__` por tus valores reales. Después sirve la carpeta
con cualquier servidor estático, por ejemplo:

```bash
npx http-server . -p 8080
```

y abre `http://localhost:8080`. (Abrir `index.html` directamente con
`file://` no funciona: los navegadores bloquean los módulos ES por CORS en
ese protocolo; necesitas servirlo por HTTP/HTTPS, igual que hace Netlify.)

---

## 4. Qué pasa si no configuras Supabase

Si despliegas sin las variables de entorno, la aplicación no falla ni se
queda en blanco: muestra una pantalla explicando que falta la configuración
y ofrece un botón para **"Continuar en modo demo"**, para poder ver y
probar la interfaz igualmente. El **Modo real** (cuentas, base de datos,
detección real con historial persistente) solo queda disponible una vez
configuradas las variables anteriores.

---

## 5. Cómo funciona la detección de presencia (visión artificial real)

- La cámara se activa con `getUserMedia` y el vídeo se procesa **siempre en
  el propio navegador**, fotograma a fotograma. Ningún vídeo ni imagen se
  envía nunca a un servidor, ni se almacena en ningún sitio.
- La detección de personas usa [TensorFlow.js](https://www.tensorflow.org/js)
  con el modelo preentrenado [COCO-SSD](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd)
  (variante `lite_mobilenet_v2`, cargado desde CDN), que reconoce la clase
  genérica "person" con una puntuación de confianza. Es un detector de
  objetos, no un sistema de reconocimiento facial ni biométrico: no
  identifica quién es una persona, solo si hay una persona presente.
- Cada mesa tiene una **zona de detección** (rectángulo X/Y/ancho/alto,
  definido en % sobre la imagen) configurable arrastrando directamente
  sobre el vídeo de la cámara, sin tocar código. Una persona detectada
  "está en la mesa" cuando su caja delimitadora se solapa con esa zona por
  encima de un umbral configurable (`min_overlap_ratio`).
- Para evitar falsos positivos por fotogramas sueltos, un **filtro
  temporal** exige presencia (o ausencia) sostenida antes de cambiar el
  estado: por defecto, confirma "ocupada" tras 2 segundos de presencia
  continuada y confirma "libre" tras 10 segundos sin detección. Ambos
  umbrales son configurables por restaurante desde **Ajustes**.
- La detección automática **solo** decide la transición OCUPADA ↔ LIBRE.
  Los estados TERMINANDO, LIMPIANDO y DISPONIBLE dependen siempre de una
  acción del personal (botones en la app), porque un modelo de "hay
  persona / no hay persona" no puede saber de forma fiable si una mesa está
  terminando la comida, si ya se ha limpiado o si está lista para nuevos
  clientes.

---

## 6. Modo real vs. Modo demo

- **Modo real** (por defecto): requiere iniciar sesión, usa la base de
  datos real de Supabase, la detección real de la cámara y el historial
  persistente. Nunca usa datos simulados ni inventados: si todavía no hay
  datos suficientes, la app lo dice explícitamente ("Datos insuficientes
  para generar este análisis.", "Necesitamos más datos para calcular una
  estimación.") en vez de mostrar cifras falsas.
- **Modo demo**: pensado para probar la interfaz sin cuenta. Genera datos
  de ejemplo localmente en el navegador (nunca se guardan en Supabase) y
  está señalado de forma permanente y visible con una etiqueta "MODO DEMO"
  en la barra superior, para que nunca se confunda con datos reales de un
  restaurante.
- Se puede cambiar entre ambos desde **Ajustes** (con cuenta) o desde la
  pantalla de acceso ("Probar en modo demo").

---

## 7. Privacidad

- El vídeo se procesa localmente y no se almacena.
- No se guardan imágenes ni fotogramas de vídeo en ningún servidor ni base
  de datos.
- No se realiza reconocimiento facial ni identificación de personas: solo
  se detecta la presencia genérica de "una persona" dentro de una zona.
- El historial guardado (`table_sessions`) contiene únicamente
  identificadores de mesa y marcas de tiempo (hora de entrada, hora de
  salida, duración) — nunca contenido visual.
- El vídeo nunca se envía a servidores externos: todo el procesamiento de
  imagen ocurre en el propio dispositivo del usuario.

Esta información también está visible dentro de la app, en la sección
**Ajustes → Privacidad**.

---

## 8. Seguridad

- No hay ninguna clave privada ni `service_role key` en el frontend; solo
  la `anon key` pública, protegida por Row Level Security.
- Autenticación real vía Supabase Auth (email + contraseña), con
  recuperación de contraseña por email.
- Autorización real vía RLS: cada consulta a la base de datos está filtrada
  a nivel de PostgreSQL por el usuario autenticado, no solo por lógica de
  la interfaz.
- Los formularios validan los datos antes de enviarlos (email válido,
  contraseña mínima, números de mesa únicos, parámetros numéricos dentro de
  rango).

---

## 9. Progressive Web App (PWA)

La aplicación incluye `manifest.json` e íconos, y un service worker
(`sw.js`) que cachea el "app shell" (HTML/CSS/JS/íconos propios) para
cargas más rápidas en visitas repetidas. Cámara, detección y datos
reales siguen necesitando red (no es una app 100% offline).

Para instalarla en iPhone: abre el sitio con Safari → botón compartir →
**"Añadir a pantalla de inicio"**. En Android/Chrome, el navegador
ofrecerá automáticamente instalar la app.

---

## 10. Estructura del proyecto

```
├── index.html              # Interfaz completa (auth, dashboard, mesas, cámara, analítica, ajustes)
├── style.css                # Estilos (responsive: escritorio/tablet/móvil)
├── manifest.json             # Manifest PWA
├── sw.js                     # Service worker (cachea el app shell)
├── build-config.js           # Genera js/config.js desde variables de entorno (build de Netlify)
├── netlify.toml               # Configuración de build/redirects/headers para Netlify
├── package.json
├── supabase/
│   └── schema.sql             # Esquema completo + RLS (ejecutar una vez en Supabase)
├── js/
│   ├── config.example.js      # Plantilla (config.js real se genera en el build, no se sube al repo)
│   ├── supabaseClient.js       # Cliente Supabase (carga perezosa del SDK)
│   ├── auth.js                 # Login/registro/logout/recuperación de contraseña
│   ├── tablesRepo.js           # CRUD de mesas contra Supabase
│   ├── historyRepo.js          # Historial real de sesiones de mesa
│   ├── detection.js             # Visión artificial (TensorFlow.js + COCO-SSD) y filtro temporal
│   ├── analyticsEngine.js        # Cálculo de estadísticas/problemas/oportunidades a partir de datos reales
│   ├── statusConstants.js         # Estados de mesa y utilidades de formato
│   ├── demoEngine.js               # Motor de datos del Modo demo (aislado, nunca usado en Modo real)
│   ├── realEngine.js                # Motor de datos del Modo real (Supabase)
│   └── app.js                        # Orquestador principal de la interfaz
└── icons/                              # Íconos PWA
```

---

## 11. Lista de verificación antes de usar en producción

- [x] El proyecto compila y arranca sin variables de entorno (muestra la
      pantalla de configuración faltante + modo demo).
- [x] El proyecto arranca correctamente con variables de entorno válidas
      (pantalla de acceso / app real).
- [x] Sin errores de JavaScript en consola durante el arranque ni la
      navegación entre secciones.
- [x] Todas las importaciones de módulos resuelven correctamente.
- [x] Navegación entre las seis secciones (Dashboard, Mesas, Analítica,
      Oportunidades, Cámara, Ajustes) funciona sin errores.
- [x] Alta, baja y renumeración de mesas funciona y persiste.
- [x] Botones de cambio de estado manual funcionan y generan historial.
- [x] Selector de periodo (Hoy/7 días/30 días) funciona.
- [x] Activar/detener cámara funciona; los mensajes de error de permisos
      están diferenciados (denegado, sin cámara, cámara en uso, navegador
      no compatible).
- [x] El editor de zonas permite dibujar y guardar zonas por mesa.
- [x] Cierre de sesión limpia el estado y detiene la cámara.
- [x] Diseño responsive comprobado en anchos de escritorio, tablet y móvil.

---

## 12. Límites conocidos (honestidad, no features pendientes)

Esto no es una lista de "para más adelante": la aplicación es funcional tal
cual. Estas son características inherentes a cualquier sistema de este
tipo, no carencias de la implementación:

- La detección de personas depende de la calidad/ángulo de la cámara: como
  cualquier sistema de visión artificial basado en cámara RGB, una zona mal
  encuadrada o muy oscura reduce su fiabilidad. Por eso el editor de zonas y
  los umbrales de confianza/solape son configurables por el propio
  restaurante.
- Los estados TERMINANDO/LIMPIANDO/DISPONIBLE son siempre decisión del
  personal (ver sección 5): esto es una decisión de diseño explícita, no
  una limitación técnica no resuelta.
