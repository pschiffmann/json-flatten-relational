import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  root: "./demo/",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../dist/",
  },
});
