import type { InputHTMLAttributes, ReactNode } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export const fieldBoxClass = (hasError: boolean) =>
  `flex h-13 items-center gap-2 rounded-2xl border bg-surface-raised px-4 transition-colors focus-within:border-2 focus-within:px-[15px] ${
    hasError ? "border-invalid focus-within:border-invalid" : "border-border focus-within:border-accent-text"
  }`;

export function TextField({ name, label, error, hint, leading, trailing, id, className = "", ...inputProps }: TextFieldProps) {
  const inputId = id ?? name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={`flex w-full flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-body-sm font-semibold text-foreground-secondary">
        {label}
      </label>
      <div className={fieldBoxClass(Boolean(error))}>
        {leading}
        <input
          id={inputId}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-foreground-muted"
          {...inputProps}
        />
        {trailing}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-caption text-invalid">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-caption text-foreground-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
