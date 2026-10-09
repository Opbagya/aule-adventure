import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DESTINATIONS, type DestinationId } from "./destinations";
import { sim, travelTo } from "./sim";
import { audio } from "./audio";

export function DestinationMenu({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<DestinationId>(sim.destination || "mars");
  const body = DESTINATIONS.find((d) => d.id === selected);
  const launch = (id: DestinationId | "mission") => {
    audio.init();
    if (travelTo(id)) { audio.warp(); onClose(); }
  };
  return <section role="dialog" aria-modal="true" aria-label="Solar system destinations" className="fixed inset-0 z-30 overflow-y-auto bg-background/90 px-6 py-8 font-brand text-foreground sm:px-12">
    <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-foreground/15 pb-6">
      <span className="text-xl font-semibold">aule <span className="font-normal text-foreground/55">space</span></span>
      <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close destinations"><X /></Button>
    </header>
    <div className="mx-auto max-w-5xl py-10">
      <p className="text-xs uppercase text-foreground/50">Solar system</p>
      <h2 className="mt-3 text-4xl font-medium sm:text-5xl">Where to next?</h2>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DESTINATIONS.map((d) => <Button key={d.id} variant="ghost" aria-pressed={selected === d.id} onClick={() => setSelected(d.id)} className={`h-auto min-h-40 flex-col gap-5 rounded-lg border p-5 ${selected === d.id ? "border-brand-accent bg-brand-accent/15" : "border-foreground/15 hover:bg-foreground/5"}`}>
          <span aria-hidden="true" className={`planet-disc planet-${d.id}`} />
          <span className="text-base font-medium">{d.name}</span>
        </Button>)}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-foreground/15 pt-6">
        <div><p className="text-lg">{body?.name}</p><p className="mt-1 text-sm text-foreground/55">{body?.surface === "cloud" ? "Atmospheric exploration · fictional cloud landing deck" : "Surface exploration · manual touchdown"}</p></div>
        <Button disabled={sim.transferActive || sim.docked} onClick={() => launch(selected)} className="h-12 bg-brand-accent px-8 text-primary-foreground hover:bg-brand-accent/80">Start <ArrowRight /></Button>
      </div>
      {sim.exploring && <Button variant="ghost" onClick={() => launch("mission")} className="mt-5 text-foreground/65"><ArrowLeft /> Return to orbital mission</Button>}
    </div>
  </section>;
}