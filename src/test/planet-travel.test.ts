import { beforeEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { advanceTransfer, beginLanding, resetSim, sim, travelTo } from "@/game/sim";
import { DESTINATIONS } from "@/game/destinations";

beforeEach(() => { resetSim(); sim.screen = "playing"; });
function finish() { for (let n = 0; n < 110; n++) advanceTransfer(0.05); }

describe("Solar system travel", () => {
  it("contains all eight planets", () => {
    expect(DESTINATIONS.map((d) => d.id)).toEqual(["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"]);
  });
  it("arrives exactly outside each planet across three rounds of visits", () => {
    for (let round = 0; round < 3; round++) for (const d of DESTINATIONS) {
      expect(travelTo(d.id)).toBe(true); finish();
      expect(sim.transferActive).toBe(false);
      expect(sim.pos.distanceTo(d.center.clone().add(d.offset))).toBeLessThan(1e-8);
      expect(sim.pos.distanceTo(d.center)).toBeGreaterThan(d.radius + 165);
      expect(sim.vel.length()).toBe(0);
      expect(sim.fuel).toBe(90);
    }
  });
  it("rejects overlap and pauses without progressing", () => {
    travelTo("mars"); expect(travelTo("venus")).toBe(false);
    sim.screen = "paused"; advanceTransfer(1); expect(sim.transfer).toBe(0);
    sim.screen = "playing"; finish(); expect(sim.destination).toBe("mars");
  });
  it("can warp from a landing and restore the original mission", () => {
    sim.vel.set(1, 2, -3); sim.angVel.set(0.1, 0.2, 0.3);
    const pos = sim.pos.clone(), vel = sim.vel.clone(), quat = sim.quat.clone();
    travelTo("mars"); finish();
    const mars = DESTINATIONS.find((d) => d.id === "mars");
    if (!mars) throw new Error("Mars missing");
    beginLanding(new THREE.Vector3(0, 0, 1), mars.center, mars.radius);
    expect(sim.landing).toBe("manual");
    travelTo("saturn"); finish(); expect(sim.landing).toBe("orbit");
    travelTo("mission"); finish();
    expect(sim.exploring).toBe(false); expect(sim.pos.distanceTo(pos)).toBe(0);
    expect(sim.vel.distanceTo(vel)).toBe(0); expect(sim.quat.angleTo(quat)).toBe(0);
  });
  it("each planet acquires player-controlled landing from either hemisphere", () => {
    for (const body of DESTINATIONS) for (const side of [-1, 1]) {
      sim.destination = body.id; sim.pos.copy(body.center).add(new THREE.Vector3(0, 0, side * (body.radius + 120)));
      beginLanding(new THREE.Vector3(0, 0, side), body.center, body.radius);
      expect(sim.landing).toBe("manual"); expect(sim.surfacePos.y).toBeCloseTo(120);
      expect(sim.surfacePos.x).toBe(0); expect(sim.surfacePos.z).toBe(0); expect(sim.gear).toBe(1);
    }
  });
});