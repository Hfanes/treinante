import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Strava token refresh is not implemented yet" },
    { status: 501 }
  );
}
