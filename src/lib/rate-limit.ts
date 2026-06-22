import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase-admin";

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("check_rate_limit", {
      rate_key: key,
      max_requests: maxRequests,
      window_seconds: windowSeconds,
    })
    .single();

  if (error || !data) {
    console.warn("Rate limit check failed", error);
    return { allowed: false, retryAfter: 60 };
  }

  return {
    allowed: data.allowed,
    retryAfter: data.retry_after,
  };
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many requests. Try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    }
  );
}
