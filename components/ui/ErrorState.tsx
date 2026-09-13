export function ErrorState({ message }: { message: string }) {
  return <p className="rounded-xl border border-[#9a4e54] bg-[#fff2f3] p-4 text-sm text-[#742f38] shadow-[4px_4px_0_#9a4e54]" role="alert">{message}</p>;
}
