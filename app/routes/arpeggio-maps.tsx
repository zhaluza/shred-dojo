import type { Route } from "./+types/arpeggio-maps";
import { ArpeggioMaps } from "~/components/ArpeggioMaps";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Arpeggio Maps" },
    {
      name: "description",
      content:
        "Chord-tone neck positions for the 5 CAGED shapes — see exactly where root, 3rd, 5th, and 7th land across major, minor, and seventh arpeggios.",
    },
  ];
}

export default function ArpeggioMapsRoute() {
  return <ArpeggioMaps />;
}
