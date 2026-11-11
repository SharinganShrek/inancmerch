import { NextResponse } from "next/server";
import { isRole } from "@/lib/roles";
import { rpc } from "@/lib/rpc";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: claims, error } = await supabase.auth.getClaims();
  const id = claims?.claims?.sub;
  if (error || !id) return NextResponse.json({ profile: null });

  const { data, error: readError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: "Profil okunamadı." }, { status: 500 });
  }

  return NextResponse.json({
    profile: data ? { role: data.role, fullName: data.full_name } : null,
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    role?: string;
    fullName?: string;
  } | null;
  const role = body?.role ?? "";
  const fullName = (body?.fullName ?? "").trim().replace(/\s+/g, " ");
  if (!isRole(role)) {
    return NextResponse.json({ error: "Önce kim olduğunu seç." }, { status: 400 });
  }
  return rpc("save_profile", { p_role: role, p_full_name: fullName });
}
