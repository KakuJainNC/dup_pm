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
      const fullName: string | undefined =
        user.user_metadata?.full_name ??
        user.user_metadata?.name;
      const firstName = fullName
        ? fullName.split(" ")[0]
        : user.email
          ? user.email.split("@")[0]
          : null;
      setDisplayName(firstName ?? null);
    });
  }, []);

  return (
    <div>
      <section className="relative">
        {/* Background image */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.pexels.com/photos/7810361/pexels-photo-7810361.jpeg')" }} />
        {/* Darkening overlay */}
        <div className="absolute inset-0 bg-black/[0.52]" />

        {/* Welcome title */}
        <div className="relative flex flex-col items-center px-6 pb-[70px] pt-10 text-center">
          <p className="text-2xl font-bold text-white">
            Welcome to Property Management app
          </p>
        </div>

        {/* Profile picture — half inside band, half below */}
        <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 h-24 w-24 overflow-hidden rounded-full border-4 border-[#f8e7d1] shadow-lg">
          <img src="/default-user.jpg" alt="Profile" className="h-full w-full object-cover" />
        </div>
      </section>

      {/* Greeting — sits just below the profile image */}
      {displayName && (
        <p className="pt-14 pb-1 text-center text-lg font-medium text-[#355e3b]">
          Hello, {displayName}
        </p>
      )}
    </div>
  );
}
