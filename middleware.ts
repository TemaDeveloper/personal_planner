export { auth as middleware } from "@/lib/auth";

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
    "/onboarding",
  ],
};
