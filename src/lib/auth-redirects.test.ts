import { describe, expect, test } from "vitest";

import { getAuthRedirectUrl, getSafeNextPath } from "./auth-redirects";

describe("getSafeNextPath", () => {
  test("falls back to dashboard for missing or unsafe next values", () => {
    expect(getSafeNextPath(null)).toBe("/dashboard");
    expect(getSafeNextPath(undefined)).toBe("/dashboard");
    expect(getSafeNextPath("")).toBe("/dashboard");
    expect(getSafeNextPath("https://evil.test")).toBe("/dashboard");
    expect(getSafeNextPath("//evil.test")).toBe("/dashboard");
    expect(getSafeNextPath("/\\evil.test")).toBe("/dashboard");
    expect(getSafeNextPath("\\/evil.test")).toBe("/dashboard");
  });

  test("allows paths that start with a single slash", () => {
    expect(getSafeNextPath("/runs")).toBe("/runs");
  });
});

describe("getAuthRedirectUrl", () => {
  test("adds a next parameter when the safe next path is not dashboard", () => {
    expect(getAuthRedirectUrl("/login", "/runs")).toBe("/login?next=%2Fruns");
  });

  test("omits next when redirecting to the dashboard default", () => {
    expect(getAuthRedirectUrl("/login", "/dashboard")).toBe("/login");
  });
});
