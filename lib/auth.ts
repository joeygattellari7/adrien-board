export const AUTH_COOKIE = "adrien_auth";

// A stable token derived from the configured password + a static salt, so
// middleware can verify the cookie without any server-side session storage.
// Uses Web Crypto (SubtleCrypto) instead of node:crypto so this also works
// in the Edge middleware runtime.
export async function expectedAuthToken(): Promise<string | null> {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return null;

  const data = new TextEncoder().encode(`adrien-dashboard:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
