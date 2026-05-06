import type { Route } from "./+types/chord-tones";
import { ChordTones } from "~/components/ChordTones";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Chord Tones" },
    {
      name: "description",
      content:
        "Identify the interval of each highlighted note within a scale shape. Pentatonic boxes, blues scale, and diatonic 3nps/CAGED positions.",
    },
  ];
}

export default function ChordTonesRoute() {
  return <ChordTones />;
}
