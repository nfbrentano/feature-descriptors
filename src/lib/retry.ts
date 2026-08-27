export interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  backoffFactor?: number
  shouldRetry?: (error: any) => boolean
}

/**
 * Executes an async operation with exponential backoff retry capability.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 300,
    backoffFactor = 2,
    shouldRetry = () => true
  } = options

  let attempt = 0
  let currentDelay = initialDelayMs

  while (attempt < maxRetries) {
    try {
      return await fn()
    } catch (error) {
      attempt++
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error
      }

      await new Promise(resolve => setTimeout(resolve, currentDelay))
      currentDelay *= backoffFactor
    }
  }

  throw new Error('Retry limit exceeded')
}
