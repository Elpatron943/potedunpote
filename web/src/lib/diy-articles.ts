import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type DiyArticleListItem = {
  slug: string;
  title: string;
  excerpt: string | null;
  updatedAt: string;
  metierId: string;
  prestationId: string;
};

export type DiyArticleDetail = DiyArticleListItem & {
  bodyMarkdown: string;
};

export async function listDiyArticles(): Promise<DiyArticleListItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("DiyKnowledgeArticle")
    .select("slug,title,excerpt,updatedAt,metierId,prestationId")
    .order("updatedAt", { ascending: false });

  if (error) {
    console.error("[diy-articles]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    slug: row.slug as string,
    title: row.title as string,
    excerpt: (row.excerpt as string | null) ?? null,
    updatedAt: row.updatedAt as string,
    metierId: row.metierId as string,
    prestationId: row.prestationId as string,
  }));
}

export async function getDiyArticleBySlug(slug: string): Promise<DiyArticleDetail | null> {
  const t = slug.trim();
  if (!t) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("DiyKnowledgeArticle")
    .select("slug,title,excerpt,bodyMarkdown,updatedAt,metierId,prestationId")
    .eq("slug", t)
    .maybeSingle();

  if (error || !data) return null;

  return {
    slug: data.slug as string,
    title: data.title as string,
    excerpt: (data.excerpt as string | null) ?? null,
    bodyMarkdown: data.bodyMarkdown as string,
    updatedAt: data.updatedAt as string,
    metierId: data.metierId as string,
    prestationId: data.prestationId as string,
  };
}
