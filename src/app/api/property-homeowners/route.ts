import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseRouteClient(request.headers.get("authorization"));
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const propertyId = request.nextUrl.searchParams.get("property_id");
  const homeownerId = request.nextUrl.searchParams.get("homeowner_id");
  const all = request.nextUrl.searchParams.get("all");

  if (!propertyId && !homeownerId && all !== "true") {
    return NextResponse.json({ error: "property_id or homeowner_id is required." }, { status: 400 });
  }

  if (all === "true") {
    const { data, error } = await supabase
      .from("property_homeowners")
      .select("id, homeowner_id, property_id, properties(name)");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flattened = (data ?? []).map((row: any) => ({
      id: row.id,
      homeowner_id: row.homeowner_id,
      property_id: row.property_id,
      name: row.properties?.name ?? null,
    }));
    return NextResponse.json({ data: flattened });
  }

  if (propertyId) {
    // Return homeowners assigned to this property
    const { data, error } = await supabase
      .from("property_homeowners")
      .select("id, homeowner_id, homeowners(full_name, email, phone, dial_code)")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Flatten for convenience
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flattened = (data ?? []).map((row: any) => ({
      id: row.id,
      homeowner_id: row.homeowner_id,
      full_name: row.homeowners?.full_name ?? null,
      email: row.homeowners?.email ?? null,
      phone: row.homeowners?.phone ?? null,
      dial_code: row.homeowners?.dial_code ?? null,
    }));

    return NextResponse.json({ data: flattened });
  }

  // homeownerId: return properties assigned to this homeowner
  const { data, error } = await supabase
    .from("property_homeowners")
    .select("id, property_id, properties(id, name, address, is_active, property_sections(section_name))")
    .eq("homeowner_id", homeownerId!)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flattened = (data ?? []).map((row: any) => ({
    id: row.id,
    property_id: row.property_id,
    name: row.properties?.name ?? null,
    address: row.properties?.address ?? null,
    is_active: row.properties?.is_active ?? null,
    section_name: row.properties?.property_sections?.section_name ?? null,
  }));

  return NextResponse.json({ data: flattened });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await request.json()) as { property_id?: string; homeowner_id?: string };
  if (!body.property_id || !body.homeowner_id) {
    return NextResponse.json({ error: "property_id and homeowner_id are required." }, { status: 400 });
  }

  const { error } = await supabase.from("property_homeowners").insert({
    property_id: body.property_id,
    homeowner_id: body.homeowner_id,
  });

  if (error) {
    const message = error.code === "23505"
      ? "This homeowner is already assigned to this property."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const { error } = await supabase.from("property_homeowners").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
