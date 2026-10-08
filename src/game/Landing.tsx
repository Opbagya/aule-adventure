import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import regolith from "@/assets/mars-regolith.jpg";
import { sim } from "./sim";

export const FOOT_HEIGHT = 2.65;
export function surfaceHeight(x: number, z: number) {
  const fade = THREE.MathUtils.smoothstep(Math.hypot(x, z), 10, 55);
  return fade * (Math.sin(x * 0.028) * Math.cos(z * 0.035) * 7 + Math.sin(x * 0.09 + z * 0.055) * 2);
}

export function LandingSurface() {
  const root = useRef<THREE.Group>(null);
  const map = useTexture(regolith);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1600, 1600, 128, 128);
    g.rotateX(-Math.PI / 2);
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) p.setY(i, surfaceHeight(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    return g;
  }, []);
  const bump = useMemo(() => { const t = map.clone(); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t; }, [map]);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(100, 100); t.anisotropy = 8; }
  useFrame(() => {
    if (!root.current) return;
    root.current.visible = sim.landing !== "orbit";
    root.current.position.copy(sim.surfaceOrigin);
    root.current.quaternion.copy(sim.surfaceQuat);
  });
  return <group ref={root} visible={false}>
    <mesh geometry={geometry} receiveShadow><meshStandardMaterial map={map} bumpMap={bump} bumpScale={0.12} roughness={0.98} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position-y={0.025}><ringGeometry args={[6, 6.06, 96]} /><meshBasicMaterial color="silver" transparent opacity={0.45} /></mesh>
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