import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseRouteClient(request.headers.get("authorization"));
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("team_members")
    .select("id, full_name, email")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const body = (await request.json()) as { full_name?: string; email?: string; dial_code?: string; phone?: string; role?: string };
  const fullName = body.full_name?.trim();
  const email = body.email?.trim() ?? null;
  const dialCode = body.dial_code?.trim() ?? null;
  const phone = body.phone?.trim() ?? null;
  const role = body.role?.trim() ?? null;

  if (!fullName) {
    return NextResponse.json({ error: "full_name is required." }, { status: 400 });
  }

  const { error } = await supabase.from("team_members").insert({
    full_name: fullName,
    email: email || null,
    dial_code: dialCode,
    phone,
    role,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
