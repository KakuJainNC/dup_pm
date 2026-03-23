import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseRouteClient(request.headers.get("authorization"));
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rolesRes, membersRes] = await Promise.all([
    (supabase as any).from("roles").select("id, name").order("name", { ascending: true }),
    supabase.from("team_members").select("role"),
  ]);

  if (rolesRes.error) return NextResponse.json({ error: rolesRes.error.message }, { status: 400 });
  if (membersRes.error) return NextResponse.json({ error: membersRes.error.message }, { status: 400 });

  const counts = (membersRes.data ?? []).reduce<Record<string, number>>((acc, m) => {
    if (m.role) acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  const data = (rolesRes.data ?? []).map((r) => ({ ...r, member_count: counts[r.name] ?? 0 }));

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("roles").insert({ name });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
