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
  plugins: [tailwindcss(), viteReact(), flattenShellIndex()],
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
