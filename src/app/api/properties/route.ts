import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseRouteClient(request.headers.get("authorization"));
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("properties")
    .select("id, name, address, property_section_id, created_at, created_by, is_active, property_sections(id, section_name)")
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
    name?: string;
    address?: string;
    property_section_id?: string;
  };
  const name = body.name?.trim();
  const address = body.address?.trim() ?? null;
  const propertySectionId = body.property_section_id?.trim();

  if (!name || !propertySectionId) {
    return NextResponse.json(
      { error: "name and property_section_id are required." },
      { status: 400 },
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("properties").insert({
    name,
    address: address || null,
    property_section_id: propertySectionId,
    created_by: user?.email ?? null,
  });

  if (error) {
    const message = error.code === "23505"
      ? "A property with this name already exists."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
