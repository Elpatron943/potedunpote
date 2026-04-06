import { redirect } from "next/navigation";

/** Ancienne URL : les formules Pro sont détaillées sur /pro/forfaits */
export default function ArtisanAbonnementRedirectPage() {
  redirect("/pro/forfaits");
}
