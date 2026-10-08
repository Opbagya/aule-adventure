import * as THREE from "three";

export const NOSE = 1.9; // servicer center -> docking ring face (local -Z)
export const DOCK_Z = 2.4; // ComSat center -> aft LAR ring (local +Z)
export const TUMBLE = (0.5 * 2 * Math.PI) / 60; // 0.5 rpm roll tumble
export const FUEL_MAX = 90; // delta-v budget, m/s
export const TRANS_ACC = 1.1;
export const ROT_ACC = 0.32;
export const ROT_FUEL = 3.5;
export const START_RANGE = 1500;
export const SUN_DIR = new THREE.Vector3(0.95, 0.28, 0.12).normalize();

export type Screen = "briefing" | "playing" | "paused" | "success" | "failed";

export interface Debris {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  quat: THREE.Quaternion;
  angVel: THREE.Vector3;
  radius: number;
  kind: number;
  scale: number;
  cool: number;
}

export interface ScreenPt {
  x: number;
  y: number;
  on: boolean;
}
export interface Threat extends ScreenPt {
  tti: number;
  dist: number;
}

export const sim = {
  screen: "briefing" as Screen,
  runId: 0,
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  quat: new THREE.Quaternion(),
  angVel: new THREE.Vector3(),
  thrustWorld: new THREE.Vector3(),
  thrustRot: new THREE.Vector3(),
  fuel: FUEL_MAX,
  hull: 100,
  time: 0,
  damp: false,
  view: 1,
  range: START_RANGE,
  along: START_RANGE,
  closure: 0,
  lateral: 0,
  relSpeed: 0,
  corridorR: 1,
  inCorridor: true,
  err: { roll: 0, pitch: 0, yaw: 0, total: 0 },
  rate: { roll: 0, pitch: 0, yaw: 0 },
  phase: 1,
  warnings: [] as string[],
  flash: "",
  flashT: 0,
  targetScreen: { x: 0.5, y: 0.5, on: false } as ScreenPt,
  progradeScreen: { x: 0.5, y: 0.5, on: false } as ScreenPt,
  retroScreen: { x: 0.5, y: 0.5, on: false } as ScreenPt,
  sunScreen: { x: 0.5, y: 0.5, on: false } as ScreenPt,
  threats: [] as Threat[],
  docked: false,
  dockT: 0,
  dockTimer: 0,
  dockSpeed: 0,
  dockMis: 0,
  dockFrom: new THREE.Vector3(),
  dockFromQ: new THREE.Quaternion(),
  targetAngle: 0,
  targetQuat: new THREE.Quaternion(),
  debris: [] as Debris[],
  shake: 0,
  failReason: "",
  score: { total: 0, time: 0, fuel: 0, precision: 0, hull: 0, best: 0 },
};

export function resetSim() {
  sim.runId++;
  sim.pos.set(6, 4, START_RANGE + NOSE + DOCK_Z);
  sim.vel.set(0, 0, 0);
  sim.quat.identity();
  sim.angVel.set(0, 0, 0);
  sim.fuel = FUEL_MAX;
  sim.hull = 100;
  sim.time = 0;
  sim.damp = false;
  sim.phase = 1;
  sim.docked = false;
  sim.dockT = 0;
  sim.dockTimer = 0;
  sim.warnings = [];
  sim.flash = "";
  sim.threats = [];
  sim.failReason = "";
  sim.shake = 0;
  const kinds = [0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4];
  const debris: Debris[] = [];
  for (let i = 0; i < 42; i++) {
    const kind = kinds[Math.floor(Math.random() * kinds.length)]!;
    const scale = kind === 2 ? 1 + Math.random() * 1.2 : 0.7 + Math.random() * 0.8;
    const baseR = [5, 1.6, 0.7, 1.1, 0.9][kind]!;
    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 220,
      (Math.random() - 0.5) * 120,
      230 + Math.random() * 1150,
    );
    const dir = Math.random() < 0.5 ? -1 : 1;
    debris.push({
      pos,
      vel: new THREE.Vector3(
        dir * (1.5 + Math.random() * 6),
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 2,
      ),
      quat: new THREE.Quaternion().setFromEuler(
        new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      ),
      angVel: new THREE.Vector3(
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.6,
      ),
      radius: baseR * scale,
      kind,
      scale,
      cool: 0,
    });
  }
  sim.debris = debris;
}

export function computeScore() {
  const time = Math.max(0, Math.round(3000 - sim.time * 6));
  const fuel = Math.round((sim.fuel / FUEL_MAX) * 4000);
  const precision =
    Math.round(Math.max(0, (0.2 - sim.dockSpeed) / 0.2) * 3000) +
    (sim.dockSpeed < 0.15 ? 1000 : 0) +
    Math.round(Math.max(0, (3.5 - sim.dockMis) / 3.5) * 1000);
  const hull = Math.round(sim.hull * 10);
  const total = time + fuel + precision + hull;
  let best = total;
  try {
    best = Math.max(total, Number(localStorage.getItem("aule-best") || 0));
    localStorage.setItem("aule-best", String(best));
  } catch {
    /* ignore */
  }
  sim.score = { total, time, fuel, precision, hull, best };
}
