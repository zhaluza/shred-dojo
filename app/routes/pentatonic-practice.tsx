import type { Route } from "./+types/pentatonic-practice";
import { PentatonicPractice } from "~/components/PentatonicPractice";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Pentatonic Practice" },
    {
      name: "description",
      content:
        "A six-step pentatonic practice routine: shape memorization, key placement, transposition, whole-neck orientation, horizontal string sets, and improvisation — across all 12 keys.",
    },
  ];
}

export default function PentatonicPracticeRoute() {
  return <PentatonicPractice />;
}
