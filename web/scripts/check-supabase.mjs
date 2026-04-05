/**
 * Vérifie URL + service_role + table User (HTTPS natif, évite undici/fetch sur certains Windows).
 * Usage : cd web puis  npm run check:supabase
 */
import https from "node:https";
import { URL } from "node:url";

const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!base || !key) {
  console.error("Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans web/.env");
  process.exit(1);
}

const u = new URL(base);
u.pathname = "/rest/v1/User";
u.search = "select=id&limit=1";

await new Promise((resolve, reject) => {
  const req = https.request(
    u,
    {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    },
    (res) => {
      let body = "";
      res.on("data", (c) => {
        body += c;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
          return;
        }
        reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
      });
    },
  );
  req.on("error", reject);
  req.end();
});

console.log("OK — connexion Supabase OK (table User accessible).");
