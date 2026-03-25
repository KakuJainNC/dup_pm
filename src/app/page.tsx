import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { HeroHeader } from "@/components/hero-header";
import { Footer } from "@/components/footer";
import { ShieldCheck, SquaresFour } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

type DashboardCounts = {
  homeowners: number;
  properties: number;
  sections: number;
  teamMembers: number;
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

  const [teamRes, propertyRes, homeownerRes, sectionRes] = await Promise.all([
    supabase.from("team_members").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("homeowners").select("*", { count: "exact", head: true }),
    supabase.from("property_sections").select("*", { count: "exact", head: true }),
  ]);

  const errors = [teamRes.error, propertyRes.error, homeownerRes.error, sectionRes.error].filter(Boolean);
  if (errors.length > 0) {
    return {
      counts: null,
      error: "Supabase tables are not ready yet. Run the SQL schema from the bootcamp step, then refresh.",
    };
  }

  const counts: DashboardCounts = {
    homeowners: homeownerRes.count ?? 0,
    properties: propertyRes.count ?? 0,
    sections: sectionRes.count ?? 0,
    teamMembers: teamRes.count ?? 0,
  };

  return { counts, error: null };
}

const navItems = [
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
    label: "Team",
    href: "/team-members",
    description: "Add and manage your team",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
        <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM143.31,41.34,152,56.9,125.09,81.24,112.85,88H96.14a16,16,0,0,0-13.88,8l-8.73,15.23L63.38,84.19,74.32,58.32a87.87,87.87,0,0,1,69-17ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Zm102.58,86.78,1.13-5.81a16.09,16.09,0,0,0-4-13.9,1.85,1.85,0,0,1-.14-.14L120,174.74,133.7,144l22.82,3.08,45.72,28.12A88.18,88.18,0,0,1,142.58,214.78Z" />
      </svg>
    ),
  },
  {
    label: "Notifications",
    href: "/notifications",
    description: "Manage notification recipients",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
        <path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.63-16h45.26A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z" />
      </svg>
    ),
  },
  {
    label: "Homeowners",
    href: "/homeowners",
    description: "Manage property homeowners",
    icon: <SquaresFour size={32} />,
  },
  {
    label: "Roles",
    href: "/roles",
    description: "View roles and member counts",
    icon: <ShieldCheck size={32} />,
  },
];

export default async function Home() {
  const { counts, error } = await getDashboardCounts();

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <HeroHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-10 pt-6 sm:px-10">

        {error ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
              <p className="text-3xl font-bold text-[#355e3b]">{counts?.homeowners}</p>
              <p className="mt-1 text-sm text-black">Homeowners</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
              <p className="text-3xl font-bold text-[#355e3b]">{counts?.properties}</p>
              <p className="mt-1 text-sm text-black">Properties</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
              <p className="text-3xl font-bold text-[#355e3b]">{counts?.sections}</p>
              <p className="mt-1 text-sm text-black">Sections</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
              <p className="text-3xl font-bold text-[#355e3b]">{counts?.teamMembers}</p>
              <p className="mt-1 text-sm text-black">Team Members</p>
            </div>
          </div>
        )}

        <div className="flex justify-around py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center gap-2 text-[#355e3b] transition-all duration-200 hover:scale-110 hover:opacity-100 opacity-70"
            >
              <span className="transition-transform duration-200 group-hover:drop-shadow-md">
                {item.icon}
              </span>
              <span className="text-xs font-semibold tracking-wide">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
