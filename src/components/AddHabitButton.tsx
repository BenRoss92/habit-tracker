import { IconPlus } from "@tabler/icons-react";
import { Dispatch, SetStateAction } from "react";
import { ActiveAction } from "@/lib/types";

export function AddHabitButton({
  activeAction,
  setActiveAction,
}: {
  activeAction: ActiveAction;
  setActiveAction: Dispatch<SetStateAction<ActiveAction>>;
}) {
  return (
    <button
      disabled={activeAction.type !== "none"}
      onClick={() => setActiveAction({ type: "adding" })}
      aria-label="Add habit"
      // Icon-only below sm:, the original "+ Add habit" pill from sm: up - the card is already at
      // (or very near) its own 600px max-width right around that breakpoint, so desktop keeps
      // plenty of room for the original design untouched; only narrow/mobile widths get the
      // compact treatment. h-[33px]/w-[33px] (mobile only) matches the date heading's own
      // line-height (22px bold Nunito computes to a 33px line box) so the button's height still
      // visually aligns with the date text next to it. rounded-[10px] (not the original
      // rounded-[20px]) deliberately keeps this a rounded square rather than a circle - a 20px
      // radius on a 33px box exceeds half its side length, which always renders as a full circle
      // regardless of the literal radius value; 10px (reused from AddHabitForm's own input
      // radius, rather than inventing a new value) leaves visibly flat corners instead. The
      // desktop sm: overrides restore the exact original size/padding/radius/gap.
      className="flex items-center justify-center gap-1.5 border-2 border-brand
      bg-white h-8.25 w-8.25 rounded-[10px] text-brand cursor-pointer
      disabled:opacity-40 disabled:cursor-not-allowed
      sm:h-auto sm:w-auto sm:rounded-[20px] sm:py-2.25 sm:px-5 sm:text-sm sm:font-bold"
    >
      <IconPlus size={16} />
      <span className="hidden whitespace-nowrap sm:inline">Add habit</span>
    </button>
  );
}
