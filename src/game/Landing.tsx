import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import regolith from "@/assets/mars-regolith.jpg";
import earthGround from "@/assets/earth-ground.jpg";
import iceGround from "@/assets/ice-ground.jpg";
import { createAsteroidGeometry } from "./Asteroids";
import { sim } from "./sim";
import { DESTINATIONS } from "./destinations";

export const FOOT_HEIGHT = 2.65;
export function surfaceHeight(x: number, z: number, relief = DESTINATIONS.find((d) => d.id === sim.destination)?.relief ?? 7) {
  const fade = THREE.MathUtils.smoothstep(Math.hypot(x, z), 10, 55);
  const distance = Math.hypot(x, z);
  const ridges = THREE.MathUtils.smoothstep(distance, 120, 450) * (28 + 40 * Math.sin(x * 0.007) * Math.cos(z * 0.009));
  return relief / 7 * fade * (Math.sin(x * 0.028) * Math.cos(z * 0.035) * 7 + Math.sin(x * 0.09 + z * 0.055) * 2 + ridges);
}

export function LandingSurface() {
  const root = useRef<THREE.Group>(null);
  const maps = useTexture([regolith, earthGround, iceGround]);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const deck = useRef<THREE.Group>(null);
  const terrain = useRef<THREE.Mesh>(null);
  const sky = useRef<THREE.Mesh>(null);
  const fill = useRef<THREE.HemisphereLight>(null);
  const skyUniforms = useMemo(() => ({ tint: new THREE.Uniform(new THREE.Color()), cloud: new THREE.Uniform(0) }), []);
  const geometries = useMemo(() => DESTINATIONS.map((body) => {
    const g = new THREE.PlaneGeometry(6000, 6000, 160, 160);
    g.rotateX(-Math.PI / 2);
    const p = g.getAttribute("position");
    // Concentrate vertices near touchdown while keeping a broad, unbroken horizon.
    for (let i = 0; i < p.count; i++) {
      const warp = (v: number) => Math.sign(v) * (Math.abs(v) / 3000) ** 2 * 3000;
      const x = warp(p.getX(i)), z = warp(p.getZ(i));
      p.setXYZ(i, x, surfaceHeight(x, z, body.relief), z);
    }
    g.computeVertexNormals();
    return g;
  }), []);
  const bumps = useMemo(() => maps.map((map) => { const t = map.clone(); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t; }), [maps]);
  maps.forEach((map) => { map.colorSpace = THREE.SRGBColorSpace; });
  for (const t of [...maps, ...bumps]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(180, 180); t.anisotropy = 8; }
  // Use physical world-space UVs after nonuniform terrain tessellation.
  geometries.forEach((g) => { const p = g.getAttribute("position"), uv = g.getAttribute("uv"); for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 6000, p.getZ(i) / 6000); });
  useEffect(() => () => { geometries.forEach((g) => g.dispose()); bumps.forEach((t) => t.dispose()); }, [geometries, bumps]);
  const active = useRef("");
  useFrame(() => {
    if (!root.current) return;
    root.current.visible = sim.landing !== "orbit";
    root.current.position.copy(sim.surfaceOrigin);
    root.current.quaternion.copy(sim.surfaceQuat);
    sky.current?.position.set(sim.surfacePos.x, 0, sim.surfacePos.z);
    const index = DESTINATIONS.findIndex((d) => d.id === sim.destination);
    const body = DESTINATIONS[index];
    if (body && material.current && terrain.current && active.current !== body.id) {
      active.current = body.id;
      const texture = body.surface === "earth" ? 1 : body.surface === "cloud" ? 2 : 0;
      material.current.map = maps[texture] ?? null;
      material.current.bumpMap = bumps[texture] ?? null;
      material.current.color.set(body.tint);
      skyUniforms.tint.value.set(body.tint).lerp(new THREE.Color().setRGB(0.18, 0.2, 0.24), 0.55);
      skyUniforms.cloud.value = body.surface === "cloud" ? 1 : 0;
      if (fill.current) { fill.current.color.copy(skyUniforms.tint.value); fill.current.intensity = 1.25; }
      material.current.needsUpdate = true;
      terrain.current.geometry = geometries[index] ?? geometries[0] ?? terrain.current.geometry;
      if (deck.current) deck.current.visible = body.surface === "cloud";
    }
  });
  const firstGeometry = geometries[0];
  if (!firstGeometry) return null;
  return <group ref={root} visible={false}>
    <hemisphereLight ref={fill} intensity={1.25} />
    <mesh ref={sky} renderOrder={-20}>
      <sphereGeometry args={[4200, 32, 16]} />
      <shaderMaterial side={THREE.BackSide} depthWrite={false} uniforms={skyUniforms}
        vertexShader={`varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
        fragmentShader={`varying vec3 direction;uniform vec3 tint;uniform float cloud;void main(){float y=normalize(direction).y;float haze=exp(-max(y,0.0)*5.0);vec3 c=tint*(0.12+0.9*haze);c=mix(c,tint*(0.7+0.45*haze),cloud);gl_FragColor=vec4(c,1.0);}`} />
    </mesh>
    <mesh ref={terrain} geometry={firstGeometry} receiveShadow><meshStandardMaterial ref={material} bumpScale={0.45} roughness={0.95} /></mesh>
    <SurfaceRocks />
    <group ref={deck} position-y={-0.12}>
      <mesh receiveShadow><cylinderGeometry args={[16, 16.5, 0.22, 64]} /><meshStandardMaterial map={maps[2] ?? null} metalness={0.55} roughness={0.48} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.13}><ringGeometry args={[13.8, 14, 64]} /><meshStandardMaterial emissive={skyUniforms.tint.value} emissiveIntensity={2} /></mesh>
    </group>
  </group>;
}

function SurfaceRocks() {
  const group = useMemo(() => {
    const root = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: "#524f4b",
      roughness: 0.92,
      metalness: 0.1,
      flatShading: true,
    });
    for (let i = 0; i < 24; i++) {
      const geom = createAsteroidGeometry(0.8 + (i % 4) * 0.35, i * 2.1);
      const mesh = new THREE.Mesh(geom, mat);
      const angle = i * 2.399963, radius = 18 + (i * 19 % 120);
      mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      mesh.rotation.set(0.1 * (i % 3), angle, 0.15 * (i % 4));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    }
    return root;
  }, []);
  const active = useRef("");
  useFrame(() => {
    if (active.current === sim.destination) return;
    active.current = sim.destination;
    const body = DESTINATIONS.find((d) => d.id === sim.destination);
    group.visible = body?.surface !== "cloud";
    for (const rock of group.children) rock.position.y = surfaceHeight(rock.position.x, rock.position.z, body?.relief ?? 7) - 0.15;
  });
  return <primitive object={group} />;
}

export function LandingGear() {
  const root = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!root.current) return;
    root.current.visible = sim.landing !== "orbit";
    root.current.position.copy(sim.pos);
    root.current.quaternion.copy(sim.quat);
    root.current.scale.y = Math.max(0.01, sim.gear);
  });
  return <group ref={root} visible={false}>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <group key={`${x}${z}`} position={[x * 1.35, -1.05, z * 0.85]}>
      <mesh position={[x * 0.27, -0.62, z * 0.1]} rotation-z={x * 0.38} castShadow><cylinderGeometry args={[0.07, 0.09, 1.5, 16]} /><meshStandardMaterial color="silver" metalness={0.9} roughness={0.25} /></mesh>
      <mesh position={[x * 0.54, -1.45, z * 0.2]} castShadow><cylinderGeometry args={[0.34, 0.42, 0.17, 32]} /><meshStandardMaterial color="dimgray" metalness={0.7} roughness={0.4} /></mesh>
      <mesh position={[x * 0.27, -0.55, z * 0.1]} rotation-z={x * 0.38}><cylinderGeometry args={[0.12, 0.12, 0.65, 16]} /><meshStandardMaterial color="silver" metalness={0.9} roughness={0.18} /></mesh>
    </group>))}
  </group>;
}