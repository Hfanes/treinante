const DEFAULT_NEXT_PATH = "/dashboard";
export const LAST_LOGIN_COOKIE = "treinante_last_login";
export const LOGIN_METHODS = ["email", "google", "strava"] as const;

export type LoginMethod = (typeof LOGIN_METHODS)[number];

export function getSafeNextPath(next: string | null | undefined) {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return DEFAULT_NEXT_PATH;
  }

  return next;
}

export function getAuthRedirectUrl(
  pathname: string,
  next: string | null | undefined
) {
  const safeNextPath = getSafeNextPath(next);

  if (safeNextPath === DEFAULT_NEXT_PATH) {
    return pathname;
  }

  const searchParams = new URLSearchParams({ next: safeNextPath });
  return `${pathname}?${searchParams.toString()}`;
}

export function isLoginMethod(value: string | undefined): value is LoginMethod {
  return LOGIN_METHODS.includes(value as LoginMethod);
}

export function getOAuthCallbackUrl(
  method: Exclude<LoginMethod, "email">,
  next: string | null | undefined
) {
  return getAuthCallbackUrl(method, next);
}

export function getAuthCallbackUrl(
  method: LoginMethod,
  next: string | null | undefined
) {
  const callbackPath = getAuthRedirectUrl("/auth/callback", next);
  const [pathname, search = ""] = callbackPath.split("?");
  const searchParams = new URLSearchParams(search);
  searchParams.set("login", method);
  return `${pathname}?${searchParams.toString()}`;
}

export function lastLoginCookieValue(method: LoginMethod) {
  return `${LAST_LOGIN_COOKIE}=${method}; Max-Age=31536000; Path=/; SameSite=Lax`;
}
