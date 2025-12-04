import { APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';

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

export type UserRole = 'brand' | 'influencer' | 'follower';

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
        this.baseURL = process.env.API_URL || 'http://localhost:3000/api';
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
        const password = options.password || faker.internet.password({ length: 12 });

        const userData = {
            email: options.email || faker.internet.email(),
            name: options.name || faker.person.fullName(),
            password,
            role: options.role || 'follower',
            reputationScore: options.reputationScore ?? 50, // Default neutral score
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

            // Get access token for authenticated requests
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

    /**
     * Create multiple users at once
     */
    async createUsers(count: number, options: CreateUserOptions = {}): Promise<User[]> {
        const users: User[] = [];
        for (let i = 0; i < count; i++) {
            users.push(await this.createUser(options));
        }
        return users;
    }

    /**
     * Cleanup: Delete all users created during the test
     * Called automatically by fixture after test completion
     */
    async cleanup(): Promise<void> {
        const deletePromises = this.createdUserIds.map(async (userId) => {
            try {
                await this.request.delete(`${this.baseURL}/users/${userId}`);
            } catch (error) {
                console.warn(`Failed to delete user ${userId}:`, error);
            }
        });

        await Promise.all(deletePromises);
        this.createdUserIds = [];
    }
}
