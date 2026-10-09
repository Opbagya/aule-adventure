import { useEffect, useState } from "react";
import { audio } from "./audio";
import { attachKeyboard } from "./input";
import { liftOff, resetSim, sim } from "./sim";
import { SpaceScene } from "./Scene";
import { HUD, TouchControls, useTick } from "./HUD";
import { Briefing } from "./Briefing";
import { Button } from "@/components/ui/button";
import { Globe2, Pause, Play, Rocket } from "lucide-react";
import { DestinationMenu } from "./DestinationMenu";

const CONTROLS: [string, string][] = [
  ["S / W", "Pitch up / down"],
  ["A / D", "Yaw left / right"],
  ["Q / E", "Roll CCW / CW"],
  ["↑ / R", "Forward translation"],
  ["Shift", "Hyperdrive (hold)"],
  ["L", "Lift off after touchdown"],
  ["B", "Solar system destinations"],
  ["Landing", "Space/C rise/descend · arrows translate"],
  ["Ctrl (or F, ↓)", "Retrograde translation"],
  ["Space / C", "Heave up / down"],
  ["← / →", "Sway left / right"],
  ["X", "RCS damper (kill rotation · rate-match < 300 m)"],
  ["V", "Cycle camera: sensor / chase / target"],
  ["P / Esc", "Pause"],
];

function Controls() {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
      {CONTROLS.map(([k, d]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-hud/15 py-1">
          <span className="text-hud">{k}</span>
          <span className="text-right text-muted-foreground">{d}</span>
        </div>
      ))}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-background/55 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-3xl border border-hud/30 bg-hud-panel/85 p-6 font-hud text-foreground shadow-2xl sm:p-10">{children}</div>
    </div>
  );
}

const Btn = ({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) => (
  <Button
    onClick={onClick}
    className={
      primary
        ? "border border-hud bg-hud px-8 py-3 font-display text-lg font-bold tracking-[0.25em] text-hud-panel transition hover:brightness-110"
        : "border border-hud/50 px-6 py-3 font-display tracking-[0.25em] text-hud transition hover:bg-hud/10"
    }
  >
    {children}
  </Button>
);

export function Game() {
  useTick(8);
  const [, setRun] = useState(() => {
    resetSim();
    return 0;
  });
  const [isTouch, setTouch] = useState(false);
  const [destinationsOpen, setDestinationsOpen] = useState(false);

  const togglePause = () => {
    if (sim.screen === "playing") {
      sim.screen = "paused";
      audio.setHiss(0);
      audio.suspend(true);
    } else if (sim.screen === "paused") {
      sim.screen = "playing";
      audio.suspend(false);
    }
  };
  const toggleDamp = () => {
    sim.damp = !sim.damp;
    audio.beep(sim.damp ? 1500 : 600, 0.06, 0.08);
  };
  const cycleView = () => {
    sim.view = (sim.view + 1) % 3;
  };
  const start = () => {
    audio.init();
    audio.suspend(false);
    resetSim();
    setRun((r) => r + 1);
    sim.view = 1;
    sim.damp = true;
    sim.cruise = true;
    sim.screen = "playing";
    audio.voice("Aule Servicer one, you are go for proximity operations.");
  };

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    if (import.meta.env.DEV) (window as unknown as { __sim: typeof sim }).__sim = sim;
    return attachKeyboard((code) => {
      if (code === "KeyP" || code === "Escape") togglePause();
      if (sim.screen !== "playing") return;
      if (code === "KeyV") cycleView();
      if (code === "KeyX") toggleDamp();
      if (code === "KeyL") liftOff();
      if (code === "KeyB" && !sim.transferActive) setDestinationsOpen((open) => !open);
    });
  }, []);

  const s = sim.screen;
  return (
    <div className="fixed inset-0 bg-background">
      <SpaceScene />
      {(s === "playing" || s === "paused") && <HUD />}
      {s === "playing" && !sim.transferActive && <div className="fixed right-5 top-5 z-20 flex gap-2 font-brand text-foreground">
        {sim.landing === "landed" && <Button size="icon" variant="ghost" title="Lift off" aria-label="Lift off" onClick={liftOff}><Rocket /></Button>}
        <Button size="icon" variant="ghost" title="Solar system destinations" aria-label="Solar system destinations" onClick={() => setDestinationsOpen(true)} className="bg-background/60"><Globe2 /></Button>
        <Button size="icon" variant="ghost" title="Pause mission" aria-label="Pause mission" onClick={togglePause} className="bg-background/60"><Pause /></Button>
      </div>}
      {s === "playing" && destinationsOpen && <DestinationMenu onClose={() => setDestinationsOpen(false)} />}
      {s === "playing" && sim.transferActive && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-10"><div className="warp-light" /><div className="absolute inset-x-0 top-0 h-[8vh] bg-background" /><div className="absolute inset-x-0 bottom-0 h-[8vh] bg-background" /></div>}
      {s === "playing" && isTouch && <TouchControls onDamp={toggleDamp} onView={cycleView} onPause={togglePause} />}

      {s === "briefing" && <Briefing onStart={start} controls={<Controls />} />}
      {s === "paused" && (
        <Panel>
          <h2 className="font-display text-4xl font-bold tracking-[0.2em] text-hud">PAUSED</h2>
          <div className="mt-6">
            <Controls />
          </div>
          <div className="mt-6 flex gap-4">
            <Btn primary onClick={togglePause}><Play size={16} /> RESUME</Btn>
            <Btn onClick={start}>RESTART</Btn>
          </div>
        </Panel>
      )}

      {s === "success" && (
        <Panel>
          <div className="text-xs tracking-[0.4em] text-hud/70">HARD DOCK CONFIRMED</div>
          <h2 className="mt-2 font-display text-3xl font-bold leading-tight tracking-[0.1em] text-hud sm:text-5xl">MISSION SUCCESS</h2>
          <p className="mt-2 font-display text-xl tracking-[0.12em] text-foreground">SATELLITE LIFE EXTENDED BY 5 YEARS. 0 kg fuel wasted.</p>
          <p className="mt-1 text-sm text-muted-foreground">Powered by Aule Space Autonomous RPOD.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["TIME", `${Math.floor(sim.time / 60)}:${Math.floor(sim.time % 60).toString().padStart(2, "0")}`, sim.score.time],
              ["ΔV LEFT", `${sim.fuel.toFixed(1)} m/s`, sim.score.fuel],
              ["CONTACT", `${sim.dockSpeed.toFixed(3)} m/s`, sim.score.precision],
              ["HULL", `${sim.hull.toFixed(0)}%`, sim.score.hull],
            ].map(([l, v, p]) => (
              <div key={l as string} className="border border-hud/25 p-3">
                <div className="text-[10px] tracking-[0.2em] text-muted-foreground">{l}</div>
                <div className="text-lg text-foreground">{v}</div>
                <div className="text-hud">+{p}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-end justify-between">
            <div>
              <div className="text-xs tracking-[0.3em] text-muted-foreground">SCORE</div>
              <div className="font-display text-5xl font-bold text-hud">{sim.score.total}</div>
            </div>
            <div className="text-right text-xs tracking-[0.2em] text-muted-foreground">
              BEST <span className="text-foreground">{sim.score.best}</span>
              {sim.dockSpeed < 0.15 && <div className="text-hud">PRECISION BONUS · &lt; 0.15 m/s</div>}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <a href="https://aule.space/" target="_blank" rel="noreferrer" className="border border-hud bg-hud px-8 py-3 font-display text-lg font-bold tracking-[0.2em] text-hud-panel hover:brightness-110">
              EXPLORE AULE SPACE FLEET →
            </a>
            <Btn onClick={start}>FLY AGAIN</Btn>
          </div>
        </Panel>
      )}

      {s === "failed" && (
        <Panel>
          <div className="text-xs tracking-[0.4em] text-hud-danger">MISSION ABORT</div>
          <h2 className="mt-2 font-display text-4xl font-bold tracking-[0.15em] text-hud-danger">LOSS OF VEHICLE</h2>
          <p className="mt-3 text-muted-foreground">{sim.failReason}</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Btn primary onClick={start}>RETRY MISSION</Btn>
            <a href="https://aule.space/" target="_blank" rel="noreferrer" className="self-center text-xs tracking-[0.2em] text-hud/70 hover:underline">
              SEE HOW AULE DOES IT ↗
            </a>
          </div>
        </Panel>
      )}
    </div>
  );
}
