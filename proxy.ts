import { NextResponse, type NextRequest } from "next/server";
import { updateSession, withCookies } from "@/lib/supabase/proxy";

const PUBLIC_PATHS = ["/login", "/auth/"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

// Optimistic auth redirects. Pages still verify the user server-side (lib/auth.ts).
export async function proxy(request: NextRequest) {
  const { response, isSignedIn } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  // API routes check auth themselves and answer 401 instead of redirecting.
  if (!isSignedIn && !isPublic(pathname) && !pathname.startsWith("/api/")) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return withCookies(NextResponse.redirect(url), response);
  }

  if (isSignedIn && pathname === "/login") {
    return withCookies(
      NextResponse.redirect(new URL("/week", request.url)),
      response,
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
