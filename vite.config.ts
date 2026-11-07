import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Injects the absolute site URL into index.html so WhatsApp / iMessage link
 * previews can find the Open Graph image. Netlify sets `URL` automatically
 * during builds; you can also set SITE_URL yourself. When neither exists
 * (e.g. a local build dragged into Netlify Drop) relative paths are used.
 */
function siteUrlPlugin(): Plugin {
  const raw = process.env.SITE_URL || process.env.URL || "";
  const siteUrl = raw.replace(/\/+$/, "");
  return {
    name: "inject-site-url",
    transformIndexHtml(html) {
      return html.replaceAll("__SITE_URL__", siteUrl);
    },
  };
}

export default defineConfig({
  plugins: [react(), siteUrlPlugin()],
  build: {
    target: "es2020",
    sourcemap: false,
  },
});
