"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Counts = {
  homeowners: number;
  properties: number;
  sections: number;
  teamMembers: number;
};

export function DashboardScores() {
  const [counts, setCounts] = useState<Counts | null>(null);

  const fetchCounts = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const [hoRes, propRes, secRes, tmRes] = await Promise.all([
      fetch("/api/homeowners", { headers }),
      fetch("/api/properties", { headers }),
      fetch("/api/property-sections"),
      fetch("/api/team-members"),
    ]);

    const [hoPayload, propPayload, secPayload, tmPayload] = await Promise.all([
      hoRes.json() as Promise<{ data?: unknown[] }>,
      propRes.json() as Promise<{ data?: unknown[] }>,
      secRes.json() as Promise<{ data?: unknown[] }>,
      tmRes.json() as Promise<{ data?: unknown[] }>,
    ]);

    setCounts({
      homeowners: (hoPayload.data ?? []).length,
      properties: (propPayload.data ?? []).filter((p) => (p as { is_active?: boolean }).is_active).length,
      sections: (secPayload.data ?? []).length,
      teamMembers: (tmPayload.data ?? []).length,
    });
  }, []);

  useEffect(() => { void fetchCounts(); }, [fetchCounts]);

  const cards = [
    { label: "Homeowners", value: counts?.homeowners },
    { label: "Properties", value: counts?.properties },
    { label: "Sections", value: counts?.sections },
    { label: "Team Members", value: counts?.teamMembers },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {cards.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center justify-center rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <p className="text-3xl font-bold text-[#355e3b]">{value ?? "—"}</p>
          <p className="mt-1 text-sm text-black">{label}</p>
        </div>
      ))}
    </div>
  );
}
