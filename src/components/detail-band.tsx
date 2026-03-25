"use client";

import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export function DetailBand({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div className="w-full bg-[#355e3b] px-10 py-4">
      <nav className="flex items-center gap-2 text-sm">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-white/40">/</span>}
            {item.href ? (
              <Link href={item.href} className="text-white/70 hover:text-white transition-colors">
                {item.label}
              </Link>
            ) : item.onClick ? (
              <button onClick={item.onClick} className="text-white/70 hover:text-white transition-colors">
                {item.label}
              </button>
            ) : (
              <span className="font-semibold text-white">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}
