import type { SourceStatus } from "@/lib/source";

export function SectionBadge({ status }: { status: SourceStatus }) {
  return <span className="inline-flex rounded-full border border-[#193a68] bg-[#ccecff] px-3 py-1 text-xs font-bold text-[#183153]">{status}</span>;
}
