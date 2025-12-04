# vox Test Suite

Production-ready Playwright test framework for the vox reputation platform.

## Overview

This test suite provides comprehensive E2E testing coverage for vox's trust graph, marketplace, and verification systems.

**Framework**: Playwright with TypeScript  
**Architecture**: Fixture-based with auto-cleanup factories  
**Test Strategy**: Risk-based testing prioritizing trust graph integrity and reputation algorithms

---

## Setup

### Prerequisites

- Node.js 20.11.0+ (use `nvm use` to match `.nvmrc`)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Fill in environment variables in .env
```

### Environment Configuration

Edit `.env` with your test environment settings:

```bash
TEST_ENV=local
BASE_URL=http://localhost:3000
API_URL=http://localhost:3000/api

# Test credentials (optional, factories create users dynamically)
TEST_BRAND_EMAIL=test-brand@vox-test.com
TEST_BRAND_PASSWORD=your_password
```

---

## Running Tests

### Local Development

```bash
# Run all tests (headless mode)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug tests/e2e/trust-graph.spec.ts

# View latest test report
npm run test:report
```

### Run Specific Tests

```bash
# Run single test file
npx playwright test tests/e2e/auth.spec.ts

# Run tests matching pattern
npx playwright test --grep "trust connection"

# Run tests on specific browser
npx playwright test --project=chromium
```

### CI/CD

Tests automatically run in CI with the following configuration:

- **Parallel Execution**: Disabled (`workers: 1`) for database consistency
- **Retries**: 2 retries on failure
- **Artifacts**: Screenshots/videos retained only on failure
- **Reporters**: HTML + JUnit XML for pipeline integration

```bash
# CI mode (respects CI=true in environment)
CI=true npm run test:e2e
```

---

## Test Architecture

### Directory Structure

```
tests/
├── e2e/                          # Test files (organize by feature)
│   ├── auth.spec.ts              # Authentication flows
│   ├── trust-graph.spec.ts       # Trust network testing
│   └── marketplace.spec.ts       # Campaign and collaboration tests
├── support/                      # Test infrastructure
│   ├── fixtures/                 # Auto-cleanup test fixtures
│   │   ├── index.ts              # Fixture composition (mergeTests pattern)
│   │   └── factories/            # Data factories with auto-cleanup
│   │       ├── user-factory.ts            # User creation (brands, influencers, followers)
│   │       ├── campaign-factory.ts        # Campaign creation
│   │       └── trust-connection-factory.ts # Trust graph edge creation
│   ├── helpers/                  # Utility functions (future)
│   └── page-objects/             # Page object models (optional)
└── README.md                     # This file
```

### Fixture Architecture

Tests use **auto-cleanup fixtures** to ensure test isolation:

```typescript
import { test, expect } from '../support/fixtures';

test('scenario', async ({ userFactory, trustConnectionFactory }) => {
  // Create test data
  const influencer = await userFactory.createInfluencer({ reputationScore: 85 });
  const brand = await userFactory.createBrand();
  
  // Build trust network
  await trustConnectionFactory.createConnection({
    fromUserId: influencer.id,
    toUserId: brand.id,
    trustLevel: 90
  });
  
  // Test logic...
  
  // Automatic cleanup happens after test completes
});
```

**Benefits:**
- ✅ Test isolation (no data pollution between tests)
- ✅ No manual cleanup code needed
- ✅ Parallel-safe (each test creates unique data)
- ✅ Failure-resilient (cleanup runs even if test fails)

### Data Factories

#### UserFactory

Create test users with different roles:

```typescript
// Create specific role
const brand = await userFactory.createBrand({ reputationScore: 70 });
const influencer = await userFactory.createInfluencer({ verified: true });
const follower = await userFactory.createFollower();

// Create with overrides
const user = await userFactory.createUser({
  role: 'influencer',
  email: 'specific@example.com',
  reputationScore: 95,
  socialAccounts: { instagram: '@influencer' }
});

// Bulk creation
const users = await userFactory.createUsers(10, { role: 'follower' });
```

#### CampaignFactory

Create marketplace campaigns:

```typescript
const campaign = await campaignFactory.createCampaign({
  brandId: brand.id,
  budget: 5000,
  minReputationScore: 70,
  category: 'fashion',
  maxInfluencers: 10
});
```

#### TrustConnectionFactory

Build trust graphs for testing:

```typescript
// Single connection
const connection = await trustConnectionFactory.createConnection({
  fromUserId: userA.id,
  toUserId: userB.id,
  trustLevel: 85
});

// Star network (center connected to multiple users)
await trustConnectionFactory.createNetwork(center.id, [user1.id, user2.id, user3.id]);

// Chain network (for path testing)
await trustConnectionFactory.createChain([userA.id, userB.id, userC.id, userD.id]);
```

---

## Best Practices

### Selector Strategy

**Always use `data-testid` attributes** for stable selectors:

```typescript
// ✅ Good: Stable, semantic
await page.click('[data-testid="send-trust-request"]');

// ❌ Bad: Brittle, breaks with styling changes
await page.click('.btn-primary.trust-btn');
```

### Test Design Principles

1. **Test Isolation**: Each test should be independent (fixtures handle this)
2. **Deterministic**: No flaky waits, use `waitFor` patterns
3. **Clear Assertions**: Explicit expectations, avoid implicit waits
4. **Focused Tests**: One scenario per test (easier debugging)
5. **Fast Execution**: Use API-level factories for setup, UI for verification

### Performance Optimization

- **Parallel Execution**: Tests run in parallel (configure in `playwright.config.ts`)
- **API-Level Setup**: Use factories to create data via API (faster than UI)
- **Selective Artifacts**: Capture screenshots/videos only on failure
- **Worker Reuse**: `reuseExistingServer: true` for dev server

### Trust Graph Testing

Testing trust networks requires special consideration:

```typescript
test('reputation algorithm', async ({ userFactory, trustConnectionFactory }) => {
  // Build controlled network topology
  const users = await userFactory.createUsers(5);
  
  // Create specific graph structure (star, chain, etc.)
  await trustConnectionFactory.createNetwork(users[0].id, users.slice(1).map(u => u.id));
  
  // Trigger reputation calculation
  // Assert expected reputation scores based on network topology
});
```

---

## Debugging

### Interactive Debugging

```bash
# Run test in debug mode (pauses execution)
npm run test:e2e:debug tests/e2e/trust-graph.spec.ts

# Or add breakpoint in code
await page.pause(); // Pauses execution in headed mode
```

### Trace Viewer

Playwright captures traces on failure. View them:

```bash
# View trace from failed test
npx playwright show-trace test-results/traces/trace.zip
```

Trace includes:
- Screenshots at each step
- Network requests
- Console logs
- DOM snapshots

### Verbose Logging

```bash
# Enable debug logs
DEBUG=pw:api npm run test:e2e
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.11.0'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
          BASE_URL: http://localhost:3000
          API_URL: http://localhost:3000/api
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test-results/
```

---

## Coverage Strategy

### Risk-Based Testing

Tests prioritize high-risk, high-impact areas:

1. **Critical Paths** (P0):
   - User authentication and authorization
   - Trust connection creation and acceptance
   - Reputation score calculation accuracy
   - Campaign creation and collaboration requests
   - Bot detection triggers

2. **Core Features** (P1):
   - User profile management
   - Network visualization
   - Marketplace filtering
   - Verification voting

3. **Edge Cases** (P2):
   - Error handling
   - Boundary conditions
   - Performance under load

### Test Organization

```
tests/e2e/
├── auth.spec.ts              # P0: Authentication flows
├── trust-graph.spec.ts       # P0: Trust network and reputation
├── marketplace.spec.ts       # P0: Campaign and collaboration
├── verification.spec.ts      # P1: Community verification
├── profiles.spec.ts          # P1: User profiles
└── admin.spec.ts             # P2: Admin and moderation
```

---

## Troubleshooting

### Common Issues

**Tests timing out:**
- Check `BASE_URL` is correct in `.env`
- Ensure dev server is running (`npm run dev`)
- Increase timeout in `playwright.config.ts`

**Database conflicts:**
- Tests should use auto-cleanup factories
- Disable parallel execution if database locks occur
- Use unique test data (factories use faker for randomness)

**Flaky tests:**
- Replace `waitForTimeout` with `waitFor` assertions
- Use `data-testid` selectors instead of CSS classes
- Check for race conditions in test setup

---

## Contributing

### Adding New Tests

1. Create test file in `tests/e2e/`
2. Import fixtures: `import { test, expect } from '../support/fixtures'`
3. Use factories for data creation (auto-cleanup)
4. Follow naming convention: `feature.spec.ts`

### Adding New Factories

1. Create factory in `tests/support/fixtures/factories/`
2. Implement `cleanup()` method
3. Add to fixture composition in `tests/support/fixtures/index.ts`
4. Export types and interfaces

---

## Resources

- [Playwright Documentation](https://playwright.dev)
- [vox Architecture](../docs/architecture.md)
- [vox PRD](../docs/prd.md)
- [Test Design Principles](https://martinfowler.com/articles/practical-test-pyramid.html)

---

## Support

For test framework issues, contact the QA team or open an issue in the vox repository.
