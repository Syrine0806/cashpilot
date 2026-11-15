import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-contrast shadow-sm hover:bg-brand-strong",
  secondary: "border border-border bg-surface text-text shadow-card hover:border-border-strong hover:bg-surface-muted",
  danger: "bg-negative text-white shadow-sm hover:opacity-90",
  ghost: "text-text-secondary hover:bg-surface-muted hover:text-text",
};
const SIZES: Record<Size, string> = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm" };

export function buttonClass(variant: ButtonVariant = "primary", size: Size = "md", className?: string) {
  return clsx(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
