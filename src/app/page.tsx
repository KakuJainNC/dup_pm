import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PmControlCenter } from "@/components/pm-control-center";

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
    supabase
      .from("property_sections")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("property_assignments")
      .select("*", { count: "exact", head: true }),
  ]);

  const errors = [teamRes.error, propertyRes.error, sectionRes.error, assignmentRes.error].filter(Boolean);
  if (errors.length > 0) {
    return {
      counts: null,
      error:
        "Supabase tables are not ready yet. Run the SQL schema from the bootcamp step, then refresh.",
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

export default async function Home() {
  const { counts, error } = await getDashboardCounts();

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-[#1f3523]">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10 [&_.font-bold]:text-[#355e3b] [&_.font-semibold]:text-[#355e3b]">
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">DUP PM</h1>
          <p className="mt-3 max-w-3xl text-[#4c6b53]">
            Manage team members, properties, sections, and role-based assignments
            from one control center.
          </p>
        </section>

        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Live Supabase Snapshot</h2>

          {error ? (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {error}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3">
                <p className="text-xs text-[#6b8a72]">Team Members</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.teamMembers}</p>
              </div>
              <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3">
                <p className="text-xs text-[#6b8a72]">Properties</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.properties}</p>
              </div>
              <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3">
                <p className="text-xs text-[#6b8a72]">Property Sections</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.sections}</p>
              </div>
              <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3">
                <p className="text-xs text-[#6b8a72]">Assignments</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.assignments}</p>
              </div>
            </div>
          )}
        </section>

        <PmControlCenter />
      </main>
    </div>
  );
}
