import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{
    metier?: string;
    loc?: string;
    page?: string;
    rge?: string;
    act?: string | string[];
    stars?: string;
    entreprise?: string;
  }>;
};

/** Ancienne URL : tout redirige vers la homepage. */
export default async function RechercheRedirect({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.metier) q.set("metier", sp.metier);
  if (sp.loc) q.set("loc", sp.loc);
  if (sp.entreprise != null && String(sp.entreprise).trim() !== "") {
    q.set("entreprise", String(sp.entreprise).trim());
  }
  if (sp.page) q.set("page", sp.page);
  if (sp.rge) q.set("rge", sp.rge);
  if (sp.stars != null && sp.stars !== "") q.set("stars", sp.stars);
  const acts = sp.act;
  if (acts != null) {
    const list = Array.isArray(acts) ? acts : [acts];
    for (const a of list) {
      const v = String(a).trim();
      if (v) q.append("act", v);
    }
  }
  const suffix = q.toString();
  redirect(suffix ? `/?${suffix}` : "/");
}
