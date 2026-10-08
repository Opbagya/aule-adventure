import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import marsMap from "@/assets/mars-surface.jpg";
import jupiterMap from "@/assets/jupiter-surface.jpg";
import { DESTINATIONS } from "./destinations";
import { sim } from "./sim";

export function Planets() {
  const textures = useTexture([marsMap, jupiterMap]);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  textures.forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; });
  useFrame((_, delta) => {
    meshes.current.forEach((m, i) => { if (m) { m.rotation.y += Math.min(delta, 0.05) * 0.008; m.visible = !(i === 0 && sim.landing !== "orbit"); } });
  });
  return <>{DESTINATIONS.map((body, i) => (
    <mesh key={body.id} position={body.center} ref={(m) => { meshes.current[i] = m; }} rotation={[0.08, 0.6, 0]}>
      <sphereGeometry args={[body.radius, 80, 56]} />
      <meshStandardMaterial map={textures[i] ?? null} roughness={0.96} metalness={0} />
    </mesh>
  ))}</>;
}