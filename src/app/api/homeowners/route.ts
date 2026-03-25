import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseRouteClient(request.headers.get("authorization"));
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const { data, error } = await supabase
    .from("homeowners")
    .select("id, full_name, email, phone, dial_code, notes, created_at, created_by")
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await request.json()) as {
    full_name?: string;
    email?: string;
    phone?: string;
    dial_code?: string;
    notes?: string;
  };

  const fullName = body.full_name?.trim();
  if (!fullName) return NextResponse.json({ error: "full_name is required." }, { status: 400 });

  const { error } = await supabase.from("homeowners").insert({
    full_name: fullName,
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    dial_code: body.dial_code?.trim() || null,
    notes: body.notes?.trim() || null,
    created_by: user.email ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
