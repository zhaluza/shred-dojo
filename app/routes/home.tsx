import type { Route } from "./+types/home";
import { ScalePositions } from "~/components/ScalePositions";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Scale Positions" },
    {
      name: "description",
      content: "Positional scale viewer for major and minor scales",
    },
  ];
}

export default function Home() {
  return <ScalePositions />;
}
