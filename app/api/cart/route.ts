import { NextResponse } from "next/server";
import { rpc } from "@/lib/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return rpc("cart");
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    productId?: string;
    size?: string;
    qty?: number;
    commit?: boolean;
  } | null;

  const qty = Math.floor(Number(body?.qty ?? 1));
  return rpc("add_line", {
    p_product_id: body?.productId ?? "",
    p_size: (body?.size ?? "").trim(),
    p_qty: qty,
    p_commit: Boolean(body?.commit),
  });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Satır id gerekli." }, { status: 400 });
  }
  return rpc("remove_line", { p_id: id });
}
