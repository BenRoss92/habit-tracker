// min-w-11/min-h-8.5 (44x34px) guarantee every badge - including the empty, contentless 0-streak
// state - renders at the same minimum footprint, rather than each variant auto-sizing to its own
// content independently and ending up visibly different sizes (a 1-digit number is narrower/
// shorter than a fixed 44x34px empty box). min- rather than a fixed size, so a future 2-digit
// streak (e.g. "24") or the 🔥 emoji prefix at streak 3+ can still grow past this floor instead of
// being clipped. inline-flex + items-center + justify-center centers short content within that
// guaranteed minimum box, matching docs/design/design.md's "Streak badge" spec.
//
// leading-none matters here in a way that's easy to miss: without it, the default line-height
// (1.5x the 15px font-size = 22.5px) makes any badge with digit text taller than min-h-8.5's 34px
// floor (22.5px line-height + 10px padding + 4px border = 36.5px) - but the empty 0-streak badge,
// having no text at all, has nothing to push it past the floor and stays at exactly 34px. That
// 2.5px difference is small but real: toggling a habit from 0 to 1 visibly grows/shifts the badge.
// leading-none (line-height: 1, i.e. 15px) drops every numbered badge's natural height to 29px -
// under the floor - so min-h-8.5 becomes the one thing governing height for every state, and they
// all render at exactly the same 34px, confirmed by measuring each variant's rendered
// getBoundingClientRect() directly in the browser rather than assuming from the CSS alone.
const sharedStyles =
  "text-[15px] font-bold py-1.25 px-3.25 rounded-[20px] border-2 inline-flex items-center justify-center min-w-11 min-h-8.5 leading-none";

export function Streak({ streakCount }: { streakCount: number }) {
  // aria-label on every variant, including 0 (which has no visible text at all) - without it,
  // the badge has no accessible name for a screen reader to announce, and nothing but its colour
  // to distinguish one state from another for a sighted user glancing at just the number either.
  const ariaLabel = `${streakCount} day streak count`;

  if (streakCount === 1) {
    return (
      <span
        aria-label={ariaLabel}
        className={`${sharedStyles} bg-streak-intensity-1-bg text-streak-intensity-1-text border-streak-intensity-1-border`}
      >
        {streakCount}
      </span>
    );
  }

  if (streakCount === 2) {
    return (
      <span
        aria-label={ariaLabel}
        className={`${sharedStyles} bg-streak-intensity-2-bg text-white border-streak-intensity-2-border`}
      >
        {streakCount}
      </span>
    );
  }

  if (streakCount >= 3) {
    return (
      <span
        aria-label={ariaLabel}
        className={`${sharedStyles} bg-brand text-white border-streak-intensity-3-border`}
      >
        🔥 {streakCount}
      </span>
    );
  }

  // The default is 0 streaks
  return (
    <span aria-label={ariaLabel} className={`${sharedStyles} bg-transparent border-line`}></span>
  );
}
