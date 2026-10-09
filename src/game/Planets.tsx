import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import marsMap from "@/assets/mars-surface.jpg";
import jupiterMap from "@/assets/jupiter-surface.jpg";
import { DESTINATIONS } from "./destinations";
import { sim } from "./sim";

export function Planets() {
  const textures = useTexture([marsMap, jupiterMap, "/textures/earth_atmos_2048.jpg"]);
  const meshes = useRef<(THREE.Group | null)[]>([]);
  textures.forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; });
  useFrame((_, delta) => {
    meshes.current.forEach((m, i) => { if (m) { m.visible = !(DESTINATIONS[i]?.id === sim.destination && sim.landing !== "orbit") && !sim.transferActive; } });
  });
  return <>{DESTINATIONS.map((body, i) => (
    <group key={body.id} position={body.center} ref={(m) => { meshes.current[i] = m; }} rotation={[0.08, 0.6, 0]}>
      <mesh><sphereGeometry args={[body.radius, 48, 32]} />
        <meshStandardMaterial map={textures[body.id === "earth" ? 2 : body.surface === "cloud" || body.id === "venus" ? 1 : 0] ?? null} color={body.tint} roughness={0.96} metalness={0} />
      </mesh>
      {body.id === "saturn" && <mesh rotation-x={Math.PI / 2.4}><ringGeometry args={[body.radius * 1.3, body.radius * 2.05, 96]} /><meshStandardMaterial color={body.tint} map={textures[1] ?? null} side={THREE.DoubleSide} transparent opacity={0.72} /></mesh>}
    </group>
  ))}</>;
}