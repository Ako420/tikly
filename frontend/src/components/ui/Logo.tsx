type LogoProps = { tone?: "media" | "default"; className?: string };

export function Logo({ tone = "default", className = "" }: LogoProps) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className="flex size-8 -rotate-12 items-center justify-center rounded-logo bg-accent text-on-accent">
        <svg viewBox="0 0 512 512" className="size-5" aria-hidden="true">
          <path
            fill="currentColor"
            d="M277 181h-42v-42h42Zm0 96h-42v-42h42Zm0 96h-42v-42h42Zm192-160v-85q0-18-12.5-30.5T427 85H85q-17 0-29.5 12.5T43 128v85q17 0 29.5 12.5T85 256t-12.5 30.5T43 299v85q0 18 12.5 30.5T85 427h342q17 0 29.5-12.5T469 384v-85q-17 0-29.5-12.5T427 256t12.5-30.5T469 213"
          />
        </svg>
      </span>
      <span
        className={`text-2xl leading-tight font-extrabold tracking-[-0.6px] ${tone === "media" ? "text-on-media" : "text-foreground"}`}
      >
        tikly
      </span>
    </span>
  );
}
