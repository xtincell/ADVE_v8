import { redirect } from "next/navigation";

// Alias EN → la page canonique française (cahier §4.1 : /pricing + /tarifs).
export default async function PricingAlias({ searchParams }: { searchParams: Promise<{ zone?: string }> }) {
  const { zone } = await searchParams;
  redirect(zone ? `/tarifs?zone=${zone}` : "/tarifs");
}
