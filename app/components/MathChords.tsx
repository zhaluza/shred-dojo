import { useState, useEffect, useRef, useCallback } from "react";
import { PageShell } from "./PageShell";
import { PageHeader } from "./PageHeader";
import { CtrlButton } from "./CtrlButton";
import {
  OPEN,
  SHARP,
  QUALS,
  QBYID,
  QLABEL,
  KEYS,
  ROMANS,
  DEGQUAL,
  transpose,
  chordNotes,
  chordWindow,
  readout,
  spellScale,
  midiToHz,
  type QualId,
} from "./mathChords.utils";

// ─── Diagram palette (blueprint functional tokens) ───────────────────────────
// root → red ink; the 9th (the point of the lab) → cyan accent; other chord
// tones → hollow ink outlines; muted strings → faint.
function dotStyle(iv: number): { fill: string; stroke: string; text: string } {
  if (iv === 0) return { fill: "var(--root-col)", stroke: "var(--root-col)", text: "#fff" };
  if (iv === 2) return { fill: "var(--accent)", stroke: "var(--accent)", text: "var(--bg)" };
  return { fill: "transparent", stroke: "var(--text)", text: "var(--text)" };
}

// ─── Audio: Karplus-Strong pluck, strummed low → high ────────────────────────
function pluck(ctx: AudioContext, midi: number, when: number, vol = 0.16) {
  const fs = ctx.sampleRate;
  const freq = midiToHz(midi);
  const N = Math.max(2, Math.round(fs / freq));
  const dur = 1.9;
  const len = Math.floor(fs * dur);
  const buf = ctx.createBuffer(1, len, fs);
  const out = buf.getChannelData(0);
  const ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
  let p = 0;
  const fb = 0.992;
  for (let i = 0; i < len; i++) {
    const cur = ring[p];
    const nxt = ring[(p + 1) % N];
    out[i] = cur;
    ring[p] = (cur + nxt) * 0.5 * fb;
    p = (p + 1) % N;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3200;
  const g = ctx.createGain();
  const t0 = ctx.currentTime + when;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  src.connect(lp);
  lp.connect(g);
  g.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

function useStrum() {
  const ctxRef = useRef<AudioContext | null>(null);
  const ensure = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);
  const strum = useCallback(
    (pat: (number | null)[], when = 0) => {
      try {
        const ctx = ensure();
        let k = 0;
        for (let i = 0; i < 6; i++) {
          const f = pat[i];
          if (f !== null) {
            pluck(ctx, OPEN[i] + f, when + k * 0.021);
            k++;
          }
        }
      } catch {
        /* audio unavailable */
      }
    },
    [ensure],
  );
  useEffect(() => () => { ctxRef.current?.close(); }, []);
  return strum;
}

// ─── Chord diagram (bespoke React-SVG) ───────────────────────────────────────
function ChordDiagram({
  pat,
  rootPc,
  w = 128,
}: {
  pat: (number | null)[];
  rootPc: number;
  w?: number;
}) {
  const { start, showNut } = chordWindow(pat);
  const NF = 5;
  const W = w;
  const H = Math.round(w * 1.33);
  const L = 14;
  const R = 28;
  const T = 26;
  const B = 20;
  const gw = W - L - R;
  const gh = H - T - B;
  const sx = (i: number) => L + i * (gw / 5);
  const fy = (k: number) => T + k * (gh / NF);
  const dotR = Math.min(8.6, (gw / 5) * 0.46);

  const notes = chordNotes(pat, rootPc);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" className="font-mono">
      {/* fret lines */}
      {Array.from({ length: NF + 1 }, (_, k) => (
        <line
          key={`f${k}`}
          x1={L}
          y1={fy(k)}
          x2={W - R}
          y2={fy(k)}
          stroke={k === 0 && showNut ? "var(--text)" : "var(--fret-bar)"}
          strokeWidth={k === 0 && showNut ? 3 : 1}
        />
      ))}
      {/* strings */}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={`s${i}`} x1={sx(i)} y1={T} x2={sx(i)} y2={H - B} stroke="var(--fret-bar)" strokeWidth={1} />
      ))}
      {/* base-fret label */}
      {!showNut && (
        <text x={W - R + 3} y={fy(0) + 11} fontSize={9} fill="var(--faint)">
          {start}fr
        </text>
      )}
      {/* muted markers */}
      {pat.map((f, i) =>
        f === null ? (
          <g key={`x${i}`} stroke="var(--muted)" strokeWidth={1.6} opacity={0.85}>
            <line x1={sx(i) - 3.4} y1={T - 13} x2={sx(i) + 3.4} y2={T - 7} />
            <line x1={sx(i) + 3.4} y1={T - 13} x2={sx(i) - 3.4} y2={T - 7} />
          </g>
        ) : null,
      )}
      {/* dots */}
      {notes.map((n) => {
        const cx = sx(n.string);
        const cy = fy(n.fret - start) + gh / NF / 2;
        const st = dotStyle(n.iv);
        return (
          <g key={`d${n.string}`}>
            <circle cx={cx} cy={cy} r={dotR} fill={st.fill} stroke={st.stroke} strokeWidth={1.6} />
            <text x={cx} y={cy + 3.1} textAnchor="middle" fontWeight={700} fontSize={8.5} fill={st.text}>
              {n.deg}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── localStorage helpers (hydrate after mount to avoid SSR mismatch) ─────────
function readLS(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

type ProgItem = { rootPc: number; rootName: string; qid: QualId; v: number };

const SECTION_LABEL =
  "text-[0.58rem] tracking-[0.16em] uppercase font-display mb-2";

export function MathChords() {
  const strum = useStrum();

  const [tab, setTab] = useState<"voicings" | "prog">("voicings");
  const [root, setRoot] = useState(9); // A
  const [qual, setQual] = useState<QualId>("maj7");
  const [keyIdx, setKeyIdx] = useState(0); // C major
  const [diaChoice, setDiaChoice] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [prog, setProg] = useState<ProgItem[]>([]);
  const [litIdx, setLitIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // hydrate persisted selections post-mount
  useEffect(() => {
    const r = readLS("mc-root");
    const q = readLS("mc-qual");
    const k = readLS("mc-key");
    const t = readLS("mc-tab");
    if (r !== null) setRoot(Number(r));
    if (q !== null && q in QBYID) setQual(q as QualId);
    if (k !== null) setKeyIdx(Number(k));
    if (t === "voicings" || t === "prog") setTab(t);
  }, []);
  useEffect(() => writeLS("mc-root", String(root)), [root]);
  useEffect(() => writeLS("mc-qual", qual), [qual]);
  useEffect(() => writeLS("mc-key", String(keyIdx)), [keyIdx]);
  useEffect(() => writeLS("mc-tab", tab), [tab]);

  const stopPlayback = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setLitIdx(-1);
    setPlaying(false);
  }, []);
  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const q = QBYID[qual];
  const chordName = SHARP[root] + q.sym;

  // ── Progression actions ──
  function addToProg(rootPc: number, rootName: string, qid: QualId) {
    setProg((p) => [...p, { rootPc, rootName, qid, v: 0 }]);
  }
  function removeFromProg(idx: number) {
    setProg((p) => p.filter((_, i) => i !== idx));
  }
  function cycleVoicing(idx: number, dir: 1 | -1) {
    setProg((p) =>
      p.map((it, i) => {
        if (i !== idx) return it;
        const n = QBYID[it.qid].shapes.length;
        return { ...it, v: ((it.v + dir) % n + n) % n };
      }),
    );
  }

  function playProgression() {
    if (playing || prog.length === 0) return;
    setPlaying(true);
    const gap = 0.62;
    let when = 0;
    prog.forEach((item, idx) => {
      const qq = QBYID[item.qid];
      const pat = transpose(qq.shapes[item.v], qq.root, item.rootPc);
      strum(pat, when);
      timersRef.current.push(setTimeout(() => setLitIdx(idx), when * 1000));
      when += gap;
    });
    timersRef.current.push(
      setTimeout(() => {
        setLitIdx(-1);
        setPlaying(false);
      }, when * 1000),
    );
  }

  return (
    <PageShell maxWidth={1080}>
      <PageHeader
        eyebrow="Extended voicing lab · written in 7/8"
        title={<>Math<span className="text-[var(--accent)]">·</span>Chords</>}
        subtitle={
          <>
            Movable maj7, m7, dom7, m7♭5 and the nine-chords — every shape
            transposes to any root, with the extension highlighted in{" "}
            <span className="text-[var(--accent)]">cyan</span>. Tap any diagram to
            hear it.
          </>
        }
        meta={[{ label: "Feel", value: "7/8" }]}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <CtrlButton label="Voicings" active={tab === "voicings"} onClick={() => setTab("voicings")} />
        <CtrlButton label="Progression" active={tab === "prog"} onClick={() => setTab("prog")} />
      </div>

      {tab === "voicings" ? (
        <section>
          <div className="mb-5">
            <p className={SECTION_LABEL} style={{ color: "var(--muted)" }}>Root</p>
            <div className="flex flex-wrap gap-1.5">
              {SHARP.map((n, pc) => (
                <CtrlButton key={pc} label={n} active={pc === root} onClick={() => setRoot(pc)} small />
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className={SECTION_LABEL} style={{ color: "var(--muted)" }}>Chord type</p>
            <div className="flex flex-wrap gap-1.5">
              {QUALS.map((qq) => (
                <CtrlButton
                  key={qq.id}
                  label={QLABEL[qq.id]}
                  active={qq.id === qual}
                  onClick={() => setQual(qq.id)}
                  small
                  normalCase
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-0">
            {q.shapes.map((sh, idx) => {
              const pat = transpose(sh, q.root, root);
              const notes = chordNotes(pat, root);
              return (
                <button
                  key={idx}
                  onClick={() => strum(pat)}
                  className="group relative -mt-px -ml-px flex flex-col items-center bg-[var(--surface)] border border-[var(--border)] p-3 cursor-pointer transition-colors hover:border-[var(--accent)] hover:z-[2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)] focus-visible:z-[2]"
                >
                  <span className="absolute top-2 right-2.5 text-[0.7rem] text-[var(--faint)] group-hover:text-[var(--accent)]">▶</span>
                  <span className="self-start font-mono font-bold text-[0.95rem] tracking-tight">{chordName}</span>
                  <span className="self-start font-mono text-[0.55rem] tracking-[0.16em] uppercase text-[var(--faint)] mt-px">{sh.tag}</span>
                  <ChordDiagram pat={pat} rootPc={root} />
                  <span className="font-mono text-[0.62rem] tracking-[0.06em] text-[var(--accent)] text-center min-h-[14px]">{readout(notes)}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section>
          <div className="mb-5">
            <p className={SECTION_LABEL} style={{ color: "var(--muted)" }}>Key (major)</p>
            <div className="flex flex-wrap gap-1.5">
              {KEYS.map((k, i) => (
                <CtrlButton key={k.n} label={k.n} active={i === keyIdx} onClick={() => setKeyIdx(i)} small />
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className={SECTION_LABEL} style={{ color: "var(--muted)" }}>
              In-key chords — pick an extension, then add
            </p>
            <div className="flex gap-2.5 overflow-x-auto pb-3 -mx-1 px-1">
              {spellScale(KEYS[keyIdx].n).map((deg, di) => {
                const [baseQ, extQ] = DEGQUAL[di];
                const chosenQ = diaChoice[di] === 1 && extQ ? extQ : baseQ;
                return (
                  <div
                    key={di}
                    className="shrink-0 w-[132px] flex flex-col gap-2 bg-[var(--surface)] border border-[var(--border)] p-3"
                  >
                    <div className="font-mono text-[0.62rem] tracking-[0.16em] uppercase text-[var(--faint)]">{ROMANS[di]}</div>
                    <div className="font-mono font-bold text-[1.05rem] leading-none">{deg.name}{QBYID[chosenQ].sym}</div>
                    <div className="flex border border-[var(--border)]">
                      <SegButton
                        label={QBYID[baseQ].sym}
                        active={diaChoice[di] === 0}
                        onClick={() => setDiaChoice((c) => c.map((v, i) => (i === di ? 0 : v)))}
                      />
                      {extQ && (
                        <SegButton
                          label={QBYID[extQ].sym}
                          active={diaChoice[di] === 1}
                          onClick={() => setDiaChoice((c) => c.map((v, i) => (i === di ? 1 : v)))}
                        />
                      )}
                    </div>
                    <CtrlButton
                      label="+ Add"
                      active={false}
                      small
                      onClick={() => addToProg(deg.pc, deg.name, chosenQ)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-[0.58rem] tracking-[0.16em] uppercase font-display" style={{ color: "var(--muted)" }}>Your progression</p>
            <div className="flex gap-2">
              <CtrlButton
                label={playing ? "■ Stop" : "▶ Play"}
                active={playing}
                disabled={prog.length === 0}
                onClick={() => (playing ? stopPlayback() : playProgression())}
              />
              <CtrlButton
                label="Clear"
                active={false}
                disabled={prog.length === 0}
                onClick={() => {
                  stopPlayback();
                  setProg([]);
                }}
              />
            </div>
          </div>

          <div
            className="border border-dashed border-[var(--border)] min-h-[150px] p-3.5"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent 0 calc(25% - 1px), color-mix(in srgb, var(--text) 5%, transparent) calc(25% - 1px) 25%)",
            }}
          >
            {prog.length === 0 ? (
              <div className="font-mono text-[0.8rem] text-[var(--faint)] text-center leading-[1.7] py-8">
                No chords yet.<br />Build a line from the in-key chords above —<br />try{" "}
                <span className="text-[var(--accent)]">I&nbsp; vi&nbsp; IV&nbsp; V</span> or go modal with the ♭5.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 items-start">
                {prog.map((item, idx) => {
                  const qq = QBYID[item.qid];
                  const sh = qq.shapes[item.v];
                  const pat = transpose(sh, qq.root, item.rootPc);
                  const notes = chordNotes(pat, item.rootPc);
                  const lit = idx === litIdx;
                  return (
                    <div
                      key={idx}
                      className={[
                        "relative w-[150px] flex flex-col gap-1.5 bg-[var(--surface)] border p-2.5",
                        lit ? "border-[var(--accent)] z-[2]" : "border-[var(--border)]",
                      ].join(" ")}
                      style={lit ? { boxShadow: "0 0 0 1px var(--accent)" } : undefined}
                    >
                      <span className="absolute top-2 left-2.5 font-mono text-[0.6rem] text-[var(--faint)]">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <button
                        onClick={() => removeFromProg(idx)}
                        title="Remove"
                        className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center text-[var(--faint)] hover:text-[var(--feedback-wrong)] bg-transparent border-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      >
                        ✕
                      </button>
                      <button
                        onClick={() => strum(pat)}
                        className="flex flex-col items-center mt-3 cursor-pointer bg-transparent border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      >
                        <span className="font-mono font-bold text-[1.05rem] leading-none">{item.rootName}{qq.sym}</span>
                        <ChordDiagram pat={pat} rootPc={item.rootPc} w={120} />
                      </button>
                      <div className="flex items-center justify-between gap-1.5">
                        <CycBtn label="‹" title="Previous voicing" onClick={() => cycleVoicing(idx, -1)} />
                        <span className="font-mono text-[0.55rem] tracking-[0.1em] uppercase text-[var(--faint)]">{sh.tag}</span>
                        <CycBtn label="›" title="Next voicing" onClick={() => cycleVoicing(idx, 1)} />
                      </div>
                      <span className="font-mono text-[0.62rem] tracking-[0.06em] text-[var(--accent)] text-center">{readout(notes)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      <p className="mt-8 border-t border-[var(--border)] pt-4 font-mono text-[0.62rem] leading-[1.8] text-[var(--faint)]">
        <span className="text-[var(--muted)] font-bold">Reading:</span> ◯ outline = chord tone · ● red = root · ● cyan = 9th · ✕ = muted string. Degree printed in each node.<br />
        <span className="text-[var(--muted)] font-bold">Heads up:</span> fret positions are exact; fingerings from the source sheet were hand-drawn, so those are a sensible guess.
      </p>
    </PageShell>
  );
}

// small wrappers to keep the JSX above tidy
function SegButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={[
        "flex-1 font-mono text-[0.72rem] font-bold py-1.5 cursor-pointer transition-colors border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        active ? "bg-[var(--accent)] text-[var(--bg)]" : "bg-transparent text-[var(--muted)] hover:text-[var(--text)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function CycBtn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-6 h-6 flex items-center justify-center font-mono text-[0.85rem] leading-none bg-transparent border border-[var(--border)] text-[var(--text)] cursor-pointer hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      {label}
    </button>
  );
}
