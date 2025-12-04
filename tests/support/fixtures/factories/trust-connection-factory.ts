import { APIRequestContext } from '@playwright/test';
import { User } from './user-factory';

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
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
}

export class TrustConnectionFactory {
    private request: APIRequestContext;
    private createdConnectionIds: string[] = [];
    private baseURL: string;

    constructor(request: APIRequestContext) {
        this.request = request;
        this.baseURL = process.env.API_URL || 'http://localhost:3000/api';
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
            trustLevel: options.trustLevel ?? 70, // Default trust level
            note: options.note || '',
        };

        try {
            const response = await this.request.post(`${this.baseURL}/trust-connections`, {
                data: connectionData,
            });

            if (!response.ok()) {
                throw new Error(`Failed to create trust connection: ${response.status()} ${await response.text()}`);
            }

            const connection = await response.json();
            this.createdConnectionIds.push(connection.id);

            return connection;
        } catch (error) {
            console.error('TrustConnectionFactory.createConnection failed:', error);
            throw error;
        }
    }

    /**
     * Accept a pending trust connection
     */
    async acceptConnection(connectionId: string): Promise<TrustConnection> {
        const response = await this.request.patch(`${this.baseURL}/trust-connections/${connectionId}/accept`, {});

        if (!response.ok()) {
            throw new Error(`Failed to accept connection: ${response.status()}`);
        }

        return response.json();
    }

    /**
     * Reject a pending trust connection
     */
    async rejectConnection(connectionId: string): Promise<TrustConnection> {
        const response = await this.request.patch(`${this.baseURL}/trust-connections/${connectionId}/reject`, {});

        if (!response.ok()) {
            throw new Error(`Failed to reject connection: ${response.status()}`);
        }

        return response.json();
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
        const connections: TrustConnection[] = [];

        for (const userId of connectedUserIds) {
            const connection = await this.createConnection({
                fromUserId: centerUserId,
                toUserId: userId,
                trustLevel: 75,
            });

            // Auto-accept for test networks
            await this.acceptConnection(connection.id);
            connections.push(connection);
        }

        return connections;
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
        const connections: TrustConnection[] = [];

        for (let i = 0; i < userIds.length - 1; i++) {
            const connection = await this.createConnection({
                fromUserId: userIds[i],
                toUserId: userIds[i + 1],
                trustLevel: 70,
            });

            await this.acceptConnection(connection.id);
            connections.push(connection);
        }

        return connections;
    }

    /**
     * Cleanup: Delete all trust connections created during the test
     * Called automatically by fixture after test completion
     */
    async cleanup(): Promise<void> {
        const deletePromises = this.createdConnectionIds.map(async (connectionId) => {
            try {
                await this.request.delete(`${this.baseURL}/trust-connections/${connectionId}`);
            } catch (error) {
                console.warn(`Failed to delete trust connection ${connectionId}:`, error);
            }
        });

        await Promise.all(deletePromises);
        this.createdConnectionIds = [];
    }
}
