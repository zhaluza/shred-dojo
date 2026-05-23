import type { Route } from "./+types/morning-coffee";
import { MorningCoffee } from "~/components/MorningCoffee";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Morning Coffee" },
    {
      name: "description",
      content:
        "Daily practice routine cycling 14 drills through all 12 keys. Based on Alex Rockwell's Morning Coffee method.",
    },
  ];
}

export default function MorningCoffeeRoute() {
  return <MorningCoffee />;
}
