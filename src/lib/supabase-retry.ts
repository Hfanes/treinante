const RETRY_DELAY_MS = 2_000;
const RETRYABLE_ERROR_PATTERN =
  /timeout|503|service unavailable|failed to fetch/i;

function isRetryableError(error: unknown) {
  if (error instanceof Error) {
    return RETRYABLE_ERROR_PATTERN.test(error.message);
  }

  if (error && typeof error === "object" && "message" in error) {
    return RETRYABLE_ERROR_PATTERN.test(String(error.message));
  }

  return RETRYABLE_ERROR_PATTERN.test(String(error));
}

function isRetryableSupabaseResult(result: unknown) {
  if (!result || typeof result !== "object" || !("error" in result)) {
    return false;
  }

  const { error, status } = result as { error?: unknown; status?: unknown };

  return Boolean(error) && (status === 503 || isRetryableError(error));
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withSupabaseRetry<T>(
  action: () => Promise<T>,
  onRetry?: () => void
) {
  try {
    const result = await action();

    if (!isRetryableSupabaseResult(result)) {
      return result;
    }

    onRetry?.();
    await wait(RETRY_DELAY_MS);
    return action();
  } catch (error) {
    if (!isRetryableError(error)) {
      throw error;
    }

    onRetry?.();
    await wait(RETRY_DELAY_MS);
    return action();
  }
}
