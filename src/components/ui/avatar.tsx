import clsx from "clsx";

const PALETTE = ["#3a5cf5", "#10b3a3", "#eb6834", "#8b5cf6", "#e0457b", "#0ea5e9"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** Initials avatar with a colour derived from the name (stable across renders). */
export function Avatar({ name, size = "md", square = false }: { name: string; size?: "sm" | "md" | "lg"; square?: boolean }) {
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return (
    <span
      aria-hidden
      style={{ background: PALETTE[hash % PALETTE.length] }}
      className={clsx(
        "grid shrink-0 place-items-center font-semibold text-white",
        square ? "rounded-lg" : "rounded-full",
        size === "sm" ? "size-8 text-xs" : size === "md" ? "size-9 text-sm" : "size-11 text-base",
      )}
    >
      {initials(name)}
    </span>
  );
}
