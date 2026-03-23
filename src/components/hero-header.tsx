"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function HeroHeader() {
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      const name =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email ??
        null;
      setDisplayName(name);
    });
  }, []);

  return (
    <section className="relative overflow-hidden rounded-2xl shadow-sm">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2d5233] via-[#355e3b] to-[#4a7c52]" />

      {/* Content */}
      <div className="relative flex flex-col items-center px-6 py-10 text-center">
        {/* Circular profile picture */}
        <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white/40 shadow-lg">
          <img
            src="/default-user.jpg"
            alt="Profile"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Greeting */}
        {displayName && (
          <p className="mt-4 text-lg font-medium text-white/90">
            Hello, {displayName}
          </p>
        )}

        {/* Tagline */}
        <p className="mt-1 text-2xl font-bold text-white">
          Welcome to Property Management app
        </p>
      </div>
    </section>
  );
}
