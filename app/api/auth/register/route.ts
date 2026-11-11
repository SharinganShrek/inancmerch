import { NextResponse } from "next/server";
import { isRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cleanName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      email?: string;
      password?: string;
      role?: string;
      fullName?: string;
    } | null;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";
    const role = body?.role ?? "";
    const fullName = cleanName(body?.fullName ?? "");

    if (!isRole(role)) {
      return NextResponse.json({ error: "Önce kim olduğunu seç." }, { status: 400 });
    }
    if (fullName.length < 5 || !fullName.includes(" ")) {
      return NextResponse.json({ error: "İsim ve soyisim gir." }, { status: 400 });
    }
    if (fullName.length > 80) {
      return NextResponse.json({ error: "İsim çok uzun." }, { status: 400 });
    }
    if (!validEmail(email)) {
      return NextResponse.json({ error: "Geçerli bir e-posta gir." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Şifre en az 6 karakter olmalı." }, { status: 400 });
    }

    const origin = new URL(req.url).origin;
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/confirm`,
        data: { role, full_name: fullName },
      },
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

    if (data.session) {
      await supabase.rpc("save_profile", { p_role: role, p_full_name: fullName });
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
