import { useEffect, useRef, useState } from "react";
import { FUEL_MAX, sim } from "./sim";
import { touch } from "./input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function useTick(hz: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((t) => t + 1), 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);
}

const VIEWS = ["BOW OPTICAL SENSOR", "CHASE CAM", "TARGET CAM · COMSAT-9"];
const PHASES = ["", "PH-1 TRANSIT / DEBRIS AVOIDANCE", "PH-2 TERMINAL APPROACH", "PH-3 CONTACT & CAPTURE"];

const fmt = (v: number, d = 1) => (v >= 0 ? "+" : "") + v.toFixed(d);
const pct = (p: { x: number; y: number }) => ({ left: `${p.x * 100}%`, top: `${p.y * 100}%` });

function Readout({ label, value, unit, tone = "ok" }: { label: string; value: string; unit?: string; tone?: "ok" | "warn" | "danger" }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hud/15 py-1">
      <span className="text-[10px] tracking-[0.2em] text-hud/60">{label}</span>
      <span className={cn("text-lg tabular-nums", tone === "ok" && "text-hud", tone === "warn" && "text-hud-warn", tone === "danger" && "text-hud-danger")}>
        {value}
        {unit && <span className="ml-1 text-[10px] text-hud/50">{unit}</span>}
      </span>
    </div>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "danger" }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] tracking-[0.2em] text-hud/60">
        <span>{label}</span>
        <span className="tabular-nums">{value.toFixed(0)}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full border border-hud/30">
        <div className={cn("h-full transition-[width]", tone === "ok" && "bg-hud", tone === "warn" && "bg-hud-warn", tone === "danger" && "bg-hud-danger")} style={{ width: `${Math.max(0, value)}%` }} />
      </div>
    </div>
  );
}

export function HUD() {
  useTick(20);
  const travel = sim.transferActive || sim.boosting || sim.exploring || (sim.range > 200 && sim.vel.length() > 2);
  if (travel) return <div className="pointer-events-none fixed inset-0 z-10 font-brand text-foreground">
    <div className="absolute left-5 top-5 text-sm">aule space <span className="ml-3 text-foreground/50">{sim.landing !== "orbit" ? "MARS / SURFACE OPERATIONS" : sim.exploring ? sim.destination.toUpperCase() : "ORBITAL TRANSIT"}</span></div>
    <div className="absolute right-5 top-5 text-right text-sm tabular-nums">
      {sim.landing !== "orbit" ? <><div>{sim.landing === "landed" ? sim.landingQuality : sim.landing === "automatic" ? "Automatic descent" : "Manual descent"}</div><div className="mt-2 text-foreground/70">{sim.altitude.toFixed(1)} m · {Math.abs(sim.surfaceVel.y).toFixed(2)} m/s</div></> : <><div>{sim.transferActive ? `TRANSFER ${Math.round(sim.transfer * 100)}%` : sim.boosting ? "HYPERDRIVE" : `${sim.vel.length().toFixed(0)} m/s`}</div>{!sim.exploring && <div className="mt-2 text-foreground/60">ComSat-9 · {(sim.range / 1000).toFixed(2)} km</div>}</>}
    </div>
    {sim.warnings.length > 0 && <div className="absolute left-1/2 top-20 -translate-x-1/2 text-sm text-hud-danger">{sim.warnings[0]}</div>}
    {sim.flashT > 0 && <div className="absolute left-1/2 top-28 max-w-[90vw] -translate-x-1/2 text-center text-sm">{sim.flash}</div>}
  </div>;
  const t = sim.targetScreen;
  const fuelPct = (sim.fuel / FUEL_MAX) * 100;
  const closeTone = sim.range < 50 && sim.closure > 0.3 ? "danger" : sim.closure > 2 && sim.range < 200 ? "warn" : "ok";
  const errTone = (v: number) => (Math.abs(v) < 3.5 ? "ok" : Math.abs(v) < 10 ? "warn" : "danger");
  const mm = Math.floor(sim.time / 60);
  const ss = Math.floor(sim.time % 60).toString().padStart(2, "0");
  const capture = sim.phase === 3 || sim.range < 25;
  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none font-hud text-hud">
      {/* Lens flare ghosts */}
      {sim.sunScreen.on &&
        [0.35, 0.7, 1.15, 1.5].map((f, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-hud-flare mix-blend-screen"
            style={{
              left: `${(sim.sunScreen.x + (0.5 - sim.sunScreen.x) * 2 * f) * 100}%`,
              top: `${(sim.sunScreen.y + (0.5 - sim.sunScreen.y) * 2 * f) * 100}%`,
              width: [60, 22, 90, 34][i],
              height: [60, 22, 90, 34][i],
              transform: "translate(-50%,-50%)",
              opacity: [0.12, 0.25, 0.07, 0.18][i],
              filter: "blur(2px)",
            }}
          />
        ))}

      {/* boresight */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg width="220" height="220" viewBox="-110 -110 220 220" className={cn("text-hud", sim.view === 0 ? "opacity-90" : "opacity-40")}>
          <g stroke="currentColor" strokeWidth="1.2" fill="none">
            <circle r="34" strokeDasharray="4 6" />
            <path d="M-100 0 H-46 M46 0 H100 M0 -100 V-46 M0 46 V100" />
            <path d="M-8 0 H8 M0 -8 V8" />
            {sim.view === 0 && <circle r="90" strokeOpacity="0.25" />}
            {sim.view === 0 && <path d="M-70 -70 l12 0 M-70 -70 l0 12 M70 -70 l-12 0 M70 -70 l0 12 M-70 70 l12 0 M-70 70 l0 -12 M70 70 l-12 0 M70 70 l0 -12" />}
          </g>
        </svg>
      </div>

      {/* target marker */}
      {!sim.docked && !sim.exploring && (
        <div className="absolute" style={{ ...pct(t), transform: "translate(-50%,-50%)" }}>
          <div className={cn("relative h-12 w-12 border-2", t.on ? "border-hud-target" : "border-hud-target/50 rotate-45")}>
            <span className="absolute -right-1 -top-5 translate-x-full whitespace-nowrap text-xs text-hud-target">
              COMSAT-9 · {sim.range >= 1000 ? (sim.range / 1000).toFixed(2) + " km" : sim.range.toFixed(sim.range < 20 ? 2 : 0) + " m"}
            </span>
          </div>
        </div>
      )}
      {sim.planetMarkers.filter((p) => p.on).map((p) => <div key={p.id} className="absolute -translate-x-1/2 font-brand text-xs text-foreground/80" style={pct(p)}><div className="mb-2 h-2 w-2 rounded-full border border-foreground/60" />{p.name} · {(p.distance / 1000).toFixed(1)} km</div>)}
      {sim.exploring && <div className="absolute left-1/2 top-24 -translate-x-1/2 font-brand text-sm text-foreground">{sim.transferActive ? `Transfer ${Math.round(sim.transfer * 100)}%` : `${sim.destination === "mars" ? "Mars" : "Jupiter"} / Free flight`}</div>}
      {/* prograde / retrograde */}
      {sim.progradeScreen.on && (
        <svg className="absolute" style={{ ...pct(sim.progradeScreen), transform: "translate(-50%,-50%)" }} width="40" height="40" viewBox="-20 -20 40 40">
          <g stroke="currentColor" strokeWidth="1.6" fill="none" className="text-hud-warn">
            <circle r="7" />
            <path d="M-18 0 H-7 M7 0 H18 M0 -7 V-16" />
          </g>
        </svg>
      )}
      {sim.retroScreen.on && (
        <svg className="absolute" style={{ ...pct(sim.retroScreen), transform: "translate(-50%,-50%)" }} width="40" height="40" viewBox="-20 -20 40 40">
          <g stroke="currentColor" strokeWidth="1.6" fill="none" className="text-hud-warn">
            <circle r="7" />
            <path d="M-5 -5 L5 5 M5 -5 L-5 5 M0 7 V16" />
          </g>
        </svg>
      )}
      {/* debris threats */}
      {sim.threats.map((th, i) => (
        <div key={i} className="absolute" style={{ ...pct(th), transform: "translate(-50%,-50%)" }}>
          <div className={cn("h-10 w-10 border-2 border-hud-danger", th.tti > 0 && th.tti < 6 && "animate-pulse")} />
          <span className="absolute left-11 top-0 whitespace-nowrap text-[11px] text-hud-danger">
            {th.tti > 0 ? `TTI ${th.tti.toFixed(1)}s` : "PROX"} · {th.dist.toFixed(0)}m
          </span>
        </div>
      ))}

      {/* top bar */}
      <div className="absolute left-0 right-0 top-0 flex items-start justify-between gap-3 p-4 text-[10px] sm:text-xs sm:tracking-[0.2em]">
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-bold text-hud sm:text-base sm:tracking-[0.3em]">AULE SERVICER-1</div>
          <div className="text-hud/70">{sim.exploring ? "PLANETARY EXPLORATION" : PHASES[sim.phase]}</div>
          <div className="text-hud/50">MET {mm}:{ss} · {VIEWS[sim.view]}</div>
        </div>
        <div className="absolute left-4 right-4 top-28 flex flex-col items-center gap-1 sm:static">
          {sim.warnings.map((w) => (
            <div key={w} className={cn("border px-4 py-1 font-display text-xs font-bold sm:text-sm sm:tracking-[0.3em] animate-pulse", w === "IMPACT WARNING" || w.includes("CRITICAL") || w.includes("CLOSURE") ? "border-hud-danger bg-hud-danger/20 text-hud-danger" : "border-hud-warn bg-hud-warn/15 text-hud-warn")}>
              ⚠ {w}
            </div>
          ))}
          {sim.flashT > 0 && <div className="mt-1 border border-hud bg-hud/15 px-3 py-1.5 text-center font-display text-xs font-bold sm:text-base sm:tracking-[0.3em]">{sim.flash}</div>}
        </div>
        <div className="w-32 shrink-0 sm:w-56">
          <Bar label="RCS PROPELLANT" value={fuelPct} tone={fuelPct > 35 ? "ok" : fuelPct > 15 ? "warn" : "danger"} />
          <div className="mb-2 text-right text-[10px] tracking-[0.2em] text-hud/60">ΔV {sim.fuel.toFixed(1)} m/s</div>
          <Bar label="HULL INTEGRITY" value={sim.hull} tone={sim.hull > 60 ? "ok" : sim.hull > 30 ? "warn" : "danger"} />
        </div>
      </div>

      {/* left telemetry */}
      <div className={cn("absolute left-4 top-1/2 hidden w-56 -translate-y-1/2 border-l border-hud/40 bg-hud-panel/40 px-3 py-2 sm:block", sim.exploring && "sm:hidden")}>
        <div className="mb-1 text-[10px] tracking-[0.3em] text-hud/50">RELATIVE NAV</div>
        <Readout label="RANGE" value={sim.range.toFixed(sim.range < 100 ? 2 : 0)} unit="m" />
        <Readout label="CLOSURE" value={fmt(sim.closure, 2)} unit="m/s" tone={closeTone} />
        <Readout label="REL VEL" value={sim.relSpeed.toFixed(2)} unit="m/s" tone={sim.range < 15 && sim.relSpeed > 0.2 ? "danger" : "ok"} />
        <Readout label="LATERAL" value={sim.lateral.toFixed(2)} unit="m" tone={sim.range < 200 && !sim.inCorridor ? "warn" : "ok"} />
        <Readout label="CORRIDOR" value={sim.inCorridor ? "IN" : "OUT"} tone={sim.inCorridor ? "ok" : "warn"} />
      </div>

      {/* right telemetry */}
      <div className={cn("absolute right-4 top-1/2 hidden w-56 -translate-y-1/2 border-r border-hud/40 bg-hud-panel/40 px-3 py-2 sm:block", sim.exploring && "sm:hidden")}>
        <div className="mb-1 text-[10px] tracking-[0.3em] text-hud/50">ATTITUDE ERROR / RATE</div>
        <Readout label="ROLL" value={fmt(sim.err.roll)} unit="°" tone={errTone(sim.err.roll)} />
        <Readout label="PITCH" value={fmt(sim.err.pitch)} unit="°" tone={errTone(sim.err.pitch)} />
        <Readout label="YAW" value={fmt(sim.err.yaw)} unit="°" tone={errTone(sim.err.yaw)} />
        <Readout label="TOTAL" value={sim.err.total.toFixed(1)} unit="°" tone={errTone(sim.err.total)} />
        <Readout label="RATES P/Y/R" value={`${sim.rate.pitch.toFixed(1)}/${sim.rate.yaw.toFixed(1)}/${sim.rate.roll.toFixed(1)}`} unit="°/s" />
        <Readout label="RCS DAMPER" value={sim.damp ? (sim.range < 300 ? "RATE-MATCH" : "KILL-ROT") : "OFF"} tone={sim.damp ? "ok" : "warn"} />
      </div>

      {/* capture checklist */}
      {capture && !sim.docked && !sim.exploring && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 border border-hud/40 bg-hud-panel/50 px-5 py-2 text-xs tracking-[0.2em] backdrop-blur-sm">
          <div className="mb-1 text-center text-hud/60">CAPTURE CRITERIA</div>
          <div className="flex gap-5">
            <span className={sim.relSpeed < 0.2 ? "text-hud" : "text-hud-danger"}>{sim.relSpeed < 0.2 ? "✔" : "✖"} VEL &lt; 0.20</span>
            <span className={sim.err.total < 3.5 ? "text-hud" : "text-hud-danger"}>{sim.err.total < 3.5 ? "✔" : "✖"} ALIGN &lt; 3.5°</span>
            <span className={sim.lateral < 0.5 ? "text-hud" : "text-hud-danger"}>{sim.lateral < 0.5 ? "✔" : "✖"} LAT &lt; 0.5m</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[10px] tracking-[0.2em] text-hud/45 md:block">
        W/S PITCH · A/D YAW · Q/E ROLL · ↑/R FWD · SHIFT BOOST · CTRL/F AFT · SPACE/C HEAVE · ←/→ SWAY · X DAMPER · V VIEW · P PAUSE
      </div>
    </div>
  );
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
