import type { Route } from "./+types/pentatonic-triads";
import { PentatonicTriads } from "~/components/PentatonicTriads";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Pentatonic Triads" },
    {
      name: "description",
      content:
        "Visualize the triad intervals within and across pentatonic shapes for major and minor scales.",
    },
  ];
}

export default function PentatonicTriadsRoute() {
  return <PentatonicTriads />;
}
