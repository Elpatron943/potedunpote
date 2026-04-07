import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";

export const runtime = "nodejs";

/** Prépare une session d’upload anonyme (photos) avant création du lead. */
export async function POST() {
  return NextResponse.json({ sessionId: createId() });
}
