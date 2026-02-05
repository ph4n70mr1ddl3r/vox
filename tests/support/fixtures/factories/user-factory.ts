import { APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { DEFAULT_PASSWORD, DEFAULT_REPUTATION_SCORE, USER_ROLES, DEFAULT_USER_ROLE } from '../constants';
import { BaseFactory } from './base-factory';
import { type CleanupResult } from '../utils/cleanup';

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

export class UserFactory extends BaseFactory {
    constructor(request: APIRequestContext) {
        super(request);
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
            role: options.role || DEFAULT_USER_ROLE,
            reputationScore: options.reputationScore ?? DEFAULT_REPUTATION_SCORE,
            verified: options.verified ?? false,
            socialAccounts: options.socialAccounts || {},
        };

        try {
            const response = await this.request.post(`${this.baseURL}/users`, {
                data: userData,
            });

            if (!response.ok()) {
                const errorText = await response.text();
                throw new Error(`Failed to create user ${userData.email}: ${response.status()} ${errorText}`);
            }

            const user = await response.json();
            this.trackId(user.id);

            const loginResponse = await this.request.post(`${this.baseURL}/auth/login`, {
                data: { email: userData.email, password },
            });

            if (!loginResponse.ok()) {
                const errorText = await loginResponse.text();
                throw new Error(`Failed to login user ${userData.email}: ${loginResponse.status()} ${errorText}`);
            }

            const authData = await loginResponse.json();
            user.accessToken = authData.accessToken;

            return user;
        } catch (error) {
            if (error instanceof Error) {
                console.error(`UserFactory.createUser failed for ${userData.email}:`, error.message);
            }
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
        if (count <= 0) {
            throw new Error(`User count must be positive, got ${count}`);
        }

        return Promise.all(Array(count).fill(null).map(() => this.createUser(options)));
    }

    /**
     * Cleanup: Delete all users created during the test
     * Called automatically by fixture after test completion
     */
    async cleanup(): Promise<CleanupResult<string>> {
        return super.cleanup('users');
    }
}
