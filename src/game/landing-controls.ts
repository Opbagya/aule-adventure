export const LANDING_ACCEL = 5;
export const LANDING_GRAVITY = 0.65;

export function landingVerticalVelocity(velocity: number, input: number, delta: number) {
  return Math.max(-12, Math.min(8, velocity + (input * LANDING_ACCEL - LANDING_GRAVITY) * Math.min(delta, 0.05)));
}