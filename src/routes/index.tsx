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
      { property: "og:url", content: "https://aule-adventure.pages.dev/" },
      { property: "og:image", content: "https://aule-adventure.pages.dev/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Aule Space: Orbital RPOD Simulator" },
      { name: "twitter:description", content: "Explore the solar system with cinematic warp travel and manual landings in the Aule Space orbital simulator." },
      { name: "twitter:image", content: "https://aule-adventure.pages.dev/og-image.png" },
    ],
  }),
  component: Game,
});
