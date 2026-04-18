import type { Route } from "./+types/pentatonic-colors";
import { PentatonicColors } from "~/components/PentatonicColors";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Pentatonic Colors" },
    {
      name: "description",
      content:
        "Visualize how modes extend the pentatonic foundation with color notes — minor and major, Box 1, G root.",
    },
  ];
}

export default function PentatonicColorsRoute() {
  return <PentatonicColors />;
}
