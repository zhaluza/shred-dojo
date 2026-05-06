import { Fragment, useMemo, useState, useEffect, useRef } from "react";
import { DARK_THEME, LIGHT_THEME } from "./scalePositions.theme";
import { Nav } from "./Nav";
import {
  KEY_NAMES,
  SCALE_TYPES,
  SCALE_TYPE_KEYS,
  buildScale,
  toVexNote,
  type ScaleNote,
  type ScaleType,
} from "./scaleBuilder.utils";

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "font-display text-[0.68rem] tracking-[0.1em] uppercase border px-[0.75rem] py-[0.28rem] cursor-pointer transition-all",
        active
          ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]"
          : "bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function NamesView({ notes, steps }: { notes: ScaleNote[]; steps: string[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 flex-nowrap py-6 px-1">
        {notes.map((n, i) => (
          <Fragment key={i}>
            <div
              className={[
                "font-display text-[0.9rem] tracking-[0.06em] uppercase border px-3 py-1 shrink-0",
                i === 0
                  ? "bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]"
                  : "bg-transparent text-[var(--text)] border-[var(--border)]",
              ].join(" ")}
            >
              {n.note}
            </div>
            {i < steps.length && (
              <span
                className="font-mono text-[0.6rem] shrink-0"
                style={{ color: "var(--muted)" }}
              >
                {steps[i]}
              </span>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function StaffView({
  scaleNotes,
  isDark,
}: {
  scaleNotes: ScaleNote[];
  isDark: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || containerWidth < 10) return;
    let cancelled = false;

    import("vexflow").then(
      ({ Renderer, Stave, StaveNote, Voice, Formatter, Accidental }) => {
        if (cancelled || !containerRef.current) return;
        el.innerHTML = "";

        const height = 200;
        const renderer = new Renderer(el, Renderer.Backends.SVG);
        renderer.resize(containerWidth, height);
        const ctx = renderer.getContext();

        const textColor = isDark ? "#e8e0d0" : "#1a1612";
        ctx.setFillStyle(textColor);
        ctx.setStrokeStyle(textColor);

        const stave = new Stave(10, 40, containerWidth - 20);
        stave.addClef("treble");
        stave.setContext(ctx).draw();

        const vexNotes = scaleNotes.map((sn) => {
          const { key, accidental } = toVexNote(sn);
          const note = new StaveNote({ keys: [key], duration: "q" });
          if (accidental) note.addModifier(new Accidental(accidental), 0);
          return note;
        });

        const voice = new Voice({ numBeats: vexNotes.length, beatValue: 4 });
        voice.setMode(Voice.Mode.SOFT);
        voice.addTickables(vexNotes);

        const noteAreaWidth =
          stave.getWidth() - (stave.getNoteStartX() - stave.getX()) - 10;

        new Formatter()
          .joinVoices([voice])
          .format([voice], noteAreaWidth);

        voice.draw(ctx, stave);
      }
    );
    return () => { cancelled = true; };
  }, [scaleNotes, isDark, containerWidth]);

  return <div ref={containerRef} className="w-full" />;
}

export function ScaleBuilder() {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("shred-dojo-dark") === "true";
    } catch {
      return false;
    }
  });

  const [keyIdx, setKeyIdx] = useState(() => {
    if (typeof window === "undefined") return 0;
    const n = Number(localStorage.getItem("shred-dojo-key") ?? NaN);
    return Number.isInteger(n) && n >= 0 && n < 12 ? n : 0;
  });

  const [scaleType, setScaleType] = useState<ScaleType>("major");
  const [viewMode, setViewMode] = useState<"names" | "staff">("names");

  function toggleDark() {
    const next = !isDark;
    setIsDark(next);
    try {
      localStorage.setItem("shred-dojo-dark", String(next));
    } catch {}
  }

  function handleKeyIdx(i: number) {
    setKeyIdx(i);
    try {
      localStorage.setItem("shred-dojo-key", String(i));
    } catch {}
  }

  const config = SCALE_TYPES[scaleType];

  const scaleNotes = useMemo(
    () => buildScale(KEY_NAMES[keyIdx], config.intervals),
    [keyIdx, config.intervals]
  );

  return (
    <div
      className="min-h-dvh flex flex-col bg-[var(--bg)] text-[var(--text)] transition-colors duration-200"
      style={isDark ? DARK_THEME : LIGHT_THEME}
    >
      <Nav isDark={isDark} toggleDark={toggleDark} />
      <main className="flex-1 px-5 md:px-8 py-8 max-w-[760px] mx-auto w-full">
        {/* Header */}
        <h1 className="font-display font-semibold text-[clamp(1.8rem,5vw,2.8rem)] tracking-[0.04em] uppercase leading-none mb-8">
          Scale{" "}
          <span style={{ color: "var(--accent)" }}>Builder</span>
        </h1>

        <div className="flex flex-col gap-6">
          {/* Key selector */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[0.58rem] tracking-[0.16em] uppercase"
              style={{ color: "var(--muted)" }}
            >
              Key
            </span>
            <div className="flex flex-wrap gap-1.5">
              {KEY_NAMES.map((name, i) => (
                <Chip
                  key={name}
                  label={name}
                  active={keyIdx === i}
                  onClick={() => handleKeyIdx(i)}
                />
              ))}
            </div>
          </div>

          {/* Scale type selector */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[0.58rem] tracking-[0.16em] uppercase"
              style={{ color: "var(--muted)" }}
            >
              Scale
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SCALE_TYPE_KEYS.map((k) => (
                <Chip
                  key={k}
                  label={SCALE_TYPES[k].label}
                  active={scaleType === k}
                  onClick={() => setScaleType(k)}
                />
              ))}
            </div>
          </div>

          {/* Formula */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[0.58rem] tracking-[0.16em] uppercase"
              style={{ color: "var(--muted)" }}
            >
              Formula
            </span>
            <div className="flex items-center gap-1 flex-wrap font-mono text-[0.8rem]">
              {config.steps.map((step, i) => (
                <Fragment key={i}>
                  {i > 0 && (
                    <span style={{ color: "var(--faint)" }}>—</span>
                  )}
                  <span
                    className="font-semibold"
                    style={{ color: "var(--accent)" }}
                  >
                    {step}
                  </span>
                </Fragment>
              ))}
              <span
                className="ml-3 text-[0.65rem] tracking-[0.1em] font-display uppercase"
                style={{ color: "var(--muted)" }}
              >
                (W = whole step · H = half step · WH = whole + half)
              </span>
            </div>
          </div>

          {/* View toggle + output */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span
                className="text-[0.58rem] tracking-[0.16em] uppercase"
                style={{ color: "var(--muted)" }}
              >
                View
              </span>
              <div className="flex gap-1.5">
                <Chip
                  label="Names"
                  active={viewMode === "names"}
                  onClick={() => setViewMode("names")}
                />
                <Chip
                  label="Staff"
                  active={viewMode === "staff"}
                  onClick={() => setViewMode("staff")}
                />
              </div>
            </div>

            {/* Output panel */}
            <div
              className="border px-5 py-4"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              {viewMode === "names" ? (
                <NamesView notes={scaleNotes} steps={config.steps} />
              ) : (
                <StaffView scaleNotes={scaleNotes} isDark={isDark} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
