export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl border border-invalid/40 bg-invalid-subtle px-4 py-3 text-sm font-medium text-invalid">
      {message}
    </p>
  );
}
