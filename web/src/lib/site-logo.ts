import fs from "fs";
import path from "path";

const LOGO_PARTS = ["public", "brand", "logo.png"] as const;

export const SITE_LOGO_PUBLIC_PATH = "/brand/logo.png" as const;

export function siteLogoExists(): boolean {
  try {
    const full = path.join(process.cwd(), ...LOGO_PARTS);
    return fs.existsSync(full);
  } catch {
    return false;
  }
}
