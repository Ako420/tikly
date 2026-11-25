import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" };

const variants = {
  primary: "bg-action text-on-action hover:opacity-90",
  outline: "border-[1.5px] border-outline bg-transparent text-foreground hover:bg-surface",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`flex h-14 w-full shrink-0 items-center justify-center gap-3 rounded-2xl px-6 text-subtitle font-semibold transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
