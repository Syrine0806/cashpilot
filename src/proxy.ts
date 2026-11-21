import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/server/auth/jwt";

const PUBLIC_ROUTES = ["/login", "/register"];

/**
 * Optimistic route protection: redirects visitors without a valid session.
 * Authorisation itself is always re-checked in pages, actions and route
 * handlers (see src/server/auth/dal.ts).
 *
 * The proxy never redirects *away* from /login: a cookie can be correctly
 * signed yet point to a user that no longer exists (e.g. after a re-seed).
 * Only the login page, which checks the database, decides that.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  if (!session && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
