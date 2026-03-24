import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseRouteClient(request.headers.get("authorization"));
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rolesRes, membersRes] = await Promise.all([
    (supabase as any).from("roles").select("id, name, created_at, created_by").order("name", { ascending: true }),
    (supabase as any).from("team_members").select("role"),
  ]);

  if (rolesRes.error) return NextResponse.json({ error: rolesRes.error.message }, { status: 400 });
  if (membersRes.error) return NextResponse.json({ error: membersRes.error.message }, { status: 400 });

  const members = (membersRes.data ?? []) as { role: string | null }[];
  const roles = (rolesRes.data ?? []) as { id: string; name: string; created_at: string; created_by: string | null }[];

  const counts: Record<string, number> = {};
  for (const m of members) {
    if (m.role) counts[m.role] = (counts[m.role] ?? 0) + 1;
  }

  const data = roles.map((r) => ({ ...r, member_count: counts[r.name] ?? 0, created_at: r.created_at, created_by: r.created_by }));

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim().toLowerCase().replace(/\s+/g, "_");

  if (!name) return NextResponse.json({ error: "Role name is required." }, { status: 400 });

  const { data: { user } } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("roles").insert({ name, created_by: user?.email ?? null });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
