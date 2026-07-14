/**
 * Edge middleware — HTTP Basic Auth gate (Phase 5 / T501)
 *
 * Protects all app and API routes when APP_USER + APP_PASSWORD are set.
 * Set DISABLE_BASIC_AUTH=true to bypass (local debugging only).
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  credentialsMatch,
  parseBasicAuthHeader,
  shouldEnforceBasicAuth,
  unauthorizedResponse,
} from "@/lib/basic-auth";

export function middleware(request: NextRequest) {
  if (!shouldEnforceBasicAuth(process.env)) {
    return NextResponse.next();
  }

  const expectedUser = process.env.APP_USER ?? "";
  const expectedPass = process.env.APP_PASSWORD ?? "";

  const header = request.headers.get("authorization");
  const parsed = parseBasicAuthHeader(header);

  if (!credentialsMatch(parsed, expectedUser, expectedPass)) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

/**
 * Protect pages + API. Skip Next internals and static assets.
 */
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, common static extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
