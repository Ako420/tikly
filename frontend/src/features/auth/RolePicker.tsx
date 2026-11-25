import type { Dictionary } from "@/i18n/dictionaries";
import { WEB_SIGNUP_ROLES, type WebSignupRole } from "./types";

const roleIcons: Record<WebSignupRole, string> = {
  organizer: "M7 3v3m10-3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Zm3 8h2m3 0h2m-7 3.5h2",
  provider: "M4 9.5 5.5 4h13L20 9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M4 9.5V20h16V9.5M9.5 20v-5h5v5",
  exhibitor: "M4.5 4h6v6h-6zm9 0h6v6h-6zm-9 9.5h6v6h-6zm9 0h6v6h-6z",
};

type RolePickerProps = { t: Dictionary; defaultValue?: string; error?: string };

export function RolePicker({ t, defaultValue, error }: RolePickerProps) {
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? "role-error" : undefined}>
      <legend className="mb-1.5 text-body-sm font-semibold text-foreground-secondary">{t.signup.roleLabel}</legend>
      {WEB_SIGNUP_ROLES.map((role) => (
        <label
          key={role}
          className={`group flex cursor-pointer items-start gap-3 rounded-2xl border bg-surface-raised p-3.5 transition-colors hover:bg-surface has-checked:border-2 has-checked:border-accent-text has-checked:bg-surface has-checked:p-[13px] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-text ${
            error ? "border-invalid" : "border-border"
          }`}
        >
          <input type="radio" name="role" value={role} defaultChecked={defaultValue === role} className="peer sr-only" />
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-accent-text group-has-checked:bg-accent group-has-checked:text-on-accent">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d={roleIcons[role]} />
            </svg>
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-subtitle font-bold text-foreground">{t.signup.roles[role].title}</span>
            <span className="text-caption text-foreground-secondary">{t.signup.roles[role].description}</span>
          </span>
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border group-has-checked:border-accent-text">
            <span className="size-2.5 scale-0 rounded-full bg-accent-text transition-transform group-has-checked:scale-100" />
          </span>
        </label>
      ))}
      {error ? (
        <p id="role-error" className="text-caption text-invalid">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
