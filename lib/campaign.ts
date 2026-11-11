import { createClient } from "@/lib/supabase/server";
import type { CatalogProduct } from "@/lib/types";

export async function getHome() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("catalog");
  if (error) throw new Error(error.message);
  const products = (Array.isArray(data) ? data : []) as CatalogProduct[];
  return { products };
}
