import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = (url.searchParams.get("key") ?? "").trim();
  if (!key) return NextResponse.json({ error: "key requis" }, { status: 400 });

  const bucket = (process.env.SUPABASE_PROJECT_PHOTOS_BUCKET ?? "pro-projects").trim() || "pro-projects";
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).download(key);
  if (error || !data) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const buf = Buffer.from(await data.arrayBuffer());
  return new NextResponse(buf, {
    headers: {
      "Content-Type": data.type || "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

