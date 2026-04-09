import type { Route } from "./+types/chord-voicings";
import { ChordVoicings } from "~/components/ChordVoicings";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Chord Voicings" },
    {
      name: "description",
      content:
        "All 5 CAGED chord shapes for major, minor, and seventh chord types — root, 3rd, 5th, and 7th color-coded across every shape.",
    },
  ];
}

export default function ChordVoicingsRoute() {
  return <ChordVoicings />;
}
