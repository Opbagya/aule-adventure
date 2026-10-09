const keys = new Set<string>();

export const touch = { tx: 0, ty: 0, rx: 0, ry: 0, roll: 0, heave: 0, boost: false };

const GAME_KEYS = new Set([
  "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight",
  "ControlLeft", "ControlRight", "KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "KeyC",
  "KeyR", "KeyF", "KeyX", "KeyV", "KeyL", "KeyB",
]);

export function attachKeyboard(onPress: (code: string) => void) {
  const down = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) onPress(e.code);
    keys.add(e.code);
  };
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  const blur = () => keys.clear();
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
  };
}

const k = (c: string) => (keys.has(c) ? 1 : 0);
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

export function readAxes(landing = false) {
  return {
    surge: clamp(
      k("KeyR") + (landing ? 0 : k("ArrowUp")) -
        k("ControlLeft") - k("ControlRight") - k("KeyF") - (landing ? 0 : k("ArrowDown")) + (landing ? 0 : touch.ty),
    ),
    sway: clamp(k("ArrowRight") - k("ArrowLeft") + touch.tx),
    heave: clamp(k("Space") - k("KeyC") + touch.heave + (landing ? k("ArrowUp") - k("ArrowDown") + touch.ty : 0)),
    pitch: clamp(k("KeyS") - k("KeyW") + touch.ry),
    yaw: clamp(k("KeyA") - k("KeyD") - touch.rx),
    roll: clamp(k("KeyQ") - k("KeyE") + touch.roll),
    boost: keys.has("ShiftLeft") || keys.has("ShiftRight") || touch.boost,
  };
}
