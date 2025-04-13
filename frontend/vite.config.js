import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable specific polyfills
      protocolImports: true, // Support for protocols like 'crypto', 'stream'
    }),
  ],
  resolve: {
    alias: {
      // Aliases for Node.js core modules
      crypto: "crypto-browserify",
      stream: "stream-browserify",
    },
  },
  build: {
    rollupOptions: {
      // Ensure polyfills are included
      external: ["stream", "crypto"],
    },
  },
});
