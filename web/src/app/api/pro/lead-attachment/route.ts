import { NextResponse } from "next/server";

import { requireProContext } from "@/lib/pro-auth";
import { parseLeadIdFromStoragePath, quoteLeadsBucket } from "@/lib/quote-lead-files";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Sert une pièce jointe lead (auth pro + propriété SIREN). */
export async function GET(req: Request) {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const url = new URL(req.url);
  const key = (url.searchParams.get("key") ?? "").trim();
  if (!key || key.includes("..")) {
    return NextResponse.json({ error: "Clé invalide." }, { status: 400 });
  }

  const leadId = parseLeadIdFromStoragePath(key);
  if (!leadId) {
    return NextResponse.json({ error: "Clé invalide." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: lead } = await supabase.from("ProLead").select("id,siren").eq("id", leadId).maybeSingle();
  if (!lead || (lead.siren as string) !== ctx.artisanProfile.siren) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const bucket = quoteLeadsBucket();
  const { data, error } = await supabase.storage.from(bucket).download(key);
  if (error || !data) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  const buf = Buffer.from(await data.arrayBuffer());
  return new NextResponse(buf, {
    headers: {
      "Content-Type": data.type || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
