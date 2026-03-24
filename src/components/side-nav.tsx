"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, ShieldCheck } from "@phosphor-icons/react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { NAV_ITEMS, type NavItemKey } from "@/lib/nav-config";

const STORAGE_KEY = "pm_member_images";

const NAV_ICONS: Record<NavItemKey, React.ReactNode> = {
  home: <ArrowUpRight size={20} />,
  properties: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
      <path d="M240,208H224V136l2.34,2.34A8,8,0,0,0,237.66,127L139.31,28.68a16,16,0,0,0-22.62,0L18.34,127a8,8,0,0,0,11.32,11.31L32,136v72H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM48,120l80-80,80,80v88H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48Zm96,88H112V160h32Z" />
    </svg>
  ),
  team: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM143.31,41.34,152,56.9,125.09,81.24,112.85,88H96.14a16,16,0,0,0-13.88,8l-8.73,15.23L63.38,84.19,74.32,58.32a87.87,87.87,0,0,1,69-17ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Zm102.58,86.78,1.13-5.81a16.09,16.09,0,0,0-4-13.9,1.85,1.85,0,0,1-.14-.14L120,174.74,133.7,144l22.82,3.08,45.72,28.12A88.18,88.18,0,0,1,142.58,214.78Z" />
    </svg>
  ),
  notifications: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
      <path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.63-16h45.26A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z" />
    </svg>
  ),
  roles: <ShieldCheck size={20} />,
};

export function SideNav() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const loadProfile = async (email: string | undefined) => {
      if (!email) return;
      setUserEmail(email);
      // Fetch full_name from profiles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("profiles")
        .select("full_name")
        .eq("email", email)
        .single();
      setUserName(data?.full_name ?? null);
      // Load image from localStorage
      try {
        const map = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, string>;
        setUserImage(map[email] ?? null);
      } catch { /* ignore */ }
    };

    supabase.auth.getSession().then(({ data }) => {
      void loadProfile(data.session?.user?.email);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      void loadProfile(session?.user?.email);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-full w-52 border-r border-[#c9d9cc] bg-[#fcfefd] flex flex-col">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-[#c9d9cc]">
        <img src="/logo.png" alt="PM App" className="h-7 w-7 rounded-md" />
        <span className="font-bold text-[#355e3b]">PM App</span>
      </div>

      <nav className="flex flex-col gap-1 p-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#355e3b] text-white"
                  : "text-black hover:bg-[#e8f0ea] hover:text-[#355e3b]"
              }`}
            >
              {NAV_ICONS[item.key]}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#c9d9cc] px-2 py-3">
        {userEmail ? (
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-[#e8f0ea] transition-colors group"
          >
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[#c9d9cc]">
              {userImage ? (
                <img src={userImage} alt={userName ?? userEmail} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#355e3b] text-xs font-bold text-white">
                  {(userName ?? userEmail)[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-black group-hover:text-[#355e3b]">
                {userName ?? userEmail}
              </p>
              {userName && (
                <p className="truncate text-[10px] text-black/40">{userEmail}</p>
              )}
            </div>
          </Link>
        ) : (
          <p className="px-2 text-xs text-black/50">Not signed in</p>
        )}
      </div>
    </aside>
  );
}
