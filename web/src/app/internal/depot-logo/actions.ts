"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 2 * 1024 * 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type LogoDepotState = { ok: boolean; error?: string };

function uploadAllowed(secret: FormDataEntryValue | null): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const expected = process.env.LOGO_DEPOT_SECRET;
  if (!expected || expected.length < 8) return false;
  return typeof secret === "string" && secret === expected;
}

export async function saveSiteLogo(
  _prev: LogoDepotState,
  formData: FormData,
): Promise<LogoDepotState> {
  const secret = formData.get("secret");
  if (!uploadAllowed(secret)) {
    return {
      ok: false,
      error:
        "Dépôt refusé : en production, définissez LOGO_DEPOT_SECRET (≥ 8 caractères) dans l’environnement et saisissez la même valeur ci-dessous, ou utilisez cette page en local (npm run dev).",
    };
  }

  const file = formData.get("logo");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Choisis un fichier PNG." };
  }
  if (file.type !== "image/png") {
    return { ok: false, error: "Le fichier doit être au format PNG." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (max. 2 Mo)." };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length < PNG_MAGIC.length || !buf.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    return { ok: false, error: "Le contenu ne ressemble pas à un PNG valide." };
  }

  const dir = path.join(process.cwd(), "public", "brand");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "logo.png"), buf);

  revalidatePath("/", "layout");

  return { ok: true };
}
