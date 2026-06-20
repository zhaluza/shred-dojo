import type { Route } from "./+types/metronome";
import { Metronome } from "~/components/Metronome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Metronome" },
    {
      name: "description",
      content:
        "A dedicated practice station: a large beat-dial metronome with tap tempo, a tempo trainer that ramps speed automatically, and a countdown timer.",
    },
  ];
}

export default function MetronomeRoute() {
  return <Metronome />;
}
