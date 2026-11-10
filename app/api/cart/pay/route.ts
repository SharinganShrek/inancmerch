import { NextResponse } from "next/server";
import { rpc } from "@/lib/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ error: "Satır id gerekli." }, { status: 400 });
  }
  return rpc("pay_line", { p_id: body.id });
}
