export const STRAVA_STATE_COOKIE = "treinante-strava-state";

export const STRAVA_STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 10 * 60,
  path: "/api/strava",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
