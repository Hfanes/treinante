const DEFAULT_NEXT_PATH = "/dashboard";

export function getSafeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return DEFAULT_NEXT_PATH;
  }

  return next;
}

export function getAuthRedirectUrl(pathname: string, next: string | null | undefined) {
  const safeNextPath = getSafeNextPath(next);

  if (safeNextPath === DEFAULT_NEXT_PATH) {
    return pathname;
  }

  const searchParams = new URLSearchParams({ next: safeNextPath });
  return `${pathname}?${searchParams.toString()}`;
}
