import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

const appRoot = path.resolve(__dirname);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, "VITE_");
  const fusekiEndpoint = process.env.VITE_FUSEKI_ENDPOINT?.trim()
    || env.VITE_FUSEKI_ENDPOINT?.trim()
    || (mode === "development" ? "http://localhost:3030/Autolavado" : "");
  if (mode === "development") {
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
      ?? env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en frontend/.env.development.local.",
      );
    }

    const hostname = new URL(supabaseUrl).hostname;
    if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
      throw new Error(
        "El servidor de desarrollo solo puede conectarse a Supabase local. " +
          "Configura VITE_SUPABASE_URL como http://127.0.0.1:54321.",
      );
    }
  }

  return {
    root: appRoot,
    envDir: appRoot,
    define: fusekiEndpoint
      ? { "import.meta.env.VITE_FUSEKI_ENDPOINT": JSON.stringify(fusekiEndpoint) }
      : undefined,
    server: {
      host: "::",
      port: Number(process.env.PORT) || 8080,
      https: process.env.HTTPS === "true" ? {} : undefined,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      // HTTPS local con certificado autofirmado, solo cuando corres `npm run dev:https`.
      // Necesario para probar APIs que exigen "contexto seguro" (cámara, getUserMedia)
      // desde otro dispositivo en la red (el celular no cuenta como "localhost").
      process.env.HTTPS === "true" && basicSsl(),
      VitePWA({
        registerType: "autoUpdate",
        devOptions: { enabled: true },
        includeAssets: ["favicon.ico", "favicon.jpg"],
        manifest: {
          name: "Autolavado Express El Chorro",
          short_name: "El Chorro",
          description: "Sistema de gestión para autolavado con tablero Kanban",
          theme_color: "#dc2626",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          scope: "/",
          lang: "es",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg}"],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(appRoot, "./src"),
      },
    },
  };
});
