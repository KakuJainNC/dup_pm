import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseRouteClient(request.headers.get("authorization"));
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const propertyId = request.nextUrl.searchParams.get("property_id");
  if (!propertyId) return NextResponse.json({ error: "property_id is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("property_comments")
    .select("id, content, created_by_email, created_by_name, created_at")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true });

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

  const body = (await request.json()) as { property_id?: string; content?: string };
  const content = body.content?.trim();
  const propertyId = body.property_id?.trim();

  if (!content || !propertyId) {
    return NextResponse.json({ error: "property_id and content are required." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { error } = await supabase.from("property_comments").insert({
    property_id: propertyId,
    content,
    created_by_email: user.email ?? "",
    created_by_name: profile?.full_name ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
