// Central practice log — timestamped session entries written from any practice
// page (Practice Station, Pentatonic Practice, and more later). Storage is
// localStorage today; the function API below is the seam for a future DB backend
// (pages import these helpers and never touch localStorage directly).

export type PracticeSource =
  | "pentatonic-practice"
  | "practice-station"
  | "caged-immersion"
  | "morning-coffee";

export interface PracticeSession {
  id: string;
  startedAt: number; // epoch ms
  durationSec: number;
  source: PracticeSource;
  section?: string; // structural source-tag, e.g. pentatonic step title
  label?: string; // optional free-text note the user attaches at save / edit time
  bpm?: number; // metronome bpm at commit, if any
}

export const SOURCE_LABELS: Record<PracticeSource, string> = {
  "pentatonic-practice": "Pentatonic Practice",
  "practice-station": "Practice Station",
  "caged-immersion": "CAGED Immersion",
  "morning-coffee": "Morning Coffee",
};

const STORAGE_KEY = "shred-dojo-practice-log";

function isValidSession(s: unknown): s is PracticeSession {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.startedAt === "number" &&
    typeof o.durationSec === "number" &&
    (o.source === "pentatonic-practice" ||
      o.source === "practice-station" ||
      o.source === "caged-immersion" ||
      o.source === "morning-coffee")
  );
}

function readRaw(): PracticeSession[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isValidSession) : [];
  } catch {
    return [];
  }
}

function writeRaw(sessions: PracticeSession[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    /* storage unavailable / full */
  }
}

function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** All sessions, newest first. */
export function loadSessions(): PracticeSession[] {
  return readRaw().sort((a, b) => b.startedAt - a.startedAt);
}

/** Append a session, returning the stored entry (with generated id). */
export function addSession(s: Omit<PracticeSession, "id">): PracticeSession {
  const entry: PracticeSession = { ...s, id: makeId() };
  writeRaw([entry, ...readRaw()]);
  return entry;
}

/** Patch an existing session's editable fields (label, bpm, durationSec). */
export function updateSession(
  id: string,
  patch: Partial<Pick<PracticeSession, "label" | "bpm" | "durationSec">>,
): void {
  writeRaw(readRaw().map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

export function deleteSession(id: string): void {
  writeRaw(readRaw().filter((s) => s.id !== id));
}

export function clearSessions(): void {
  writeRaw([]);
}

// ─── Pure aggregation helpers ────────────────────────────────────────────────

export function totalSec(sessions: PracticeSession[]): number {
  return sessions.reduce((sum, s) => sum + s.durationSec, 0);
}

/** True if two epoch-ms timestamps fall on the same local calendar day. */
export function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export interface DayGroup {
  key: string; // local day key, e.g. "2026-06-21"
  date: number; // start-of-day epoch ms
  sessions: PracticeSession[];
  totalSec: number;
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Group sessions by local day (newest day first; newest session first within). */
export function groupByDay(sessions: PracticeSession[]): DayGroup[] {
  const map = new Map<string, PracticeSession[]>();
  for (const s of sessions) {
    const k = dayKey(s.startedAt);
    const arr = map.get(k);
    if (arr) arr.push(s);
    else map.set(k, [s]);
  }
  const groups: DayGroup[] = [];
  for (const [key, list] of map) {
    list.sort((a, b) => b.startedAt - a.startedAt);
    const d = new Date(list[0].startedAt);
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    groups.push({ key, date, sessions: list, totalSec: totalSec(list) });
  }
  groups.sort((a, b) => b.date - a.date);
  return groups;
}
