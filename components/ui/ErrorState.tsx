export function ErrorState({ message }: { message: string }) {
  return <p className="rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100" role="alert">{message}</p>;
}
