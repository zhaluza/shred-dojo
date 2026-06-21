import { describe, it, expect, beforeEach } from "vitest";
import {
  totalSec,
  isSameDay,
  groupByDay,
  loadSessions,
  addSession,
  updateSession,
  deleteSession,
  clearSessions,
  type PracticeSession,
} from "./practiceLog.utils";

// The util module reads `window`/`localStorage` lazily, so a per-test mock on
// globalThis (the test env is node, with neither defined) exercises the real
// read/write paths.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

// Build a session at a given local date/time with a duration.
function sess(
  y: number, mo: number, d: number, h: number, min: number,
  durationSec: number,
  extra: Partial<PracticeSession> = {},
): PracticeSession {
  return {
    id: `${y}-${mo}-${d}-${h}-${min}`,
    startedAt: new Date(y, mo - 1, d, h, min).getTime(),
    durationSec,
    source: "practice-station",
    ...extra,
  };
}

describe("totalSec", () => {
  it("sums durations", () => {
    expect(totalSec([sess(2026, 6, 21, 9, 0, 60), sess(2026, 6, 21, 10, 0, 90)])).toBe(150);
  });
  it("is 0 for empty", () => {
    expect(totalSec([])).toBe(0);
  });
});

describe("isSameDay", () => {
  it("true within the same local day across hours", () => {
    expect(isSameDay(new Date(2026, 5, 21, 0, 1).getTime(), new Date(2026, 5, 21, 23, 59).getTime())).toBe(true);
  });
  it("false across midnight", () => {
    expect(isSameDay(new Date(2026, 5, 21, 23, 59).getTime(), new Date(2026, 5, 22, 0, 1).getTime())).toBe(false);
  });
});

describe("groupByDay", () => {
  const sessions = [
    sess(2026, 6, 21, 9, 0, 60),
    sess(2026, 6, 20, 8, 0, 30),
    sess(2026, 6, 21, 14, 30, 120),
    sess(2026, 6, 20, 18, 0, 45),
  ];

  it("groups by local day, newest day first", () => {
    const groups = groupByDay(sessions);
    expect(groups.map((g) => g.key)).toEqual(["2026-06-21", "2026-06-20"]);
  });

  it("orders sessions newest-first within a day", () => {
    const [today] = groupByDay(sessions);
    expect(today.sessions.map((s) => s.durationSec)).toEqual([120, 60]); // 14:30 before 9:00
  });

  it("computes per-day totals", () => {
    const groups = groupByDay(sessions);
    expect(groups.find((g) => g.key === "2026-06-21")?.totalSec).toBe(180);
    expect(groups.find((g) => g.key === "2026-06-20")?.totalSec).toBe(75);
  });

  it("returns [] for no sessions", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe("storage (add / load / update / delete / clear)", () => {
  beforeEach(() => {
    (globalThis as unknown as { window: object }).window = {};
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  });

  const base = {
    startedAt: Date.now(),
    durationSec: 120,
    source: "practice-station" as const,
  };

  it("adds and reads back, generating an id", () => {
    const entry = addSession({ ...base, label: "warmup", bpm: 100 });
    expect(entry.id).toBeTruthy();
    const all = loadSessions();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ label: "warmup", bpm: 100, durationSec: 120 });
  });

  it("returns sessions newest-first", () => {
    addSession({ ...base, startedAt: 1000, label: "old" });
    addSession({ ...base, startedAt: 5000, label: "new" });
    expect(loadSessions().map((s) => s.label)).toEqual(["new", "old"]);
  });

  it("drops malformed entries on load", () => {
    localStorage.setItem(
      "shred-dojo-practice-log",
      JSON.stringify([
        { id: "ok", startedAt: 1, durationSec: 10, source: "practice-station" },
        { id: "bad-source", startedAt: 1, durationSec: 10, source: "nope" },
        { id: "missing-fields" },
        "garbage",
      ]),
    );
    expect(loadSessions().map((s) => s.id)).toEqual(["ok"]);
  });

  it("survives non-array / corrupt JSON", () => {
    localStorage.setItem("shred-dojo-practice-log", "{not json");
    expect(loadSessions()).toEqual([]);
    localStorage.setItem("shred-dojo-practice-log", JSON.stringify({ a: 1 }));
    expect(loadSessions()).toEqual([]);
  });

  it("updates label and bpm by id, leaving others untouched", () => {
    const a = addSession({ ...base, label: "a", bpm: 80 });
    const b = addSession({ ...base, label: "b", bpm: 90 });
    updateSession(a.id, { label: "renamed", bpm: 120 });
    const byId = Object.fromEntries(loadSessions().map((s) => [s.id, s]));
    expect(byId[a.id]).toMatchObject({ label: "renamed", bpm: 120 });
    expect(byId[b.id]).toMatchObject({ label: "b", bpm: 90 });
  });

  it("clears a field when patched with undefined (key dropped on serialize)", () => {
    const a = addSession({ ...base, label: "x", bpm: 100 });
    updateSession(a.id, { label: undefined, bpm: undefined });
    const loaded = loadSessions()[0];
    expect(loaded.label).toBeUndefined();
    expect(loaded.bpm).toBeUndefined();
    expect("bpm" in loaded).toBe(false);
  });

  it("deletes a single session", () => {
    const a = addSession({ ...base, label: "keep" });
    const b = addSession({ ...base, label: "drop" });
    deleteSession(b.id);
    expect(loadSessions().map((s) => s.id)).toEqual([a.id]);
  });

  it("clears the whole log", () => {
    addSession({ ...base });
    addSession({ ...base });
    clearSessions();
    expect(loadSessions()).toEqual([]);
  });
});
