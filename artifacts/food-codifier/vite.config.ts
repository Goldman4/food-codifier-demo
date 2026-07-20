import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repositoryRoot, "");
  const rawPort = env.WEB_PORT || "5173";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid WEB_PORT value: "${rawPort}"`);
  }

  return {
    base: env.BASE_PATH || "/",
    envDir: repositoryRoot,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "127.0.0.1",
      proxy: {
        "/api": {
          target: env.API_URL || "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    preview: {
      port,
      host: "127.0.0.1",
    },
  };
});
