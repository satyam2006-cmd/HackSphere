import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/historical": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
