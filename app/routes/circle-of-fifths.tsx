import type { Route } from "./+types/circle-of-fifths";
import { CircleOfFifths } from "~/components/CircleOfFifths";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Circle of Fifths" },
    {
      name: "description",
      content:
        "Interactive circle of fifths — explore key signatures, diatonic chords, and closely related keys for all 12 major keys.",
    },
  ];
}

export default function CircleOfFifthsRoute() {
  return <CircleOfFifths />;
}
