import { ArrowRight, ExternalLink, Gamepad2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Briefing({ onStart, controls }: { onStart: () => void; controls: React.ReactNode }) {
  const [showControls, setShowControls] = useState(false);
  return (
    <div className="mission-intro fixed inset-0 z-30 overflow-y-auto font-brand text-foreground">
      <header className="flex items-center justify-between px-6 py-7 md:px-12">
        <a href="https://aule.space/" target="_blank" rel="noreferrer" className="text-3xl font-semibold">aule<span className="ml-2 text-sm font-normal text-foreground/65">space</span></a>
        <a href="https://aule.space/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-foreground/75">The Aule fleet <ExternalLink size={14} /></a>
      </header>
      <main className="mx-6 mt-14 max-w-xl pb-10 md:mx-12 md:mt-20">
        <div className="mb-6 flex items-center gap-3 text-xs text-foreground/70"><span className="h-1.5 w-1.5 rounded-full bg-brand-accent" /> ORBITAL OPERATIONS / 001</div>
        <h1 className="text-5xl font-medium leading-[1.05] md:text-7xl">Aule Space<br /><span className="text-foreground/55">Orbital simulator.</span></h1>
        <p className="mt-7 max-w-md text-base leading-relaxed text-foreground/70">One stranded satellite. Five more years in orbit.<br />Take the controls of Servicer-1 and bring ComSat-9 back to life.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Button onClick={onStart} className="h-12 rounded-full bg-brand-accent px-7 text-primary-foreground hover:bg-brand-accent/85">Begin mission <ArrowRight /></Button>
          <Button variant="ghost" onClick={() => setShowControls(true)} className="h-12 rounded-full px-5 text-foreground/80 hover:bg-foreground/10"><Gamepad2 /> Flight controls</Button>
        </div>
        <div className="mt-14 grid grid-cols-3 gap-4 border-t border-foreground/20 pt-5">
          {[['450 km', 'Low Earth orbit'], ['1.5 km', 'Rendezvous range'], ['0.20 m/s', 'Capture velocity']].map(([value, label]) => <div key={label}><div className="text-lg md:text-2xl">{value}</div><div className="mt-2 text-xs text-foreground/55">{label}</div></div>)}
        </div>
        <div className="mt-8 flex gap-6 text-xs text-foreground/50"><span>01 / Avoid debris</span><span>02 / Match attitude</span><span>03 / Dock & extend</span></div>
      </main>
      {showControls && <div className="fixed inset-0 flex items-center justify-center bg-background/60 p-5"><section role="dialog" aria-modal="true" aria-label="Flight controls" className="w-full max-w-2xl rounded-lg border border-foreground/15 bg-background p-6"><div className="mb-6 flex items-center justify-between"><h2 className="text-xl">Flight controls</h2><Button variant="ghost" size="icon" aria-label="Close flight controls" onClick={() => setShowControls(false)}><X /></Button></div>{controls}</section></div>}
    </div>
  );
}