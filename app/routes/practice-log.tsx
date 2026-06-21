import type { Route } from "./+types/practice-log";
import { PracticeLog } from "~/components/PracticeLog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Practice Log" },
    {
      name: "description",
      content:
        "A central log of your practice sessions, filled in automatically as you run the timer across Shred Dojo's practice tools.",
    },
  ];
}

export default function PracticeLogRoute() {
  return <PracticeLog />;
}
