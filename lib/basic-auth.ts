/**
 * HTTP Basic Authentication helpers (T501)
 *
 * Pure logic — used by Next.js middleware. Safe to unit-test without Edge runtime.
 *
 * @module lib/basic-auth
 */

export type BasicCredentials = {
  username: string;
  password: string;
};

/**
 * Parse `Authorization: Basic …` header into username/password.
 */
export function parseBasicAuthHeader(
  header: string | null | undefined
): BasicCredentials | null {
  if (!header) return null;
  const match = /^Basic\s+(.+)$/i.exec(header.trim());
  if (!match) return null;

  try {
    // Edge middleware has no Buffer — use atob (ASCII credentials OK for basic auth)
    const decoded = decodeBase64(match[1]);
    const colon = decoded.indexOf(":");
    if (colon < 0) return null;
    return {
      username: decoded.slice(0, colon),
      password: decoded.slice(colon + 1),
    };
  } catch {
    return null;
  }
}

/** Base64 decode that works in Node and Edge (middleware). */
function decodeBase64(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64").toString("utf8");
  }
  // Edge / browser
  const binary = atob(value);
  try {
    return decodeURIComponent(
      Array.from(binary, (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(
        ""
      )
    );
  } catch {
    return binary;
  }
}

/**
 * Constant-time-ish string compare for credentials (length-checked).
 * Not a crypto library; adequate for single-user app basic auth.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function credentialsMatch(
  parsed: BasicCredentials | null,
  expectedUser: string,
  expectedPass: string
): boolean {
  if (!parsed) return false;
  return (
    safeEqual(parsed.username, expectedUser) &&
    safeEqual(parsed.password, expectedPass)
  );
}

/**
 * Whether middleware should enforce Basic auth for this process env.
 * - Disabled when DISABLE_BASIC_AUTH=true|1
 * - Disabled when APP_USER or APP_PASSWORD missing/empty
 */
export function shouldEnforceBasicAuth(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): boolean {
  const disabled =
    env.DISABLE_BASIC_AUTH === "1" ||
    env.DISABLE_BASIC_AUTH === "true" ||
    env.DISABLE_BASIC_AUTH === "TRUE";
  if (disabled) return false;

  const user = env.APP_USER?.trim() ?? "";
  const pass = env.APP_PASSWORD ?? "";
  return user.length > 0 && pass.length > 0;
}

/**
 * Standard 401 challenge response for browsers and API clients.
 */
export function unauthorizedResponse(realm = "PuppetFlow"): Response {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"`,
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
