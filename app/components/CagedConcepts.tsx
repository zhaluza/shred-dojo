import { Link } from "react-router";
import { ChordDiagram } from "./ChordVoicings";
import { FullNeckFretboard, type FullNeckLayer } from "./FullNeckFretboard";
import {
  cagedShapeRow,
  essentialSounds,
  noteName,
  scaleNeckNotes,
  type ConceptMode,
} from "./cagedImmersion.utils";

// ─── Module 1: CAGED Concepts ───────────────────────────────────────────────────
// A focused guided sequence — three essential sounds, the five CAGED shapes, and
// the Phrasing Trick capstone — then links out to the existing reference tools for
// the full per-shape scale/arpeggio/pentatonic matrix.

function Panel({
  index,
  kicker,
  title,
  blurb,
  children,
}: {
  index: string;
  kicker?: string;
  title: string;
  blurb: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 border border-[var(--border)] bg-[var(--surface)]">
      <div className="px-4 md:px-5 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-[0.4rem]">
          <span className="font-mono text-[0.55rem] tracking-[0.2em] uppercase" style={{ color: "var(--accent)" }}>
            {index}
          </span>
          {kicker && (
            <span className="font-mono text-[0.55rem] tracking-[0.2em] uppercase" style={{ color: "var(--muted)" }}>
              {kicker}
            </span>
          )}
        </div>
        <h2 className="font-display font-semibold uppercase tracking-[0.03em] leading-none m-0 text-[clamp(1.1rem,2.6vw,1.5rem)]">
          {title}
        </h2>
        <p className="mt-2 mb-0 font-mono text-[0.72rem] leading-[1.6] max-w-[68ch]" style={{ color: "var(--muted)" }}>
          {blurb}
        </p>
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

export function CagedConcepts({ tonicPc, mode }: { tonicPc: number; mode: ConceptMode }) {
  const tonic = noteName(tonicPc);
  const sounds = essentialSounds(tonicPc);
  const shapeRow = cagedShapeRow(tonicPc, mode);

  const scaleNotes = scaleNeckNotes(tonicPc, mode);
  const phrasingLayers: FullNeckLayer[] = [
    {
      isMain: false,
      notes: scaleNotes.map((n) => ({ string: n.string, absoluteFret: n.absoluteFret, deg: n.deg })),
    },
    {
      isMain: true,
      notes: scaleNotes
        .filter((n) => n.isChordTone)
        .map((n) => ({ string: n.string, absoluteFret: n.absoluteFret, deg: n.deg, penta: true })),
    },
  ];

  return (
    <div>
      {/* 1 — Three Essential Sounds */}
      <Panel
        index="01"
        title="Three Essential Sounds"
        blurb={
          <>
            Almost everything reduces to three chord qualities. The <b style={{ color: "var(--text)" }}>major</b>{" "}
            triad (R · 3 · 5), the <b style={{ color: "var(--text)" }}>minor</b> (R · ♭3 · 5), and the{" "}
            <b style={{ color: "var(--text)" }}>dominant 7</b> (R · 3 · 5 · ♭7). Learn to hear and find these
            three on the neck and the rest of CAGED hangs off them. Shown here as the E shape on {tonic}.
          </>
        }
      >
        <div className="flex flex-wrap gap-x-8 gap-y-8 justify-center">
          {sounds.map((s) => (
            <div key={s.quality} className="flex flex-col items-center gap-2">
              <div className="text-center">
                <div className="font-display font-semibold text-[0.95rem] tracking-[0.03em]">{s.chord}</div>
                <div className="font-mono text-[0.52rem] tracking-[0.14em] uppercase" style={{ color: "var(--muted)" }}>
                  {s.label}
                </div>
              </div>
              <ChordDiagram voicing={s.voicing} />
            </div>
          ))}
        </div>
      </Panel>

      {/* 2 — The Five CAGED Shapes */}
      <Panel
        index="02"
        title="The Five CAGED Shapes"
        blurb={
          <>
            One chord, five fingerings — the open <b style={{ color: "var(--text)" }}>C, A, G, E, D</b> shapes made
            movable and chained up the neck. Each shape's root hands the baton to the next, so they tile the whole
            fretboard. Here is the {mode === "major" ? "" : "minor "}
            {tonic}
            {mode === "major" ? "" : "m"} chord in all five shapes.
          </>
        }
      >
        <div className="flex flex-wrap gap-x-6 gap-y-8 justify-center">
          {shapeRow.map((r) => (
            <ChordDiagram key={r.shape} voicing={r.voicing} />
          ))}
        </div>
      </Panel>

      {/* 3 — The Phrasing Trick */}
      <Panel
        index="03"
        kicker="the capstone"
        title="The Phrasing Trick"
        blurb={
          <>
            Run the {mode === "major" ? "major" : "natural minor"} scale up and down in groups of{" "}
            <b style={{ color: "var(--text)" }}>three eighth-notes + an eighth rest</b>, arranged so the{" "}
            <b style={{ color: "var(--text)" }}>1st and 3rd note of every group land on a chord tone</b> (solid dots
            below). The rest gives you breathing room and resets the pattern. Because the strong notes are always
            chord tones, anything you play sounds resolved over the changes. Dimmed dots are passing tones.
          </>
        }
      >
        <FullNeckFretboard layers={phrasingLayers} />
        <p className="mt-3 mb-0 font-mono text-[0.62rem] leading-[1.6]" style={{ color: "var(--faint)" }}>
          Solid = chord tones (landing notes) · dimmed = passing tones · {tonic}
          {mode === "major" ? " major" : " minor"}.
        </p>
      </Panel>

      {/* 4 — Go deeper (link out) */}
      <Panel
        index="04"
        title="Go Deeper"
        blurb="The course also drills triads in groups of three and the full scale / arpeggio / pentatonic matrix for each shape. Those already live in Shred Dojo's reference tools — jump straight in:"
      >
        <div className="grid grid-cols-2 max-[560px]:grid-cols-1 gap-0">
          {[
            { to: "/shape-explorer", title: "Shape Explorer", body: "Each CAGED shape's scale, focused or as an overview." },
            { to: "/arpeggio-maps", title: "Arpeggio Maps", body: "Where R · 3 · 5 · 7 land for every shape." },
            { to: "/chord-voicings", title: "Chord Voicings", body: "All five shapes for maj / min / 7 chords." },
            { to: "/pentatonic-triads", title: "Pentatonic Triads", body: "Triads in groups of three across the boxes." },
          ].map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="-mt-px -ml-px block border border-[var(--border)] p-4 no-underline transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)] group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[0.82rem] tracking-[0.06em] uppercase text-[var(--text)] group-hover:text-[var(--accent)]">
                  {c.title}
                </span>
                <span className="text-[var(--muted)] group-hover:text-[var(--accent)]">→</span>
              </div>
              <p className="mt-1 mb-0 font-mono text-[0.64rem] leading-[1.5]" style={{ color: "var(--muted)" }}>
                {c.body}
              </p>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
