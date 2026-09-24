import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  // No manualChunks. Naming vendor chunks by path split a cyclic module
  // group — recharts and its d3 internals — across chunks, and they were then
  // evaluated out of order: "ReferenceError: Cannot access 'S' before
  // initialization", thrown from vendor-charts on page load, which killed the
  // whole app behind a blank screen. The chunk import graph was acyclic, which
  // is why inspecting it did not catch this; acyclic chunks do not imply a
  // safe evaluation order for modules that reference each other.
  //
  // Rollup's own splitting already gives a chunk per lazy route and puts
  // shared dependencies where they can be initialised safely. The route-level
  // laziness is where the benefit was anyway.
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
