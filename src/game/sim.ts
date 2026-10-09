import * as THREE from "three";
import { DESTINATIONS, type DestinationId } from "./destinations";

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
  exploring: false,
  destination: "" as DestinationId | "",
  transfer: 0,
  transferActive: false,
  transferFrom: new THREE.Vector3(),
  transferTo: new THREE.Vector3(),
  boosting: false,
  motion: 0,
  cruise: false,
  landing: "orbit" as "orbit" | "manual" | "landed",
  surfaceOrigin: new THREE.Vector3(),
  surfaceQuat: new THREE.Quaternion(),
  surfacePos: new THREE.Vector3(),
  surfaceVel: new THREE.Vector3(),
  altitude: 0,
  landingSpeed: 0,
  landingQuality: "",
  gear: 0,
  missionPos: new THREE.Vector3(),
  missionVel: new THREE.Vector3(),
  missionQuat: new THREE.Quaternion(),
  missionAngVel: new THREE.Vector3(),
  planetMarkers: DESTINATIONS.map((d) => ({ id: d.id, name: d.name, x: 0.5, y: 0.5, on: false, distance: 0 })),
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
  sim.targetAngle = 0;
  sim.targetQuat.identity();
  sim.exploring = false;
  sim.destination = "";
  sim.transferActive = false;
  sim.transfer = 0;
  sim.boosting = false;
  sim.motion = 0;
  sim.cruise = false;
  sim.landing = "orbit";
  sim.gear = 0;
  sim.landingQuality = "";
  sim.view = 1;
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
    const kind = i < 12 ? i % 4 : (kinds[Math.floor(Math.random() * kinds.length)] ?? 1);
    const scale = kind === 2 ? 2 + Math.random() : 1.2 + Math.random() * 0.8;
    const baseR = [5.8, 1.6, 0.7, 1.1, 0.9][kind] ?? 1;
    const pos = new THREE.Vector3(
      i < 12 ? (i % 2 ? -1 : 1) * (8 + Math.random() * 18) : (Math.random() - 0.5) * 100,
      i < 12 ? (Math.random() - 0.5) * 18 : (Math.random() - 0.5) * 60,
      i < 12 ? 1465 - i * 24 : 230 + Math.random() * 1150,
    );
    const dir = Math.random() < 0.5 ? -1 : 1;
    debris.push({
      pos,
      vel: new THREE.Vector3(
        dir * (0.6 + Math.random() * 2),
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

export function travelTo(id: DestinationId | "mission") {
  if (sim.screen !== "playing" || sim.transferActive || sim.docked) return false;
  if (id === "mission") {
    if (!sim.exploring) return false;
    sim.transferTo.copy(sim.missionPos);
    sim.destination = "";
  } else {
    const body = DESTINATIONS.find((d) => d.id === id);
    if (!body) return false;
    if (!sim.exploring) {
      sim.missionPos.copy(sim.pos);
      sim.missionVel.copy(sim.vel);
      sim.missionQuat.copy(sim.quat);
      sim.missionAngVel.copy(sim.angVel);
    }
    sim.transferTo.copy(body.center).add(body.offset);
    sim.destination = id;
    sim.exploring = true;
  }
  sim.transferFrom.copy(sim.pos);
  sim.landing = "orbit";
  sim.gear = 0;
  sim.transfer = 0;
  sim.transferActive = true;
  sim.vel.set(0, 0, 0);
  sim.angVel.set(0, 0, 0);
  sim.quat.identity();
  sim.view = 1;
  const direction = sim.transferTo.clone().sub(sim.pos);
  if (direction.lengthSq() > 0.001) sim.quat.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction.normalize());
  sim.surfaceVel.set(0, 0, 0);
  sim.altitude = 0;
  sim.landingQuality = "";
  sim.shake = 0;
  sim.motion = 0;
  return true;
}

/** One transfer path for every destination, including repeated visits and return. */
export function advanceTransfer(delta: number) {
  if (!sim.transferActive || sim.screen !== "playing") return false;
  sim.transfer = Math.min(1, sim.transfer + Math.max(0, delta) / 5);
  const t = THREE.MathUtils.smoothstep(sim.transfer, 0.18, 0.88);
  sim.pos.lerpVectors(sim.transferFrom, sim.transferTo, t * t * (3 - 2 * t));
  if (sim.transfer < 1) return false;
  sim.pos.copy(sim.transferTo);
  sim.transferActive = false;
  sim.vel.set(0, 0, 0);
  sim.angVel.set(0, 0, 0);
  sim.thrustWorld.set(0, 0, 0);
  const body = DESTINATIONS.find((d) => d.id === sim.destination);
  if (body) sim.quat.setFromUnitVectors(new THREE.Vector3(0, 0, -1), body.center.clone().sub(sim.pos).normalize());
  else {
    sim.exploring = false;
    sim.vel.copy(sim.missionVel);
    sim.quat.copy(sim.missionQuat);
    sim.angVel.copy(sim.missionAngVel);
  }
  return true;
}

export function approachSurface() {
  if (!sim.exploring || sim.transferActive || sim.landing !== "orbit") return;
  const body = DESTINATIONS.find((d) => d.id === sim.destination);
  if (!body) return;
  sim.transferFrom.copy(sim.pos);
  sim.transferTo.copy(body.center).add(new THREE.Vector3(0, 0, body.radius + 140));
  sim.transfer = 0;
  sim.transferActive = true;
  sim.vel.set(0, 0, 0);
}

export function beginLanding(normal: THREE.Vector3, center: THREE.Vector3, radius: number) {
  sim.surfaceOrigin.copy(center).addScaledVector(normal, radius);
  sim.surfaceQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  sim.surfacePos.copy(sim.pos).sub(sim.surfaceOrigin).applyQuaternion(sim.surfaceQuat.clone().invert());
  sim.surfacePos.y = Math.max(12, Math.min(160, sim.surfacePos.y));
  sim.surfaceVel.set(0, 0, 0);
  sim.vel.set(0, 0, 0);
  sim.angVel.set(0, 0, 0);
  sim.quat.copy(sim.surfaceQuat);
  sim.surfacePos.x = 0;
  sim.surfacePos.z = 0;
  sim.altitude = sim.surfacePos.y - 2.65;
  sim.gear = 1;
  sim.landing = "manual";
  sim.boosting = false;
  sim.view = 1;
}

export function liftOff() {
  if (sim.landing !== "landed") return;
  sim.surfacePos.y = 4;
  sim.surfaceVel.set(0, 5, 0);
  sim.landing = "manual";
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
