import type { Route } from "./+types/interval-shapes";
import { IntervalShapes } from "~/components/IntervalShapes";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Interval Shapes" },
    {
      name: "description",
      content:
        "Learn the recurring two-string interval shapes within major and minor pentatonic scales. Diagram and flashcard modes.",
    },
  ];
}

export default function IntervalShapesRoute() {
  return <IntervalShapes />;
}
