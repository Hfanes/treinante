import { afterEach, describe, expect, test, vi } from "vitest";

import { withSupabaseRetry } from "./supabase-retry";

describe("withSupabaseRetry", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns the first action result when it succeeds", async () => {
    const action = vi.fn(async () => "ok");

    await expect(withSupabaseRetry(action)).resolves.toBe("ok");

    expect(action).toHaveBeenCalledTimes(1);
  });

  test("retries once after two seconds for retryable failures", async () => {
    vi.useFakeTimers();
    const action = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("failed to fetch"))
      .mockResolvedValueOnce("ok");
    const onRetry = vi.fn();

    const result = withSupabaseRetry(action, onRetry);
    await vi.advanceTimersByTimeAsync(1999);

    expect(action).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBe("ok");
    expect(action).toHaveBeenCalledTimes(2);
  });

  test.each(["timeout", "503", "service unavailable"])(
    "retries once for %s failures",
    async (message) => {
      vi.useFakeTimers();
      const action = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error(message))
        .mockResolvedValueOnce("ok");

      const result = withSupabaseRetry(action);
      await vi.advanceTimersByTimeAsync(2_000);

      await expect(result).resolves.toBe("ok");
      expect(action).toHaveBeenCalledTimes(2);
    }
  );

  test("retries resolved Supabase-like results with retryable errors", async () => {
    vi.useFakeTimers();
    const retryableResult = {
      error: { message: "database unavailable" },
      status: 503,
    };
    const successResult = { data: "ok", error: null, status: 200 };
    const action = vi
      .fn<() => Promise<typeof retryableResult | typeof successResult>>()
      .mockResolvedValueOnce(retryableResult)
      .mockResolvedValueOnce(successResult);
    const onRetry = vi.fn();

    const result = withSupabaseRetry(action, onRetry);
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(result).resolves.toBe(successResult);
    expect(action).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("retries resolved Supabase-like results with retryable error messages", async () => {
    vi.useFakeTimers();
    const retryableResult = {
      error: { message: "timeout" },
      status: 504,
    };
    const successResult = { data: "ok", error: null, status: 200 };
    const action = vi
      .fn<() => Promise<typeof retryableResult | typeof successResult>>()
      .mockResolvedValueOnce(retryableResult)
      .mockResolvedValueOnce(successResult);
    const onRetry = vi.fn();

    const result = withSupabaseRetry(action, onRetry);
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(result).resolves.toBe(successResult);
    expect(action).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("returns resolved Supabase-like results with non-retryable errors unchanged", async () => {
    const errorResult = {
      error: { message: "invalid credentials" },
      status: 400,
    };
    const action = vi.fn(async () => errorResult);
    const onRetry = vi.fn();

    await expect(withSupabaseRetry(action, onRetry)).resolves.toBe(errorResult);

    expect(action).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  test("throws non-retryable failures without retrying", async () => {
    const error = new Error("invalid credentials");
    const action = vi.fn(async () => {
      throw error;
    });
    const onRetry = vi.fn();

    await expect(withSupabaseRetry(action, onRetry)).rejects.toBe(error);

    expect(action).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });
});
