import { APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { DEFAULT_PASSWORD, DEFAULT_API_URL, DEFAULT_REPUTATION_SCORE, USER_ROLES } from '../constants';

/**
 * User Factory for vox platform testing
 * 
 * Creates test users with different roles (brand, influencer, follower)
 * and automatically tracks them for cleanup after test completion.
 * 
 * Supports:
 * - Role-based user creation
 * - Reputation score initialization
 * - Social account linking (optional)
 * - Auto-cleanup of created users
 */

export type UserRole = typeof USER_ROLES[number];

export interface CreateUserOptions {
    role?: UserRole;
    email?: string;
    name?: string;
    password?: string;
    reputationScore?: number;
    verified?: boolean;
    socialAccounts?: {
        instagram?: string;
        twitter?: string;
        tiktok?: string;
    };
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    reputationScore: number;
    verified: boolean;
    accessToken?: string;
}

export class UserFactory {
    private request: APIRequestContext;
    private createdUserIds: string[] = [];
    private baseURL: string;

    constructor(request: APIRequestContext) {
        this.request = request;
        this.baseURL = process.env.API_URL || DEFAULT_API_URL;
    }

    /**
     * Create a test user with specified options
     * 
     * @example
     * const influencer = await userFactory.createUser({ 
     *   role: 'influencer', 
     *   reputationScore: 85 
     * });
     */
    async createUser(options: CreateUserOptions = {}): Promise<User> {
        const password = options.password || DEFAULT_PASSWORD;

        const userData = {
            email: options.email || faker.internet.email(),
            name: options.name || faker.person.fullName(),
            password,
            role: options.role || USER_ROLES[2],
            reputationScore: options.reputationScore ?? DEFAULT_REPUTATION_SCORE,
            verified: options.verified ?? false,
            socialAccounts: options.socialAccounts || {},
        };

        try {
            const response = await this.request.post(`${this.baseURL}/users`, {
                data: userData,
            });

            if (!response.ok()) {
                throw new Error(`Failed to create user: ${response.status()} ${await response.text()}`);
            }

            const user = await response.json();
            this.createdUserIds.push(user.id);

            const loginResponse = await this.request.post(`${this.baseURL}/auth/login`, {
                data: { email: userData.email, password },
            });

            const authData = await loginResponse.json();
            user.accessToken = authData.accessToken;

            return user;
        } catch (error) {
            console.error('UserFactory.createUser failed:', error);
            throw error;
        }
    }

    /**
     * Create a brand user (convenience method)
     */
    async createBrand(options: Omit<CreateUserOptions, 'role'> = {}): Promise<User> {
        return this.createUser({ ...options, role: 'brand' });
    }

    /**
     * Create an influencer user (convenience method)
     */
    async createInfluencer(options: Omit<CreateUserOptions, 'role'> = {}): Promise<User> {
        return this.createUser({ ...options, role: 'influencer' });
    }

    /**
     * Create a follower user (convenience method)
     */
    async createFollower(options: Omit<CreateUserOptions, 'role'> = {}): Promise<User> {
        return this.createUser({ ...options, role: 'follower' });
    }

    async createUsers(count: number, options: CreateUserOptions = {}): Promise<User[]> {
        return Promise.all(Array(count).fill(null).map(() => this.createUser(options)));
    }

    /**
     * Cleanup: Delete all users created during the test
     * Called automatically by fixture after test completion
     */
    async cleanup(): Promise<{ deleted: number; failed: number; errors: Array<{ id: string; error: string }> }> {
        const results = await Promise.allSettled(
            this.createdUserIds.map(async (userId) => {
                const response = await this.request.delete(`${this.baseURL}/users/${userId}`);
                if (!response.ok()) {
                    throw new Error(`Failed to delete user ${userId}: ${response.status()} ${await response.text()}`);
                }
                return userId;
            })
        );

        const deleted: string[] = [];
        const failed: Array<{ id: string; error: string }> = [];

        results.forEach((result, index) => {
            const userId = this.createdUserIds[index];
            if (result.status === 'fulfilled') {
                deleted.push(userId);
            } else {
                failed.push({ id: userId, error: result.reason.message });
                console.warn(`Failed to delete user ${userId}:`, result.reason);
            }
        });

        this.createdUserIds = [];

        if (failed.length > 0) {
            console.warn(`UserFactory cleanup: ${deleted.length} deleted, ${failed.length} failed`);
        }

        return { deleted: deleted.length, failed: failed.length, errors: failed };
    }
}
