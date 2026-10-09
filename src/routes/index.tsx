import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/game/Game";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aule Space: Orbital RPOD Simulator" },
      { name: "description", content: "Pilot Aule Servicer-1, dodge orbital debris, warp to all eight planets, and master manual planetary landings." },
      { property: "og:title", content: "Aule Space: Orbital RPOD Simulator" },
      { property: "og:description", content: "Explore the solar system with cinematic warp travel and manual landings in the Aule Space orbital simulator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
