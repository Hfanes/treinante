import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

const protectedPrefixes = [
  "/dashboard",
  "/runs",
  "/records",
  "/fitness",
  "/predictor",
  "/segments",
  "/reports",
  "/settings",
  "/update-password",
];

export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return res;
  }

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = protectedPrefixes.some((prefix) =>
    req.nextUrl.pathname.startsWith(prefix)
  );

  if (isProtected && !user) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/runs/:path*",
    "/records/:path*",
    "/fitness/:path*",
    "/predictor/:path*",
    "/segments/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/update-password/:path*",
  ],
};
