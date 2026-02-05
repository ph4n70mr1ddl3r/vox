export interface CleanupResult<T = string> {
    deleted: number;
    failed: number;
    errors: Array<{ id: T; error: string }>;
}

export async function cleanupResources<T>(
    resourceIds: T[],
    deleteFn: (id: T) => Promise<void>,
    resourceType: string
): Promise<CleanupResult<T>> {
    const results = await Promise.allSettled(
        resourceIds.map(async (id) => {
            await deleteFn(id);
            return id;
        })
    );

    const deleted: T[] = [];
    const failed: Array<{ id: T; error: string }> = [];

    results.forEach((result, index) => {
        const id = resourceIds[index];
        if (result.status === 'fulfilled') {
            deleted.push(id);
        } else {
            failed.push({ id, error: result.reason.message });
            console.warn(`Failed to delete ${resourceType} ${id}:`, result.reason);
        }
    });

    if (failed.length > 0) {
        console.warn(`${resourceType} cleanup: ${deleted.length} deleted, ${failed.length} failed`);
    }

    return { deleted: deleted.length, failed: failed.length, errors: failed };
}
