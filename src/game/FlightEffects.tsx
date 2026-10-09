import { useFrame } from "@react-three/fiber";
import { Effect } from "postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sim } from "./sim";

class SpeedBlur extends Effect {
  constructor() {
    super("SpeedBlur", `uniform float strength; uniform float warp; uniform float time; uniform float aspect; uniform vec3 warpColor;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 d = uv - vec2(0.5);
        float edge = smoothstep(0.12, 0.58, length(d));
        vec2 v = d * strength * edge * 0.034;
        vec4 c = inputColor * 0.4;
        c += texture2D(inputBuffer, uv - v) * 0.2;
        c += texture2D(inputBuffer, uv + v) * 0.2;
        c += texture2D(inputBuffer, uv - v * 2.0) * 0.1;
        c += texture2D(inputBuffer, uv + v * 2.0) * 0.1;
        vec2 p=d*2.0; p.x*=aspect;
        float r=length(p), a=atan(p.y,p.x);
        float bend=sin(r*3.0-time*1.1)*0.3;
        float line=smoothstep(0.7,0.99,sin(a*48.0+bend+sin(a*7.0)*0.6));
        float fine=pow(max(0.0,sin(a*83.0-bend)),10.0)*0.22;
        float flow=0.65+0.35*sin(r*12.0-time*9.0+sin(a*11.0));
        float glow=warp*smoothstep(0.045,0.32,r)*((line+fine)*flow*0.8+0.055);
        c.rgb += warpColor*glow;
        outputColor = c;
      }`, { uniforms: new Map<string, THREE.Uniform>([["strength", new THREE.Uniform(0)], ["warp", new THREE.Uniform(0)], ["time", new THREE.Uniform(0)], ["aspect", new THREE.Uniform(1)], ["warpColor", new THREE.Uniform(new THREE.Color())]]) });
  }
}

export function MotionBlur() {
  const effect = useMemo(() => new SpeedBlur(), []);
  const reduced = useRef(false);
  useEffect(() => {
    const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--hyperspace-tail").trim(); ctx.fillRect(0, 0, 1, 1);
    const p = ctx.getImageData(0, 0, 1, 1).data;
    effect.uniforms.get("warpColor")?.value.setRGB((p[0] ?? 0) / 255, (p[1] ?? 0) / 255, (p[2] ?? 0) / 255, THREE.SRGBColorSpace);
  }, [effect]);
  useEffect(() => { const q = window.matchMedia("(prefers-reduced-motion: reduce)"); reduced.current = q.matches; const change = () => { reduced.current = q.matches; }; q.addEventListener("change", change); return () => { q.removeEventListener("change", change); effect.dispose(); }; }, [effect]);
  useFrame(({ size }) => {
    const u = effect.uniforms.get("strength"); if (u) u.value = reduced.current || sim.landing !== "orbit" ? 0 : sim.screen === "briefing" ? 0.16 : sim.motion;
    const warp = effect.uniforms.get("warp"); if (warp) warp.value = reduced.current || !sim.transferActive ? 0 : THREE.MathUtils.smoothstep(sim.transfer, 0, 0.18) * (1 - THREE.MathUtils.smoothstep(sim.transfer, 0.78, 1));
    const time = effect.uniforms.get("time"); if (time) time.value = sim.transfer * 5;
    const aspect = effect.uniforms.get("aspect"); if (aspect) aspect.value = size.width / Math.max(1, size.height);
  });
  return <primitive object={effect} />;
}

export function SpeedStreaks() {
  const root = useRef<THREE.Mesh>(null);
  const reduced = useRef(false);
  useEffect(() => { const q = window.matchMedia("(prefers-reduced-motion: reduce)"); reduced.current = q.matches; const change = () => { reduced.current = q.matches; }; q.addEventListener("change", change); return () => q.removeEventListener("change", change); }, []);
  const data = useMemo(() => {
    const count = 640;
    const positions = new Float32Array(count * 18);
    const uv = new Float32Array(count * 12);
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: i * 2.399963, r: 13 + (i * 17 % 71), z: i * 43.17 % 240,
      width: 0.055 + (i % 7) * 0.02, length: 0.65 + (i % 11) * 0.08,
    }));
    for (let i = 0; i < count; i++) uv.set([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], i * 12);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return { geo, positions, seeds, time: 0, uniforms: {
      intensity: new THREE.Uniform(0),
      core: new THREE.Uniform(new THREE.Color()),
      tail: new THREE.Uniform(new THREE.Color()),
    } };
  }, []);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    // Resolve semantic CSS colors to sRGB for the WebGL material.
    const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d");
    if (ctx) for (const [key, token] of [["core", "--hyperspace-core"], ["tail", "--hyperspace-tail"]] as const) {
      ctx.fillStyle = css.getPropertyValue(token).trim(); ctx.fillRect(0, 0, 1, 1);
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      data.uniforms[key].value.setRGB((pixel[0] ?? 0) / 255, (pixel[1] ?? 0) / 255, (pixel[2] ?? 0) / 255, THREE.SRGBColorSpace);
    }
    return () => data.geo.dispose();
  }, [data]);
  useFrame(({ camera }, raw) => {
    const mesh = root.current; if (!mesh) return;
    mesh.visible = !reduced.current && !sim.transferActive && sim.motion > 0.08 && sim.screen === "playing" && sim.landing === "orbit";
    if (!mesh.visible) return;
    mesh.position.copy(camera.position); mesh.quaternion.copy(camera.quaternion);
    data.time += Math.min(raw, 0.05) * (sim.boosting || sim.transferActive ? 180 : 35);
    data.seeds.forEach((s, i) => {
      const z = -250 + ((s.z + data.time) % 240);
      const x = Math.cos(s.a) * s.r; const y = Math.sin(s.a) * s.r;
      const w = s.width * (0.4 + sim.motion); const back = z - (6 + sim.motion * 140) * s.length;
      data.positions.set([x-w,y,back, x+w,y,back, x+w,y,z, x-w,y,back, x+w,y,z, x-w,y,z], i * 18);
    });
    data.geo.getAttribute("position").needsUpdate = true;
    data.uniforms.intensity.value = sim.motion;
  });
  return <mesh ref={root} geometry={data.geo} frustumCulled={false}>
    <shaderMaterial uniforms={data.uniforms} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending}
      vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
      fragmentShader={`varying vec2 vUv; uniform float intensity; uniform vec3 core; uniform vec3 tail;
        void main(){float edge=pow(max(0.0,1.0-abs(vUv.x*2.0-1.0)),1.5);
        float fade=smoothstep(0.0,0.35,vUv.y)*(1.0-smoothstep(0.94,1.0,vUv.y));
        vec3 color=mix(tail,core,pow(vUv.y,3.0));
        gl_FragColor=vec4(color*(1.0+intensity*2.5),edge*fade*intensity*0.8);}`} />
  </mesh>;
}

/** Clip-space tunnel stays edge-to-edge regardless of camera motion or viewport aspect. */
export function WarpTunnel() {
  const root = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ time: new THREE.Uniform(0), strength: new THREE.Uniform(0), aspect: new THREE.Uniform(1), color: new THREE.Uniform(new THREE.Color()) }), []);
  const reduced = useRef(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { reduced.current = query.matches; };
    change(); query.addEventListener("change", change);
    const canvas = document.createElement("canvas"); const c = canvas.getContext("2d");
    if (c) { c.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--hyperspace-tail").trim(); c.fillRect(0, 0, 1, 1); const p = c.getImageData(0, 0, 1, 1).data; uniforms.color.value.setRGB((p[0] ?? 0)/255, (p[1] ?? 0)/255, (p[2] ?? 0)/255, THREE.SRGBColorSpace); }
    return () => query.removeEventListener("change", change);
  }, [uniforms]);
  useFrame(({ size }) => {
    const m = root.current; if (!m) return;
    m.visible = !reduced.current && sim.transferActive && (sim.screen === "playing" || sim.screen === "paused");
    uniforms.aspect.value = size.width / Math.max(1, size.height);
    uniforms.time.value = sim.transfer * 5;
    uniforms.strength.value = THREE.MathUtils.smoothstep(sim.transfer, 0, 0.18) * (1 - THREE.MathUtils.smoothstep(sim.transfer, 0.78, 1));
  });
  return <mesh ref={root} frustumCulled={false} renderOrder={1000}>
    <planeGeometry args={[2, 2]} />
    <shaderMaterial transparent depthWrite={false} depthTest={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} uniforms={uniforms}
      vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`}
      fragmentShader={`varying vec2 vUv; uniform float time; uniform float strength; uniform float aspect; uniform vec3 color;
        void main(){
          vec2 p=(vUv-0.5)*2.0; p.x*=aspect;
          float r=length(p); float a=atan(p.y,p.x);
          // Integer angular frequencies close the seam; gentle continuous flow never resets.
          float bend=sin(r*3.0-time*1.1)*0.3;
          float band=sin(a*48.0+bend+sin(a*7.0)*0.6);
          float line=smoothstep(0.7,0.99,band);
          float fine=pow(max(0.0,sin(a*83.0-bend)),10.0)*0.22;
          float flow=0.65+0.35*sin(r*12.0-time*9.0+sin(a*11.0));
          float edge=smoothstep(0.045,0.32,r);
          float veil=0.035+0.045*smoothstep(0.1,1.4,r);
          gl_FragColor=vec4(color*(1.2+line*2.0),strength*edge*((line+fine)*flow*0.65+veil));
        }`}/>
  </mesh>;
}