import type { Route } from "./+types/math-chords";
import { MathChords } from "~/components/MathChords";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Math Chords" },
    {
      name: "description",
      content:
        "An extended-voicing lab for math rock: movable maj7, m7, dom7, m7♭5 and nine-chords that transpose to any root, plus a diatonic progression builder you can hear.",
    },
  ];
}

export default function MathChordsRoute() {
  return <MathChords />;
}
