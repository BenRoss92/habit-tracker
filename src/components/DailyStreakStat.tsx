export function DailyStreakStat({ dailyStreakCount }: { dailyStreakCount: number }) {
  return (
    <div className="border-line border-[1.5px] bg-white px-4 py-[13.6px] rounded-xl w-full flex-col">
      <h3 className="text-[11px] uppercase text-action-icon font-bold tracking-[0.06em] mb-1 min-h-8.5 sm:min-h-0">
        Daily streak
      </h3>
      <p className="text-[22px] font-bold leading-[1.2] text-heading">{dailyStreakCount}</p>
      <p className="text-xs text-muted mt-0.75 leading-[1.4] font-medium line-clamp-2">
        days active
      </p>
    </div>
  );
}
