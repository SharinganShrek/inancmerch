import { HomeClient } from "@/components/HomeClient";
import { getHome } from "@/lib/campaign";
import { formatDeadline } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { products, deadline } = await getHome();
  return (
    <HomeClient
      initialProducts={products}
      deadlineLabel={formatDeadline(new Date(deadline))}
    />
  );
}
