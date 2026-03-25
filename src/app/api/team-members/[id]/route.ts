import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/team-members/[id]">) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const { id } = await ctx.params;
  const body = (await req.json()) as { action: "link" | "unlink" };

  if (body.action === "unlink") {
    const { error } = await supabase
      .from("team_members")
      .update({ user_id: null } as never)
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "link") {
    // Get the team member's email
    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .select("email")
      .eq("id", id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    }
    if (!member.email) {
      return NextResponse.json({ error: "Team member has no email address." }, { status: 400 });
    }

    // Find a profile with the matching email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: profileError } = await (supabase as any)
      .from("profiles")
      .select("id")
      .eq("email", member.email)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "No app account found with this email. This person must sign up first." },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("team_members")
      .update({ user_id: (profile as { id: string }).id } as never)
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/team-members/[id]">) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const supabase = getSupabaseRouteClient(authHeader);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  // Decode user ID from the JWT payload directly (avoids auth server round-trip)
  let userId: string;
  try {
    const base64 = authHeader.replace("Bearer ", "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString()) as { sub?: string };
    if (!payload.sub) throw new Error("No sub");
    userId = payload.sub;
  } catch {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("app_role")
    .eq("id", userId)
    .single();

  if (profile?.app_role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
