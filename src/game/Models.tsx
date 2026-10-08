import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { DOCK_Z, NOSE, SUN_DIR, sim } from "./sim";
import { getFoil, getSolar } from "./textures";

const hdr = (r: number, g: number, b: number) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false });

function useMats() {
  return useMemo(() => {
    const gold = getFoil("gold");
    const silver = getFoil("silver");
    const deep = getSolar("deep");
    const blue = getSolar("blue");
    return {
      gold: new THREE.MeshPhysicalMaterial({
        map: gold.map, bumpMap: gold.bump, bumpScale: 2.5, metalness: 0.9, roughness: 0.26,
        clearcoat: 0.3, clearcoatRoughness: 0.2,
      }),
      silver: new THREE.MeshPhysicalMaterial({
        map: silver.map, bumpMap: silver.bump, bumpScale: 2.5, metalness: 0.9, roughness: 0.22,
      }),
      alu: new THREE.MeshStandardMaterial({ color: "#c9ccd1", metalness: 0.92, roughness: 0.22 }),
      dark: new THREE.MeshStandardMaterial({ color: "#1b1d22", metalness: 0.6, roughness: 0.45 }),
      white: new THREE.MeshStandardMaterial({ color: "#e8e6df", metalness: 0.05, roughness: 0.55 }),
      osr: new THREE.MeshStandardMaterial({ color: "#dfe6ee", metalness: 0.95, roughness: 0.08 }),
      niobium: new THREE.MeshStandardMaterial({ color: "#5d5248", metalness: 0.85, roughness: 0.38 }),
      lens: new THREE.MeshPhysicalMaterial({ color: "#05070c", metalness: 0.2, roughness: 0.05, clearcoat: 1 }),
      solarDeep: new THREE.MeshPhysicalMaterial({
        map: deep, metalness: 0.55, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.04,
      }),
      solarBlue: new THREE.MeshPhysicalMaterial({
        map: blue, metalness: 0.5, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.04,
      }),
      backsheet: new THREE.MeshStandardMaterial({ color: "#3a3a3c", metalness: 0.3, roughness: 0.7 }),
    };
  }, []);
}

type Mats = ReturnType<typeof useMats>;

function Panel({ mats, solar, size, ...p }: { mats: Mats; solar: THREE.Material; size: [number, number, number] } & JSX.IntrinsicElements["group"]) {
  const arr = useMemo(
    () => [mats.alu, mats.alu, solar, mats.backsheet, mats.alu, mats.alu],
    [mats, solar],
  );
  return (
    <group {...p}>
      <mesh material={arr} castShadow receiveShadow>
        <boxGeometry args={size} />
      </mesh>
    </group>
  );
}

const RCS_BLOCKS: [number, number, number][] = [
  [1.02, 0.62, 0.4],
  [-1.02, 0.62, 0.4],
  [1.02, -0.62, 0.4],
  [-1.02, -0.62, 0.4],
];
export const RCS_LOCAL = RCS_BLOCKS.map((p) => new THREE.Vector3(...p));

export function Servicer() {
  const mats = useMats();
  const g = useRef<THREE.Group>(null);
  const wings = useRef<(THREE.Group | null)[]>([]);
  const fingers = useRef<(THREE.Group | null)[]>([]);
  const beacon = useMemo(() => hdr(6, 1, 0.4), []);
  const _q = useMemo(() => new THREE.Quaternion(), []);
  const _v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.position.copy(sim.pos);
    g.current.quaternion.copy(sim.quat);
    _v.copy(SUN_DIR).applyQuaternion(_q.copy(sim.quat).invert());
    const a = Math.atan2(_v.z, _v.y);
    wings.current.forEach((w) => w && (w.rotation.x += (a - w.rotation.x) * 0.02));
    const close = sim.dockT;
    fingers.current.forEach((f) => f && (f.rotation.x = 0.9 * (1 - close) - 0.15 * close));
    const blink = Math.sin(clock.elapsedTime * 6) > 0.7 ? 1 : 0.05;
    beacon.color.setRGB(6 * blink, 1 * blink, 0.4 * blink);
  }, -1);

  return (
    <group ref={g}>
      {/* hexagonal bus */}
      <mesh material={mats.gold} rotation={[Math.PI / 2, 0, Math.PI / 6]} castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.15, 2.4, 6]} />
      </mesh>
      <mesh material={mats.dark} position={[0, 0, -1.22]} rotation={[Math.PI / 2, 0, Math.PI / 6]}>
        <cylinderGeometry args={[1.05, 1.05, 0.06, 6]} />
      </mesh>
      <mesh material={mats.silver} position={[0, 0, 1.22]} rotation={[Math.PI / 2, 0, Math.PI / 6]}>
        <cylinderGeometry args={[1.05, 1.05, 0.06, 6]} />
      </mesh>
      {/* docking ring + struts */}
      <mesh material={mats.alu} position={[0, 0, -NOSE]} castShadow>
        <torusGeometry args={[0.72, 0.07, 16, 48]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} material={mats.alu} position={[Math.cos(a) * 0.72, Math.sin(a) * 0.72, -1.55]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.7, 6]} />
          </mesh>
        );
      })}
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[0, 0, (i / 3) * Math.PI * 2 + 0.5]}>
          <group position={[0, 0.72, -NOSE]} ref={(r) => (fingers.current[i] = r)}>
            <mesh material={mats.dark} position={[0, 0.05, -0.18]}>
              <boxGeometry args={[0.16, 0.08, 0.38]} />
            </mesh>
            <mesh material={mats.alu} position={[0, -0.04, -0.35]}>
              <boxGeometry args={[0.14, 0.16, 0.06]} />
            </mesh>
          </group>
        </group>
      ))}
      {/* LiDAR turret */}
      <group position={[0, 1.12, -0.85]}>
        <mesh material={mats.alu}>
          <cylinderGeometry args={[0.18, 0.22, 0.25, 20]} />
        </mesh>
        <mesh material={mats.dark} position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.34, 20]} />
        </mesh>
        <mesh material={mats.lens} position={[0, 0.2, -0.18]}>
          <sphereGeometry args={[0.12, 20, 12]} />
        </mesh>
      </group>
      <mesh material={beacon} position={[0, -1.08, -1.1]}>
        <sphereGeometry args={[0.05, 8, 8]} />
      </mesh>
      {/* RCS quads */}
      {RCS_BLOCKS.map((p, i) => (
        <group key={i} position={p}>
          <mesh material={mats.alu} castShadow>
            <boxGeometry args={[0.24, 0.24, 0.24]} />
          </mesh>
          {[
            [0.15, 0, 0, 0, 0, -Math.PI / 2],
            [0, 0.15 * Math.sign(p[1]), 0, 0, 0, p[1] > 0 ? 0 : Math.PI],
            [0, 0, 0.15, Math.PI / 2, 0, 0],
            [0, 0, -0.15, -Math.PI / 2, 0, 0],
          ].map((n, j) => (
            <mesh key={j} material={mats.niobium} position={[n[0] * Math.sign(p[0] || 1), n[1], n[2]]} rotation={[n[3], n[4], n[5] * Math.sign(p[0] || 1)]}>
              <coneGeometry args={[0.05, 0.1, 10, 1, true]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* articulated solar wings */}
      {[1, -1].map((s, i) => (
        <group key={s} position={[s * 1.15, 0, 0.2]}>
          <mesh material={mats.alu} position={[s * 0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
          </mesh>
          <mesh material={mats.dark} position={[s * 0.95, 0, 0]}>
            <boxGeometry args={[0.14, 0.18, 0.18]} />
          </mesh>
          <group position={[s * 1.0, 0, 0]} ref={(r) => (wings.current[i] = r)}>
            <Panel mats={mats} solar={mats.solarDeep} size={[1.9, 0.04, 1.3]} position={[s * 1.05, 0, 0]} />
            <Panel mats={mats} solar={mats.solarDeep} size={[1.9, 0.04, 1.3]} position={[s * 3.0, 0, 0]} />
          </group>
        </group>
      ))}
    </group>
  );
}

export function ComSat() {
  const mats = useMats();
  const g = useRef<THREE.Group>(null);
  const red = useMemo(() => hdr(8, 0.3, 0.2), []);
  const green = useMemo(() => hdr(0.3, 8, 0.6), []);
  const white = useMemo(() => hdr(12, 12, 12), []);
  const dish = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 28; i++) {
      const r = (i / 28) * 2.4;
      pts.push(new THREE.Vector2(r, (r * r) / (4 * 1.5)));
    }
    return new THREE.LatheGeometry(pts, 64);
  }, []);
  const bell = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      pts.push(new THREE.Vector2(0.14 + Math.pow(t, 1.6) * 0.34, t * 0.9));
    }
    return new THREE.LatheGeometry(pts, 40);
  }, []);
  const dishMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ecebe6", roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide }), []);
  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.quaternion.copy(sim.targetQuat);
    const t = clock.elapsedTime;
    const nav = (t % 1.2) < 0.12 ? 1 : 0.02;
    red.color.setRGB(8 * nav, 0.3 * nav, 0.2 * nav);
    green.color.setRGB(0.3 * nav, 8 * nav, 0.6 * nav);
    const ph = t % 1.6;
    const st = ph < 0.06 || (ph > 0.2 && ph < 0.26) ? 1 : 0.01;
    white.color.setRGB(14 * st, 14 * st, 14 * st);
  }, -1);

  return (
    <group ref={g}>
      <mesh material={mats.silver} castShadow receiveShadow>
        <boxGeometry args={[3, 3, 4]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} material={mats.osr} position={[0, s * 1.52, 0]} receiveShadow>
          <boxGeometry args={[2.6, 0.04, 3.6]} />
        </mesh>
      ))}
      <mesh material={mats.gold} position={[0, 0, 2.02]}>
        <boxGeometry args={[2.8, 2.8, 0.04]} />
      </mesh>
      {/* main high-gain dish */}
      <group position={[0, -0.6, -2.3]} rotation={[-Math.PI / 2 + 0.35, 0, 0]}>
        <mesh geometry={dish} material={dishMat} castShadow receiveShadow />
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={i} material={mats.alu} position={[Math.cos(a) * 1.0, 0.85, Math.sin(a) * 1.0]} rotation={[Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7]}>
              <cylinderGeometry args={[0.025, 0.025, 1.9, 6]} />
            </mesh>
          );
        })}
        <mesh material={mats.gold} position={[0, 1.5, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.16, 0.4, 16]} />
        </mesh>
      </group>
      {/* secondary dish */}
      <group position={[0.6, 1.6, -1.2]} rotation={[-0.5, 0, 0]} scale={0.38}>
        <mesh geometry={dish} material={dishMat} castShadow />
      </group>
      {/* apogee kick motor + launch adapter ring */}
      <mesh geometry={bell} material={mats.niobium} position={[0, 0, 2.05]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh material={mats.alu} position={[0, 0, 2.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.76, 0.8, 0.3, 48, 1, true]} />
      </mesh>
      <mesh material={mats.alu} position={[0, 0, DOCK_Z - 0.05]} castShadow>
        <torusGeometry args={[0.76, 0.07, 16, 56]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} material={hdr(1.4, 1.4, 1.4)} position={[Math.cos(a) * 1.1, Math.sin(a) * 1.1, 2.06]}>
            <boxGeometry args={[0.14, 0.14, 0.02]} />
          </mesh>
        );
      })}
      <mesh material={white} position={[0, 0.95, 2.1]}>
        <sphereGeometry args={[0.07, 10, 10]} />
      </mesh>
      <mesh material={white} position={[0, -0.95, 2.1]}>
        <sphereGeometry args={[0.07, 10, 10]} />
      </mesh>
      {/* solar arrays */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh material={mats.alu} position={[s * 2.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 2.2, 8]} />
          </mesh>
          <mesh material={mats.dark} position={[s * 1.6, 0, 0]}>
            <boxGeometry args={[0.3, 0.4, 0.4]} />
          </mesh>
          <group rotation={[-0.45, 0, 0]}>
            {[0, 1, 2, 3].map((i) => (
              <Panel key={i} mats={mats} solar={mats.solarBlue} size={[2.6, 0.06, 2.3]} position={[s * (5.1 + i * 2.72), 0, 0]} rotation={[Math.PI / 2, 0, 0]} />
            ))}
          </group>
          <mesh material={s > 0 ? green : red} position={[s * 15.75, 0, 0]}>
            <sphereGeometry args={[0.1, 10, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Holographic docking corridor funnel along ComSat +Z. */
export function Corridor() {
  const g = useRef<THREE.Group>(null);
  const { obj, mat } = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.3, 2.2, 1.4), transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
    const obj = new THREE.Group();
    for (let i = 1; i <= 22; i++) {
      const d = i * i * 0.45;
      const r = 0.6 + d * 0.1;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 64; k++) {
        const a = (k / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, DOCK_Z + d));
      }
      obj.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const far = 22 * 22 * 0.45;
      const pts = [
        new THREE.Vector3(Math.cos(a) * 0.6, Math.sin(a) * 0.6, DOCK_Z),
        new THREE.Vector3(Math.cos(a) * (0.6 + far * 0.1), Math.sin(a) * (0.6 + far * 0.1), DOCK_Z + far),
      ];
      obj.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    return { obj, mat };
  }, []);
  useFrame(() => {
    if (!g.current) return;
    g.current.quaternion.copy(sim.targetQuat);
    g.current.visible = sim.range < 260 && !sim.docked;
    if (sim.inCorridor) mat.color.setRGB(0.3, 2.2, 1.4);
    else mat.color.setRGB(2.6, 1.2, 0.2);
    mat.opacity = 0.35 + Math.min(1, 40 / Math.max(sim.range, 1)) * 0.3;
  }, -1);
  return (
    <group ref={g}>
      <primitive object={obj} />
    </group>
  );
}

export function DebrisField() {
  const mats = useMats();
  const root = useMemo(() => {
    const root = new THREE.Group();
    const geo = {
      stage: new THREE.CylinderGeometry(1.6, 1.6, 9, 32, 1),
      band: new THREE.CylinderGeometry(1.62, 1.62, 1.2, 32, 1, true),
      nozzle: new THREE.ConeGeometry(1.1, 1.8, 24, 1, true),
      shard: new THREE.BoxGeometry(2.4, 0.05, 1.6),
      cube: new THREE.BoxGeometry(0.34, 0.34, 0.68),
      wing: new THREE.BoxGeometry(0.6, 0.02, 0.32),
      foil: (() => {
        const gg = new THREE.IcosahedronGeometry(1, 1);
        const p = gg.attributes.position;
        for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1 + Math.random() * 0.4), p.getY(i) * 0.18, p.getZ(i) * (0.7 + Math.random() * 0.4));
        gg.computeVertexNormals();
        return gg;
      })(),
      rock: (() => {
        const gg = new THREE.DodecahedronGeometry(0.8, 1);
        const p = gg.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const s = 0.75 + Math.random() * 0.45;
          p.setXYZ(i, p.getX(i) * s, p.getY(i) * s, p.getZ(i) * s);
        }
        gg.computeVertexNormals();
        return gg;
      })(),
    };
    const rockMat = new THREE.MeshStandardMaterial({ color: "#4a4440", roughness: 0.95, metalness: 0.1, flatShading: true });
    const goldFlat = mats.gold.clone();
    goldFlat.flatShading = true;
    goldFlat.side = THREE.DoubleSide;
    for (const d of sim.debris) {
      const o = new THREE.Group();
      const add = (gm: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], pos?: [number, number, number], rot?: [number, number, number]) => {
        const mesh = new THREE.Mesh(gm, m);
        mesh.castShadow = mesh.receiveShadow = true;
        if (pos) mesh.position.set(...pos);
        if (rot) mesh.rotation.set(...rot);
        o.add(mesh);
      };
      if (d.kind === 0) {
        add(geo.stage, mats.white);
        add(geo.band, mats.dark, [0, 2.6, 0]);
        add(geo.nozzle, mats.niobium, [0, -5.3, 0]);
      } else if (d.kind === 1) {
        add(geo.shard, [mats.alu, mats.alu, mats.solarBlue, mats.backsheet, mats.alu, mats.alu]);
      } else if (d.kind === 2) {
        add(geo.cube, mats.alu);
        add(geo.wing, mats.solarDeep, [0.47, 0, 0.1]);
        add(geo.wing, mats.solarDeep, [-0.47, 0, 0.1], [0.4, 0, 0]);
      } else if (d.kind === 3) {
        add(geo.foil, goldFlat);
      } else {
        add(geo.rock, rockMat);
      }
      o.scale.setScalar(d.scale);
      root.add(o);
    }
    return root;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mats, sim.runId]);
  useFrame(() => {
    root.children.forEach((c, i) => {
      const d = sim.debris[i];
      if (!d) return;
      c.position.copy(d.pos);
      c.quaternion.copy(d.quat);
    });
  }, -1);
  return <primitive object={root} />;
}
