/**
 * Result of a cleanup operation
 */
export interface CleanupResult<T = string> {
  deleted: number
  failed: number
  errors: Array<{ id: T; error: string }>
}

/**
 * Clean up resources by calling delete function for each ID
 * @param resourceIds - Array of resource IDs to delete
 * @param deleteFn - Async function to delete a single resource
 * @param resourceType - Type name for logging purposes
 * @param timeoutMs - Timeout for each delete operation (default 30000ms)
 * @returns CleanupResult with counts of successful/failed deletions
 */
export async function cleanupResources<T>(
  resourceIds: T[],
  deleteFn: (id: T) => Promise<void>,
  resourceType: string,
  timeoutMs: number = 30000
): Promise<CleanupResult<T>> {
  if (resourceIds.length === 0) {
    return { deleted: 0, failed: 0, errors: [] }
  }

  const results = await Promise.allSettled(
    resourceIds.map(async id => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Cleanup timeout after ${timeoutMs}ms`)), timeoutMs)
      )
      await Promise.race([deleteFn(id), timeoutPromise])
      return id
    })
  )

  const deleted: T[] = []
  const failed: Array<{ id: T; error: string }> = []

  results.forEach((result, index) => {
    const id = resourceIds[index]
    if (result.status === 'fulfilled') {
      deleted.push(id)
    } else {
      const errorMessage =
        result.reason instanceof Error ? result.reason.message : String(result.reason)
      failed.push({ id, error: errorMessage })
      console.warn(`Failed to delete ${resourceType} ${id}:`, result.reason)
    }
  })

  if (failed.length > 0) {
    console.warn(`${resourceType} cleanup: ${deleted.length} deleted, ${failed.length} failed`)
  }

  return { deleted: deleted.length, failed: failed.length, errors: failed }
}
