import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Check for NextAuth session cookie (Edge-safe, no Mongoose import)
  const token =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/work/:path*",
    "/gym/:path*",
    "/finances/:path*",
    "/habits/:path*",
    "/study/:path*",
    "/hobbies/:path*",
    "/housework/:path*",
    "/health/:path*",
    "/goals/:path*",
    "/reading/:path*",
    "/journal/:path*",
    "/shopping/:path*",
    "/mealprep/:path*",
    "/settings/:path*",
    "/export/:path*",
    "/sections/:path*",
    "/onboarding",
  ],
};
