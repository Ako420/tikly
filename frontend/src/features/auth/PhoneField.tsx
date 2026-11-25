import { TextField } from "@/components/ui/TextField";
import type { Dictionary } from "@/i18n/dictionaries";

type PhoneFieldProps = { t: Dictionary; defaultValue?: string; error?: string };

export function PhoneField({ t, defaultValue, error }: PhoneFieldProps) {
  return (
    <TextField
      name="phone"
      type="tel"
      inputMode="tel"
      label={t.fields.phone}
      placeholder={t.fields.phonePlaceholder}
      autoComplete="tel-national"
      required
      defaultValue={defaultValue}
      error={error}
      leading={
        <span className="-ml-1 flex h-7 items-center border-r border-border pr-2 text-body font-semibold text-foreground-secondary">
          +237
        </span>
      }
    />
  );
}
