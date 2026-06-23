import { useState, useEffect, useCallback, useMemo } from "react";
import { Nav } from "./Nav";
import { PageHeader } from "./PageHeader";
import { CtrlButton } from "./CtrlButton";
import { LIGHT_THEME, DARK_THEME } from "./theme";
import { fmtClock } from "./Timer";
import {
  loadSessions,
  clearSessions,
  updateSession,
  deleteSession,
  groupByDay,
  totalSec,
  isSameDay,
  SOURCE_LABELS,
  type PracticeSession,
} from "./practiceLog.utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function dayHeading(date: number, now: number): string {
  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, now - DAY_MS)) return "Yesterday";
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function timeOfDay(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex-1 min-w-[120px] p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="font-mono text-[0.55rem] tracking-[0.14em] uppercase mb-1" style={{ color: "var(--faint)" }}>
        {label}
      </div>
      <div className="font-mono font-semibold tabular-nums text-[1.4rem] leading-none" style={{ color: "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}

export function PracticeLog() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("shred-dojo-dark");
    if (stored !== null) setIsDark(stored === "true");
    else setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try { localStorage.setItem("shred-dojo-dark", String(next)); } catch {}
      return next;
    });
  }, []);
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  // Read the log after mount to avoid SSR hydration mismatch.
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  useEffect(() => { setSessions(loadSessions()); }, []);

  const now = Date.now();
  const summary = useMemo(() => {
    const today = sessions.filter((s) => isSameDay(s.startedAt, now));
    const week = sessions.filter((s) => s.startedAt >= now - 7 * DAY_MS);
    return {
      today: totalSec(today),
      week: totalSec(week),
      all: totalSec(sessions),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  const days = useMemo(() => groupByDay(sessions), [sessions]);

  const refresh = () => setSessions(loadSessions());

  const clear = () => {
    if (sessions.length === 0) return;
    if (!window.confirm("Clear the entire practice log? This can't be undone.")) return;
    clearSessions();
    setSessions([]);
  };

  return (
    <div style={theme} className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      <Nav isDark={isDark} toggleDark={toggleDark} />

      <div className="max-w-[960px] mx-auto px-4 pt-6 max-[700px]:pt-5 pb-16">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <PageHeader className="flex-1 min-w-[240px]" eyebrow="Train" title="Practice Log" />
          <CtrlButton label="Clear log" active={false} onClick={clear} normalCase disabled={sessions.length === 0} />
        </div>

        {/* Summary */}
        <div className="flex gap-3 flex-wrap mb-7">
          <Stat label="Today" value={fmtClock(summary.today)} />
          <Stat label="Last 7 days" value={fmtClock(summary.week)} />
          <Stat label="All time" value={fmtClock(summary.all)} />
        </div>

        {/* Sessions grouped by day */}
        {days.length === 0 ? (
          <div
            className="p-8 text-center font-mono text-[0.8rem]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
          >
            No practice logged yet. Run the timer on the{" "}
            <span style={{ color: "var(--text)" }}>Metronome</span> or{" "}
            <span style={{ color: "var(--text)" }}>Pentatonic</span> pages and your sessions show up here.
          </div>
        ) : (
          days.map((day) => (
            <div key={day.key} className="mb-6">
              <div className="flex items-baseline justify-between gap-3 mb-2 pb-1" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="font-display text-[0.85rem] tracking-[0.06em] uppercase" style={{ color: "var(--text)" }}>
                  {dayHeading(day.date, now)}
                </span>
                <span className="font-mono text-[0.7rem] tabular-nums" style={{ color: "var(--muted)" }}>
                  {fmtClock(day.totalSec)}
                </span>
              </div>
              <div className="flex flex-col">
                {day.sessions.map((s) => (
                  <SessionRow key={s.id} session={s} onChanged={refresh} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// One log row: read-only by default, with inline edit (label + bpm) and delete.
function SessionRow({ session: s, onChanged }: { session: PracticeSession; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(s.label ?? "");
  const [bpm, setBpm] = useState(s.bpm != null ? String(s.bpm) : "");

  const startEdit = () => {
    setLabel(s.label ?? "");
    setBpm(s.bpm != null ? String(s.bpm) : "");
    setEditing(true);
  };
  const save = () => {
    const n = parseInt(bpm, 10);
    updateSession(s.id, {
      label: label.trim() || undefined,
      bpm: bpm.trim() === "" || isNaN(n) ? undefined : n,
    });
    setEditing(false);
    onChanged();
  };
  const remove = () => {
    if (!window.confirm("Delete this session?")) return;
    deleteSession(s.id);
    onChanged();
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap py-[0.45rem] border-b" style={{ borderColor: "var(--border)" }}>
        <span className="font-mono text-[0.7rem] tabular-nums w-[64px] flex-shrink-0" style={{ color: "var(--muted)" }}>
          {timeOfDay(s.startedAt)}
        </span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          placeholder="Label"
          aria-label="Session label"
          className="font-mono text-[0.72rem] border px-2 py-[0.3rem] bg-transparent flex-1 min-w-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        />
        <input
          type="number"
          value={bpm}
          onChange={(e) => setBpm(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          placeholder="bpm"
          aria-label="Session bpm"
          className="font-mono text-[0.72rem] border px-2 py-[0.3rem] bg-transparent w-[4.2rem] text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        />
        <CtrlButton label="Save" active onClick={save} small normalCase />
        <CtrlButton label="Cancel" active={false} onClick={() => setEditing(false)} small normalCase />
        <CtrlButton label="Delete" active={false} onClick={remove} small normalCase />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-[0.45rem] border-b group" style={{ borderColor: "var(--border)" }}>
      <span className="font-mono text-[0.7rem] tabular-nums w-[64px] flex-shrink-0" style={{ color: "var(--muted)" }}>
        {timeOfDay(s.startedAt)}
      </span>
      <span className="font-display text-[0.72rem] tracking-[0.04em] uppercase flex-shrink-0" style={{ color: "var(--accent)" }}>
        {SOURCE_LABELS[s.source]}
      </span>
      <span className="font-mono text-[0.72rem] truncate flex-1" style={{ color: "var(--text)" }}>
        {s.label ?? s.section ?? ""}
      </span>
      {s.bpm != null && (
        <span className="font-mono text-[0.68rem] tabular-nums flex-shrink-0" style={{ color: "var(--faint)" }}>
          {s.bpm} bpm
        </span>
      )}
      <span className="font-mono text-[0.72rem] tabular-nums flex-shrink-0 w-[52px] text-right" style={{ color: "var(--text)" }}>
        {fmtClock(s.durationSec)}
      </span>
      <button
        onClick={startEdit}
        aria-label="Edit session"
        className="font-display text-[0.62rem] tracking-[0.08em] uppercase px-2 py-[0.2rem] flex-shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        style={{ color: "var(--muted)" }}
      >
        Edit
      </button>
    </div>
  );
}
