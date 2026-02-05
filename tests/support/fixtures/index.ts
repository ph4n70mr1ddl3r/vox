import { test as base } from '@playwright/test'
import { UserFactory } from './factories/user-factory'
import { CampaignFactory } from './factories/campaign-factory'
import { TrustConnectionFactory } from './factories/trust-connection-factory'
import { DEFAULT_PASSWORD } from './constants'

/**
 * Extended Playwright fixtures for vox platform testing
 *
 * Provides auto-cleanup factories for:
 * - Users (brands, influencers, followers)
 * - Trust connections (graph edges)
 * - Campaigns (marketplace listings)
 *
 * Usage:
 *   import { test, expect } from '../support/fixtures'
 *   test('scenario', async ({ userFactory, trustConnectionFactory }) => {
 *     const influencer = await userFactory.createInfluencer()
 *     // Test automatically cleans up after completion
 *   })
 */

type TestFixtures = {
  userFactory: UserFactory
  campaignFactory: CampaignFactory
  trustConnectionFactory: TrustConnectionFactory
  defaultPassword: string
}

export const test = base.extend<TestFixtures>({
  // User factory fixture with auto-cleanup
  userFactory: async ({ request }, use) => {
    const factory = new UserFactory(request)
    await use(factory)
    await factory.cleanup() // Automatically delete created users
  },

  // Campaign factory fixture with auto-cleanup
  campaignFactory: async ({ request }, use) => {
    const factory = new CampaignFactory(request)
    await use(factory)
    await factory.cleanup() // Automatically delete created campaigns
  },

  // Trust connection factory fixture with auto-cleanup
  trustConnectionFactory: async ({ request }, use) => {
    const factory = new TrustConnectionFactory(request)
    await use(factory)
    await factory.cleanup()
  },

  // Default password fixture for tests
  defaultPassword: DEFAULT_PASSWORD,
})

export { expect } from '@playwright/test'
