import type { Route } from "./+types/shape-explorer";
import { ShapeExplorer } from "~/components/ShapeExplorer";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Shape Explorer" },
    {
      name: "description",
      content:
        "Visualize 3nps, CAGED, and pentatonic scale shapes in any key — major and minor.",
    },
  ];
}

export default function ShapeExplorerRoute() {
  return <ShapeExplorer />;
}
