import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ErrBody = { error: string; status: number };

function isErr(data: unknown): data is ErrBody {
  return Boolean(
    data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      "error" in data &&
      typeof (data as ErrBody).error === "string" &&
      "status" in data &&
      typeof (data as ErrBody).status === "number",
  );
}

export async function rpc(fn: string, args?: Record<string, unknown>) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(fn, error.message);
    return NextResponse.json(
      { error: "İşlem tamamlanamadı. Tekrar dene." },
      { status: 500 },
    );
  }
  if (isErr(data)) {
    return NextResponse.json({ error: data.error }, { status: data.status });
  }
  return NextResponse.json(data ?? { ok: true });
}
