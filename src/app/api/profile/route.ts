import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const [profileRes, memberRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("profiles")
      .select("id, email, full_name, app_role")
      .eq("id", user.id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("team_members")
      .select("id, full_name, role, phone, dial_code")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 400 });

  return NextResponse.json({
    data: {
      ...profileRes.data,
      team_member_id: memberRes.data?.id ?? null,
      team_role: memberRes.data?.role ?? null,
      phone: memberRes.data?.phone ?? null,
      dial_code: memberRes.data?.dial_code ?? null,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await request.json()) as { full_name?: string };
  const fullName = body.full_name?.trim() ?? null;

  // Update profiles.full_name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await (supabase as any)
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  // Also update the linked team_member row if one exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("team_members")
    .update({ full_name: fullName })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
