import {
  getBestStreakStat,
  getCompletedTodayCount,
  getHabitsWithStats,
  getStreakCount,
} from "./habit-completions";
import { Completion, Habit } from "./types";

// Fixed "today" for every test below, so "yesterday" is always 2026-08-26 and "the day before" is
// always 2026-08-25, except the month/year-boundary tests, which pass their own todaysDate.
const TODAYS_DATE = "2026-08-27";

function habit(id: string, name: string): Habit {
  return { id, name, created_at: "2026-08-17T11:06:09.855Z" };
}

function completion(id: string, habitId: string, completedOn: string): Completion {
  return {
    id,
    habit_id: habitId,
    completed_on: completedOn,
    created_at: `${completedOn}T09:00:00.000Z`,
  };
}

describe("getStreakCount", () => {
  it("returns 0 given no completions at all", () => {
    expect(getStreakCount([], TODAYS_DATE)).toBe(0);
  });

  it("returns 0 given only a completion from 5 days ago (neither today nor yesterday)", () => {
    // An old, isolated completion doesn't keep a streak alive - it broke as soon as a day was
    // missed, regardless of how much history exists further back.
    const completions = [completion("c1", "1", "2026-08-22")];

    expect(getStreakCount(completions, TODAYS_DATE)).toBe(0);
  });

  it("returns 1 given a completion dated today only", () => {
    const completions = [completion("c1", "1", "2026-08-27")];

    expect(getStreakCount(completions, TODAYS_DATE)).toBe(1);
  });

  it("returns 1 given a completion dated yesterday only (not done today yet)", () => {
    // A streak stays alive through yesterday even if today hasn't been ticked off yet - it
    // shouldn't read as broken just because the user hasn't checked in yet today.
    const completions = [completion("c1", "1", "2026-08-26")];

    expect(getStreakCount(completions, TODAYS_DATE)).toBe(1);
  });

  it("returns 2 given completions today and yesterday", () => {
    const completions = [completion("c1", "1", "2026-08-27"), completion("c2", "1", "2026-08-26")];

    expect(getStreakCount(completions, TODAYS_DATE)).toBe(2);
  });

  it("returns 3 given three consecutive days including today", () => {
    const completions = [
      completion("c1", "1", "2026-08-27"),
      completion("c2", "1", "2026-08-26"),
      completion("c3", "1", "2026-08-25"),
    ];

    expect(getStreakCount(completions, TODAYS_DATE)).toBe(3);
  });

  it("stops the count at the first gap, ignoring older isolated completions", () => {
    // Today + yesterday are consecutive (streak of 2), but the third completion is 5 days ago -
    // disconnected from the other two, so it shouldn't extend the streak.
    const completions = [
      completion("c1", "1", "2026-08-27"),
      completion("c2", "1", "2026-08-26"),
      completion("c3", "1", "2026-08-22"),
    ];

    expect(getStreakCount(completions, TODAYS_DATE)).toBe(2);
  });

  it("counts consecutive days correctly across a month boundary", () => {
    const completions = [
      completion("c1", "1", "2026-09-01"),
      completion("c2", "1", "2026-08-31"),
      completion("c3", "1", "2026-08-30"),
    ];

    expect(getStreakCount(completions, "2026-09-01")).toBe(3);
  });

  it("counts consecutive days correctly across a year boundary", () => {
    const completions = [
      completion("c1", "1", "2027-01-01"),
      completion("c2", "1", "2026-12-31"),
      completion("c3", "1", "2026-12-30"),
    ];

    expect(getStreakCount(completions, "2027-01-01")).toBe(3);
  });

  describe("given completions from more than one habit on the same day", () => {
    // Regression guard for a real bug found during development: getStreakCount is fed the
    // *entire*, unfiltered completions list for the app-wide "daily streak" stat (Stats.tsx), so
    // two different habits completed on the same day produce two entries with the identical date.
    // Without deduping first, the consecutive-day loop compared each entry against the very next
    // one expecting it to be exactly one calendar day earlier, and a same-day duplicate isn't -
    // cutting the streak short right where the duplicate landed. Confirmed directly before the
    // fix: this exact scenario (two habits, same 3 consecutive days) returned a streak of 1.
    it("still counts 3 consecutive days as a streak of 3, not 1", () => {
      const completions = [
        completion("c1", "1", "2026-08-27"),
        completion("c2", "2", "2026-08-27"),
        completion("c3", "1", "2026-08-26"),
        completion("c4", "2", "2026-08-26"),
        completion("c5", "1", "2026-08-25"),
        completion("c6", "2", "2026-08-25"),
      ];

      expect(getStreakCount(completions, TODAYS_DATE)).toBe(3);
    });

    it("still stops at a genuine gap even when every day has duplicate same-day entries", () => {
      const completions = [
        completion("c1", "1", "2026-08-27"),
        completion("c2", "2", "2026-08-27"),
        completion("c3", "1", "2026-08-26"),
        completion("c4", "2", "2026-08-26"),
        // Gap here - no completions on 2026-08-25 - before an older, disconnected duplicate day.
        completion("c5", "1", "2026-08-22"),
        completion("c6", "2", "2026-08-22"),
      ];

      expect(getStreakCount(completions, TODAYS_DATE)).toBe(2);
    });
  });
});

describe("getHabitsWithStats", () => {
  it("calculates each habit's wasDoneToday and streakCount independently", () => {
    // Regression guard for a real bug found during development: the streak calculation once
    // accidentally pooled every habit's completions together instead of filtering to just the one
    // habit being calculated for, which would have shown both habits below with identical (wrong)
    // streaks instead of their own actual ones.
    const habits = [habit("1", "Meditate"), habit("2", "Read")];
    const completions = [
      completion("c1", "1", "2026-08-27"),
      completion("c2", "1", "2026-08-26"),
      completion("c3", "1", "2026-08-25"),
      completion("c4", "2", "2026-08-27"),
    ];

    const result = getHabitsWithStats(habits, completions, TODAYS_DATE);

    expect(result).toEqual([
      { habit: habits[0], wasDoneToday: true, streakCount: 3 },
      { habit: habits[1], wasDoneToday: true, streakCount: 1 },
    ]);
  });

  it("does not mark a habit done from a completion belonging to a different habit's id", () => {
    const habits = [habit("1", "Meditate")];
    const completions = [completion("c1", "2", "2026-08-27")];

    const result = getHabitsWithStats(habits, completions, TODAYS_DATE);

    expect(result).toEqual([{ habit: habits[0], wasDoneToday: false, streakCount: 0 }]);
  });
});

describe("getCompletedTodayCount", () => {
  it("returns 0 given no completions", () => {
    expect(getCompletedTodayCount([], TODAYS_DATE)).toBe(0);
  });

  it("counts completions dated today across every habit", () => {
    const completions = [
      completion("c1", "1", "2026-08-27"),
      completion("c2", "2", "2026-08-27"),
      completion("c3", "3", "2026-08-27"),
    ];

    expect(getCompletedTodayCount(completions, TODAYS_DATE)).toBe(3);
  });

  it("does not count a completion dated on a different day", () => {
    const completions = [completion("c1", "1", "2026-08-26")];

    expect(getCompletedTodayCount(completions, TODAYS_DATE)).toBe(0);
  });
});

describe("getBestStreakStat", () => {
  it("returns state 'none' given no habits", () => {
    expect(getBestStreakStat([], [], TODAYS_DATE)).toEqual({ state: "none" });
  });

  it("returns state 'none' given habits but no completions at all", () => {
    expect(getBestStreakStat([habit("1", "Meditate")], [], TODAYS_DATE)).toEqual({
      state: "none",
    });
  });

  it("returns state 'none' given completions exist, but every habit's streak has since lapsed", () => {
    // completions.length > 0 alone doesn't mean any habit's streak is still alive today - if every
    // habit's most recent completion is older than yesterday, maxStreak is 0 even though real
    // completion history exists. That should read the same as "no history at all" rather than
    // falling through to a bare "0" and an arbitrary habit's name.
    const habits = [habit("1", "Meditate")];
    const completions = [completion("c1", "1", "2026-08-01")];

    expect(getBestStreakStat(habits, completions, TODAYS_DATE)).toEqual({ state: "none" });
  });

  it("returns state 'single' naming the one habit with the highest streak", () => {
    const habits = [habit("1", "Meditate"), habit("2", "Read")];
    const completions = [
      completion("c1", "1", "2026-08-27"),
      completion("c2", "1", "2026-08-26"),
      completion("c3", "2", "2026-08-27"),
    ];

    expect(getBestStreakStat(habits, completions, TODAYS_DATE)).toEqual({
      state: "single",
      bestStreakCount: 2,
      habitName: "Meditate",
    });
  });

  it("does not treat habits tied below the top streak as a tie for best streak", () => {
    // Habits 1 and 2 are tied with *each other* at a 1-day streak, but habit 3's 2-day streak is
    // strictly higher - "tied" only ever means "tied for the single highest streak," so this
    // should resolve to a clean single winner (habit 3), not a tie between 1 and 2.
    const habits = [habit("1", "Meditate"), habit("2", "Read"), habit("3", "Stretch")];
    const completions = [
      completion("c1", "1", "2026-08-27"),
      completion("c2", "2", "2026-08-27"),
      completion("c3", "3", "2026-08-27"),
      completion("c4", "3", "2026-08-26"),
    ];

    expect(getBestStreakStat(habits, completions, TODAYS_DATE)).toEqual({
      state: "single",
      bestStreakCount: 2,
      habitName: "Stretch",
    });
  });

  it("counts only the habits actually tied at the top, not every habit", () => {
    const habits = [habit("1", "Meditate"), habit("2", "Read"), habit("3", "Stretch")];
    const completions = [
      completion("c1", "1", "2026-08-27"),
      completion("c2", "1", "2026-08-26"),
      completion("c3", "2", "2026-08-27"),
      completion("c4", "2", "2026-08-26"),
      completion("c5", "3", "2026-08-27"),
    ];

    // Habits 1 and 2 are tied on a 2-day streak; habit 3 is only on a 1-day streak.
    expect(getBestStreakStat(habits, completions, TODAYS_DATE)).toEqual({
      state: "tied",
      bestStreakCount: 2,
      tiedHabitCount: 2,
    });
  });
});
