import { APIRequestContext } from '@playwright/test'
import { faker } from '@faker-js/faker'
import {
  DEFAULT_PASSWORD,
  DEFAULT_REPUTATION_SCORE,
  USER_ROLES,
  DEFAULT_USER_ROLE,
  MIN_REPUTATION_SCORE,
  MAX_REPUTATION_SCORE,
} from '../constants'
import { BaseFactory } from './base-factory'
import { type CleanupResult } from '../utils/cleanup'

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

export type UserRole = (typeof USER_ROLES)[number]

export interface CreateUserOptions {
  role?: UserRole
  email?: string
  name?: string
  password?: string
  reputationScore?: number
  verified?: boolean
  socialAccounts?: {
    instagram?: string
    twitter?: string
    tiktok?: string
  }
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  reputationScore: number
  verified: boolean
  accessToken?: string
}

export class UserFactory extends BaseFactory {
  constructor(request: APIRequestContext) {
    super(request)
  }

  /**
   * Create a test user with specified options
   * @param options - User creation options
   * @returns Created user with access token
   * @throws Error if email is invalid or reputation score is out of range
   * @example
   * const influencer = await userFactory.createUser({
   *   role: 'influencer',
   *   reputationScore: 85
   * })
   */
  async createUser(options: CreateUserOptions = {}): Promise<User> {
    const password = options.password || DEFAULT_PASSWORD

    const userData = {
      email: options.email || faker.internet.email(),
      name: options.name || faker.person.fullName(),
      password,
      role: options.role || DEFAULT_USER_ROLE,
      reputationScore: options.reputationScore ?? DEFAULT_REPUTATION_SCORE,
      verified: options.verified ?? false,
      socialAccounts: options.socialAccounts || {},
    }

    if (!userData.email || !userData.email.includes('@')) {
      throw new Error(`Invalid email address: ${userData.email}`)
    }

    if (
      userData.reputationScore < MIN_REPUTATION_SCORE ||
      userData.reputationScore > MAX_REPUTATION_SCORE
    ) {
      throw new Error(
        `Reputation score must be between ${MIN_REPUTATION_SCORE} and ${MAX_REPUTATION_SCORE}, got ${userData.reputationScore}`
      )
    }

    let user: User

    try {
      const response = await this.request.post(`${this.baseURL}/users`, {
        data: userData,
      })

      if (!response.ok()) {
        const errorText = await response.text()
        throw new Error(
          `Failed to create user ${userData.email}: ${response.status()} ${errorText}`
        )
      }

      user = await response.json()
      this.trackId(user.id)

      const loginResponse = await this.request.post(`${this.baseURL}/auth/login`, {
        data: { email: userData.email, password },
      })

      if (!loginResponse.ok()) {
        const errorText = await loginResponse.text()
        throw new Error(
          `Failed to login user ${userData.email}: ${loginResponse.status()} ${errorText}`
        )
      }

      const authData = await loginResponse.json()
      user.accessToken = authData.accessToken

      return user
    } catch (error) {
      if (error instanceof Error) {
        console.error(`UserFactory.createUser failed for ${userData.email}:`, error.message)
      }
      throw error
    }
  }

  /**
   * Create a brand user (convenience method)
   * @param options - User creation options (role will be set to 'brand')
   * @returns Created brand user
   */
  async createBrand(options: Omit<CreateUserOptions, 'role'> = {}): Promise<User> {
    return this.createUser({ ...options, role: 'brand' })
  }

  /**
   * Create an influencer user (convenience method)
   * @param options - User creation options (role will be set to 'influencer')
   * @returns Created influencer user
   */
  async createInfluencer(options: Omit<CreateUserOptions, 'role'> = {}): Promise<User> {
    return this.createUser({ ...options, role: 'influencer' })
  }

  /**
   * Create a follower user (convenience method)
   * @param options - User creation options (role will be set to 'follower')
   * @returns Created follower user
   */
  async createFollower(options: Omit<CreateUserOptions, 'role'> = {}): Promise<User> {
    return this.createUser({ ...options, role: 'follower' })
  }

  /**
   * Create multiple users with the same options
   * @param count - Number of users to create (must be positive integer)
   * @param options - User creation options
   * @returns Array of created users
   * @throws Error if count is not a positive integer
   */
  async createUsers(count: number, options: CreateUserOptions = {}): Promise<User[]> {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error(`User count must be a positive integer, got ${count}`)
    }

    return Promise.all(Array.from({ length: count }, () => this.createUser(options)))
  }

  /**
   * Cleanup: Delete all users created during the test
   * Called automatically by fixture after test completion
   * @returns Cleanup result with success/failure counts
   */
  async cleanup(): Promise<CleanupResult<string>> {
    return super.cleanup('users')
  }
}
