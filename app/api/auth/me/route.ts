import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    if (error || !sub) return NextResponse.json({ user: null });
    const email = data.claims.email;
    return NextResponse.json({
      user: {
        id: sub,
        email: typeof email === "string" ? email : "",
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
