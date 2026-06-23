import type { Route } from "./+types/caged-immersion";
import { CagedImmersion } from "~/components/CagedImmersion";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — CAGED Immersion" },
    {
      name: "description",
      content:
        "A two-module CAGED experience: the core concepts (three sounds, the five shapes, the phrasing trick) and seven transposable 1-4-5 exercises, with a key drone and practice timer. Based on Guthrie Trapp's method.",
    },
  ];
}

export default function CagedImmersionRoute() {
  return <CagedImmersion />;
}
