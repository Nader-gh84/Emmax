const TRAILING_SLASH = /\/$/;

export function getAppBaseUrl(): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (siteUrl) {
    return siteUrl.replace(TRAILING_SLASH, "");
  }

  return "http://localhost:3000";
}

export function getBaseUrlFromRequest(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin && !origin.startsWith("blob:") && !origin.includes("localhost")) {
    return origin.replace(TRAILING_SLASH, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");

  if (host && !host.includes("localhost")) {
    const protocol = request.headers.get("x-forwarded-proto") ?? "https";
    return `${protocol}://${host}`.replace(TRAILING_SLASH, "");
  }

  return getAppBaseUrl();
}

export function isSafePublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      !parsed.hostname.includes("localhost")
    );
  } catch {
    return false;
  }
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
