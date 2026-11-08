import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { event } from "./src/config/event";
import { ICS_PATH, buildIcs, getEventDisplay } from "./src/lib/event-display";

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

/**
 * Serves the party's calendar file as a real file. Phones (iPhone especially)
 * won't open a calendar built into the link itself, but they do offer
 * "Add to Calendar" for a real .ics file.
 */
function calendarFilePlugin(): Plugin {
  const text = () => buildIcs(event, getEventDisplay(event));
  return {
    name: "calendar-file",
    configureServer(server) {
      server.middlewares.use(ICS_PATH, (_req, res) => {
        const ics = text();
        if (!ics) { res.statusCode = 404; res.end(); return; }
        res.setHeader("Content-Type", "text/calendar; charset=utf-8");
        res.end(ics);
      });
    },
    generateBundle() {
      const ics = text();
      if (ics) this.emitFile({ type: "asset", fileName: ICS_PATH.slice(1), source: ics });
    },
  };
}

export default defineConfig({
  plugins: [react(), siteUrlPlugin(), calendarFilePlugin()],
  build: {
    target: "es2020",
    sourcemap: false,
  },
});
