import clsx from "clsx";
import { useId } from "react";

/** CashPilot mark: a flight path climbing over a runway line. */
export function Logo({ compact = false, tone = "default" }: { compact?: boolean; tone?: "default" | "light" }) {
  const gradientId = useId(); // unique per instance (several logos can share a page)
  return (
    <span className={clsx("inline-flex items-center gap-2.5 font-semibold tracking-tight", tone === "light" ? "text-white" : "text-text")}>
      <svg aria-hidden viewBox="0 0 32 32" className="size-8">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#3a5cf5" />
            <stop offset="1" stopColor="#10b3a3" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
        <path d="M7 23h18" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2.5 3" />
        <path d="M7 19.5c4.5 0 6.5-1.5 9-5s5-5 9-5.5" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="25" cy="9" r="2.2" fill="#fff" />
      </svg>
      {!compact && <span className="text-[17px]">CashPilot</span>}
    </span>
  );
}
