# System-Level Test Design - vox

**Generated:** 2025-12-04  
**Author:** Murat (Master Test Architect)  
**Project:** vox  
**Phase:** Phase 3 - Solutioning (Testability Review)  
**Mode:** System-Level Testability Assessment

---

## Executive Summary

This system-level test design evaluates vox's architecture for testability before implementation begins. The assessment validates whether the technical architecture (Next.js 16 + PostgreSQL + Prisma + NextAuth.js + Vercel) supports reliable, scalable automated testing while meeting the project's critical NFRs: <3s page load on 3G, 95% bot detection accuracy, 10K+ concurrent users, and 99.9% uptime.

**Key Findings:**
- ✅ **Testability Assessment: PASS with CONCERNS**
- ✅ Strong controllability (API seeding, Prisma factories, serverless isolation)
- ⚠️ Moderate observability (needs structured logging and APM integration)
- ✅ Good reliability (stateless architecture, Vercel edge caching)
- ⚠️ Concern: Trust graph queries at scale (recursive CTEs may become bottleneck)
- ⚠️ Concern: Reputation algorithm complexity (5-second SLA requires optimization)

**Recommendation for Implementation-Readiness Gate:**
- **Status:** CONCERNS (proceed with mitigations)
- **Blockers:** None
- **Required Actions Before Sprint 0:**
  1. Add structured logging middleware (trace IDs, Server-Timing headers)
  2. Prototype reputation calculation with 10K+ connection dataset
  3. Add APM integration (Vercel Analytics or Datadog)
  4. Document test data seeding strategy for CI environments

---

## 1. Testability Assessment

### 1.1 Controllability: ✅ PASS

**Definition:** Can we control system state for testing (API seeding, mocks, resets)?

**Architecture Evaluation:**

| Aspect | Implementation | Testability Rating | Notes |
|--------|----------------|-------------------|-------|
| **Data Seeding** | Prisma factories + API endpoints | ✅ Excellent | Can seed users, trust edges, campaigns via API |
| **State Reset** | Database transactions, `beforeEach` cleanup | ✅ Excellent | Prisma supports test database resets |
| **External Dependencies** | NextAuth.js OAuth, email service | ✅ Good | OAuth providers mockable, email service interceptable |
| **Error Injection** | Route mocking (Playwright/Cypress) | ✅ Excellent | Can simulate 500 errors, network failures, slow responses |
| **Time Control** | `page.clock.fastForward()` (Playwright) | ✅ Good | Can test JWT expiry, reputation decay over time |

**Supporting Evidence:**

```typescript
// Example: Prisma factory for data seeding
// tests/factories/user-factory.ts
export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    name: faker.name.fullName(),
    userType: 'influencer',
    reputation: 5.0,
    createdAt: new Date(),
    ...overrides,
  };
}

// Example: API seeding in test
test.beforeEach(async ({ request }) => {
  const user = createUser({ reputation: 8.5, userType: 'influencer' });
  await request.post('/api/users', { data: user });
});

// Example: Mock OAuth provider
test('login with Google OAuth', async ({ page, context }) => {
  await context.route('**/oauth/google/callback', (route) => {
    route.fulfill({
      status: 302,
      headers: { Location: '/dashboard' },
      body: JSON.stringify({ token: 'mock-jwt-token' }),
    });
  });
  
  await page.goto('/login');
  await page.click('[data-testid="login-google"]');
  await expect(page).toHaveURL('/dashboard');
});
```

**Concerns & Mitigations:**

- ⚠️ **Concern:** Reputation calculation depends on complex graph queries (may be slow to seed large networks)
  - **Mitigation:** Pre-compute materialized reputation scores for test data
  - **Owner:** Backend team
  - **Deadline:** Before Sprint 0

- ⚠️ **Concern:** Vercel serverless functions have cold start delays (affects test stability)
  - **Mitigation:** Warm up endpoints in `test.beforeAll()` with dummy requests
  - **Owner:** QA team
  - **Deadline:** During framework setup

**Verdict:** ✅ **PASS** - Excellent controllability with documented mitigations for graph seeding.

---

### 1.2 Observability: ⚠️ CONCERNS

**Definition:** Can we inspect system state, validate NFRs, and debug failures?

**Architecture Evaluation:**

| Aspect | Implementation | Testability Rating | Notes |
|--------|----------------|-------------------|-------|
| **Logging** | Console logs (basic) | ⚠️ Needs improvement | No structured logging or trace IDs |
| **Metrics** | Vercel Analytics (basic) | ⚠️ Partial | Page load metrics available, but no API timing |
| **Traces** | Not implemented | ❌ Missing | No distributed tracing for API calls |
| **Test Determinism** | Server Components + static rendering | ✅ Good | Deterministic page rendering |
| **Error Visibility** | Error boundaries (React) | ✅ Good | Errors surface clearly in UI |
| **API Responses** | Consistent wrapper format | ✅ Excellent | All APIs return `{success, data, error, meta}` |

**Supporting Evidence:**

```typescript
// ✅ GOOD: Consistent API response wrapper
// From architecture.md Rule 3
{
  success: true,
  data: { /* actual data */ },
  meta: {
    timestamp: "2025-12-04T10:00:00Z",
    pagination: { page: 1, pageSize: 20, total: 150, pages: 8 }
  }
}

// ❌ MISSING: No structured logging with trace IDs
// Should be implemented as:
// lib/middleware/logger.ts
export function withLogging(handler: ApiHandler) {
  return async (req: Request) => {
    const traceId = req.headers.get('x-trace-id') || generateTraceId();
    const startTime = Date.now();
    
    try {
      const response = await handler(req);
      const duration = Date.now() - startTime;
      
      logStructured({
        level: 'info',
        traceId,
        method: req.method,
        url: req.url,
        duration,
        status: response.status,
      });
      
      return response;
    } catch (error) {
      logStructured({ level: 'error', traceId, error });
      throw error;
    }
  };
}
```

**Concerns & Mitigations:**

- ❌ **CONCERN (BLOCKER for NFR validation):** No structured logging with trace IDs
  - **Impact:** Cannot correlate test failures with backend logs, makes debugging E2E failures very difficult
  - **Mitigation:** Add logging middleware with trace ID propagation before Sprint 0
  - **Owner:** Backend team
  - **Deadline:** Before Sprint 0 (REQUIRED)
  - **Test Validation:** E2E tests will verify `x-trace-id` header in API responses

- ❌ **CONCERN (BLOCKER for Performance NFR):** No APM integration (Application Performance Monitoring)
  - **Impact:** Cannot validate reputation calculation SLA (<5s) or API response times
  - **Mitigation:** Add Vercel Analytics or Datadog APM with Server-Timing headers
  - **Owner:** DevOps team
  - **Deadline:** Before Sprint 0 (REQUIRED)
  - **Test Validation:** Integration tests will verify `Server-Timing` header contains `db` and `total` metrics

**Verdict:** ⚠️ **CONCERNS** - Missing structured logging and APM integration. These are **blockers for NFR validation** and must be resolved before Sprint 0.

---

### 1.3 Reliability: ✅ PASS

**Definition:** Are tests isolated, reproducible, and can we validate error recovery?

**Architecture Evaluation:**

| Aspect | Implementation | Testability Rating | Notes |
|--------|----------------|-------------------|-------|
| **Isolation** | Stateless serverless functions | ✅ Excellent | Each test invocation isolated |
| **Parallel Safety** | PostgreSQL transactions, unique data | ✅ Excellent | Tests can run in parallel with proper cleanup |
| **Deterministic Waits** | Network-first pattern supported | ✅ Excellent | Can intercept responses before actions |
| **Failure Reproducibility** | HAR capture, trace viewer | ✅ Good | Playwright trace viewer for debugging |
| **Loose Coupling** | REST API + Server Components | ✅ Excellent | UI and API testable independently |

**Supporting Evidence:**

```typescript
// Example: Isolated test with cleanup
test('create trust connection', async ({ page, request, seedUser }) => {
  // Setup: Seed isolated test data
  const userA = await seedUser({ reputation: 7.0 });
  const userB = await seedUser({ reputation: 8.5 });
  
  // Network-first: Intercept BEFORE action
  const connectionPromise = page.waitForResponse('**/api/trust-connections');
  
  await page.goto(`/profile/${userB.id}`);
  await page.click('[data-testid="send-trust-request"]');
  
  const response = await connectionPromise;
  expect(response.status()).toBe(201);
  
  // Validate response structure
  const connection = await response.json();
  expect(connection.success).toBe(true);
  expect(connection.data.fromUserId).toBe(userA.id);
  expect(connection.data.toUserId).toBe(userB.id);
  expect(connection.data.status).toBe('pending');
  
  // Auto-cleanup via seedUser fixture
});

// Example: Error recovery test
test('handle API failure gracefully', async ({ page, context }) => {
  await context.route('**/api/campaigns', (route) => {
    route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) });
  });
  
  await page.goto('/marketplace');
  
  // User sees error message (not blank page)
  await expect(page.getByText('Unable to load campaigns. Please try again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});
```

**Concerns & Mitigations:**

- ⚠️ **Minor Concern:** Trust graph queries may have race conditions at high concurrency
  - **Impact:** Tests might fail intermittently when simulating 10K+ concurrent users
  - **Mitigation:** Use database-level locks for reputation updates (Prisma transactions)
  - **Owner:** Backend team
  - **Deadline:** During Epic 3 (Trust Network) implementation
  - **Test Validation:** Stress tests with k6 will validate transaction isolation

**Verdict:** ✅ **PASS** - Excellent reliability foundation with stateless architecture.

---

### 1.4 Overall Testability Score

| Dimension | Rating | Weight | Weighted Score |
|-----------|--------|--------|----------------|
| Controllability | 9/10 | 35% | 3.15 |
| Observability | 6/10 | 30% | 1.80 |
| Reliability | 9/10 | 35% | 3.15 |
| **Total** | | | **8.1/10** |

**Interpretation:**
- **8.1/10 = PASS with CONCERNS**
- Strong foundation, but observability gaps must be addressed before Sprint 0
- Mitigations documented with owners and deadlines

---

## 2. Architecturally Significant Requirements (ASRs)

ASRs are quality requirements that drive architecture decisions and pose testability challenges.

### ASR-1: Page Load Performance (<3s on 3G)

**Category:** PERF  
**NFR Source:** PRD - "Page load times must be under 3 seconds on 3G connections"  
**Architecture Impact:** Drives Next.js App Router (SSR), Vercel Edge caching, image optimization  
**Testability Challenge:** Requires real 3G throttling and Lighthouse CI integration

**Risk Assessment:**
- **Probability:** 2 (Possible) - Next.js + Vercel optimized, but trust graph queries may slow rendering
- **Impact:** 3 (Critical) - Poor performance = user churn, SEO penalty
- **Risk Score:** 2 × 3 = **6 (HIGH RISK)** - Requires mitigation

**Test Strategy:**
- **Tool:** Lighthouse CI (automated in CI pipeline)
- **Frequency:** Every PR to main branch
- **Acceptance Criteria:**
  - Lighthouse Performance score ≥85
  - First Contentful Paint (FCP) <1.8s
  - Largest Contentful Paint (LCP) <2.5s
  - Time to Interactive (TTI) <3.5s
- **Test Implementation:**
  ```yaml
  # .github/workflows/lighthouse.yml
  - name: Run Lighthouse CI
    run: |
      npm install -g @lhci/cli
      lhci autorun --config=lighthouserc.json
  
  # lighthouserc.json
  {
    "ci": {
      "assert": {
        "assertions": {
          "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
          "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
          "interactive": ["error", { "maxNumericValue": 3500 }],
          "performance-score": ["error", { "minScore": 0.85 }]
        }
      }
    }
  }
  ```

**Mitigation Plan:**
- Pre-compute reputation scores (materialized views)
- Aggressive Vercel edge caching (60s TTL)
- Lazy-load trust network visualizations (not critical path)
- **Owner:** Frontend team + Backend team
- **Deadline:** Before Epic 3 completion

---

### ASR-2: Bot Detection Accuracy (95%)

**Category:** SEC  
**NFR Source:** PRD - "System must detect and prevent bot accounts with 95% accuracy"  
**Architecture Impact:** Drives decentralized verification system, ML-based detection (future)  
**Testability Challenge:** Requires synthetic bot accounts and validation dataset

**Risk Assessment:**
- **Probability:** 2 (Possible) - MVP uses community voting, not ML (simpler but less accurate)
- **Impact:** 3 (Critical) - Bot infiltration destroys trust graph integrity, platform fails
- **Risk Score:** 2 × 3 = **6 (HIGH RISK)** - Requires mitigation

**Test Strategy:**
- **Tool:** Custom bot detection tests + Playwright E2E for voting workflows
- **Frequency:** Before each release
- **Acceptance Criteria:**
  - Test dataset: 100 synthetic accounts (50 real, 50 bot-like patterns)
  - Detection accuracy ≥95% (TP + TN / Total ≥ 0.95)
  - False positive rate <5% (don't ban real users)
  - Community voting correctly flags 90%+ of bot accounts
- **Test Implementation:**
  ```typescript
  // tests/integration/bot-detection.spec.ts
  test('bot detection achieves 95% accuracy', async ({ request }) => {
    // Seed synthetic accounts
    const realUsers = Array.from({ length: 50 }, () => createRealUser());
    const botUsers = Array.from({ length: 50 }, () => createBotUser());
    
    for (const user of [...realUsers, ...botUsers]) {
      await request.post('/api/users', { data: user });
    }
    
    // Run community voting simulation
    const results = await request.post('/api/verification/batch-analyze', {
      data: { userIds: [...realUsers, ...botUsers].map(u => u.id) }
    });
    
    const { detectedBots, detectedReal } = await results.json();
    
    // Calculate accuracy
    const truePositives = detectedBots.filter(id => botUsers.find(u => u.id === id)).length;
    const trueNegatives = detectedReal.filter(id => realUsers.find(u => u.id === id)).length;
    const accuracy = (truePositives + trueNegatives) / 100;
    
    expect(accuracy).toBeGreaterThanOrEqual(0.95);
  });
  
  function createBotUser(): User {
    return createUser({
      email: faker.internet.email(),
      createdAt: new Date(Date.now() - 60000), // Created < 1 min ago
      trustGiven: [], // No trust connections (bot pattern)
      activity: 'high-frequency', // Rapid actions (bot pattern)
    });
  }
  
  function createRealUser(): User {
    return createUser({
      email: faker.internet.email(),
      createdAt: faker.date.past(),
      trustGiven: Array.from({ length: faker.datatype.number({ min: 3, max: 50 }) }),
      activity: 'normal',
    });
  }
  ```

**Mitigation Plan:**
- Create synthetic bot detection dataset during Sprint 0
- Monitor false positive rate in production (SLO: <5%)
- Phase 2: Add ML-based detection (scikit-learn, TensorFlow.js)
- **Owner:** Data Science team (Phase 2) + Backend team (MVP)
- **Deadline:** MVP: Community voting validated by Sprint 3, ML: Phase 2

---

### ASR-3: Scalability (10K+ Concurrent Users)

**Category:** PERF  
**NFR Source:** PRD - "Support 10,000+ concurrent users during peak periods"  
**Architecture Impact:** Drives serverless architecture (Vercel Functions), PostgreSQL connection pooling, caching strategy  
**Testability Challenge:** Requires load testing infrastructure (k6, staging environment)

**Risk Assessment:**
- **Probability:** 2 (Possible) - Vercel auto-scales, but database may bottleneck
- **Impact:** 3 (Critical) - Service degradation = user churn, lost revenue
- **Risk Score:** 2 × 3 = **6 (HIGH RISK)** - Requires mitigation

**Test Strategy:**
- **Tool:** k6 (load testing), not Playwright
- **Frequency:** Before major releases, after architecture changes
- **Acceptance Criteria:**
  - Sustain 10K concurrent users for 10 minutes
  - P95 response time <500ms for API endpoints
  - Error rate <1% under load
  - Database connection pool does not exhaust (<80% utilization)
- **Test Implementation:**
  ```javascript
  // tests/nfr/load-test.k6.js
  import http from 'k6/http';
  import { check, sleep } from 'k6';
  
  export const options = {
    stages: [
      { duration: '2m', target: 1000 },   // Ramp to 1K users
      { duration: '5m', target: 5000 },   // Ramp to 5K users
      { duration: '5m', target: 10000 },  // Ramp to 10K users
      { duration: '10m', target: 10000 }, // Sustain 10K for 10 min
      { duration: '2m', target: 0 },      // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p(95)<500'], // P95 < 500ms
      http_req_failed: ['rate<0.01'],   // Error rate < 1%
    },
  };
  
  export default function () {
    // Test critical endpoints
    const campaignsResp = http.get(`${__ENV.BASE_URL}/api/campaigns?limit=20`);
    check(campaignsResp, {
      'campaigns API responds': (r) => r.status === 200,
      'campaigns API fast': (r) => r.timings.duration < 500,
    });
    
    const influencersResp = http.get(`${__ENV.BASE_URL}/api/influencers/search?minReputation=7.0`);
    check(influencersResp, {
      'search API responds': (r) => r.status === 200,
      'search API fast': (r) => r.timings.duration < 500,
    });
    
    sleep(1); // Realistic user think time
  }
  ```

**Mitigation Plan:**
- Enable PostgreSQL connection pooling (PgBouncer or Prisma pooling)
- Cache reputation scores in Vercel edge cache (60s TTL)
- Horizontal scaling: Vercel auto-scales functions (no action needed)
- **Owner:** DevOps team + Backend team
- **Deadline:** Before Sprint 3 (Marketplace launch)

---

### ASR-4: Reputation Calculation SLA (<5s)

**Category:** PERF  
**NFR Source:** PRD - "Reputation score calculations must update within 5 seconds"  
**Architecture Impact:** Drives materialized views, background jobs, cache invalidation strategy  
**Testability Challenge:** Requires large-scale graph dataset (10K+ connections) to validate timing

**Risk Assessment:**
- **Probability:** 3 (Likely) - Recursive CTEs on large graphs are slow, real risk
- **Impact:** 2 (Degraded) - Slow updates = stale data, but not system failure
- **Risk Score:** 3 × 2 = **6 (HIGH RISK)** - Requires mitigation

**Test Strategy:**
- **Tool:** Custom performance tests + k6 API stress tests
- **Frequency:** After graph algorithm changes, before major releases
- **Acceptance Criteria:**
  - Reputation recalculation completes in <5s for 99% of users
  - Background job processes 1000 reputation updates in <30s
  - Cache invalidation triggers within 500ms of trust connection change
- **Test Implementation:**
  ```typescript
  // tests/integration/reputation-performance.spec.ts
  test('reputation calculation meets 5s SLA', async ({ request }) => {
    // Seed large trust network (1K users, 10K connections)
    const users = await seedLargeTrustNetwork({ userCount: 1000, connectionCount: 10000 });
    const testUser = users[faker.datatype.number({ min: 0, max: 999 })];
    
    // Measure reputation calculation time
    const startTime = Date.now();
    
    const response = await request.post('/api/reputation/recalculate', {
      data: { userId: testUser.id }
    });
    
    const duration = Date.now() - startTime;
    
    expect(response.status()).toBe(200);
    expect(duration).toBeLessThan(5000); // <5s SLA
    
    const { reputation, calculatedAt } = await response.json();
    expect(reputation).toBeGreaterThan(0);
    expect(new Date(calculatedAt).getTime()).toBeGreaterThan(startTime);
  });
  ```

**Mitigation Plan:**
- Pre-compute reputation scores in materialized view (PostgreSQL)
- Background job: Recalculate scores every 5 minutes (not on-demand)
- Cache invalidation: Tag-based revalidation on trust edge changes
- Prototype with 10K+ dataset before Sprint 3
- **Owner:** Backend team
- **Deadline:** Before Epic 3 completion (CRITICAL)

---

### ASR Summary Table

| ASR ID | Requirement | Category | Risk Score | Mitigation Priority | Owner | Test Tool |
|--------|-------------|----------|------------|---------------------|-------|-----------|
| ASR-1 | Page load <3s (3G) | PERF | 6 (HIGH) | High | Frontend + Backend | Lighthouse CI |
| ASR-2 | Bot detection 95% | SEC | 6 (HIGH) | High | Backend + Data Science | Playwright + Custom |
| ASR-3 | 10K concurrent users | PERF | 6 (HIGH) | High | DevOps + Backend | k6 |
| ASR-4 | Reputation calc <5s | PERF | 6 (HIGH) | Critical | Backend | Custom + k6 |

**All ASRs are HIGH RISK (score=6)** - Require documented mitigations before Sprint 0.

---

## 3. Test Levels Strategy

Based on architecture (Next.js web app with Server Components, REST API, PostgreSQL) and NFRs.

### 3.1 Recommended Test Distribution

| Test Level | Percentage | Rationale |
|------------|------------|-----------|
| **Unit** | 40% | Business logic (reputation calculation, bot detection algorithms, data validation) |
| **Integration** | 30% | API contracts, database operations, service interactions (NextAuth.js, Prisma) |
| **E2E** | 25% | Critical user journeys (trust connections, campaign discovery, verification voting) |
| **Component** | 5% | UI components (trust network cards, reputation badges) in isolation |

**Rationale:**
- **Web app with moderate complexity:** 40% unit tests for complex reputation algorithms and bot detection logic
- **API-heavy architecture:** 30% integration tests for REST API contracts, Prisma queries, NextAuth sessions
- **Critical user journeys:** 25% E2E for trust building workflows (revenue-impacting, high business value)
- **Component library:** 5% for design system validation (reusable UI components)

### 3.2 Test Level Characteristics Matrix

| Test Level | Speed | Isolation | Confidence | Maintenance | Use For |
|------------|-------|-----------|------------|-------------|---------|
| **Unit** | ⚡️ <1s | 🔒 Complete | ⚠️ Low | ✅ Easy | Pure functions, algorithms, validation logic |
| **Integration** | ⏱️ 1-10s | 🔗 Partial | ✅ Good | ⚠️ Moderate | API endpoints, database queries, service integration |
| **E2E** | 🐌 10-60s | 🌐 None | ✅✅ Highest | ❌ Hard | Critical user journeys, cross-system workflows |
| **Component** | ⚡️ <5s | 🔒 Complete | ⚠️ Moderate | ✅ Easy | UI components, design system validation |

### 3.3 Test Level Selection by Feature Domain

| Feature Domain | Unit | Integration | E2E | Component | Notes |
|----------------|------|-------------|-----|-----------|-------|
| **Trust Network** | 35% | 35% | 25% | 5% | Complex graph algorithms (unit), API interactions (integration), user workflows (E2E) |
| **Reputation System** | 50% | 30% | 15% | 5% | Heavy algorithm focus (unit), score persistence (integration), badge display (E2E) |
| **Marketplace** | 30% | 35% | 30% | 5% | Filters/search (unit), API contracts (integration), discovery flow (E2E) |
| **Authentication** | 20% | 50% | 25% | 5% | Validation (unit), NextAuth integration (integration), login flow (E2E) |
| **Bot Detection** | 60% | 25% | 10% | 5% | Detection algorithms (unit), voting API (integration), reporting UI (E2E) |

### 3.4 Tool Selection

| Test Level | Primary Tool | Justification |
|------------|-------------|---------------|
| **Unit** | Vitest | Fast, TypeScript-native, compatible with Next.js |
| **Integration** | Playwright API Testing | HTTP client for REST APIs, auth support, schema validation |
| **E2E** | Playwright | Official Next.js recommendation, trace viewer, network interception |
| **Component** | Playwright Component Testing (future) | Unified toolchain, defer to Phase 2 |
| **Performance** | k6 | Industry standard for load/stress testing, SLO/SLA validation |
| **Visual Regression** | Playwright (future) | Built-in screenshots, Percy integration (Phase 2) |

**Why Playwright over Cypress:**
- Next.js App Router officially recommends Playwright
- Better performance with parallel execution
- Native TypeScript support (matches project stack)
- Superior debugging (trace viewer, HAR capture)
- API testing built-in (no need for Cypress + Pactum)

---

## 4. NFR Testing Approach

### 4.1 Security NFR

**Requirements:**
- All data encrypted at rest and in transit
- User authentication secure (password hashing, JWT tokens)
- Trust connections protected against manipulation
- 95% bot detection accuracy
- OWASP Top 10 validated (SQL injection, XSS)

**Testing Approach:**

| Security Requirement | Test Level | Tool | Validation Method |
|---------------------|------------|------|-------------------|
| **Auth/Authz** | E2E + Integration | Playwright | Unauthenticated redirect, RBAC enforced, JWT expiry |
| **Secret Handling** | Integration | Playwright API | Passwords never logged, error messages sanitized |
| **SQL Injection** | Integration | Playwright API | Malicious input blocked, no DB errors exposed |
| **XSS** | E2E | Playwright | Script tags escaped in user-generated content |
| **Bot Detection** | Integration | Custom | 95% accuracy on synthetic dataset |
| **Data Encryption** | Manual | SSL Labs, AWS Inspector | TLS 1.3, at-rest encryption verified |

**Test Implementation Highlights:**

```typescript
// tests/nfr/security/authentication.spec.ts
test('unauthenticated users redirected from protected routes', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText('Please sign in')).toBeVisible();
});

test('JWT tokens expire after 15 minutes', async ({ page }) => {
  await loginUser(page, 'test@example.com', 'password123');
  await page.clock.fastForward('00:16:00'); // Fast-forward 16 minutes
  
  const response = await page.request.get('/api/user/profile');
  expect(response.status()).toBe(401);
});

// tests/nfr/security/bot-detection.spec.ts
test('bot detection achieves 95% accuracy', async ({ request }) => {
  const dataset = await generateBotDetectionDataset({ realUsers: 50, botUsers: 50 });
  const results = await request.post('/api/verification/batch-analyze', { data: dataset });
  const accuracy = calculateAccuracy(results);
  expect(accuracy).toBeGreaterThanOrEqual(0.95);
});
```

**Security NFR Status:**
- ✅ **PASS** with mitigations (bot detection validation dataset needed before Sprint 3)

---

### 4.2 Performance NFR

**Requirements:**
- Page load <3s on 3G connections
- User actions complete within 2s
- Support 10K+ concurrent users
- Reputation calculations <5s
- Lighthouse score >85

**Testing Approach:**

| Performance Requirement | Test Level | Tool | Validation Method |
|------------------------|------------|------|-------------------|
| **Page Load <3s** | E2E | Lighthouse CI | FCP <1.8s, LCP <2.5s, TTI <3.5s |
| **API Response <2s** | Integration | k6 | P95 response time <500ms under load |
| **10K Concurrent Users** | Load Testing | k6 | Sustained load for 10 minutes, error rate <1% |
| **Reputation Calc <5s** | Integration | Custom | 99% of calculations complete in <5s |
| **Core Web Vitals** | E2E | Lighthouse CI | Performance score ≥85 |

**Test Implementation Highlights:**

```javascript
// tests/nfr/performance/load-test.k6.js
export const options = {
  stages: [
    { duration: '5m', target: 10000 }, // Ramp to 10K users
    { duration: '10m', target: 10000 }, // Sustain 10K
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // P95 <500ms
    http_req_failed: ['rate<0.01'],   // Error rate <1%
  },
};

export default function () {
  http.get(`${__ENV.BASE_URL}/api/campaigns?limit=20`);
  sleep(1);
}
```

```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  run: lhci autorun --config=lighthouserc.json

# lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "performance-score": ["error", { "minScore": 0.85 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }]
      }
    }
  }
}
```

**Performance NFR Status:**
- ⚠️ **CONCERNS** - Reputation calculation and trust graph queries need performance validation with large datasets before Sprint 3

---

### 4.3 Reliability NFR

**Requirements:**
- Graceful degradation on API failures
- Retry logic on transient errors (3 attempts)
- Health check endpoint monitoring
- Circuit breaker on repeated failures
- 99.9% uptime for core features

**Testing Approach:**

| Reliability Requirement | Test Level | Tool | Validation Method |
|------------------------|------------|------|-------------------|
| **Error Handling** | E2E | Playwright | 500 error → user-friendly message + retry button |
| **Retry Logic** | Integration | Playwright API | 3 attempts on 503, eventual success |
| **Health Checks** | Integration | Playwright API | `/api/health` returns service status |
| **Circuit Breaker** | E2E | Playwright | Opens after 5 failures, fallback UI shown |
| **Offline Handling** | E2E | Playwright | Network disconnection → sync when reconnected |

**Test Implementation Highlights:**

```typescript
// tests/nfr/reliability/error-handling.spec.ts
test('app remains functional when API returns 500', async ({ page, context }) => {
  await context.route('**/api/campaigns', (route) => {
    route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) });
  });
  
  await page.goto('/marketplace');
  await expect(page.getByText('Unable to load campaigns. Please try again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  
  // Navigation still works (graceful degradation)
  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL('/');
});

test('API client retries on transient failures', async ({ page, context }) => {
  let attemptCount = 0;
  
  await context.route('**/api/checkout', (route) => {
    attemptCount++;
    if (attemptCount < 3) {
      route.fulfill({ status: 503 }); // Fail first 2 attempts
    } else {
      route.fulfill({ status: 200, body: JSON.stringify({ orderId: '12345' }) });
    }
  });
  
  await page.goto('/checkout');
  await page.click('[data-testid="place-order"]');
  
  await expect(page.getByText('Order placed successfully')).toBeVisible();
  expect(attemptCount).toBe(3); // Verified 3 attempts
});
```

**Reliability NFR Status:**
- ✅ **PASS** - Stateless architecture supports excellent reliability testing

---

### 4.4 Maintainability NFR

**Requirements:**
- Test coverage ≥80% for critical paths
- Code duplication <5%
- No critical/high vulnerabilities
- Structured logging with trace IDs
- Error tracking configured (Sentry)

**Testing Approach:**

| Maintainability Requirement | Test Level | Tool | Validation Method |
|-----------------------------|------------|------|-------------------|
| **Test Coverage ≥80%** | CI Job | Vitest + c8 | Coverage report in GitHub Actions |
| **Code Duplication <5%** | CI Job | jscpd | Duplication scan in GitHub Actions |
| **No Vulnerabilities** | CI Job | npm audit, Snyk | Security scan in GitHub Actions |
| **Observability** | Integration | Playwright API | `x-trace-id` header present, Sentry capture validated |
| **Structured Logging** | Integration | Playwright API | `Server-Timing` header contains `db`, `total` |

**Test Implementation Highlights:**

```yaml
# .github/workflows/maintainability.yml
test-coverage:
  runs-on: ubuntu-latest
  steps:
    - name: Run tests with coverage
      run: npm run test:coverage
    
    - name: Check coverage threshold
      run: |
        COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
        if (( $(echo "$COVERAGE < 80" | bc -l) )); then
          echo "❌ FAIL: Coverage $COVERAGE% below 80%"
          exit 1
        fi

code-duplication:
  runs-on: ubuntu-latest
  steps:
    - name: Check duplication
      run: npx jscpd src/ --threshold 5

vulnerability-scan:
  runs-on: ubuntu-latest
  steps:
    - name: Run npm audit
      run: npm audit --audit-level=high
```

```typescript
// tests/nfr/observability.spec.ts
test('API responses include trace IDs', async ({ request }) => {
  const response = await request.get('/api/campaigns?limit=10');
  
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['x-trace-id']).toBeTruthy(); // Trace ID present
});

test('Server-Timing header includes metrics', async ({ request }) => {
  const response = await request.get('/api/products?limit=10');
  
  const serverTiming = response.headers()['server-timing'];
  expect(serverTiming).toBeTruthy();
  expect(serverTiming).toContain('db'); // Database query time
  expect(serverTiming).toContain('total'); // Total processing time
});
```

**Maintainability NFR Status:**
- ⚠️ **CONCERNS** - Structured logging and APM integration needed before Sprint 0 (BLOCKERS for observability validation)

---

### 4.5 NFR Summary Table

| NFR Category | Status | Test Coverage | Tool(s) | Gate Blocker? |
|--------------|--------|---------------|---------|---------------|
| **Security** | ✅ PASS | Auth/authz, bot detection, OWASP | Playwright, Custom | No |
| **Performance** | ⚠️ CONCERNS | Page load, API timing, concurrency | Lighthouse CI, k6 | No (mitigations documented) |
| **Reliability** | ✅ PASS | Error handling, retries, health checks | Playwright | No |
| **Maintainability** | ⚠️ CONCERNS | Coverage, observability, vulnerabilities | GitHub Actions, Playwright | Yes (logging/APM required) |

**Overall NFR Assessment:** ⚠️ **CONCERNS** - Maintainability blockers (logging, APM) must be resolved before Sprint 0.

---

## 5. Test Environment Requirements

Based on deployment architecture (Vercel serverless, PostgreSQL, NextAuth.js OAuth).

### 5.1 Environment Matrix

| Environment | Purpose | Data State | Deployment | Access |
|-------------|---------|------------|------------|--------|
| **Local** | Unit tests, component tests | Ephemeral (in-memory SQLite) | Developer machines | All developers |
| **CI (GitHub Actions)** | Full test suite | Ephemeral (PostgreSQL container) | On every PR | Automated only |
| **Staging** | E2E tests, manual QA | Persistent (reset nightly) | On merge to main | QA team + developers |
| **Production** | Smoke tests only | Live data | On release | Read-only monitoring |

### 5.2 Environment Configuration

```yaml
# Example: CI environment setup
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: vox_test
        ports:
          - 5432:5432
    
    steps:
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/vox_test
      
      - name: Run tests
        run: npm run test:all
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/vox_test
          NEXTAUTH_URL: http://localhost:3000
          NEXTAUTH_SECRET: test_secret
```

### 5.3 Test Data Strategy

| Data Type | Source | Reset Frequency | Seeding Method |
|-----------|--------|-----------------|----------------|
| **Users** | Factories (faker.js) | Per test | Prisma API seeding |
| **Trust Connections** | Factories | Per test | Prisma API seeding |
| **Campaigns** | Factories | Per test | Prisma API seeding |
| **Reputation Scores** | Pre-computed fixtures | Per test | Materialized view snapshot |
| **OAuth Tokens** | Mock responses | Per test | Route interception |

**Example Factory:**

```typescript
// tests/factories/user-factory.ts
import { faker } from '@faker-js/faker';

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    name: faker.name.fullName(),
    userType: 'influencer',
    reputation: 5.0,
    hasSeenWelcome: false,
    createdAt: faker.date.past(),
    ...overrides,
  };
}

export function createTrustConnection(overrides: Partial<TrustEdge> = {}): TrustEdge {
  return {
    id: faker.datatype.uuid(),
    fromId: faker.datatype.uuid(),
    toId: faker.datatype.uuid(),
    status: 'accepted',
    createdAt: faker.date.past(),
    ...overrides,
  };
}
```

---

## 6. Testability Concerns

### 6.1 Architectural Concerns

| Concern | Impact | Severity | Mitigation | Owner | Deadline |
|---------|--------|----------|------------|-------|----------|
| **Trust graph queries at scale** | Recursive CTEs may timeout with 10K+ connections | ⚠️ Medium | Pre-compute materialized views, prototype with large dataset | Backend team | Before Sprint 3 |
| **Reputation calculation SLA** | Complex algorithm may exceed 5s SLA | ⚠️ Medium | Background jobs, cache invalidation, profiling | Backend team | Before Epic 3 completion |
| **No structured logging** | Cannot correlate E2E test failures with backend logs | 🚨 High | Add logging middleware with trace IDs | Backend team | Before Sprint 0 |
| **No APM integration** | Cannot validate Performance NFRs (API timing) | 🚨 High | Add Vercel Analytics or Datadog APM | DevOps team | Before Sprint 0 |
| **Vercel cold starts** | Serverless functions have 200-500ms cold start delays | ⚠️ Low | Warm up endpoints in test setup | QA team | During framework setup |

### 6.2 Testability Concerns Summary

**Critical Blockers (Must resolve before Sprint 0):**
- ❌ No structured logging with trace IDs
- ❌ No APM integration (Server-Timing headers)

**Non-Blockers (Mitigate during implementation):**
- ⚠️ Trust graph query performance (prototype in Epic 3)
- ⚠️ Reputation calculation timing (validate in Sprint 3)
- ⚠️ Vercel cold start delays (warm-up in test setup)

---

## 7. Recommendations for Sprint 0

### 7.1 Framework Setup (*framework workflow)

**Actions:**
1. Initialize Playwright with TypeScript config
2. Configure test database (PostgreSQL in Docker for CI)
3. Set up Prisma factories for data seeding
4. Implement fixture-based cleanup pattern
5. Configure Lighthouse CI for performance validation
6. Set up k6 for load testing
7. Add structured logging middleware (BLOCKER)
8. Integrate Vercel Analytics or Datadog APM (BLOCKER)

**Deliverables:**
- `tests/` directory structure:
  ```
  tests/
    ├── e2e/               # Playwright E2E tests
    ├── integration/       # Playwright API tests
    ├── unit/              # Vitest unit tests
    ├── nfr/               # NFR validation tests (k6, Lighthouse)
    ├── factories/         # Data factories (faker.js)
    └── fixtures/          # Playwright fixtures (auto-cleanup)
  ```
- `playwright.config.ts` with projects (chromium, firefox, mobile)
- `lighthouserc.json` with performance thresholds
- `k6` load testing scripts for ASR-3

### 7.2 CI/CD Pipeline (*ci workflow)

**Actions:**
1. Configure GitHub Actions pipeline:
   - Run unit tests on every PR
   - Run integration tests on PR to main
   - Run E2E tests on merge to main
   - Run Lighthouse CI on merge to main
   - Run k6 load tests weekly (scheduled)
2. Set up test result reporting (GitHub Checks)
3. Configure code coverage enforcement (80% threshold)
4. Set up vulnerability scanning (npm audit)
5. Configure Playwright trace capture on failures

**Pipeline Structure:**
```yaml
# .github/workflows/test.yml
name: Test Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
  
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
    steps:
      - run: npm run test:integration
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-traces
          path: test-results/
  
  lighthouse:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npm run build
      - run: lhci autorun --config=lighthouserc.json
```

### 7.3 Test Design for Epics

**Epic 1 (Foundation):**
- Unit: Validation utilities, helper functions
- Integration: Database migrations, Prisma queries
- E2E: Not applicable (no user-facing features)

**Epic 2 (Authentication):**
- Unit: Password hashing, JWT validation (20%)
- Integration: NextAuth.js sessions, OAuth callbacks (50%)
- E2E: Login/logout flows, registration (25%)
- Component: Login form, registration form (5%)

**Epic 3 (Trust Network):**
- Unit: Graph traversal algorithms, reputation calculation (50%)
- Integration: Trust edge CRUD APIs, reputation queries (30%)
- E2E: Send/accept trust requests, view network (15%)
- Component: Trust network cards, reputation badges (5%)

**Epic 4 (Marketplace):**
- Unit: Search filters, recommendation logic (30%)
- Integration: Campaign APIs, collaboration requests (35%)
- E2E: Campaign discovery, influencer search (30%)
- Component: Campaign cards, search filters (5%)

**Epic 5 (Collaboration):**
- Unit: Milestone tracking logic (30%)
- Integration: Campaign communication APIs (35%)
- E2E: Join campaign, track progress (30%)
- Component: Progress tracker, file upload (5%)

**Epic 6 (Verification):**
- Unit: Bot detection algorithms (60%)
- Integration: Voting APIs, report APIs (25%)
- E2E: Vote on authenticity, report accounts (10%)
- Component: Voting UI, report modal (5%)

**Epic 7 (Administration):**
- Unit: Analytics calculations (20%)
- Integration: Admin APIs, user management (50%)
- E2E: Admin dashboard, suspend accounts (25%)
- Component: Analytics charts (5%)

---

## 8. Gate Check Recommendation

### 8.1 Gate Decision

**Decision:** ⚠️ **CONCERNS** (Proceed with Documented Mitigations)

**Rationale:**
- **Controllability:** ✅ PASS - Excellent foundation with Prisma factories, API seeding, route mocking
- **Observability:** ⚠️ CONCERNS - Missing structured logging and APM integration (BLOCKERS)
- **Reliability:** ✅ PASS - Stateless architecture, serverless isolation, excellent error recovery testing support
- **Overall Testability:** 8.1/10 (PASS with CONCERNS)

**Critical Blockers (Must resolve before Sprint 0):**
1. ❌ Add structured logging middleware with trace ID propagation
2. ❌ Integrate APM (Vercel Analytics or Datadog) with Server-Timing headers

**Non-Blocking Concerns (Mitigate during implementation):**
3. ⚠️ Validate trust graph query performance with 10K+ connection dataset (Epic 3)
4. ⚠️ Validate reputation calculation timing with large-scale data (Epic 3)
5. ⚠️ Create synthetic bot detection dataset for 95% accuracy validation (Sprint 3)

### 8.2 Next Steps

**Before Sprint 0:**
1. Backend team: Implement logging middleware (`lib/middleware/logger.ts`)
2. DevOps team: Integrate APM (Vercel Analytics or Datadog)
3. QA team: Set up test framework (`*framework` workflow)
4. QA team: Configure CI/CD pipeline (`*ci` workflow)

**During Sprint 0:**
1. Backend team: Prototype reputation calculation with 10K+ dataset
2. Backend team: Benchmark trust graph recursive CTE queries
3. QA team: Create synthetic bot detection dataset
4. QA team: Write E2E tests for authentication (Epic 2)

**Before Epic 3 Completion:**
1. Backend team: Optimize reputation calculation to meet <5s SLA
2. Backend team: Implement materialized views for reputation scores
3. QA team: Validate performance with k6 load tests (10K concurrent users)

### 8.3 Sign-Off

- **Test Architect (Murat):** ⚠️ Approve with conditions (logging + APM required)
- **Architecture Review:** ✅ Pass (strong testability foundation)
- **Security Review:** ✅ Pass (security testing strategy validated)
- **Performance Review:** ⚠️ Pass with concerns (performance validation plan documented)

---

## Appendix A: Risk Summary

| Risk ID | Category | Description | Probability | Impact | Score | Status | Mitigation Owner | Deadline |
|---------|----------|-------------|-------------|--------|-------|--------|------------------|----------|
| R-001 | PERF | Trust graph queries may timeout at scale | 2 | 3 | 6 | OPEN | Backend team | Sprint 3 |
| R-002 | PERF | Reputation calculation exceeds 5s SLA | 3 | 2 | 6 | OPEN | Backend team | Epic 3 |
| R-003 | OPS | No structured logging for debugging | 3 | 3 | 9 | OPEN | Backend team | Sprint 0 |
| R-004 | OPS | No APM for performance validation | 3 | 3 | 9 | OPEN | DevOps team | Sprint 0 |
| R-005 | SEC | Bot detection dataset unavailable | 2 | 3 | 6 | OPEN | Backend team | Sprint 3 |
| R-006 | PERF | Vercel cold starts affect test stability | 2 | 1 | 2 | OPEN | QA team | Framework setup |

**Critical Risks (Score=9):** R-003, R-004 (BLOCKERS for Sprint 0)  
**High Risks (Score=6):** R-001, R-002, R-005 (Non-blockers with mitigation plans)  
**Low Risks (Score≤2):** R-006 (Minor concern)

---

## Appendix B: Knowledge Base References

- **nfr-criteria.md:** Security, performance, reliability, maintainability validation criteria
- **test-levels-framework.md:** Unit vs Integration vs E2E decision matrix
- **risk-governance.md:** Risk scoring (probability × impact), gate decision engine, mitigation tracking
- **test-quality.md:** Test quality standards (deterministic, isolated, <1.5min, <300 lines)
- **fixture-architecture.md:** Playwright fixture patterns, auto-cleanup discipline
- **network-first.md:** Network interception patterns, HAR capture, deterministic waits
- **selective-testing.md:** Tag-based execution, spec filters, diff-based selection

---

## Document Metadata

**Generated by:** Murat (Master Test Architect)  
**Workflow:** `*test-design` (System-Level Mode)  
**Input Documents:**
- `/home/riddler/vox/docs/architecture.md`
- `/home/riddler/vox/docs/prd.md`
- `/home/riddler/vox/docs/epics.md`
- `/home/riddler/vox/docs/project_context.md`

**Knowledge Base Fragments:**
- `nfr-criteria.md`
- `test-levels-framework.md`
- `risk-governance.md`
- `test-quality.md`

**Version:** 1.0  
**Date:** 2025-12-04  
**Status:** Ready for Review

---

**End of System-Level Test Design**
