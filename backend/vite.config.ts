import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [nitro()],
  resolve: {
    alias: {
      "@checkbot/core": resolve(__dirname, "../core/src"),
    },
  },
});
