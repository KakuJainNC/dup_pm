import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/properties/[id]">) {
  const supabase = getSupabaseRouteClient(req.headers.get("authorization"));
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  const { id } = await ctx.params;
  const { data, error } = await supabase
    .from("properties")
    .select("id, name, address, property_section_id, created_at, created_by, is_active, house_phone, main_door_code, garage_code, wifi_password, property_manager_member_id, maintenance_member_id, housekeeping_member_id, property_sections(id, section_name)")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/properties/[id]">) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    address?: string | null;
    is_active?: boolean;
    house_phone?: string | null;
    main_door_code?: string | null;
    garage_code?: string | null;
    wifi_password?: string | null;
    property_manager_member_id?: string | null;
    maintenance_member_id?: string | null;
    housekeeping_member_id?: string | null;
  };

  // Toggle-only update (is_active without name)
  if (body.is_active !== undefined && body.name === undefined) {
    const { error } = await supabase
      .from("properties")
      .update({ is_active: body.is_active })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("properties")
    .update({
      name,
      address: body.address ?? null,
      house_phone: body.house_phone ?? null,
      main_door_code: body.main_door_code ?? null,
      garage_code: body.garage_code ?? null,
      wifi_password: body.wifi_password ?? null,
      property_manager_member_id: body.property_manager_member_id ?? null,
      maintenance_member_id: body.maintenance_member_id ?? null,
      housekeeping_member_id: body.housekeeping_member_id ?? null,
    })
    .eq("id", id);

  if (error) {
    const message = error.code === "23505"
      ? "A property with this name already exists."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/properties/[id]">) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const { id } = await ctx.params;

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
