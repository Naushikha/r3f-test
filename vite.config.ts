import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl(), // uncomment for VR testing
  ],
  // TODO: remove below if unused
  resolve: {
    alias: {
      // Set the alias for "core/AR" to the path of the AR.jsx file
      "core/AR": path.resolve(__dirname, "src/components/core/AR.jsx"),
    },
  },
});
