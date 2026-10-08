import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/game/Game";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aule Space: Orbital RPOD Simulator" },
      { name: "description", content: "Pilot the Aule Servicer-1 through LEO debris and dock with a stranded ComSat in a photorealistic 3D orbital simulator." },
      { property: "og:title", content: "Aule Space: Orbital RPOD Simulator" },
      { property: "og:description", content: "Fly a 6-DOF satellite servicer, dodge orbital debris, and achieve hard dock to extend a satellite's life." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
