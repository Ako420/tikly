"use client";

import { useState, type ComponentProps } from "react";
import { TextField } from "./TextField";

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, "type" | "trailing"> & {
  showLabel: string;
  hideLabel: string;
};

export function PasswordField({ showLabel, hideLabel, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="-mr-2 flex size-9 items-center justify-center rounded-full text-foreground-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent-text"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible ? null : <path strokeLinecap="round" d="M4 4l16 16" />}
          </svg>
        </button>
      }
    />
  );
}
