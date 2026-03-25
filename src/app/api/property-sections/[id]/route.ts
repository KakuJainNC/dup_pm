import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/property-sections/[id]">) {
  const supabase = getSupabaseRouteClient(req.headers.get("authorization"));
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  const { id } = await ctx.params;
  const { data, error } = await supabase
    .from("property_sections")
    .select("id, section_name, created_at, created_by")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/property-sections/[id]">) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const { id } = await ctx.params;
  const body = (await req.json()) as { section_name?: string };
  const sectionName = body.section_name?.trim();

  if (!sectionName) {
    return NextResponse.json({ error: "section_name is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("property_sections")
    .update({ section_name: sectionName })
    .eq("id", id);

  if (error) {
    const message = error.code === "23505"
      ? "A section with this name already exists."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/property-sections/[id]">) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const { id } = await ctx.params;

  // Block delete if section has properties
  const { count } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("property_section_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: "Cannot delete a section that has properties. Remove all properties first." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("property_sections")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
