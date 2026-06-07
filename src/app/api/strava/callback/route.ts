import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Strava callback is not implemented yet" },
    { status: 501 }
  );
}
