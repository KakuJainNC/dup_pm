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
    .from("role_permissions")
    .select("entity, can_add, can_edit")
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
    permissions?: { entity: string; can_add: boolean; can_edit: string }[];
  };

  if (!body.role_name || !Array.isArray(body.permissions)) {
    return NextResponse.json({ error: "role_name and permissions are required." }, { status: 400 });
  }

  const roleName = body.role_name;

  // Delete existing permissions for this role, then re-insert fresh
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase as any)
    .from("role_permissions")
    .delete()
    .eq("role_name", roleName);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  const rows = body.permissions.map((p) => ({
    role_name: roleName,
    entity: p.entity,
    can_add: p.can_add,
    can_edit: p.can_edit,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase as any)
    .from("role_permissions")
    .insert(rows);

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
