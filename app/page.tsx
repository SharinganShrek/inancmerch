import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HomeClient } from "@/components/HomeClient";
import { getHome } from "@/lib/campaign";
import { NEW_DEMAND_COOKIE } from "@/lib/new-demand";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const jar = await cookies();
  if (jar.get(NEW_DEMAND_COOKIE)?.value !== "1") {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("my_demands");
    if (!error && Array.isArray(data) && data.length > 0) {
      redirect("/talepler");
    }
  }

  const { products } = await getHome();
  return <HomeClient initialProducts={products} />;
}
