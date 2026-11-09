// Static build of the film composer, so captures are immune to dev-server reloads.
// OUT=../film/dist-home ../svif/node_modules/.bin/vite build --config vite.film.config.mjs
const defineConfig = (c) => c;
import path from "node:path";
const S = path.resolve(import.meta.dirname, "..");
export default defineConfig({
  root: path.join(S, "lab"),
  publicDir: path.join(S, "svif/public"),
  base: "/",
  resolve: { alias: { "@three": path.join(S, "svif/src/three") } },
  build: { outDir: path.resolve(S, "lab", process.env.OUT || "../film/dist"), emptyOutDir: true, rollupOptions: { input: { film: path.join(S, "lab/film.html") } }, chunkSizeWarningLimit: 4000 },
  logLevel: "warn",
});
