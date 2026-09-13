import type { SourceStatus } from "@/lib/source";

export function SectionBadge({ status }: { status: SourceStatus }) {
  return <span className="inline-flex rounded-full border border-[#e5ff4d]/30 bg-[#e5ff4d]/10 px-3 py-1 text-xs font-medium text-[#e5ff4d]">{status}</span>;
}
