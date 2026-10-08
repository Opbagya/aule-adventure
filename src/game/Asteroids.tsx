import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import asteroidAsset from "@/assets/asteroids.asset.json";
import { sim } from "./sim";

export function Asteroids() {
  const { scene } = useGLTF(asteroidAsset.url);
  const { root, rocks } = useMemo(() => {
    const rock = scene.getObjectByName("asteroid-set_3");
    const root = new THREE.Group(); const rocks: THREE.Object3D[] = [];
    if (!rock) return { root, rocks };
    const source = rock.clone(true); source.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(source); const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
    const normalized = new THREE.Group(); source.position.sub(center); normalized.add(source); normalized.scale.setScalar(1.8 / Math.max(size.x, size.y, size.z, 0.001));
    for (let i = 0; i < 42; i++) { const clone = normalized.clone(true); clone.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true; }); root.add(clone); rocks.push(clone); }
    return { root, rocks };
  }, [scene]);
  useFrame(() => {
    root.visible = !sim.exploring;
    rocks.forEach((r, i) => { const d = sim.debris[i]; r.visible = d?.kind === 4; if (!d) return; r.position.copy(d.pos); r.quaternion.copy(d.quat); r.scale.setScalar(d.scale); });
  });
  return <primitive object={root} />;
}