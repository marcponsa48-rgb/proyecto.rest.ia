#!/usr/bin/env node
// -----------------------------------------------------------------------------
// Genera js/config.js a partir de js/config.example.js sustituyendo los
// marcadores por las variables de entorno reales. Se ejecuta automáticamente
// en cada build de Netlify (ver netlify.toml: command = "node build-config.js").
//
// Variables de entorno requeridas (configúralas en Netlify -> Site settings ->
// Environment variables, o en un archivo .env local para `npm run build`):
//   SUPABASE_URL       -> URL del proyecto Supabase (Settings -> API -> Project URL)
//   SUPABASE_ANON_KEY   -> clave "anon public" del proyecto (Settings -> API)
//
// La "anon key" de Supabase está pensada para exponerse en el frontend: el
// acceso real a los datos lo controla Row Level Security (RLS), no el secreto
// de esta clave. La service_role key (privada) NUNCA debe usarse aquí.
// -----------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "\n[build-config] AVISO: SUPABASE_URL y/o SUPABASE_ANON_KEY no están definidas.\n" +
    "  La aplicación se desplegará pero mostrará un aviso de configuración pendiente\n" +
    "  hasta que añadas esas variables de entorno en Netlify y vuelvas a desplegar.\n"
  );
}

const templatePath = path.join(__dirname, "js", "config.example.js");
const outputPath = path.join(__dirname, "js", "config.js");

let content = fs.readFileSync(templatePath, "utf8");
content = content.replace("__SUPABASE_URL__", SUPABASE_URL.replace(/"/g, ""));
content = content.replace("__SUPABASE_ANON_KEY__", SUPABASE_ANON_KEY.replace(/"/g, ""));

fs.writeFileSync(outputPath, content, "utf8");
console.log("[build-config] js/config.js generado correctamente.");
