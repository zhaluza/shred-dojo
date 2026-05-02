import type { Route } from "./+types/staff-notes";
import { StaffNotes } from "~/components/StaffNotes";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Staff Notes" },
    {
      name: "description",
      content:
        "Treble clef note reading quiz. Identify notes on the staff and build music reading fluency.",
    },
  ];
}

export default function StaffNotesRoute() {
  return <StaffNotes />;
}
