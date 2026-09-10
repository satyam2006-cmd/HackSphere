import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      react: path.resolve(import.meta.dirname, "./node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "./node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    proxy: {
      "/historical": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/conversion": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
