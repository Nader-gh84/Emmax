import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isOnboardingComplete } from "@/lib/business-profile";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isOnboardingRoute = pathname === "/onboarding";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated visitors: allow /login and /signup through with no redirect.
  // Only gate dashboard and onboarding behind login.
  if (!user) {
    if (isDashboardRoute || isOnboardingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // Authenticated users only from here onward.
  const onboardingComplete = await isOnboardingComplete(supabase, user.id);

  if (isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = onboardingComplete ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(url);
  }

  if (isOnboardingRoute && onboardingComplete) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (isDashboardRoute && !onboardingComplete) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/onboarding",
  ],
};
