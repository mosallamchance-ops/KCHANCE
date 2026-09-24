"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";

/**
 * Compact back button + breadcrumb trail for secondary (non-tab) pages.
 * crumbs: array of { label, href? } between "الرئيسية" and the current page.
 * The current page itself is passed as `current` (plain text, no link).
 */
export default function BackHeader({ current, crumbs = [] }) {
  const router = useRouter();
  const trail = [{ label: "الرئيسية", href: "/" }].concat(crumbs);

  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={function () {
          router.back();
        }}
        aria-label="رجوع"
        className="w-8 h-8 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center flex-shrink-0"
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </button>

      <nav className="flex items-center gap-1 text-xs text-gray-400 overflow-x-auto whitespace-nowrap">
        {trail.map(function (c) {
          return (
            <span key={c.label} className="flex items-center gap-1">
              <Link href={c.href} className="hover:text-[var(--emerald)]">
                {c.label}
              </Link>
              <ChevronLeftIcon className="w-3 h-3" />
            </span>
          );
        })}
        <span className="text-gray-600 font-bold">{current}</span>
      </nav>
    </div>
  );
}
