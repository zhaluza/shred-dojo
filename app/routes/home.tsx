import type { Route } from "./+types/home";
import { ScalePositions } from "~/components/ScalePositions";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Scale Positions" },
    { name: "description", content: "14-position scale viewer for natural minor and major scales" },
  ];
}

export default function Home() {
  return <ScalePositions />;
}
