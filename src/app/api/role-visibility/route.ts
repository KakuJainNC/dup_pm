import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseRouteClient(request.headers.get("authorization"));
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const role = request.nextUrl.searchParams.get("role");
  if (!role) return NextResponse.json({ error: "role param required." }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("role_visibility")
    .select("nav_key, visible")
    .eq("role_name", role);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const body = (await request.json()) as {
    role_name?: string;
    visibility?: { nav_key: string; visible: boolean }[];
  };

  if (!body.role_name || !Array.isArray(body.visibility)) {
    return NextResponse.json({ error: "role_name and visibility are required." }, { status: 400 });
  }

  const roleName = body.role_name;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase as any)
    .from("role_visibility")
    .delete()
    .eq("role_name", roleName);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  const rows = body.visibility.map((v) => ({
    role_name: roleName,
    nav_key: v.nav_key,
    visible: v.visible,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase as any)
    .from("role_visibility")
    .insert(rows);

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
