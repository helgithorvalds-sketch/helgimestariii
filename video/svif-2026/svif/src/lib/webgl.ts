/**
 * One WebGL capability probe per page load. The probe's context is released straight away, so it
 * never counts against the browser's live-context cap (Chrome keeps 16; the oldest is force-lost).
 */
let cached: boolean | null = null;

export function supportsWebGL(): boolean {
  if (cached !== null) return cached;
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    cached = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}
