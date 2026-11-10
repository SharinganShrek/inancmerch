import { createClient } from "@/lib/supabase/server";
import type { CatalogProduct } from "@/lib/types";

export async function getHome() {
  const supabase = await createClient();
  const [catalog, settings] = await Promise.all([
    supabase.rpc("catalog"),
    supabase.from("settings").select("deadline").eq("id", 1).single(),
  ]);

  if (catalog.error) throw new Error(catalog.error.message);
  if (settings.error || !settings.data) throw new Error(settings.error?.message ?? "Ayar yok.");

  return {
    products: (catalog.data ?? []) as CatalogProduct[],
    deadline: settings.data.deadline as string,
  };
}
