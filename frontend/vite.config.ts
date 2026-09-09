import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("china-map-geojson")) {
            return "vendor-mapdata";
          }
          if (id.includes("echarts") || id.includes("zrender")) {
            return "vendor-charts";
          }
          if (id.includes("react-markdown") || id.includes("remark") || id.includes("micromark")) {
            return "vendor-markdown";
          }
          if (id.includes("react") || id.includes("react-router-dom")) {
            return "vendor-react";
          }
        },
      },
    },
  },
});
