import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { PageShell } from "./PageShell";
import { PageHeader } from "./PageHeader";
import { CtrlButton } from "./CtrlButton";
import { FRET_INLAYS, FRET_DOUBLE } from "./scalePositions.utils";
import {
  KEYS,
  NOTE_NAMES,
  OPEN_PCS,
  mod12,
  midiToHz,
  noteMidi,
  pcAt,
  relDegIndex,
  SCALES,
  IVMAJ,
  NAV_SCALES,
  MODES,
  QUAL,
  RN,
  chordTarget,
  defaultNavRoot,
  NUM_FRETS,
  type ScaleName,
  type NavScaleName,
  type NavRoot,
} from "./writingScales.utils";

// ─── Palette (blueprint functional tokens) ───────────────────────────────────
const COL = {
  root: "var(--root-col)", // amber → red ink: the root
  scale: "var(--accent)", // teal → cyan: scale tone / target
  colour: "var(--blues-col)", // pink → violet-indigo: ♯4 colour note
  left: "var(--seventh-col)", // violet → purple: descending nav shape
};
function textOn(fill: string): string {
  return fill === COL.scale ? "var(--bg)" : "#fff";
}

const KEY_STORAGE = "ws-key";

// ─── Audio ───────────────────────────────────────────────────────────────────
// Single-note triangle pluck, mirroring FretboardNotes.tsx. Lazy AudioContext,
// resumed within the click gesture (autoplay policy), closed on unmount.
function useNoteAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const play = useCallback((stringIdx: number, fret: number) => {
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(midiToHz(noteMidi(stringIdx, fret)), now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    } catch {
      /* audio unavailable */
    }
  }, []);
  useEffect(() => () => { ctxRef.current?.close(); }, []);
  return play;
}

// Tap ripple: one transient expanding ring per board, driven by SVG SMIL so it
// auto-runs on insert (no custom CSS keyframes).
function useTapFx() {
  const [r, setR] = useState<{ x: number; y: number; key: number } | null>(null);
  const ping = useCallback((x: number, y: number) => {
    setR({ x, y, key: Date.now() });
  }, []);
  const node = r ? (
    <circle key={r.key} cx={r.x} cy={r.y} r={9} fill="none" stroke="var(--text)" strokeWidth={2}>
      <animate attributeName="r" from="9" to="26" dur="0.5s" fill="freeze" />
      <animate attributeName="opacity" from="0.85" to="0" dur="0.5s" fill="freeze" />
    </circle>
  ) : null;
  return { ping, node };
}

// ─── Shared dot ──────────────────────────────────────────────────────────────
function Dot({
  x, y, r, fill, label, ring, opacity = 1, onClick,
}: {
  x: number; y: number; r: number; fill: string; label: string;
  ring?: boolean; opacity?: number; onClick: () => void;
}) {
  return (
    <g opacity={opacity} style={{ cursor: "pointer" }} onClick={onClick}>
      {ring && (
        <circle cx={x} cy={y} r={r + 3.5} fill="none" stroke={fill} strokeWidth={1.5} opacity={0.5} />
      )}
      <circle cx={x} cy={y} r={r} fill={fill} />
      <text
        x={x} y={y + 3.3} textAnchor="middle"
        fill={textOn(fill)} fontWeight={700}
        fontSize={label.length > 1 ? 8.5 : 10}
      >
        {label}
      </text>
    </g>
  );
}

// ─── Neck skeleton (frets, inlays, strings, numbers) ─────────────────────────
// Display rows top→bottom = high e … low E. si (low→high) maps to row 5 - si.
function neckSkeleton(NF: number, FW: number, SH: number, PADL: number, PADT: number, H: number) {
  const els: ReactNode[] = [];
  // inlays
  for (let n = 1; n <= NF; n++) {
    if (!FRET_INLAYS.has(n)) continue;
    const x = PADL + (n - 0.5) * FW;
    if (FRET_DOUBLE.has(n)) {
      els.push(<circle key={`i${n}a`} cx={x} cy={PADT + 1.5 * SH} r={3.4} fill="var(--faint)" />);
      els.push(<circle key={`i${n}b`} cx={x} cy={PADT + 3.5 * SH} r={3.4} fill="var(--faint)" />);
    } else {
      els.push(<circle key={`i${n}`} cx={x} cy={PADT + 2.5 * SH} r={3.4} fill="var(--faint)" />);
    }
  }
  // fret lines (n=0 = nut)
  for (let n = 0; n <= NF; n++) {
    const x = PADL + n * FW;
    els.push(
      <line key={`f${n}`} x1={x} y1={PADT} x2={x} y2={PADT + 5 * SH}
        stroke={n === 0 ? "var(--muted)" : "var(--fret-bar)"} strokeWidth={n === 0 ? 4 : 1.3} />,
    );
  }
  // string lines (row 5 = low E thickest)
  for (let r = 0; r < 6; r++) {
    const y = PADT + r * SH;
    els.push(
      <line key={`s${r}`} x1={PADL} y1={y} x2={PADL + NF * FW} y2={y}
        stroke="var(--border)" strokeWidth={1 + r * 0.25} />,
    );
  }
  // fret numbers
  els.push(<text key="n0" x={PADL - 18} y={H - 6} textAnchor="middle" fill="var(--faint)" fontSize={9}>0</text>);
  for (let n = 1; n <= NF; n++) {
    els.push(
      <text key={`n${n}`} x={PADL + (n - 0.5) * FW} y={H - 6} textAnchor="middle" fill="var(--faint)" fontSize={9}>
        {n}
      </text>,
    );
  }
  return els;
}

// ─── Board frame ─────────────────────────────────────────────────────────────
function Board({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 p-3 overflow-x-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}

// ─── NeckBoard (sections 1, 3, 4, 5, 6) ──────────────────────────────────────
interface NeckConfig {
  target?: number[];
  chordRoot?: number;
  emph?: boolean;
  showChar?: boolean;
}

function NeckBoard({
  rootPc, scale, labelMode, config, play,
}: {
  rootPc: number;
  scale: ScaleName;
  labelMode: "deg" | "note";
  config: NeckConfig;
  play: (s: number, f: number) => void;
}) {
  const { ping, node } = useTapFx();
  const sc = SCALES[scale];
  const FW = 46, SH = 26, PADL = 34, PADT = 20, PADB = 24;
  const NF = NUM_FRETS;
  const W = PADL + NF * FW + 18;
  const H = PADT + 5 * SH + PADB;
  const X = (n: number) => (n === 0 ? PADL - 18 : PADL + (n - 0.5) * FW);
  const Y = (si: number) => PADT + (5 - si) * SH;

  const dots: ReactNode[] = [];
  for (let si = 0; si < 6; si++) {
    for (let n = 0; n <= NF; n++) {
      const pc = pcAt(si, n);
      const idx = relDegIndex(pc, rootPc, sc.iv);
      if (idx < 0) continue;
      const x = X(n), y = Y(si);
      const isRoot = idx === 0;
      let fill = COL.scale, op = 1, r = 10, ring = false;
      if (config.target) {
        if (!config.target.includes(idx)) {
          op = 0.22;
        } else if (idx === (config.chordRoot ?? 0)) {
          fill = COL.root; ring = true;
        } else {
          fill = COL.scale; ring = true;
        }
      } else if (isRoot) {
        fill = COL.root;
        if (config.emph) { ring = true; r = 11; }
      } else if (config.showChar && idx === sc.char) {
        fill = COL.colour; ring = true;
      }
      const label = labelMode === "deg" ? sc.deg[idx] : NOTE_NAMES[pc];
      dots.push(
        <Dot key={`${si}:${n}`} x={x} y={y} r={r} fill={fill} label={label} ring={ring} opacity={op}
          onClick={() => { play(si, n); ping(x, y); }} />,
      );
    }
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="font-mono">
      {neckSkeleton(NF, FW, SH, PADL, PADT, H)}
      {dots}
      {node}
    </svg>
  );
}

// ─── OctaveBox (section 2) ───────────────────────────────────────────────────
function OctaveBox({
  rootPc, oct, play,
}: {
  rootPc: number;
  oct: 0 | 1 | 2; // 0 both · 1 lower · 2 upper
  play: (s: number, f: number) => void;
}) {
  const { ping, node } = useTapFx();
  const rf = mod12(rootPc - OPEN_PCS[0]); // root fret on low E
  const lo = Math.max(0, rf - 1);
  const hi = rf + 4;
  const cells = hi - lo + 1;
  const root1 = noteMidi(0, rf); // midi of the low-E root
  const FW = 52, SH = 28, PL = 28, PT = 20, PB = 24;
  const W = PL + cells * FW + 16;
  const H = PT + 5 * SH + PB;
  const Y = (si: number) => PT + (5 - si) * SH;

  const skel: ReactNode[] = [];
  for (let j = 0; j <= cells; j++) {
    const x = PL + j * FW;
    const nut = lo === 0 && j === 0;
    skel.push(
      <line key={`v${j}`} x1={x} y1={PT} x2={x} y2={PT + 5 * SH}
        stroke={nut ? "var(--muted)" : "var(--fret-bar)"} strokeWidth={nut ? 4 : 1.3} />,
    );
  }
  for (let r = 0; r < 6; r++) {
    const y = PT + r * SH;
    skel.push(<line key={`h${r}`} x1={PL} y1={y} x2={PL + cells * FW} y2={y} stroke="var(--border)" strokeWidth={1 + r * 0.25} />);
  }
  for (let f = lo; f <= hi; f++) {
    skel.push(<text key={`fn${f}`} x={PL + (f - lo + 0.5) * FW} y={H - 6} textAnchor="middle" fill="var(--faint)" fontSize={10}>{f}</text>);
  }

  const dots: ReactNode[] = [];
  for (let si = 0; si < 6; si++) {
    for (let f = lo; f <= hi; f++) {
      const pc = pcAt(si, f);
      const idx = relDegIndex(pc, rootPc, SCALES.Major.iv);
      if (idx < 0) continue;
      const midi = noteMidi(si, f);
      const o = midi < root1 + 12 ? 1 : 2;
      const dim = oct !== 0 && o !== oct;
      const x = PL + (f - lo + 0.5) * FW, y = Y(si);
      const isRoot = idx === 0;
      const fill = isRoot ? COL.root : COL.scale;
      dots.push(
        <Dot key={`${si}:${f}`} x={x} y={y} r={11} fill={fill} label={IVMAJ[idx]}
          ring={isRoot && !dim} opacity={dim ? 0.16 : 1}
          onClick={() => { play(si, f); ping(x, y); }} />,
      );
    }
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="font-mono">
      {skel}{dots}{node}
    </svg>
  );
}

// ─── NavBoard (section 2b) ───────────────────────────────────────────────────
function NavBoard({
  rootPc, navScale, navRoot, setNavRoot, play,
}: {
  rootPc: number;
  navScale: NavScaleName;
  navRoot: NavRoot;
  setNavRoot: (r: NavRoot) => void;
  play: (s: number, f: number) => void;
}) {
  const { ping, node } = useTapFx();
  const sc = NAV_SCALES[navScale];
  const NF = 15, FW = 38, SH = 25, PL = 30, PT = 20, PB = 24;
  const W = PL + NF * FW + 18;
  const H = PT + 5 * SH + PB;
  const X = (n: number) => (n === 0 ? PL - 16 : PL + (n - 0.5) * FW);
  const Y = (si: number) => PT + (5 - si) * SH;
  const navMidi = noteMidi(navRoot.si, navRoot.fret);
  const rf = navRoot.fret;

  // nearest octave-up / octave-down roots to draw the dashed octave-jump lines
  let up: { si: number; f: number } | null = null;
  let dn: { si: number; f: number } | null = null;
  for (let si = 0; si < 6; si++) {
    for (let f = 0; f <= NF; f++) {
      if (mod12(pcAt(si, f) - rootPc) !== 0) continue;
      const m = noteMidi(si, f);
      if (m === navMidi + 12 && (!up || Math.abs(f - rf) < Math.abs(up.f - rf))) up = { si, f };
      if (m === navMidi - 12 && (!dn || Math.abs(f - rf) < Math.abs(dn.f - rf))) dn = { si, f };
    }
  }

  const dashes: ReactNode[] = [];
  const xs = X(rf), ys = Y(navRoot.si);
  [up, dn].forEach((b, i) => {
    if (b) dashes.push(
      <line key={`d${i}`} x1={xs} y1={ys} x2={X(b.f)} y2={Y(b.si)}
        stroke="var(--root-col)" strokeWidth={1.4} strokeDasharray="3 4" opacity={0.45} />,
    );
  });

  const dots: ReactNode[] = [];
  for (let si = 0; si < 6; si++) {
    for (let n = 0; n <= NF; n++) {
      const pc = pcAt(si, n);
      const idx = relDegIndex(pc, rootPc, sc.iv);
      if (idx < 0) continue;
      const midi = noteMidi(si, n);
      const isRoot = idx === 0;
      const isSel = si === navRoot.si && n === navRoot.fret;
      const near = Math.abs(n - rf) <= 5;
      let fill: string, op = 1, r = 10, ring = false, clickRoot = false;
      if (isSel) {
        fill = COL.root; r = 12; ring = true; clickRoot = true;
      } else if (isRoot) {
        fill = COL.root; op = near ? 0.95 : 0.34; clickRoot = true;
      } else if (near && midi > navMidi && midi <= navMidi + 12) {
        fill = COL.scale;
      } else if (near && midi < navMidi && midi >= navMidi - 12) {
        fill = COL.left;
      } else continue;
      const x = X(n), y = Y(si);
      dots.push(
        <Dot key={`${si}:${n}`} x={x} y={y} r={r} fill={fill} label={sc.deg[idx]} ring={ring} opacity={op}
          onClick={
            clickRoot
              ? () => { setNavRoot({ si, fret: n }); play(si, n); ping(x, y); }
              : () => { play(si, n); ping(x, y); }
          } />,
      );
    }
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="font-mono">
      {neckSkeleton(NF, FW, SH, PL, PT, H)}
      {dashes}{dots}{node}
    </svg>
  );
}

// ─── ChordBox (section 5 — movable maj7♭5 grip) ──────────────────────────────
function ChordBox({ rootPc }: { rootPc: number }) {
  const base = mod12(rootPc - OPEN_PCS[1]); // A-string root fret
  // strings low→high: [low E, A, D, G, B, e]
  const frets: (number | null)[] = [null, base, base + 1, base + 1, base + 2, null];
  const labs = ["", "R", "♭5", "7", "3", ""];
  const played = frets.filter((f): f is number => f !== null);
  const minF = Math.min(...played), maxF = Math.max(...played);
  const start = Math.max(1, minF);
  const span = Math.max(4, maxF - start + 1);
  const cols = 6, FW = 24, SH = 30, PL = 16, PT = 24;
  const W = PL + (cols - 1) * FW + 28;
  const H = PT + span * SH + 22;
  const els: ReactNode[] = [];
  for (let c = 0; c < cols; c++) {
    const x = PL + c * FW;
    els.push(<line key={`c${c}`} x1={x} y1={PT} x2={x} y2={PT + span * SH} stroke="var(--border)" strokeWidth={1.1} />);
  }
  for (let r = 0; r <= span; r++) {
    const y = PT + r * SH;
    const nut = r === 0 && start === 1;
    els.push(<line key={`r${r}`} x1={PL} y1={y} x2={PL + (cols - 1) * FW} y2={y} stroke={nut ? "var(--muted)" : "var(--fret-bar)"} strokeWidth={nut ? 4 : 1.1} />);
  }
  if (start > 1) {
    els.push(<text key="fr" x={PL + (cols - 1) * FW + 5} y={PT + 12} fill="var(--muted)" fontSize={10}>{start}fr</text>);
  }
  for (let i = 0; i < 6; i++) {
    const f = frets[i], x = PL + i * FW;
    if (f === null) {
      els.push(<text key={`m${i}`} x={x} y={PT - 7} textAnchor="middle" fill="var(--muted)" fontSize={11}>×</text>);
      continue;
    }
    const y = PT + (f - start + 0.5) * SH;
    els.push(
      <g key={`g${i}`}>
        <circle cx={x} cy={y} r={9.5} fill={COL.scale} />
        <text x={x} y={y + 3} textAnchor="middle" fill={textOn(COL.scale)} fontSize={8} fontWeight={700}>{labs[i]}</text>
      </g>,
    );
  }
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="font-mono">{els}</svg>;
}

// ─── Small presentational helpers ────────────────────────────────────────────
function SectionHead({ num, title }: { num: string; title: string }) {
  return (
    <>
      <div className="font-display text-[0.6rem] tracking-[0.16em] uppercase" style={{ color: "var(--accent)" }}>
        {num}
      </div>
      <h2 className="font-display font-semibold text-[clamp(1.15rem,3vw,1.5rem)] tracking-[0.01em] mt-1 mb-0" style={{ color: "var(--text)" }}>
        {title}
      </h2>
    </>
  );
}

function Legend({ items }: { items: { sw: string; label: string }[] }) {
  return (
    <div className="flex gap-4 flex-wrap mt-2 px-1 font-mono text-[0.66rem]" style={{ color: "var(--muted)" }}>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: it.sw }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[0.66rem] mt-2 px-1" style={{ color: "var(--faint)" }}>{children}</div>;
}

function Seg({ children }: { children: ReactNode }) {
  return <div className="flex gap-1.5 flex-wrap mt-3">{children}</div>;
}

function Section({ children, last }: { children: ReactNode; last?: boolean }) {
  return (
    <section className="pt-8 pb-1" style={last ? undefined : { borderBottom: "1px solid var(--border)" }}>
      {children}
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export function WritingScales() {
  const play = useNoteAudio();

  const [rootPc, setRootPcState] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = parseInt(localStorage.getItem(KEY_STORAGE) ?? "", 10);
    return v >= 0 && v <= 11 ? v : 0;
  });
  const [labelMode, setLabelMode] = useState<"deg" | "note">("deg");
  const [s2, setS2] = useState<0 | 1 | 2>(0);
  const [navScale, setNavScale] = useState<NavScaleName>("Major");
  const [navRoot, setNavRoot] = useState<NavRoot>(() => defaultNavRoot(rootPc));
  const [s3, setS3] = useState<"triad" | "seventh">("triad");
  const [s4, setS4] = useState(0);
  const [s5, setS5] = useState<ScaleName>("Major");
  const [spark, setSpark] = useState<{
    scale: ScaleName; target: number[]; chordRoot: number; showChar: boolean; prompt: ReactNode;
  } | null>(null);

  const setRootPc = useCallback((pc: number) => {
    setRootPcState(pc);
    setNavRoot(defaultNavRoot(pc));
    try { localStorage.setItem(KEY_STORAGE, String(pc)); } catch {}
  }, []);

  // section 4 chord label
  const s4RootPc = mod12(rootPc + SCALES.Major.iv[s4]);

  const rollSpark = useCallback(() => {
    const k = KEYS[Math.floor(Math.random() * KEYS.length)].pc;
    const d = Math.floor(Math.random() * 7);
    const lyd = Math.random() < 0.4;
    setRootPc(k);
    const chordPc = mod12(k + SCALES.Major.iv[d]);
    setSpark({
      scale: lyd ? "Lydian" : "Major",
      target: chordTarget(d),
      chordRoot: d,
      showChar: lyd,
      prompt: (
        <>
          In <b style={{ color: "var(--text)" }}>{NOTE_NAMES[k]} major</b>, write over the{" "}
          <b style={{ color: "var(--text)" }}>{RN[d]}</b> chord (
          <b style={{ color: "var(--text)" }}>{NOTE_NAMES[chordPc]}{QUAL[d]}</b>):{" "}
          <u style={{ color: "var(--accent)", textDecoration: "none" }}>target its 1·3·5·7</u>
          {lyd ? (
            <>, then brighten with the <i style={{ color: "var(--blues-col)", fontStyle: "normal" }}>♯4 (Lydian)</i>.</>
          ) : (
            <>, then colour with the nearby scale tones.</>
          )}
        </>
      ),
    });
  }, [setRootPc]);

  const s6cfg: NeckConfig = spark
    ? { target: spark.target, chordRoot: spark.chordRoot, showChar: spark.showChar }
    : { target: [0, 2, 4], chordRoot: 0 };
  const s6scale: ScaleName = spark ? spark.scale : "Major";

  return (
    <PageShell maxWidth={860}>
      <PageHeader
        eyebrow="Train · Lesson"
        title={<>Writing ideas <span style={{ color: "var(--accent)" }}>with scales</span></>}
        subtitle="Stop memorising scales as one big block. Learn to see the neck as octave chunks, find any root in a moment, and aim your ideas at the notes that always sound right. Pick a key once — every diagram below follows it."
      />

      {/* sticky key bar */}
      <div
        className="sticky top-0 z-30 -mx-5 md:-mx-8 px-5 md:px-8 py-2.5 mt-4"
        style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--border)", borderTop: "2px solid var(--accent)" }}
      >
        <div className="font-display text-[0.55rem] tracking-[0.16em] uppercase mb-1.5" style={{ color: "var(--muted)" }}>
          Your key
        </div>
        <div className="flex gap-1.5 items-center">
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {KEYS.map((k) => {
              const on = k.pc === rootPc;
              return (
                <button
                  key={k.pc}
                  onClick={() => setRootPc(k.pc)}
                  aria-pressed={on}
                  className="flex-none font-mono text-[0.8rem] px-2.5 py-1.5 border max-[700px]:min-h-[40px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    background: on ? "var(--accent)" : "transparent",
                    borderColor: on ? "var(--accent)" : "var(--border)",
                    color: on ? "var(--bg)" : "var(--text)",
                    fontWeight: on ? 700 : 400,
                  }}
                >
                  {NOTE_NAMES[k.pc]}
                </button>
              );
            })}
          </div>
          <div className="flex border ml-auto flex-none" style={{ borderColor: "var(--border)" }}>
            {(["deg", "note"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setLabelMode(m)}
                aria-pressed={labelMode === m}
                className="font-mono text-[0.68rem] px-2.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{
                  background: labelMode === m ? "var(--border)" : "transparent",
                  color: labelMode === m ? "var(--text)" : "var(--muted)",
                }}
              >
                {m === "deg" ? "degrees" : "notes"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 01 */}
      <Section>
        <SectionHead num="01 · The problem" title="A whole scale at once is too much to see" />
        <p className="text-[0.95rem] mt-3 mb-0" style={{ color: "var(--text)" }}>
          Most players try to memorise a scale as one big two-octave block and then can never find the
          note they want in the moment. Here's the major scale across the neck in your key — useful, but
          hard to <em>use</em> for writing.
        </p>
        <Board>
          <NeckBoard rootPc={rootPc} scale="Major" labelMode={labelMode} config={{}} play={play} />
        </Board>
        <Legend items={[{ sw: COL.root, label: "root (1)" }, { sw: COL.scale, label: "scale tone" }]} />
        <Hint>Tap any note to hear it.</Hint>
      </Section>

      {/* 02 */}
      <Section>
        <SectionHead num="02 · The fix" title="See it as two octave chunks" />
        <p className="text-[0.95rem] mt-3 mb-0" style={{ color: "var(--text)" }}>
          Don't memorise the whole block — learn one <b style={{ color: "var(--text)" }}>position box</b>,
          then split it into its two one-octave halves: the lower half lives on the lower strings, the
          upper half on the higher strings. Same shape in every key (anchored to the root on the low E),
          labelled with interval names — R, Δ3, p4, …
        </p>
        <Seg>
          {([["both halves", 0], ["lower octave", 1], ["upper octave", 2]] as const).map(([lab, v]) => (
            <CtrlButton key={v} label={lab} active={s2 === v} onClick={() => setS2(v)} small normalCase />
          ))}
        </Seg>
        <Board>
          <OctaveBox rootPc={rootPc} oct={s2} play={play} />
        </Board>
        <Hint>One box, two octaves — isolate each half, and tap to hear.</Hint>
      </Section>

      {/* 02b */}
      <Section>
        <SectionHead num="02b · Finding your place" title="Two shapes from any root — plus the octave map" />
        <p className="text-[0.95rem] mt-3 mb-0" style={{ color: "var(--text)" }}>
          From any root the scale runs two ways: a shape to the{" "}
          <u style={{ color: "var(--accent)", textDecoration: "none" }}>right</u> (ascending) and a shape
          to the <u style={{ color: "var(--seventh-col)", textDecoration: "none" }}>left</u> (descending).
          Learn those two, plus where the root repeats across the strings — the{" "}
          <b style={{ color: "var(--root-col)" }}>octave map</b>, with dashed lines showing the octave
          jumps — and you can drop in anywhere and instantly know the scale around you. Works the same for
          the full scale or the pentatonic.
        </p>
        <Seg>
          {([["diatonic (major)", "Major"], ["major pentatonic", "MajPent"], ["minor pentatonic", "MinPent"]] as const).map(([lab, v]) => (
            <CtrlButton key={v} label={lab} active={navScale === v} onClick={() => setNavScale(v)} small normalCase />
          ))}
        </Seg>
        <Board>
          <NavBoard rootPc={rootPc} navScale={navScale} navRoot={navRoot} setNavRoot={setNavRoot} play={play} />
        </Board>
        <Legend items={[
          { sw: COL.root, label: "root — tap to move" },
          { sw: COL.scale, label: "right shape ↑" },
          { sw: COL.left, label: "left shape ↓" },
        ]} />
        <Hint>Faint roots everywhere = the octave map. Tap any root to anchor the two shapes there.</Hint>
      </Section>

      {/* 03 */}
      <Section>
        <SectionHead num="03 · Target the good notes" title="Aim at the chord tones" />
        <p className="text-[0.95rem] mt-3 mb-0" style={{ color: "var(--text)" }}>
          To write over a chord, land on its chord tones — the triad{" "}
          <b style={{ color: "var(--text)" }}>1·3·5</b> — and use the rest of the scale to colour around
          them. Those are the notes that always sound "right" over the chord. Add the 7th and you get the
          lush <b style={{ color: "var(--text)" }}>3·5·7</b> sound.
        </p>
        <Seg>
          {([["triad · 1 3 5", "triad"], ["7th · 3 5 7", "seventh"]] as const).map(([lab, v]) => (
            <CtrlButton key={v} label={lab} active={s3 === v} onClick={() => setS3(v)} small normalCase />
          ))}
        </Seg>
        <Board>
          <NeckBoard
            rootPc={rootPc} scale="Major" labelMode={labelMode}
            config={{ target: s3 === "triad" ? [0, 2, 4] : [2, 4, 6], chordRoot: s3 === "triad" ? 0 : 2 }}
            play={play}
          />
        </Board>
        <Legend items={[
          { sw: COL.root, label: "chord root" },
          { sw: COL.scale, label: "target tone" },
          { sw: "var(--faint)", label: "colour tone" },
        ]} />
      </Section>

      {/* 04 */}
      <Section>
        <SectionHead num="04 · Any chord in the key" title="Each chord is a doorway to a mode" />
        <p className="text-[0.95rem] mt-3 mb-0" style={{ color: "var(--text)" }}>
          The same trick works for every chord in the key — pick one and target its tones. And here's the
          side-door: to nail a chord like the <b style={{ color: "var(--text)" }}>V</b>, think of{" "}
          <em>its</em> scale (e.g. play the major scale but flatten the 7th — that's Mixolydian), so its
          root, 3rd and 5th jump out instantly.
        </p>
        <Seg>
          {RN.map((rn, i) => (
            <CtrlButton key={rn} label={rn} active={s4 === i} onClick={() => setS4(i)} small normalCase />
          ))}
        </Seg>
        <div className="font-mono text-[0.82rem] mt-3" style={{ color: "var(--text)" }}>
          <b style={{ color: "var(--root-col)" }}>{RN[s4]}</b> chord —{" "}
          <b style={{ color: "var(--root-col)" }}>{NOTE_NAMES[s4RootPc]}{QUAL[s4]}</b> — colour it with{" "}
          <i style={{ color: "var(--accent)", fontStyle: "normal" }}>{NOTE_NAMES[s4RootPc]} {MODES[s4]}</i>
        </div>
        <Board>
          <NeckBoard rootPc={rootPc} scale="Major" labelMode={labelMode} config={{ target: chordTarget(s4), chordRoot: s4 }} play={play} />
        </Board>
        <Hint>Amber = the chord's root · cyan = its 3rd / 5th / 7th.</Hint>
      </Section>

      {/* 05 */}
      <Section>
        <SectionHead num="05 · Modes in one move" title="Once you know major, a mode is one note away" />
        <p className="text-[0.95rem] mt-3 mb-0" style={{ color: "var(--text)" }}>
          Because you know where every degree sits, you reach a mode by nudging a single note. The
          brightest colour, <b style={{ color: "var(--text)" }}>Lydian</b>, is just the major scale with
          the <i style={{ color: "var(--blues-col)", fontStyle: "normal" }}>4th raised a fret</i> to a ♯4.
          Flip it on, then deliberately target that ♯4 — over a maj7 it gives the floating{" "}
          <b style={{ color: "var(--text)" }}>maj7♯11 (a.k.a. maj7♭5)</b> sound.
        </p>
        <Seg>
          {([["major", "Major"], ["raise the 4th → Lydian", "Lydian"]] as const).map(([lab, v]) => (
            <CtrlButton key={v} label={lab} active={s5 === v} onClick={() => setS5(v)} small normalCase />
          ))}
        </Seg>
        <Board>
          <NeckBoard rootPc={rootPc} scale={s5} labelMode={labelMode} config={{ emph: true, showChar: s5 === "Lydian" }} play={play} />
        </Board>
        <Legend items={[
          { sw: COL.root, label: "root" },
          { sw: COL.scale, label: "scale tone" },
          ...(s5 === "Lydian" ? [{ sw: COL.colour, label: "♯4 colour note" }] : []),
        ]} />
        <div className="mt-4 flex items-center gap-4 flex-wrap">
          <div className="p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <ChordBox rootPc={rootPc} />
          </div>
          <div className="text-[0.82rem] max-w-[32ch]" style={{ color: "var(--muted)" }}>
            <span className="font-mono" style={{ color: "var(--text)" }}>{NOTE_NAMES[rootPc]}maj7♭5</span>
            <br />
            The chord that ♯4 implies — play your Lydian ideas over this movable shape (it shifts with your key).
          </div>
        </div>
      </Section>

      {/* 06 */}
      <Section last>
        <SectionHead num="06 · Now write one" title="Put it together" />
        <p className="text-[0.9rem] mt-3 mb-0" style={{ color: "var(--muted)" }}>
          A complete idea = target a chord's tones, then spice with a colour note. Roll a starting point —
          it sets the key and lights up the target tones below.
        </p>
        <div className="mt-4 p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderTop: "2px solid var(--accent)" }}>
          <div className="font-display text-[0.55rem] tracking-[0.18em] uppercase" style={{ color: "var(--accent)" }}>
            Writing prompt
          </div>
          <div className="text-[1.05rem] my-2.5 min-h-[2.4em]" style={{ color: "var(--text)" }}>
            {spark ? spark.prompt : "Roll one and chase it."}
          </div>
          <CtrlButton label="Give me a starting point ↻" active onClick={rollSpark} normalCase />
        </div>
        <Board>
          <NeckBoard rootPc={rootPc} scale={s6scale} labelMode={labelMode} config={s6cfg} play={play} />
        </Board>
        <Hint>
          {spark ? `Target tones lit — ${NOTE_NAMES[mod12(rootPc + SCALES.Major.iv[spark.chordRoot])]}${QUAL[spark.chordRoot]}` : "Your prompt will light up here."}
        </Hint>
      </Section>

      <footer className="text-center font-mono text-[0.68rem] mt-8 leading-[1.7]" style={{ color: "var(--muted)" }}>
        Standard tuning · nothing saved.
      </footer>
    </PageShell>
  );
}
