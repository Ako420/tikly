export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-2xl border border-invalid/40 bg-invalid/10 px-4 py-3 text-body-sm font-semibold text-invalid"
    >
      {message}
    </p>
  );
}
