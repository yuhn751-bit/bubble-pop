import { copyFileSync, existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Offline bundle for Electron and Capacitor.
 * The Vercel app keeps using vite.config.ts (TanStack Start + Nitro).
 * This build never starts a server and never calls the deployed site.
 *
 * Vite preserves `shell/index.html` as `shell/dist/shell/index.html`.
 * The shells expect `shell/dist/index.html`, so the html is moved after emit.
 */
const root = path.dirname(fileURLToPath(import.meta.url));
const surimTitle = path.join(root, "packaging/surim/surim-title.jpg");

/** Packaging-only copy. The Vercel build does not load this plugin. */
function applySurimText(code: string): string {
  return code
    .replaceAll("유수현", "강수림")
    .replaceAll("수현아", "수림아")
    .replaceAll("수현이", "수림이")
    .replaceAll("SUHYEON", "SURIM");
}

function surimFlavor(): Plugin {
  return {
    name: "native-surim-flavor",
    enforce: "pre",
    transform(code, id) {
      if (id.includes("node_modules")) return null;
      if (!/\.(tsx?|jsx?|css)$/.test(id)) return null;
      const next = applySurimText(code);
      if (next === code) return null;
      return { code: next, map: null };
    },
    closeBundle() {
      const dist = path.join(root, "shell/dist");
      copyFileSync(surimTitle, path.join(dist, "surim-title.jpg"));
      const webTitle = path.join(dist, "suhyeon-title.jpg");
      if (existsSync(webTitle)) unlinkSync(webTitle);
      const assets = path.join(dist, "assets");
      if (!existsSync(assets)) return;
      for (const name of readdirSync(assets)) {
        if (!name.endsWith(".css")) continue;
        const file = path.join(assets, name);
        const css = readFileSync(file, "utf8");
        const next = css
          .replaceAll("suhyeon-title.jpg", "surim-title.jpg")
          .replaceAll("url(../surim-title.jpg) 50% 18%", "url(../surim-title.jpg) 72% 50%");
        if (next !== css) writeFileSync(file, next);
      }
    },
  };
}

function flattenShellIndex(): Plugin {
  return {
    name: "flatten-shell-index",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const html = bundle["shell/index.html"];
      if (!html || html.type !== "asset") return;
      const source = typeof html.source === "string" ? html.source : html.source.toString("utf8");
      html.source = source.replaceAll("../assets/", "./assets/");
      html.fileName = "index.html";
    },
  };
}

export default defineConfig({
  root,
  base: "./",
  publicDir: path.join(root, "public"),
  plugins: [surimFlavor(), tailwindcss(), viteReact(), flattenShellIndex()],
  resolve: {
    alias: [
      {
        find: /^@\/game\/leaderboard$/,
        replacement: path.join(root, "src/game/leaderboard-offline.ts"),
      },
      { find: "@", replacement: path.join(root, "src") },
    ],
  },
  define: {
    "import.meta.env.VITE_OFFLINE_SHELL": JSON.stringify("1"),
  },
  build: {
    outDir: path.join(root, "shell/dist"),
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false,
    rollupOptions: {
      input: path.join(root, "shell/index.html"),
    },
  },
});
