/**
 * Shared AI resilience helper for Gemini API calls.
 * Implements:
 * - Exponential back-off with configurable retries
 * - Per-request timeout
 * - 60-second time-limited cool-down window after failure
 * - Automatic recovery when cooling expires
 */

let coolingUntil = 0;
let consecutiveFailures = 0;

export function isAiCoolingDown() {
  return Date.now() < coolingUntil;
}

export function getAiCoolingRemainingSeconds() {
  if (Date.now() >= coolingUntil) return 0;
  return Math.ceil((coolingUntil - Date.now()) / 1000);
}

export function triggerAiCooldown(durationMs = 60000) {
  consecutiveFailures++;
  coolingUntil = Date.now() + durationMs;
}

export function resetAiCooldown() {
  consecutiveFailures = 0;
  coolingUntil = 0;
}

/**
 * Executes an async AI call with per-request timeout and exponential back-off retries.
 * On repeated failure, triggers a 60-second cool-down window.
 */
export async function executeWithRetry(
  fn,
  { maxRetries = 2, baseDelayMs = 400, timeoutMs = 6000, context = 'Gemini' } = {}
) {
  if (isAiCoolingDown()) {
    const remaining = getAiCoolingRemainingSeconds();
    throw new Error(`${context} is cooling down for ${remaining}s after recent errors/rate limits`);
  }

  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timerId;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timerId = setTimeout(
          () => reject(new Error(`${context} call timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      });

      const result = await Promise.race([fn(), timeoutPromise]);
      clearTimeout(timerId);
      resetAiCooldown();
      return result;
    } catch (err) {
      clearTimeout(timerId);
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // If all retries failed, initiate a 60-second cool-down window
  triggerAiCooldown(60000);
  throw lastError;
}
