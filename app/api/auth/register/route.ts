import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      email?: string;
      password?: string;
    } | null;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";

    if (!validEmail(email)) {
      return NextResponse.json(
        { error: "Geçerli bir e-posta gir." },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Şifre en az 6 karakter olmalı." },
        { status: 400 },
      );
    }

    const origin = new URL(req.url).origin;
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/confirm` },
    });

    if (error) {
      const duplicate =
        error.code === "user_already_exists" ||
        error.message.toLowerCase().includes("already");
      return NextResponse.json(
        {
          error: duplicate
            ? "Bu e-posta zaten kayıtlı. Giriş yap."
            : "Kayıt şu an tamamlanamadı. Tekrar dene.",
        },
        { status: duplicate ? 409 : 400 },
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Kayıt şu an tamamlanamadı. Tekrar dene." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: data.user.id,
      email: data.user.email,
      confirmEmail: !data.session,
    });
  } catch (err) {
    console.error("register failed", err);
    return NextResponse.json(
      { error: "Kayıt şu an tamamlanamadı. Tekrar dene." },
      { status: 500 },
    );
  }
}
