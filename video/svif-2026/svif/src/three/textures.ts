import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();
const loader = typeof window !== "undefined" ? new THREE.TextureLoader() : null;

/** Load (once) an sRGB colour texture with good filtering. */
export function loadTex(url: string, renderer?: THREE.WebGLRenderer, onLoad?: () => void): THREE.Texture {
  const hit = cache.get(url);
  if (hit) {
    if (onLoad) queueMicrotask(onLoad);
    return hit;
  }
  const tex = loader!.load(url, () => onLoad?.());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  cache.set(url, tex);
  return tex;
}

/** Wait until every texture in the cache has its image. */
export function texturesReady(): Promise<void> {
  const pending = [...cache.values()].filter((t) => !(t.image && (t.image as HTMLImageElement).complete !== false && (t.image as HTMLImageElement).naturalWidth !== 0));
  if (!pending.length) return Promise.resolve();
  return new Promise((resolve) => {
    let left = pending.length;
    const done = () => {
      left -= 1;
      if (left <= 0) resolve();
    };
    pending.forEach((t) => {
      const img = t.image as HTMLImageElement | undefined;
      if (img && img.addEventListener) {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      } else {
        // TextureLoader assigns image on load; poll briefly
        const iv = setInterval(() => {
          if (t.image) {
            clearInterval(iv);
            done();
          }
        }, 30);
      }
    });
  });
}

/** A texture drawn with the 2D canvas API (labels, page edges, coupons). */
export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Fine horizontal striping for the page edges of the booklet. */
export function pageEdgeTex() {
  return canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = "#f4efe6";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) {
      const a = 0.06 + ((y * 7919) % 13) / 260;
      g.fillStyle = `rgba(90,74,58,${a})`;
      g.fillRect(0, y, w, 1);
    }
  });
}

let blobTex: THREE.Texture | null = null;
/** Soft radial falloff used for cheap contact shadows / ambient occlusion under objects. */
export function contactBlobTex() {
  if (blobTex) return blobTex;
  blobTex = canvasTex(128, 128, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, "rgba(40,30,20,0.55)");
    r.addColorStop(0.45, "rgba(40,30,20,0.28)");
    r.addColorStop(1, "rgba(40,30,20,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, w, h);
  }, false);
  return blobTex;
}

/** A flat contact-shadow plane (w×d) to lay just above the ground under an object. */
export function contactShadow(w: number, d: number, opacity = 0.7) {
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: contactBlobTex(), transparent: true, depthWrite: false, opacity, toneMapped: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.004;
  mesh.renderOrder = -1;
  return mesh;
}
