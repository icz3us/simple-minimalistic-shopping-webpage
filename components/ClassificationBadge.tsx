import type { Classification } from "@/lib/supabase/types";

const badgeStyles: Record<Classification, string> = {
  Common: "border-white/20 bg-white/5 text-white/70",
  Uncommon: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  Rare: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  Legendary: "border-amber-300/40 bg-amber-400/10 text-amber-100",
};

export default function ClassificationBadge({ value }: { value: Classification }) {
  return (
    <span className={`inline-flex items-center rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${badgeStyles[value]}`}>
      {value}
    </span>
  );
}
