import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // Served from https://scottjroberts.github.io/texas-power-visualizer/
  base: process.env.GITHUB_PAGES === "true" ? "/texas-power-visualizer/" : "/",
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
