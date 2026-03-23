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
  const roleList = ["GSM", "Property Manager", "Housekeeping", "Maintenance"];
  const { counts, error } = await getDashboardCounts();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-blue-700">Bootcamp Project</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">DUP PM</h1>
          <p className="mt-3 max-w-3xl text-zinc-600">
            Property management app where team members are assigned to properties
            with role-based responsibilities.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Initial Roles</h2>
            <ul className="mt-4 space-y-2">
              {roleList.map((role) => (
                <li
                  key={role}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
                >
                  {role}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Data Model (Phase 1)</h2>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              <li>- Team Members</li>
              <li>- Properties</li>
              <li>- Property Sections</li>
              <li>- Assignments (Member + Property + Role)</li>
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Next Bootcamp Step</h2>
          <p className="mt-3 text-sm text-zinc-600">
            Create a Supabase project, then add your environment variables to{" "}
            <code>.env.local</code>:
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
            {`NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}
          </pre>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Live Supabase Snapshot</h2>

          {error ? (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {error}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Team Members</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.teamMembers}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Properties</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.properties}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Property Sections</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.sections}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Assignments</p>
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
