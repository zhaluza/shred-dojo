import type { Route } from "./+types/writing-scales";
import { WritingScales } from "~/components/WritingScales";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Writing with Scales" },
    {
      name: "description",
      content:
        "An interactive lesson on writing melodies with scales: see the neck as octave chunks, find any root, and target chord tones — with key-adaptive fretboards you can hear.",
    },
  ];
}

export default function WritingScalesRoute() {
  return <WritingScales />;
}
