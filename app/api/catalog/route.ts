import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatDeadline } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const [catalog, settings, claims] = await Promise.all([
    supabase.rpc("catalog"),
    supabase.from("settings").select("deadline").eq("id", 1).single(),
    supabase.auth.getClaims(),
  ]);

  if (catalog.error || settings.error || !settings.data) {
    return NextResponse.json(
      { error: "Katalog şu an okunamadı." },
      { status: 500 },
    );
  }

  const email = claims.data?.claims?.email;
  const sub = claims.data?.claims?.sub;
  const deadline = new Date(settings.data.deadline);

  return NextResponse.json({
    products: catalog.data,
    deadline: deadline.toISOString(),
    deadlineLabel: formatDeadline(deadline),
    user: sub
      ? { id: sub, email: typeof email === "string" ? email : "" }
      : null,
  });
}
