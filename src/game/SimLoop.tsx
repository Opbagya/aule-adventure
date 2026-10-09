import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { audio } from "./audio";
import { readAxes } from "./input";
import {
  DOCK_Z, FUEL_MAX, NOSE, ROT_ACC, ROT_FUEL, SUN_DIR, TRANS_ACC, TUMBLE,
  advanceTransfer, beginLanding, computeScore, sim, type ScreenPt,
} from "./sim";
import { RCS_LOCAL } from "./Models";
import { getGlow } from "./textures";
import { DESTINATIONS } from "./destinations";
import { FOOT_HEIGHT, surfaceHeight } from "./Landing";
import { landingVerticalVelocity, LANDING_ACCEL } from "./landing-controls";

const Z = new THREE.Vector3(0, 0, 1);
const D = new THREE.Vector3();
const AX = new THREE.Vector3();
const N = new THREE.Vector3();
const REL = new THREE.Vector3();
const T1 = new THREE.Vector3();
const T2 = new THREE.Vector3();
const T3 = new THREE.Vector3();
const DQ = new THREE.Quaternion();
const QE = new THREE.Quaternion();
const EU = new THREE.Euler();
const PJ = new THREE.Vector3();
const CAM_T = new THREE.Vector3(10, 6, 34);

function project(cam: THREE.Camera, p: THREE.Vector3, out: ScreenPt) {
  PJ.copy(p).project(cam);
  const behind = PJ.z > 1;
  let x = PJ.x;
  let y = PJ.y;
  if (behind) {
    x = -x;
    y = -y;
  }
  out.on = !behind && Math.abs(x) < 1 && Math.abs(y) < 1;
  if (!out.on) {
    const m = Math.max(Math.abs(x), Math.abs(y), 1e-6);
    x = (x / m) * 0.94;
    y = (y / m) * 0.92;
  }
  out.x = x * 0.5 + 0.5;
  out.y = -y * 0.5 + 0.5;
}

function fail(reason: string) {
  sim.failReason = reason;
  sim.screen = "failed";
  audio.setHiss(0);
  audio.voice("Mission abort. " + reason);
}

let alarmT = 0;
let prevPhase = 1;
let wasThrusting = false;
let lastRun = -1;

export function SimLoop() {
  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const cam = state.camera as THREE.PerspectiveCamera;
    const playing = sim.screen === "playing";
    const paused = sim.screen === "paused";

    if (playing && !sim.exploring) {
      sim.targetAngle += TUMBLE * dt;
      sim.targetQuat.setFromAxisAngle(Z, sim.targetAngle);
    }
    D.set(0, 0, DOCK_Z).applyQuaternion(sim.targetQuat);
    AX.set(0, 0, 1).applyQuaternion(sim.targetQuat);

    sim.thrustWorld.set(0, 0, 0);
    sim.thrustRot.set(0, 0, 0);

    sim.boosting = false;
    if (playing && !sim.docked && !sim.transferActive && sim.landing === "orbit") {
      if (!sim.exploring) sim.time += dt;
      const ax = readAxes();
      // Propulsion is unlimited; proximity interlocks still protect docking/landing.
      sim.fuel = FUEL_MAX;
      const fuelOk = true;
      // --- rotation (body frame) ---
      const cmd = T1.set(ax.pitch, ax.yaw, ax.roll);
      const rot = T2.copy(cmd).multiplyScalar(fuelOk ? ROT_ACC : 0);
      if (sim.damp && fuelOk) {
        const desired = T3.set(0, 0, !sim.exploring && sim.range < 300 ? TUMBLE : 0).applyQuaternion(QE.copy(sim.quat).invert());
        desired.sub(sim.angVel);
        const c = (v: number) => Math.max(-ROT_ACC, Math.min(ROT_ACC, v * 5));
        if (cmd.x === 0) rot.x = c(desired.x);
        if (cmd.y === 0) rot.y = c(desired.y);
        if (cmd.z === 0) rot.z = c(desired.z);
      }
      sim.angVel.addScaledVector(rot, dt);
      sim.thrustRot.copy(rot);
      const ang = sim.angVel.length() * dt;
      if (ang > 1e-9) {
        DQ.setFromAxisAngle(T3.copy(sim.angVel).normalize(), ang);
        sim.quat.multiply(DQ).normalize();
      }
      // --- translation ---
      const body = DESTINATIONS.find((d) => d.id === sim.destination);
      const altitude = body ? sim.pos.distanceTo(body.center) - body.radius : Infinity;
      sim.boosting = ax.boost && (sim.exploring ? altitude > 200 : sim.range > 250) && fuelOk;
      const fine = sim.exploring ? 30 : sim.range < 30 ? 0.3 : 3;
      const tl = T1.set(ax.sway, ax.heave, -ax.surge);
      if (tl.lengthSq() > 1) tl.normalize();
      tl.multiplyScalar(fuelOk ? TRANS_ACC * fine : 0);
      sim.thrustWorld.copy(tl).applyQuaternion(sim.quat);
      sim.vel.addScaledVector(sim.thrustWorld, dt);
      if (sim.boosting) {
        const speed = sim.exploring ? Math.min(2400, Math.max(90, altitude * 1.6)) : Math.min(180, Math.max(12, (sim.range - 220) * 0.6));
        T2.set(ax.sway * speed * 0.15, ax.heave * speed * 0.15, -speed).applyQuaternion(sim.quat);
        sim.vel.lerp(T2, 1 - Math.exp(-4 * dt));
      } else if (sim.cruise) {
        const speed = sim.exploring ? Math.min(100, Math.max(6, altitude * 0.15)) : sim.range < 30 ? 0.15 : 18;
        T2.set(ax.sway, ax.heave, -ax.surge).multiplyScalar(speed).applyQuaternion(sim.quat);
        sim.vel.lerp(T2, 1 - Math.exp(-3 * dt));
      }
      sim.pos.addScaledVector(sim.vel, dt);
      if (sim.boosting) sim.thrustWorld.add(T2.set(0, 0, -8).applyQuaternion(sim.quat));
      sim.fuel = FUEL_MAX;

      const thrusting = sim.thrustWorld.lengthSq() > 1e-4 || sim.thrustRot.lengthSq() > 0.004;
      if (thrusting && !wasThrusting) audio.thud();
      wasThrusting = thrusting;
      audio.setHiss(thrusting ? Math.min(1, sim.thrustWorld.length() / TRANS_ACC + sim.thrustRot.length() / ROT_ACC * 0.5) : 0);
      if (thrusting) sim.shake = Math.max(sim.shake, 0.012 + sim.thrustWorld.length() * 0.01);
    }

    if (playing && sim.transferActive) {
      if (advanceTransfer(dt)) audio.warpExit();
    }
    if (playing && sim.exploring && !sim.transferActive && sim.landing === "orbit") {
      for (const body of DESTINATIONS) {
        T1.copy(sim.pos).sub(body.center);
        if (body.id === sim.destination && T1.length() < body.radius + 165) {
          beginLanding(T1.normalize(), body.center, body.radius);
          audio.beep(900, 0.15, 0.08);
          break;
        }
        if (T1.length() < body.radius + 80) {
          T1.normalize(); sim.pos.copy(body.center).addScaledVector(T1, body.radius + 80);
          const radial = sim.vel.dot(T1); if (radial < 0) sim.vel.addScaledVector(T1, -radial);
        }
      }
    }
    if (playing && sim.landing !== "orbit" && !sim.transferActive) {
      sim.gear = Math.min(1, sim.gear + dt * 0.6);
      const ground = surfaceHeight(sim.surfacePos.x, sim.surfacePos.z);
      const alt = Math.max(0, sim.surfacePos.y - ground - FOOT_HEIGHT);
      const ax = readAxes(true);
      if (sim.landing !== "landed") {
        // Camera-right is tangent +Z/-X; arrow up/down exclusively apply vertical thrust.
        T1.set((-18 * ax.sway - 28 * ax.surge) / 33.29 * 6, 0, (28 * ax.sway - 18 * ax.surge) / 33.29 * 6);
        sim.surfaceVel.x += (T1.x - sim.surfaceVel.x) * (1 - Math.exp(-4 * dt));
        sim.surfaceVel.z += (T1.z - sim.surfaceVel.z) * (1 - Math.exp(-4 * dt));
        sim.surfaceVel.y = landingVerticalVelocity(sim.surfaceVel.y, ax.heave, dt);
        sim.surfacePos.addScaledVector(sim.surfaceVel, dt);
        const floor = surfaceHeight(sim.surfacePos.x, sim.surfacePos.z) + FOOT_HEIGHT;
        if (sim.surfacePos.y <= floor) {
          const speed = sim.surfaceVel.length(); sim.landingSpeed = speed;
          if (speed > 2) {
            sim.surfacePos.y = floor + 1; sim.surfaceVel.y = 1.5;
            sim.hull = Math.max(0, sim.hull - 12);
            sim.flash = "HARD CONTACT"; sim.flashT = 3; audio.impact();
            if (sim.hull <= 0) fail("Landing impact exceeded structural limits.");
          } else {
            sim.surfacePos.y = floor; sim.surfaceVel.set(0, 0, 0); sim.landing = "landed";
            sim.landingQuality = speed < 0.6 ? "Precision touchdown" : "Touchdown confirmed";
            audio.clamp();
          }
        }
        if (sim.surfacePos.y > 190) {
          sim.landing = "orbit"; sim.gear = 0;
          sim.vel.copy(sim.surfaceVel).applyQuaternion(sim.surfaceQuat);
        }
      }
      sim.pos.copy(sim.surfacePos).applyQuaternion(sim.surfaceQuat).add(sim.surfaceOrigin);
      sim.quat.copy(sim.surfaceQuat);
      sim.vel.copy(sim.surfaceVel).applyQuaternion(sim.surfaceQuat);
      sim.altitude = Math.max(0, sim.surfacePos.y - surfaceHeight(sim.surfacePos.x, sim.surfacePos.z) - FOOT_HEIGHT);
      sim.thrustWorld.set(0, sim.landing === "landed" ? 0 : ax.heave * LANDING_ACCEL, 0).applyQuaternion(sim.surfaceQuat);
      audio.setHiss(sim.landing === "landed" ? 0 : Math.abs(ax.heave) * 0.6);
    }
    const motionTarget = playing && sim.landing === "orbit" ? (sim.transferActive || sim.boosting ? 1 : Math.min(0.32, sim.vel.length() / 100)) : 0;
    sim.motion += (motionTarget - sim.motion) * (1 - Math.exp(-4 * dt));

    // --- docked: capture animation ---
    if (sim.docked) {
      sim.dockT = Math.min(1, sim.dockT + dt / 1.6);
      const e = sim.dockT * sim.dockT * (3 - 2 * sim.dockT);
      const fin = T1.copy(D).addScaledVector(AX, NOSE);
      sim.pos.lerpVectors(sim.dockFrom, fin, e);
      sim.quat.slerpQuaternions(sim.dockFromQ, sim.targetQuat, e);
      sim.vel.set(0, 0, 0);
      sim.angVel.set(0, 0, 0);
      if (!paused) sim.dockTimer += dt;
      if (playing && sim.dockTimer > 4.2) {
        computeScore();
        sim.screen = "success";
      }
    }

    // --- telemetry ---
    N.set(0, 0, -NOSE).applyQuaternion(sim.quat).add(sim.pos);
    REL.copy(N).sub(D);
    sim.range = REL.length();
    sim.along = REL.dot(AX);
    sim.lateral = T1.copy(REL).addScaledVector(AX, -sim.along).length();
    sim.relSpeed = sim.vel.length();
    sim.closure = sim.range > 0.01 ? -sim.vel.dot(REL) / sim.range : 0;
    sim.corridorR = 0.6 + Math.max(sim.along, 0) * 0.1;
    sim.inCorridor = sim.along > 0 && sim.lateral < sim.corridorR;
    QE.copy(sim.quat).invert().multiply(sim.targetQuat);
    EU.setFromQuaternion(QE, "XYZ");
    sim.err.pitch = THREE.MathUtils.radToDeg(EU.x);
    sim.err.yaw = THREE.MathUtils.radToDeg(EU.y);
    sim.err.roll = THREE.MathUtils.radToDeg(EU.z);
    sim.err.total = THREE.MathUtils.radToDeg(2 * Math.acos(Math.min(1, Math.abs(QE.w))));
    sim.rate.pitch = THREE.MathUtils.radToDeg(sim.angVel.x);
    sim.rate.yaw = THREE.MathUtils.radToDeg(sim.angVel.y);
    sim.rate.roll = THREE.MathUtils.radToDeg(sim.angVel.z);
    sim.phase = sim.range > 200 ? 1 : sim.range > 15 ? 2 : 3;

    const warnings: string[] = [];
    const threatsRaw: { i: number; tti: number; dist: number }[] = [];

    if (sim.runId !== lastRun) {
      lastRun = sim.runId;
      prevPhase = 1;
    }
    if (playing && !sim.docked && !sim.exploring) {
      if (sim.phase !== prevPhase) {
        if (sim.phase === 2 && prevPhase === 1) audio.voice("Servicer one, ComSat nine in visual range. Begin terminal approach.");
        if (sim.phase === 3 && prevPhase === 2) audio.voice("Inside fifteen meters. Stand by for capture.");
        prevPhase = sim.phase;
      }
      // contact & capture
      if (sim.range < 1.5 && sim.along > -0.4) {
        const ok = sim.relSpeed < 0.2 && sim.err.total < 3.5 && sim.lateral < 0.5;
        if (ok) {
          sim.docked = true;
          sim.dockSpeed = sim.relSpeed;
          sim.dockMis = sim.err.total;
          sim.dockFrom.copy(sim.pos);
          sim.dockFromQ.copy(sim.quat);
          sim.flash = "MAGNETIC CAPTURE — HARD DOCK CONFIRMED";
          sim.flashT = 6;
          audio.setHiss(0);
          audio.clamp();
          setTimeout(() => audio.voice("Hard dock confirmed. Satellite life extended. Welcome to the Aule fleet."), 1400);
        } else if (sim.range < 0.7) {
          const vn = sim.vel.dot(AX);
          sim.vel.addScaledVector(AX, -vn * 1.6);
          sim.pos.addScaledVector(AX, 0.3);
          sim.hull -= 8 + sim.relSpeed * 40;
          sim.shake = 0.4;
          sim.flash = "CONTACT REJECTED — CHECK RATE / ALIGNMENT";
          sim.flashT = 3;
          audio.impact();
        }
      }
      // ComSat body collision
      const dc = sim.pos.length();
      if (!sim.docked && dc < 4.0) {
        T1.copy(sim.pos).normalize();
        const vn = sim.vel.dot(T1);
        if (vn < 0) sim.vel.addScaledVector(T1, -vn * 1.5);
        sim.pos.copy(T1.multiplyScalar(4.0));
        sim.hull -= 10 + Math.abs(vn) * 25;
        sim.shake = 0.5;
        sim.flash = "STRUCTURAL CONTACT WITH COMSAT-9";
        sim.flashT = 3;
        audio.impact();
      }
    }

    // debris
    if (playing && !sim.exploring) {
      for (let i = 0; i < sim.debris.length; i++) {
        const d = sim.debris[i];
        if (!d) continue;
        d.pos.addScaledVector(d.vel, dt);
        if (d.pos.x > 160) d.pos.x = -160;
        if (d.pos.x < -160) d.pos.x = 160;
        const a = d.angVel.length() * dt;
        if (a > 0) {
          DQ.setFromAxisAngle(T1.copy(d.angVel).normalize(), a);
          d.quat.premultiply(DQ);
        }
        if (d.cool > 0) d.cool -= dt;
        if (!playing || sim.docked) continue;
        T1.copy(d.pos).sub(sim.pos);
        const dist = T1.length();
        const rv = T2.copy(d.vel).sub(sim.vel);
        if (dist < d.radius + 1.6 && d.cool <= 0) {
          const rs = rv.length();
          sim.hull -= Math.max(10, Math.min(45, rs * 6));
          T1.normalize();
          sim.vel.addScaledVector(T1, -Math.max(0.5, rs * 0.25));
          sim.angVel.add(T3.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.5));
          d.vel.addScaledVector(T1, 1.5);
          d.cool = 2;
          sim.shake = 0.7;
          sim.flash = "DEBRIS IMPACT — HULL BREACH RISK";
          sim.flashT = 2.5;
          audio.impact();
          continue;
        }
        const rv2 = rv.lengthSq();
        if (rv2 > 1e-4) {
          const tti = -T1.dot(rv) / rv2;
          if (tti > 0 && tti < 12) {
            const miss = T3.copy(T1).addScaledVector(rv, tti).length();
            if (miss < d.radius + 7) threatsRaw.push({ i, tti, dist });
          }
        }
        if (dist < d.radius + 12 && !threatsRaw.some((t) => t.i === i)) threatsRaw.push({ i, tti: 0, dist });
      }
    }

    if (playing && !sim.docked && !sim.exploring) {
      if (threatsRaw.some((t) => t.tti < 6)) warnings.push("IMPACT WARNING");
      if (sim.range < 50 && sim.closure > 0.3) warnings.push("EXCESSIVE CLOSURE RATE");
      if (sim.range < 200 && !sim.inCorridor) warnings.push("CORRIDOR DEVIATION");
      if (sim.fuel / FUEL_MAX < 0.2) warnings.push("RCS PROPELLANT LOW");
      if (sim.hull < 35) warnings.push("HULL INTEGRITY CRITICAL");
      alarmT -= dt;
      if (warnings.length && alarmT <= 0) {
        const impact = warnings[0] === "IMPACT WARNING";
        audio.beep(impact ? 1250 : 740, 0.1, impact ? 0.14 : 0.09);
        if (impact) setTimeout(() => audio.beep(1250, 0.1, 0.14), 140);
        alarmT = impact ? 0.55 : 1.1;
      }
      if (sim.hull <= 0) {
        sim.hull = 0;
        fail("Hull integrity lost. Servicer destroyed.");
      } else if (sim.range > 2600) {
        fail("Servicer departed the operations zone.");
      } else if (sim.fuel <= 0 && sim.relSpeed < 0.02 && sim.range > 3) {
        fail("RCS propellant depleted. Servicer adrift.");
      }
    }
    sim.warnings = warnings;
    if (sim.flashT > 0) sim.flashT -= dt;

    // --- camera ---
    const k = 1 - Math.exp(-6 * dt);
    if (sim.screen === "briefing") {
      const drift = state.clock.elapsedTime * 0.1;
      cam.position.set(sim.pos.x + 8 + Math.sin(drift) * 1.2, sim.pos.y + 2.5 + Math.sin(drift * 0.7) * 0.3, sim.pos.z + 13);
      cam.up.set(0, 1, 0);
      cam.lookAt(sim.pos.x - 6, sim.pos.y, sim.pos.z - 3);
      cam.fov = 52;
    } else if (sim.landing !== "orbit") {
      T1.copy(sim.surfacePos).add(T3.set(28, 5, 18)).applyQuaternion(sim.surfaceQuat).add(sim.surfaceOrigin);
      cam.position.copy(T1);
      cam.up.set(0, 1, 0).applyQuaternion(sim.surfaceQuat);
      cam.lookAt(T2.copy(sim.pos).add(T3.set(0, -1.7, 0).applyQuaternion(sim.surfaceQuat)));
      cam.fov = 44;
    } else if (sim.view === 0) {
      cam.position.copy(N).add(T1.set(0, 0.2, -0.1).applyQuaternion(sim.quat));
      cam.quaternion.copy(sim.quat);
      cam.fov = 62;
    } else if (sim.view === 1) {
      const desired = T1.set(0, 3.4, 15).applyQuaternion(sim.quat).add(sim.pos);
      if (cam.position.distanceTo(desired) > 60) cam.position.copy(desired);
      cam.position.lerp(desired, sim.screen === "success" ? 0.02 : k);
      cam.up.copy(T2.set(0, 1, 0).applyQuaternion(sim.quat));
      cam.lookAt(T3.set(0, 0.6, -14).applyQuaternion(sim.quat).add(sim.pos));
      cam.fov = 55;
    } else {
      cam.position.copy(CAM_T);
      cam.up.set(0, 1, 0);
      cam.lookAt(sim.pos);
      const dist = CAM_T.distanceTo(sim.pos);
      cam.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(9 / dist)), 1.5, 55);
    }
    if (sim.shake > 0.001) {
      cam.position.add(T1.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(sim.shake * (sim.view === 0 ? 0.25 : 1)));
      sim.shake *= Math.exp(-7 * dt);
    }
    if (sim.landing === "orbit" && sim.screen !== "briefing") cam.fov += sim.motion * 14;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // --- HUD projections ---
    project(cam, D, sim.targetScreen);
    DESTINATIONS.forEach((body, i) => {
      const marker = sim.planetMarkers[i];
      if (!marker) return;
      project(cam, body.center, marker);
      marker.distance = Math.max(0, sim.pos.distanceTo(body.center) - body.radius);
    });
    if (sim.relSpeed > 0.03) {
      T1.copy(sim.vel).normalize();
      project(cam, T2.copy(cam.position).addScaledVector(T1, 500), sim.progradeScreen);
      project(cam, T2.copy(cam.position).addScaledVector(T1, -500), sim.retroScreen);
    } else {
      sim.progradeScreen.on = false;
      sim.retroScreen.on = false;
    }
    project(cam, T2.copy(cam.position).addScaledVector(SUN_DIR, 1000), sim.sunScreen);
    threatsRaw.sort((a, b) => a.dist - b.dist);
    sim.threats = threatsRaw.slice(0, 6).map((t) => {
      const sp = { x: 0, y: 0, on: false, tti: t.tti, dist: t.dist };
      const debris = sim.debris[t.i];
      if (debris) project(cam, debris.pos, sp);
      return sp;
    });
  }, -2);
  return null;
}

/** Cold-gas RCS plume particles (world space). */
export function Thrusters() {
  const MAX = 500;
  const ref = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const pos = new Float32Array(MAX * 3);
    const col = new Float32Array(MAX * 3);
    const vel = new Float32Array(MAX * 3);
    const life = new Float32Array(MAX);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return { pos, col, vel, life, geo, head: 0 };
  }, []);
  const tex = useMemo(() => getGlow(), []);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3() }), []);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const { pos, col, vel, life } = data;
    const emit = (origin: THREE.Vector3, dir: THREE.Vector3, n: number) => {
      for (let j = 0; j < n; j++) {
        const i = data.head;
        data.head = (data.head + 1) % MAX;
        pos[i * 3] = origin.x;
        pos[i * 3 + 1] = origin.y;
        pos[i * 3 + 2] = origin.z;
        const s = 6 + Math.random() * 6;
        vel[i * 3] = dir.x * s + (Math.random() - 0.5) * 2 + sim.vel.x;
        vel[i * 3 + 1] = dir.y * s + (Math.random() - 0.5) * 2 + sim.vel.y;
        vel[i * 3 + 2] = dir.z * s + (Math.random() - 0.5) * 2 + sim.vel.z;
        life[i] = 0.35 + Math.random() * 0.25;
      }
    };
    if (sim.screen === "playing") {
      if (sim.thrustWorld.lengthSq() > 1e-4) {
        const dir = tmp.a.copy(sim.thrustWorld).normalize().negate();
        for (const p of RCS_LOCAL) emit(tmp.b.copy(p).applyQuaternion(sim.quat).add(sim.pos).addScaledVector(dir, 0.15), dir, 3);
      }
      if (sim.thrustRot.lengthSq() > 0.004) {
        for (const p of RCS_LOCAL) {
          const d = tmp.c.copy(sim.thrustRot).cross(p);
          if (d.lengthSq() < 1e-5) continue;
          d.normalize().negate().applyQuaternion(sim.quat);
          emit(tmp.b.copy(p).applyQuaternion(sim.quat).add(sim.pos).addScaledVector(d, 0.15), d, 2);
        }
      }
    }
    for (let i = 0; i < MAX; i++) {
      if ((life[i] ?? 0) > 0) {
        life[i] = (life[i] ?? 0) - dt;
        pos[i * 3] = (pos[i * 3] ?? 0) + (vel[i * 3] ?? 0) * dt;
        pos[i * 3 + 1] = (pos[i * 3 + 1] ?? 0) + (vel[i * 3 + 1] ?? 0) * dt;
        pos[i * 3 + 2] = (pos[i * 3 + 2] ?? 0) + (vel[i * 3 + 2] ?? 0) * dt;
        const l = Math.max(0, (life[i] ?? 0)) * 2.4;
        col[i * 3] = 1.6 * l;
        col[i * 3 + 1] = 2.0 * l;
        col[i * 3 + 2] = 2.8 * l;
      } else {
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
      }
    }
    data.geo.getAttribute("position").needsUpdate = true;
    data.geo.getAttribute("color").needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={data.geo} frustumCulled={false}>
      <pointsMaterial map={tex} size={0.35} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}
