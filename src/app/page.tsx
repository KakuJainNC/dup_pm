import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DashboardCounts = {
  teamMembers: number;
  properties: number;
  sections: number;
  assignments: number;
};

async function getDashboardCounts() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return {
      counts: null,
      error:
        "Missing environment variables. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    };
  }

  const [teamRes, propertyRes, sectionRes, assignmentRes] = await Promise.all([
    supabase.from("team_members").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase.from("property_sections").select("*", { count: "exact", head: true }),
    supabase.from("property_assignments").select("*", { count: "exact", head: true }),
  ]);

  const errors = [teamRes.error, propertyRes.error, sectionRes.error, assignmentRes.error].filter(Boolean);
  if (errors.length > 0) {
    return {
      counts: null,
      error: "Supabase tables are not ready yet. Run the SQL schema from the bootcamp step, then refresh.",
    };
  }

  const counts: DashboardCounts = {
    teamMembers: teamRes.count ?? 0,
    properties: propertyRes.count ?? 0,
    sections: sectionRes.count ?? 0,
    assignments: assignmentRes.count ?? 0,
  };

  return { counts, error: null };
}

const navItems = [
  {
    label: "Team Members",
    href: "/team-members",
    description: "Add and manage your team",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 10-8 0 4 4 0 008 0zm6 0a3 3 0 10-6 0 3 3 0 006 0zM3 13a3 3 0 106 0 3 3 0 00-6 0z" />
      </svg>
    ),
  },
  {
    label: "Properties",
    href: "/properties",
    description: "View and create properties",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
        <path d="M240,208H224V136l2.34,2.34A8,8,0,0,0,237.66,127L139.31,28.68a16,16,0,0,0-22.62,0L18.34,127a8,8,0,0,0,11.32,11.31L32,136v72H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM48,120l80-80,80,80v88H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48Zm96,88H112V160h32Z" />
      </svg>
    ),
  },
  {
    label: "Property Sections",
    href: "/property-sections",
    description: "Organise properties into sections",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
];

export default async function Home() {
  const { counts, error } = await getDashboardCounts();

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Duplica logo" className="h-10 w-10 rounded-lg" />
            <h1 className="text-3xl font-bold tracking-tight text-[#355e3b]">DUP PM</h1>
          </div>
          <p className="mt-3 max-w-3xl text-black">
            Manage team members, properties, sections, and role-based assignments from one control center.
          </p>
        </section>

        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#355e3b]">Live Snapshot</h2>
          {error ? (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {error}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3">
                <p className="text-xs text-black">Team Members</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.teamMembers}</p>
              </div>
              <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3">
                <p className="text-xs text-black">Properties</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.properties}</p>
              </div>
              <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3">
                <p className="text-xs text-black">Property Sections</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.sections}</p>
              </div>
              <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3">
                <p className="text-xs text-black">Assignments</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.assignments}</p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#355e3b]">Navigate</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-3 rounded-xl border border-[#c9d9cc] bg-[#f3f8f4] p-6 text-center transition-colors hover:border-[#355e3b] hover:bg-[#e8f0ea]"
              >
                <span className="text-[#355e3b]">{item.icon}</span>
                <span className="font-semibold text-[#355e3b]">{item.label}</span>
                <span className="text-xs text-black">{item.description}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
