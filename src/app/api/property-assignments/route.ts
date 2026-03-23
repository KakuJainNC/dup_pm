import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";
import type { Role } from "@/lib/supabase/types";

const validRoles: Role[] = ["gsm", "property_manager", "housekeeping", "maintenance"];

export async function GET(request: NextRequest) {
  const supabase = getSupabaseRouteClient(request.headers.get("authorization"));
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("property_assignments")
    .select("id, team_member_id, property_id, role")
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

  const body = (await request.json()) as {
    team_member_id?: string;
    property_id?: string;
    role?: Role;
  };
  const teamMemberId = body.team_member_id?.trim();
  const propertyId = body.property_id?.trim();
  const role = body.role;

  if (!teamMemberId || !propertyId || !role) {
    return NextResponse.json(
      { error: "team_member_id, property_id and role are required." },
      { status: 400 },
    );
  }

  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role value." }, { status: 400 });
  }

  const { error } = await supabase.from("property_assignments").insert({
    team_member_id: teamMemberId,
    property_id: propertyId,
    role,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
