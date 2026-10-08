import { useEffect, useRef, useState } from "react";
import { touch } from "./input";
import { Button } from "@/components/ui/button";

export function useTick(hz: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((t) => t + 1), 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);
}

/** Flight scenery stays free of labels and telemetry; controls live separately. */
export function HUD() {
  return null;
}

function Stick({ onMove, label }: { onMove: (x: number, y: number) => void; label: string }) {
  const base = useRef<HTMLDivElement>(null);
  const [k, setK] = useState({ x: 0, y: 0 });
  const handle = (e: React.PointerEvent) => {
    const element = base.current;
    if (!element) return;
    const r = element.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = -(e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    setK({ x, y });
    onMove(Math.abs(x) > 0.15 ? x : 0, Math.abs(y) > 0.15 ? y : 0);
  };
  const end = () => {
    setK({ x: 0, y: 0 });
    onMove(0, 0);
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={base}
        className="relative h-32 w-32 touch-none rounded-full border-2 border-hud/40 bg-hud-panel/40"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          handle(e);
        }}
        onPointerMove={(e) => e.buttons && handle(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div className="absolute h-12 w-12 rounded-full border-2 border-hud bg-hud/20" style={{ left: `calc(50% + ${k.x * 40}px - 24px)`, top: `calc(50% - ${k.y * 40}px - 24px)` }} />
      </div>
      <span className="text-[10px] tracking-[0.2em] text-hud/60">{label}</span>
    </div>
  );
}

function HoldBtn({ label, onChange }: { label: string; onChange: (on: boolean) => void }) {
  return (
    <Button
      className="h-11 w-14 touch-none rounded border border-hud/50 bg-hud-panel/50 text-xs text-hud active:bg-hud/30"
      onPointerDown={() => onChange(true)}
      onPointerUp={() => onChange(false)}
      onPointerLeave={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
    >
      {label}
    </Button>
  );
}

export function TouchControls({ onDamp, onView, onPause }: { onDamp: () => void; onView: () => void; onPause: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 font-hud">
      <div className="flex flex-col items-start gap-2">
        <div className="flex gap-2">
          <HoldBtn label="BOOST" onChange={(on) => (touch.boost = on)} />
          <HoldBtn label="UP" onChange={(on) => (touch.heave = on ? 1 : touch.heave === 1 ? 0 : touch.heave)} />
          <HoldBtn label="DN" onChange={(on) => (touch.heave = on ? -1 : touch.heave === -1 ? 0 : touch.heave)} />
        </div>
        <Stick label="TRANSLATE" onMove={(x, y) => ((touch.tx = x), (touch.ty = y))} />
      </div>
      <div className="flex flex-col gap-2">
        <Button onClick={onDamp} className="rounded border-2 border-hud-danger bg-hud-danger/25 px-3 py-3 text-xs font-bold text-hud-danger">
          DAMPER
        </Button>
        <Button onClick={onView} className="rounded border border-hud/50 bg-hud-panel/50 px-3 py-2 text-xs text-hud">VIEW</Button>
        <Button onClick={onPause} className="rounded border border-hud/50 bg-hud-panel/50 px-3 py-2 text-xs text-hud">PAUSE</Button>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <HoldBtn label="↺" onChange={(on) => (touch.roll = on ? 1 : touch.roll === 1 ? 0 : touch.roll)} />
          <HoldBtn label="↻" onChange={(on) => (touch.roll = on ? -1 : touch.roll === -1 ? 0 : touch.roll)} />
        </div>
        <Stick label="ROTATE" onMove={(x, y) => ((touch.rx = x), (touch.ry = y))} />
      </div>
    </div>
  );
}
