import { getTodaysDate } from "./dates";

describe("getTodaysDate", () => {
  afterEach(() => {
    // Restore this machine's real date (i.e. today's actual day, not the fake dates we're using in
    // each test).
    jest.useRealTimers();
  });

  it("returns today's local date as a YYYY-MM-DD string", () => {
    // Set a fake system date that Jest will think is my machine's real date (using useFakeTimers
    // and setSystemTime).
    jest.useFakeTimers().setSystemTime(new Date(2026, 7, 26)); // 26th August 2026 (month is 0-indexed)

    expect(getTodaysDate()).toBe("2026-08-26");
  });

  it("zero-pads a single-digit month", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 26)); // March

    expect(getTodaysDate()).toBe("2026-03-26");
  });

  it("zero-pads a single-digit day", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 7, 5));

    expect(getTodaysDate()).toBe("2026-08-05");
  });

  it("zero-pads a single-digit month and day together", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 1)); // 1st January

    expect(getTodaysDate()).toBe("2026-01-01");
  });

  it("uses the machine's local date, not a UTC conversion", () => {
    // A moment that's a different calendar day in UTC than in a timezone behind it (e.g. US
    // Pacific, UTC-8) - if this used .toISOString() (UTC) instead of the local getters, it would
    // incorrectly report the 27th instead of the 26th. Jest's fake timers use the test runner's
    // own local timezone, so this only proves the *mechanism* (local getters, not UTC ones) is
    // used - see docs/decisions.md's "browser's local calendar date, not UTC" decision for why
    // that distinction matters for a real user in a real timezone.
    jest.useFakeTimers().setSystemTime(new Date(2026, 7, 26, 23, 30)); // 11:30pm local time

    expect(getTodaysDate()).toBe("2026-08-26");
  });
});
