const DEFAULT_RETRIES = 2
const RETRYABLE_ERRORS = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND']

/**
 * Check if an error is retryable based on its message
 * @param error - Error to check
 * @returns True if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    return RETRYABLE_ERRORS.some(code => error.message.includes(code))
  }
  return false
}

/**
 * Retry an async operation with exponential backoff
 * @param operation - The async function to retry
 * @param context - Description of the operation for error messages
 * @param maxRetries - Maximum number of retry attempts (default 2)
 * @returns Promise that resolves when operation succeeds
 * @throws Error if operation fails after all retries
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries: number = DEFAULT_RETRIES
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt < maxRetries) {
        const isRetryable =
          error instanceof Error && (isRetryableError(error) || /\b\d{3}\b/.test(error.message))

        if (!isRetryable) {
          throw error
        }

        const delay = Math.pow(2, attempt) * 1000
        console.warn(`${context} attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw new Error(
    `${context} failed after ${maxRetries + 1} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  )
}
