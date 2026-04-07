"use server";

import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProContext } from "@/lib/pro-auth";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_BYTES = 8 * 1024 * 1024;

function imageMimeType(m: string): "image/jpeg" | "image/png" | "image/webp" | null {
  const x = (m || "").toLowerCase().split(";")[0].trim();
  if (x === "image/jpeg" || x === "image/png" || x === "image/webp") return x;
  return null;
}

export async function addVitrinePhotoAction(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "vitrine")) {
    return { ok: false, error: "Offre Pro Vitrine requise." };
  }

  const file = formData.get("photo");
  if (!file || typeof file === "string" || file.size === 0) {
    return { ok: false, error: "Ajoute une image." };
  }
  if (file.size > MAX_BYTES) return { ok: false, error: "Fichier trop volumineux (max. 8 Mo)." };
  const mime = imageMimeType(file.type || "");
  if (!mime) return { ok: false, error: "Format non pris en charge (JPG, PNG ou WebP)." };

  const captionRaw = String(formData.get("caption") ?? "").trim();
  const caption = captionRaw.length > 0 ? captionRaw.slice(0, 140) : null;

  const bucket = (process.env.SUPABASE_PROJECT_PHOTOS_BUCKET ?? "pro-projects").trim() || "pro-projects";
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const photoId = createId();
  const objectPath = `projects/${ctx.artisanProfile.siren}/${photoId}.${ext}`;

  const supabase = getSupabaseAdmin();
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, buf, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) return { ok: false, error: "Envoi impossible (bucket Storage à configurer)." };

  const now = new Date().toISOString();
  const { error: insErr } = await supabase.from("ProjectPhoto").insert({
    id: photoId,
    artisanId: ctx.artisanProfile.id,
    storageKey: objectPath,
    caption,
    createdAt: now,
  });
  if (insErr) {
    await supabase.storage.from(bucket).remove([objectPath]);
    return { ok: false, error: "Enregistrement impossible." };
  }

  revalidatePath("/pro/vitrine");
  revalidatePath(`/vitrine/${ctx.artisanProfile.siren}`);
  return { ok: true };
}

export async function removeVitrinePhotoAction(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "vitrine")) {
    return { ok: false, error: "Offre Pro Vitrine requise." };
  }

  const photoId = String(formData.get("photoId") ?? "").trim();
  if (!photoId) return { ok: false, error: "Photo invalide." };

  const supabase = getSupabaseAdmin();
  const { data: row, error: fetchErr } = await supabase
    .from("ProjectPhoto")
    .select("id, artisanId, storageKey")
    .eq("id", photoId)
    .maybeSingle();
  if (fetchErr || !row) return { ok: false, error: "Photo introuvable." };
  if ((row.artisanId as string) !== ctx.artisanProfile.id) return { ok: false, error: "Accès refusé." };

  const bucket = (process.env.SUPABASE_PROJECT_PHOTOS_BUCKET ?? "pro-projects").trim() || "pro-projects";
  const key = (row.storageKey as string) ?? "";
  if (key) await supabase.storage.from(bucket).remove([key]);
  await supabase.from("ProjectPhoto").delete().eq("id", photoId);

  revalidatePath("/pro/vitrine");
  revalidatePath(`/vitrine/${ctx.artisanProfile.siren}`);
  return { ok: true };
}

