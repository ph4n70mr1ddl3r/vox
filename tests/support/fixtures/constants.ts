/**
 * Default test password (can be overridden via TEST_PASSWORD env var)
 */
export const DEFAULT_PASSWORD = process.env.TEST_PASSWORD || 'SecureTestPass123!'

/**
 * Default API base URL
 */
export const DEFAULT_API_URL = 'http://localhost:3000/api'

/**
 * Default reputation score for new users
 */
export const DEFAULT_REPUTATION_SCORE = 50

/**
 * Default trust level for connections (1-100 scale)
 */
export const DEFAULT_TRUST_LEVEL = 70

/**
 * Trust level for network/star connections
 */
export const NETWORK_TRUST_LEVEL = 75

/**
 * Minimum reputation score for campaigns
 */
export const DEFAULT_MIN_REPUTATION_SCORE = 50

/**
 * Maximum number of influencers per campaign
 */
export const DEFAULT_MAX_INFLUENCERS = 10

/**
 * Default campaign budget in dollars
 */
export const DEFAULT_BUDGET = 5000

/**
 * Default campaign duration in days
 */
export const CAMPAIGN_DEFAULT_DURATION_DAYS = 30

/**
 * Available campaign categories
 */
export const CAMPAIGN_CATEGORIES = ['beauty', 'fashion', 'tech', 'food', 'fitness'] as const

/**
 * Available campaign statuses
 */
export const CAMPAIGN_STATUSES = ['draft', 'active', 'completed', 'cancelled'] as const

/**
 * Available user roles
 */
export const USER_ROLES = ['brand', 'influencer', 'follower'] as const

/**
 * Default user role for new users
 */
export const DEFAULT_USER_ROLE = 'follower' as const

/**
 * Available connection statuses
 */
export const CONNECTION_STATUSES = ['pending', 'accepted', 'rejected'] as const

/**
 * Timeout for Playwright actions in milliseconds
 */
export const ACTION_TIMEOUT_MS = 15000

/**
 * Timeout for page navigation in milliseconds
 */
export const NAVIGATION_TIMEOUT_MS = 30000

/**
 * Timeout for expect assertions in milliseconds
 */
export const EXPECT_TIMEOUT_MS = 15000

/**
 * Timeout for entire test in milliseconds
 */
export const TEST_TIMEOUT_MS = 60000

/**
 * Reputation score validation bounds
 */
export const MIN_REPUTATION_SCORE = 0
export const MAX_REPUTATION_SCORE = 100

/**
 * Trust level validation bounds
 */
export const MIN_TRUST_LEVEL = 1
export const MAX_TRUST_LEVEL = 100

/**
 * Cleanup operation timeout in milliseconds
 */
export const CLEANUP_TIMEOUT_MS = 30000

/**
 * Maximum retry attempts for failed operations
 */
export const DEFAULT_MAX_RETRIES = 2
