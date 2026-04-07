import { NextResponse } from "next/server";

import { isValidQuoteSessionId, uploadQuoteSessionFile } from "@/lib/quote-lead-files";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const fd = await req.formData();
  const sessionId = String(fd.get("sessionId") ?? "").trim();
  if (!isValidQuoteSessionId(sessionId)) {
    return NextResponse.json({ ok: false, error: "Session invalide." }, { status: 400 });
  }
  const file = fd.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Fichier requis." }, { status: 400 });
  }
  try {
    const { storagePath, mimeType } = await uploadQuoteSessionFile(sessionId, file);
    return NextResponse.json({ ok: true, storagePath, mimeType });
  } catch (e) {
    const msg =
      e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
        ? String((e as { message: string }).message)
        : e instanceof Error
          ? e.message
          : "Upload impossible.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
