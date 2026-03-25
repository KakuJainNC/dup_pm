"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";

export function BackButton({ href }: { href: string }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 sm:px-10">
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-lg border border-[#b8cbbd] px-4 py-2 text-sm font-medium text-[#355e3b] hover:bg-[#355e3b] hover:text-white transition-colors"
      >
        <ArrowLeft size={16} weight="bold" />
        Back
      </Link>
    </div>
  );
}
