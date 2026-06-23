import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing bearer token" },
      { status: 401 }
    );
  }

  const response = await fetch("https://www.strava.com/api/v3/athlete", {
    headers: { authorization },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Strava athlete lookup failed" },
      { status: response.status }
    );
  }

  const athlete = (await response.json()) as {
    id?: number;
    firstname?: string | null;
    lastname?: string | null;
    username?: string | null;
    profile?: string | null;
  };

  if (!athlete.id) {
    return NextResponse.json(
      { error: "Strava athlete is missing an id" },
      { status: 502 }
    );
  }

  const name = [athlete.firstname, athlete.lastname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return NextResponse.json({
    ...athlete,
    sub: String(athlete.id),
    name: name || athlete.username || `Strava athlete ${athlete.id}`,
    preferred_username: athlete.username ?? String(athlete.id),
    picture: athlete.profile ?? null,
  });
}
