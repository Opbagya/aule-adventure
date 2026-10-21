import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { sim } from "./sim";

export function createAsteroidGeometry(radius = 1, seed = 0) {
  const geom = new THREE.DodecahedronGeometry(radius, 1);
  const pos = geom.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const noise =
      1 +
      0.22 * Math.sin(x * 4.2 + seed) * Math.cos(y * 3.7 + seed * 1.5) +
      0.14 * Math.sin(z * 5.1 + seed * 0.7) +
      0.08 * Math.cos((x + y + z) * 6.3);
    pos.setXYZ(i, x * noise, y * noise * 0.85, z * noise);
  }
  geom.computeVertexNormals();
  return geom;
}

export function Asteroids() {
  const { root, rocks } = useMemo(() => {
    const root = new THREE.Group();
    const rocks: THREE.Object3D[] = [];
    const mat = new THREE.MeshStandardMaterial({
      color: "#585550",
      roughness: 0.9,
      metalness: 0.15,
      flatShading: true,
    });

    for (let i = 0; i < 42; i++) {
      const geom = createAsteroidGeometry(1.2, i * 1.37);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
      rocks.push(mesh);
    }
    return { root, rocks };
  }, []);

  useFrame(() => {
    root.visible = !sim.exploring;
    rocks.forEach((r, i) => {
      const d = sim.debris[i];
      r.visible = d?.kind === 4;
      if (!d) return;
      r.position.copy(d.pos);
      r.quaternion.copy(d.quat);
      r.scale.setScalar(d.scale);
    });
  });

  return <primitive object={root} />;
}
