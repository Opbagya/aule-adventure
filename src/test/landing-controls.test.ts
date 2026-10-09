import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { attachKeyboard, readAxes, touch } from "@/game/input";
import { landingVerticalVelocity } from "@/game/landing-controls";

let detach: () => void;
beforeEach(() => { detach = attachKeyboard(() => {}); });
afterEach(() => { window.dispatchEvent(new Event("blur")); detach(); touch.ty = 0; });
const press = (code: string) => window.dispatchEvent(new KeyboardEvent("keydown", { code }));

describe("Landing translation", () => {
  it("Up rises without moving forward, while orbital Up still translates", () => {
    press("ArrowUp");
    expect(readAxes(true).heave).toBe(1); expect(readAxes(true).surge).toBe(0);
    expect(readAxes().surge).toBe(1); expect(readAxes().heave).toBe(0);
    expect(landingVerticalVelocity(0, readAxes(true).heave, 0.05)).toBeGreaterThan(0);
  });
  it("Down accelerates descent without moving in depth", () => {
    press("ArrowDown"); expect(readAxes(true).heave).toBe(-1); expect(readAxes(true).surge).toBe(0);
    expect(landingVerticalVelocity(-1, -1, 0.05)).toBeLessThan(-1);
  });
  it("lateral arrows and dedicated depth keys remain independent", () => {
    press("ArrowRight"); press("KeyR");
    expect(readAxes(true).sway).toBe(1); expect(readAxes(true).surge).toBe(1); expect(readAxes(true).heave).toBe(0);
  });
  it("touch vertical input also rises rather than moves in depth", () => {
    touch.ty = 1; expect(readAxes(true).heave).toBe(1); expect(readAxes(true).surge).toBe(0);
  });
  it("vertical acceleration is frame-rate independent", () => {
    let sixty = 0, thirty = 0;
    for (let i = 0; i < 60; i++) sixty = landingVerticalVelocity(sixty, 1, 1 / 60);
    for (let i = 0; i < 30; i++) thirty = landingVerticalVelocity(thirty, 1, 1 / 30);
    expect(sixty).toBeCloseTo(thirty, 8);
  });
});