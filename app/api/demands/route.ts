import { rpc } from "@/lib/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return rpc("my_demands");
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    items?: unknown;
    delivery?: unknown;
  } | null;
  return rpc("submit_demand", {
    p_items: body?.items ?? [],
    p_delivery: typeof body?.delivery === "string" ? body.delivery : null,
  });
}
