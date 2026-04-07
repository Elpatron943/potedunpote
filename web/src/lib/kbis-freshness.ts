/**
 * Un extrait Kbis est considéré à jour si la date indiquée (ex. « À jour au … »)
 * est dans les **3 derniers mois calendaires** et n’est pas dans le futur.
 */
export function isKbisExtractWithinThreeMonths(isoDateYYYYMMDD: string, now = new Date()): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDateYYYYMMDD.trim());
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const extract = new Date(Date.UTC(y, mo, d));
  if (Number.isNaN(extract.getTime())) return false;

  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (extract.getTime() > todayUtc.getTime()) return false;

  const limit = new Date(todayUtc);
  limit.setUTCMonth(limit.getUTCMonth() - 3);
  return extract.getTime() >= limit.getTime();
}

export function formatIsoDateForUser(isoDateYYYYMMDD: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDateYYYYMMDD.trim());
  if (!m) return isoDateYYYYMMDD;
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))));
  } catch {
    return isoDateYYYYMMDD;
  }
}
