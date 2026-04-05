import { NextResponse } from "next/server";

import { getBtpReferentiel, serializeBtpReferentiel } from "@/lib/btp-referentiel";

export const runtime = "nodejs";

/** Référentiel métiers + prestations (public, pour le widget DIY). */
export async function GET() {
  try {
    const ref = await getBtpReferentiel();
    return NextResponse.json(serializeBtpReferentiel(ref));
  } catch (e) {
    console.error("[referentiel-btp]", e);
    return NextResponse.json({ error: "Indisponible" }, { status: 503 });
  }
}
