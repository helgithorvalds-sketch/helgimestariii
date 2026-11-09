const defineConfig = (c) => c;
import path from "node:path";
const S = path.resolve(import.meta.dirname, "..");
export default defineConfig({
  root: path.join(S, "lab"),
  publicDir: path.join(S, "svif/public"),
  server: { port: 5199, host: "127.0.0.1", fs: { allow: [S] } },
  resolve: { alias: { "@three": path.join(S, "svif/src/three") } },
  logLevel: "warn",
});
