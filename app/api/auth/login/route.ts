import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      email?: string;
      password?: string;
    } | null;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      const code = error?.code ?? "";
      const message =
        code === "email_not_confirmed"
          ? "E-posta henüz doğrulanmadı."
          : "E-posta veya şifre hatalı.";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      id: data.user.id,
      email: data.user.email,
    });
  } catch (err) {
    console.error("login failed", err);
    return NextResponse.json(
      { error: "Giriş şu an yapılamadı. Tekrar dene." },
      { status: 500 },
    );
  }
}
