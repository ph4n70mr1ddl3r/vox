import { APIRequestContext } from '@playwright/test';
import { DEFAULT_API_URL, DEFAULT_TRUST_LEVEL, NETWORK_TRUST_LEVEL, CONNECTION_STATUSES } from '../constants';
import { cleanupResources, type CleanupResult } from '../utils/cleanup';

/**
 * Trust Connection Factory for vox trust graph testing
 * 
 * Creates test trust connections between users and automatically
 * tracks them for cleanup. Essential for testing:
 * - Trust network building
 * - Reputation score calculations
 * - Network distance queries
 * - Graph traversal algorithms
 * 
 * Auto-cleanup ensures test isolation.
 */

export interface CreateConnectionOptions {
    fromUserId: string;
    toUserId: string;
    trustLevel?: number; // 1-100 scale
    note?: string;
}

export interface TrustConnection {
    id: string;
    fromUserId: string;
    toUserId: string;
    trustLevel: number;
    note?: string;
    status: typeof CONNECTION_STATUSES[number];
    createdAt: string;
}

export class TrustConnectionFactory {
    private request: APIRequestContext;
    private createdConnectionIds: string[] = [];
    private baseURL: string;

    constructor(request: APIRequestContext) {
        this.request = request;
        this.baseURL = process.env.API_URL || DEFAULT_API_URL;
    }

    /**
     * Create a trust connection request
     * 
     * @example
     * const connection = await trustConnectionFactory.createConnection({
     *   fromUserId: influencer.id,
     *   toUserId: brand.id,
     *   trustLevel: 80
     * });
     */
    async createConnection(options: CreateConnectionOptions): Promise<TrustConnection> {
        const connectionData = {
            fromUserId: options.fromUserId,
            toUserId: options.toUserId,
            trustLevel: options.trustLevel ?? DEFAULT_TRUST_LEVEL,
            note: options.note || '',
        };

        try {
            const response = await this.request.post(`${this.baseURL}/trust-connections`, {
                data: connectionData,
            });

            if (!response.ok()) {
                const errorText = await response.text();
                throw new Error(`Failed to create trust connection from ${options.fromUserId} to ${options.toUserId}: ${response.status()} ${errorText}`);
            }

            const connection = await response.json();
            this.createdConnectionIds.push(connection.id);

            return connection;
        } catch (error) {
            if (error instanceof Error) {
                console.error(`TrustConnectionFactory.createConnection failed for ${options.fromUserId} -> ${options.toUserId}:`, error.message);
            }
            throw error;
        }
    }

    /**
     * Accept a pending trust connection
     */
    async acceptConnection(connectionId: string): Promise<TrustConnection> {
        try {
            const response = await this.request.patch(`${this.baseURL}/trust-connections/${connectionId}/accept`, {});

            if (!response.ok()) {
                const errorText = await response.text();
                throw new Error(`Failed to accept connection ${connectionId}: ${response.status()} ${errorText}`);
            }

            return response.json();
        } catch (error) {
            if (error instanceof Error) {
                console.error(`TrustConnectionFactory.acceptConnection failed for ${connectionId}:`, error.message);
            }
            throw error;
        }
    }

    async rejectConnection(connectionId: string): Promise<TrustConnection> {
        try {
            const response = await this.request.patch(`${this.baseURL}/trust-connections/${connectionId}/reject`, {});

            if (!response.ok()) {
                const errorText = await response.text();
                throw new Error(`Failed to reject connection ${connectionId}: ${response.status()} ${errorText}`);
            }

            return response.json();
        } catch (error) {
            if (error instanceof Error) {
                console.error(`TrustConnectionFactory.rejectConnection failed for ${connectionId}:`, error.message);
            }
            throw error;
        }
    }

    /**
     * Create a trust network: build multiple connections
     * 
     * @example
     * // Create a star network: center connected to 5 users
     * const network = await trustConnectionFactory.createNetwork(
     *   center.id, 
     *   [user1.id, user2.id, user3.id, user4.id, user5.id]
     * );
     */
    async createNetwork(centerUserId: string, connectedUserIds: string[]): Promise<TrustConnection[]> {
        const connections = await Promise.all(
            connectedUserIds.map((userId) =>
                this.createConnection({
                    fromUserId: centerUserId,
                    toUserId: userId,
                    trustLevel: NETWORK_TRUST_LEVEL,
                })
            )
        );

        return Promise.all(connections.map((connection) => this.acceptConnection(connection.id)));
    }

    /**
     * Create a chain of trust connections (for path testing)
     * 
     * @example
     * // Create chain: user1 -> user2 -> user3 -> user4
     * const chain = await trustConnectionFactory.createChain([
     *   user1.id, user2.id, user3.id, user4.id
     * ]);
     */
    async createChain(userIds: string[]): Promise<TrustConnection[]> {
        const connectionPromises = [];

        for (let i = 0; i < userIds.length - 1; i++) {
            const connection = await this.createConnection({
                fromUserId: userIds[i],
                toUserId: userIds[i + 1],
                trustLevel: DEFAULT_TRUST_LEVEL,
            });

            connectionPromises.push(this.acceptConnection(connection.id));
        }

        return Promise.all(connectionPromises);
    }

    /**
     * Cleanup: Delete all trust connections created during the test
     * Called automatically by fixture after test completion
     */
    async cleanup(): Promise<CleanupResult<string>> {
        const result = await cleanupResources(
            this.createdConnectionIds,
            async (connectionId) => {
                const response = await this.request.delete(`${this.baseURL}/trust-connections/${connectionId}`);
                if (!response.ok()) {
                    throw new Error(`Failed to delete trust connection ${connectionId}: ${response.status()} ${await response.text()}`);
                }
            },
            'trust connection'
        );
        this.createdConnectionIds = [];
        return result;
    }
}
