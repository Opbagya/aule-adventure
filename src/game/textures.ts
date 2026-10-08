import * as THREE from "three";

const cache = new Map<string, unknown>();
function memo<T>(key: string, fn: () => T): T {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key) as T;
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/** Crinkled multi-layer insulation foil: color + bump maps from the same facets. */
export function getFoil(tint: "gold" | "silver") {
  return memo("foil-" + tint, () => {
    const S = 512;
    const [c, g] = canvas(S, S);
    const [bc, bg] = canvas(S, S);
    const hue = tint === "gold" ? 40 : 210;
    const sat = tint === "gold" ? 75 : 8;
    g.fillStyle = `hsl(${hue},${sat}%,52%)`;
    g.fillRect(0, 0, S, S);
    bg.fillStyle = "#808080";
    bg.fillRect(0, 0, S, S);
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const r = 8 + Math.random() * 38;
      const pts = [0, 1, 2].map(() => [x + (Math.random() - 0.5) * r * 2, y + (Math.random() - 0.5) * r * 2] as [number, number]) as [[number, number], [number, number], [number, number]];
      const l = 30 + Math.random() * 45;
      const bl = Math.floor(Math.random() * 255);
      for (const [ctx, fill] of [
        [g, `hsla(${hue + (Math.random() - 0.5) * 10},${sat}%,${l}%,0.55)`],
        [bg, `rgba(${bl},${bl},${bl},0.6)`],
      ] as const) {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.lineTo(pts[2][0], pts[2][1]);
        ctx.closePath();
        ctx.fill();
      }
    }
    // seams / tape lines
    g.strokeStyle = `hsla(${hue},${sat}%,25%,0.6)`;
    g.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
      g.beginPath();
      g.moveTo(0, (i * S) / 4);
      g.lineTo(S, (i * S) / 4);
      g.stroke();
    }
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 8;
    const bump = new THREE.CanvasTexture(bc);
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    return { map, bump };
  });
}

export function getSolar(variant: "deep" | "blue") {
  return memo("solar-" + variant, () => {
    const S = 512;
    const [c, g] = canvas(S, S);
    g.fillStyle = "#c8ccd2";
    g.fillRect(0, 0, S, S);
    const n = 8;
    const cs = S / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const grd = g.createLinearGradient(i * cs, j * cs, (i + 1) * cs, (j + 1) * cs);
        const base: [number, number, number] = variant === "deep" ? [18, 24, 58] : [22, 52, 120];
        const v = (Math.random() - 0.5) * 14;
        grd.addColorStop(0, `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`);
        grd.addColorStop(1, `rgb(${base[0] * 0.6},${base[1] * 0.6},${base[2] * 0.75})`);
        g.fillStyle = grd;
        g.fillRect(i * cs + 2, j * cs + 2, cs - 4, cs - 4);
        g.strokeStyle = "rgba(200,205,215,0.35)";
        g.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
          g.beginPath();
          g.moveTo(i * cs + (k * cs) / 4, j * cs + 2);
          g.lineTo(i * cs + (k * cs) / 4, (j + 1) * cs - 2);
          g.stroke();
        }
      }
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return map;
  });
}

export function getGlow() {
  return memo("glow", () => {
    const [c, g] = canvas(128, 128);
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.15, "rgba(255,255,255,0.8)");
    grd.addColorStop(0.4, "rgba(255,255,255,0.15)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  });
}
