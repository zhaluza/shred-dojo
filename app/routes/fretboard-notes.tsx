import type { Route } from "./+types/fretboard-notes";
import { FretboardNotes } from "~/components/FretboardNotes";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Notes on the Fretboard" },
    {
      name: "description",
      content:
        "Interactive quiz to build instant fretboard note recognition. Choose your strings, note types, and fret range.",
    },
  ];
}

export default function FretboardNotesRoute() {
  return <FretboardNotes />;
}
