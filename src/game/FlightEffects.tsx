import { useFrame } from "@react-three/fiber";
import { Effect } from "postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sim } from "./sim";

class SpeedBlur extends Effect {
  constructor() {
    super("SpeedBlur", `uniform float strength;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 d = uv - vec2(0.5);
        float edge = smoothstep(0.16, 0.65, length(d));
        vec2 v = d * strength * edge * 0.018;
        vec4 c = inputColor * 0.4;
        c += texture2D(inputBuffer, uv - v) * 0.2;
        c += texture2D(inputBuffer, uv + v) * 0.2;
        c += texture2D(inputBuffer, uv - v * 2.0) * 0.1;
        c += texture2D(inputBuffer, uv + v * 2.0) * 0.1;
        outputColor = c;
      }`, { uniforms: new Map([["strength", new THREE.Uniform(0)]]) });
  }
}

export function MotionBlur() {
  const effect = useMemo(() => new SpeedBlur(), []);
  const reduced = useRef(false);
  useEffect(() => { const q = window.matchMedia("(prefers-reduced-motion: reduce)"); reduced.current = q.matches; const change = () => { reduced.current = q.matches; }; q.addEventListener("change", change); return () => { q.removeEventListener("change", change); effect.dispose(); }; }, [effect]);
  useFrame(() => { const u = effect.uniforms.get("strength"); if (u) u.value = reduced.current || sim.landing !== "orbit" ? 0 : sim.motion; });
  return <primitive object={effect} />;
}

export function SpeedStreaks() {
  const root = useRef<THREE.LineSegments>(null);
  const reduced = useRef(false);
  useEffect(() => { const q = window.matchMedia("(prefers-reduced-motion: reduce)"); reduced.current = q.matches; const change = () => { reduced.current = q.matches; }; q.addEventListener("change", change); return () => q.removeEventListener("change", change); }, []);
  const data = useMemo(() => {
    const positions = new Float32Array(160 * 6);
    const seeds = Array.from({ length: 160 }, (_, i) => ({ a: i * 2.39996, r: 9 + (i % 19) * 1.4, z: (i % 23) * 4 }));
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { geo, positions, seeds, time: 0 };
  }, []);
  useFrame(({ camera }, raw) => {
    const line = root.current; if (!line) return;
    line.visible = !reduced.current && sim.motion > 0.08 && sim.screen === "playing" && sim.landing === "orbit";
    line.position.copy(camera.position); line.quaternion.copy(camera.quaternion);
    data.time += Math.min(raw, 0.05) * (sim.boosting || sim.transferActive ? 80 : 18);
    data.seeds.forEach((s, i) => {
      const z = -110 + ((s.z + data.time) % 100);
      const o = i * 6; const x = Math.cos(s.a) * s.r; const y = Math.sin(s.a) * s.r;
      data.positions.set([x, y, z, x, y, z + sim.motion * 12], o);
    });
    data.geo.getAttribute("position").needsUpdate = true;
    const m = line.material as THREE.LineBasicMaterial; m.opacity = sim.motion * 0.38;
  });
  return <lineSegments ref={root} geometry={data.geo} frustumCulled={false}><lineBasicMaterial color="lightsteelblue" transparent opacity={0} depthWrite={false} /></lineSegments>;
}