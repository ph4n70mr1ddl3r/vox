import { APIRequestContext } from '@playwright/test';
import { DEFAULT_API_URL } from '../constants';
import { cleanupResources, type CleanupResult } from '../utils/cleanup';
import { withRetry } from '../utils/retry';

export abstract class BaseFactory {
    protected request: APIRequestContext;
    protected createdIds: string[] = [];
    protected baseURL: string;

    constructor(request: APIRequestContext) {
        this.request = request;
        this.baseURL = process.env.API_URL || DEFAULT_API_URL;
    }

    protected trackId(id: string): void {
        this.createdIds.push(id);
    }

    protected async makeRequest<T>(
        method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
        url: string,
        data?: unknown,
        context: string = 'API request'
    ): Promise<T> {
        return withRetry(async () => {
            const response = await this.request.fetch(url, {
                method,
                data,
            });

            if (!response.ok()) {
                const errorText = await response.text();
                const error = new Error(`${context} failed: ${method} ${url} - ${response.status()} ${errorText}`);
                Object.assign(error, { status: response.status(), url, method });
                throw error;
            }

            return response.json() as Promise<T>;
        }, `${context} (${method} ${url})`);
    }

    async cleanup(resourceType: string, displayName?: string, timeoutMs: number = 30000): Promise<CleanupResult<string>> {
        const result = await cleanupResources(
            this.createdIds,
            async (id) => {
                await this.makeRequest('DELETE', `${this.baseURL}/${resourceType}/${id}`, undefined, `delete ${resourceType}`);
            },
            displayName || resourceType,
            timeoutMs
        );
        this.createdIds = [];
        return result;
    }
}
