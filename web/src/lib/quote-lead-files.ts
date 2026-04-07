import { createId } from "@paralleldrive/cuid2";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const QUOTE_LEADS_ROOT = "quote-leads";

export function quoteLeadsBucket(): string {
  const b =
    (process.env.SUPABASE_QUOTE_LEADS_BUCKET ?? process.env.SUPABASE_PROJECT_PHOTOS_BUCKET ?? "pro-projects").trim() ||
    "pro-projects";
  return b;
}

export function quoteSessionPrefix(sessionId: string): string {
  return `${QUOTE_LEADS_ROOT}/sessions/${sessionId}`;
}

export function quoteLeadPrefix(leadId: string): string {
  return `${QUOTE_LEADS_ROOT}/leads/${leadId}`;
}

const MAX_FILES_PER_SESSION = 6;
const MAX_BYTES = 4 * 1024 * 1024;

export function isValidQuoteSessionId(id: string): boolean {
  return /^[a-z0-9]{20,48}$/i.test(id);
}

function mimeFromFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export async function countSessionFiles(sessionId: string): Promise<number> {
  const bucket = quoteLeadsBucket();
  const supabase = getSupabaseAdmin();
  const prefix = quoteSessionPrefix(sessionId);
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100 });
  if (error) return 0;
  return (data ?? []).filter((x) => x.name && !x.name.endsWith("/")).length;
}

export async function uploadQuoteSessionFile(
  sessionId: string,
  file: File,
): Promise<{ storagePath: string; mimeType: string }> {
  const n = await countSessionFiles(sessionId);
  if (n >= MAX_FILES_PER_SESSION) {
    throw new Error("Trop de fichiers (max 6).");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Fichier trop volumineux (max 4 Mo).");
  }
  const mime = file.type || mimeFromFilename(file.name);
  if (!mime.startsWith("image/")) {
    throw new Error("Format non pris en charge (images uniquement).");
  }
  const bucket = quoteLeadsBucket();
  const supabase = getSupabaseAdmin();
  const ext = (() => {
    const m = mime;
    if (m.includes("png")) return "png";
    if (m.includes("webp")) return "webp";
    return "jpg";
  })();
  const name = `${createId()}.${ext}`;
  const path = `${quoteSessionPrefix(sessionId)}/${name}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, buf, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw error;
  return { storagePath: path, mimeType: mime };
}

export type FinalizedAttachment = { id: string; storagePath: string; mimeType: string };

/** Déplace les fichiers de session vers le dossier du lead et retourne les chemins finaux. */
export async function finalizeQuoteLeadSession(sessionId: string, leadId: string): Promise<FinalizedAttachment[]> {
  const bucket = quoteLeadsBucket();
  const supabase = getSupabaseAdmin();
  const prefix = quoteSessionPrefix(sessionId);
  const { data: listed, error: listErr } = await supabase.storage.from(bucket).list(prefix, { limit: 100 });
  if (listErr) throw listErr;
  const out: FinalizedAttachment[] = [];
  for (const item of listed ?? []) {
    if (!item.name) continue;
    const oldPath = `${prefix}/${item.name}`;
    const newId = createId();
    const ext = item.name.includes(".") ? item.name.slice(item.name.lastIndexOf(".")) : "";
    const newName = `${newId}${ext}`;
    const newPath = `${quoteLeadPrefix(leadId)}/${newName}`;
    const { error: mvErr } = await supabase.storage.from(bucket).move(oldPath, newPath);
    if (mvErr) {
      const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(oldPath);
      if (dlErr || !blob) continue;
      const buf = Buffer.from(await blob.arrayBuffer());
      const { error: upErr } = await supabase.storage.from(bucket).upload(newPath, buf, {
        contentType: mimeFromFilename(item.name),
        upsert: false,
      });
      if (upErr) continue;
      await supabase.storage.from(bucket).remove([oldPath]);
    }
    out.push({
      id: newId,
      storagePath: newPath,
      mimeType: mimeFromFilename(item.name),
    });
  }
  return out;
}

export function parseLeadIdFromStoragePath(path: string): string | null {
  const m = path.match(new RegExp(`^${QUOTE_LEADS_ROOT}/leads/([^/]+)/`));
  return m?.[1] ?? null;
}
