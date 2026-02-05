import { APIRequestContext } from '@playwright/test';
import { DEFAULT_TRUST_LEVEL, NETWORK_TRUST_LEVEL, CONNECTION_STATUSES } from '../constants';
import { BaseFactory } from './base-factory';
import { type CleanupResult } from '../utils/cleanup';

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

export class TrustConnectionFactory extends BaseFactory {
    constructor(request: APIRequestContext) {
        super(request);
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
        const trustLevel = options.trustLevel ?? DEFAULT_TRUST_LEVEL;

        if (trustLevel < 1 || trustLevel > 100) {
            throw new Error(`Trust level must be between 1 and 100, got ${trustLevel}`);
        }

        const connectionData = {
            fromUserId: options.fromUserId,
            toUserId: options.toUserId,
            trustLevel,
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
            this.trackId(connection.id);

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
            const response = await this.request.patch(`${this.baseURL}/trust-connections/${connectionId}/accept`);

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
            const response = await this.request.patch(`${this.baseURL}/trust-connections/${connectionId}/reject`);

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

        const acceptedConnections: TrustConnection[] = [];
        const errors: Array<{ userId: string; error: string }> = [];

        const acceptResults = await Promise.allSettled(
            connections.map(async (connection) => {
                return this.acceptConnection(connection.id);
            })
        );

        acceptResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                acceptedConnections.push(result.value);
            } else {
                const errorMessage = result.reason instanceof Error
                    ? result.reason.message
                    : String(result.reason);
                errors.push({ userId: connectedUserIds[index], error: errorMessage });
            }
        });

        if (errors.length > 0) {
            console.warn(`createNetwork: ${acceptedConnections.length} succeeded, ${errors.length} failed`);
            errors.forEach(({ userId, error }) => {
                console.warn(`  Connection to user ${userId} failed: ${error}`);
            });
        }

        return acceptedConnections;
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
        const connections = await Promise.all(
            userIds.slice(0, -1).map((userId, index) =>
                this.createConnection({
                    fromUserId: userId,
                    toUserId: userIds[index + 1],
                    trustLevel: DEFAULT_TRUST_LEVEL,
                })
            )
        );

        return Promise.all(connections.map((connection) => this.acceptConnection(connection.id)));
    }

    /**
     * Cleanup: Delete all trust connections created during the test
     * Called automatically by fixture after test completion
     */
    async cleanup(): Promise<CleanupResult<string>> {
        return super.cleanup('trust-connections');
    }
}
