const DEFAULT_RETRIES = 2;
const RETRYABLE_ERRORS = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];

function isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
        return RETRYABLE_ERRORS.some(code => error.message.includes(code));
    }
    return false;
}

export async function withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = DEFAULT_RETRIES
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt < maxRetries) {
                const isRetryable = error instanceof Error && (
                    isRetryableError(error) ||
                    error.message.includes('status ')
                );

                if (!isRetryable) {
                    throw error;
                }

                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`${context} attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw new Error(`${context} failed after ${maxRetries + 1} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}
