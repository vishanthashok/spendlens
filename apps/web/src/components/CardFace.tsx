import { cn } from "../lib/cn";
import { money, percent } from "../lib/format";
import type { Card } from "../lib/types";

const TONES: Record<string, string> = {
  olive: "from-[#2a3824] to-[#12180f]",
  navy: "from-[#1d2740] to-[#10141f]",
  clay: "from-[#3d2c26] to-[#1a1210]",
  pine: "from-[#184034] to-[#0e1c18]",
  ink: "from-[#2c2e26] to-[#12140e]",
  sand: "from-[#3c362a] to-[#1c1914]",
};

export function CardFace({ card, className }: { card: Card; className?: string }) {
  const used = percent(card.statementSpendCents, card.monthlyLimitCents);
  const hot = used >= 80;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-sm",
        TONES[card.tone] ?? TONES.ink,
        card.status === "frozen" && "opacity-80",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/60">{card.nickname}</div>
          <div className="mt-1 text-sm text-white/80">{card.department}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] tracking-[0.22em] text-white/70">{card.network.toUpperCase()}</div>
          {card.status === "frozen" ? (
            <div className="mt-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider">Frozen</div>
          ) : null}
        </div>
      </div>
      <div className="mt-8 flex items-end justify-between gap-3">
        <div>
          <div className="num text-lg tracking-[0.18em]">•••• {card.last4}</div>
          <div className="mt-2 text-sm">{card.holderName}</div>
        </div>
        <div className="text-right">
          <div className={cn("num text-sm", hot ? "text-amber" : "text-lime")}>{used}%</div>
          <div className="text-[11px] text-white/60">of {money(card.monthlyLimitCents)}</div>
        </div>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/15">
        <div
          className={cn("h-full rounded-full", hot ? "bg-amber" : "bg-lime")}
          style={{ width: `${Math.min(used, 100)}%` }}
        />
      </div>
    </div>
  );
}
