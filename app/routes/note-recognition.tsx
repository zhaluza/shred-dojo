import type { Route } from "./+types/note-recognition";
import { FretboardNotes } from "~/components/FretboardNotes";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Note Recognition" },
    {
      name: "description",
      content:
        "Interactive quiz to build instant fretboard note recognition. Choose your strings, note types, and fret range.",
    },
  ];
}

export default function NoteRecognitionRoute() {
  return <FretboardNotes />;
}
