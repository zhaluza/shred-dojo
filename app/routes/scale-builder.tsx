import type { Route } from "./+types/scale-builder";
import { ScaleBuilder } from "~/components/ScaleBuilder";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Scale Builder" },
    {
      name: "description",
      content:
        "Build any major, minor, pentatonic, or blues scale from any root. View note names with step labels or render the scale on a treble clef staff.",
    },
  ];
}

export default function ScaleBuilderRoute() {
  return <ScaleBuilder />;
}
