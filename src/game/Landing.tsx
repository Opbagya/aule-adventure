import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import regolith from "@/assets/mars-regolith.jpg";
import earthGround from "@/assets/earth-ground.jpg";
import iceGround from "@/assets/ice-ground.jpg";
import { sim } from "./sim";
import { DESTINATIONS } from "./destinations";

export const FOOT_HEIGHT = 2.65;
export function surfaceHeight(x: number, z: number, relief = DESTINATIONS.find((d) => d.id === sim.destination)?.relief ?? 7) {
  const fade = THREE.MathUtils.smoothstep(Math.hypot(x, z), 10, 55);
  return relief / 7 * fade * (Math.sin(x * 0.028) * Math.cos(z * 0.035) * 7 + Math.sin(x * 0.09 + z * 0.055) * 2);
}

export function LandingSurface() {
  const root = useRef<THREE.Group>(null);
  const maps = useTexture([regolith, earthGround, iceGround]);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const deck = useRef<THREE.Mesh>(null);
  const terrain = useRef<THREE.Mesh>(null);
  const geometries = useMemo(() => DESTINATIONS.map((body) => {
    const g = new THREE.PlaneGeometry(1400, 1400, 80, 80);
    g.rotateX(-Math.PI / 2);
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) p.setY(i, surfaceHeight(p.getX(i), p.getZ(i), body.relief));
    g.computeVertexNormals();
    return g;
  }), []);
  const bumps = useMemo(() => maps.map((map) => { const t = map.clone(); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t; }), [maps]);
  maps.forEach((map) => { map.colorSpace = THREE.SRGBColorSpace; });
  for (const t of [...maps, ...bumps]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(85, 85); t.anisotropy = 4; }
  const active = useRef("");
  useFrame(() => {
    if (!root.current) return;
    root.current.visible = sim.landing !== "orbit";
    root.current.position.copy(sim.surfaceOrigin);
    root.current.quaternion.copy(sim.surfaceQuat);
    const index = DESTINATIONS.findIndex((d) => d.id === sim.destination);
    const body = DESTINATIONS[index];
    if (body && material.current && terrain.current && active.current !== body.id) {
      active.current = body.id;
      const texture = body.surface === "earth" ? 1 : body.surface === "cloud" ? 2 : 0;
      material.current.map = maps[texture] ?? null;
      material.current.bumpMap = bumps[texture] ?? null;
      material.current.color.set(body.tint);
      material.current.needsUpdate = true;
      terrain.current.geometry = geometries[index] ?? geometries[0] ?? terrain.current.geometry;
      if (deck.current) deck.current.visible = body.surface === "cloud";
    }
  });
  const firstGeometry = geometries[0];
  if (!firstGeometry) return null;
  return <group ref={root} visible={false}>
    <mesh ref={terrain} geometry={firstGeometry} receiveShadow><meshStandardMaterial ref={material} bumpScale={0.2} roughness={0.98} /></mesh>
    <mesh ref={deck} rotation-x={-Math.PI / 2} position-y={0.01} receiveShadow><circleGeometry args={[55, 64]} /><meshStandardMaterial map={maps[2] ?? null} color="silver" metalness={0.6} roughness={0.5} /></mesh>
  </group>;
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