import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const [catalog, claims] = await Promise.all([
    supabase.rpc("catalog"),
    supabase.auth.getClaims(),
  ]);

  if (catalog.error) {
    return NextResponse.json(
      { error: "Katalog şu an okunamadı." },
      { status: 500 },
    );
  }

  const email = claims.data?.claims?.email;
  const sub = claims.data?.claims?.sub;

  return NextResponse.json({
    products: catalog.data,
    user: sub
      ? { id: sub, email: typeof email === "string" ? email : "" }
      : null,
  });
}
