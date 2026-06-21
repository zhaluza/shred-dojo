import { describe, it, expect } from "vitest";
import {
  totalSec,
  isSameDay,
  groupByDay,
  type PracticeSession,
} from "./practiceLog.utils";

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
