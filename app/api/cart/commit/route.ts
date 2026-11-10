import { rpc } from "@/lib/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { ids?: string[] } | null;
  const ids = body?.ids?.filter(Boolean) ?? [];
  return rpc("commit_lines", { p_ids: ids.length ? ids : null });
}
