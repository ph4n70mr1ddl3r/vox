---
project_name: 'vox'
user_name: 'Riddler'
date: '2025-12-04'
sections_completed: ['technology_stack', 'implementation_rules', 'patterns', 'anti_patterns', 'testing']
source: 'architecture.md'
---

# Project Context for AI Agents - vox

_This file contains critical rules and patterns that AI agents must follow when implementing code in vox. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

**Frontend Framework:**
- **Next.js:** 16.x (App Router, TypeScript, Server Components)
- **TypeScript:** 5.x (strict mode enabled)
- **Styling:** Tailwind CSS v3 with PostCSS
- **UI Components:** Headless UI (no pre-built component library)

**Backend & Runtime:**
- **Node.js:** 18+ LTS
- **Runtime Environment:** Vercel Functions (serverless)

**Database:**
- **Primary:** PostgreSQL (latest LTS)
- **ORM:** Prisma (latest version)
- **Graph Support:** Custom recursive SQL queries for trust network

**Authentication:**
- **System:** NextAuth.js (latest)
- **OAuth Providers:** Google, GitHub, Discord (configured in code)
- **Session:** JWT-based with custom claims

**Deployment:**
- **Platform:** Vercel (zero-config deployment)
- **Database Hosting:** External PostgreSQL (recommend Vercel Postgres or AWS RDS)
- **CDN:** Vercel Edge Network (automatic)

**Development Tools:**
- **Build Tool:** Turbopack (default Next.js 16)
- **Linter:** ESLint with Next.js plugin
- **Code Formatter:** Prettier (recommended, not enforced)
- **Testing:** Vitest (unit/integration) + Playwright (E2E)

---

## Critical Implementation Rules

### Rule 1: Database Naming Convention - STRICT

**Database layer (Prisma schema):** `snake_case` ALWAYS
```prisma
model User {
  id           String   @id
  email        String   @unique
  user_type    String   // NOT "userType"
  created_at   DateTime @default(now())
}
```

**TypeScript/Application layer:** `camelCase` ALWAYS
```typescript
interface User {
  id: string
  email: string
  userType: string // NOT "user_type"
  createdAt: Date
}
```

**Prisma auto-maps:** Use `@map("database_name")` for complex mappings

**Violation consequence:** Type mismatches between DB and code, runtime errors

---

### Rule 2: API Endpoints - RESTful Plural Resources Only

**ALL API endpoints MUST be:**
- Plural resource names: `/api/trust-connections/` NOT `/api/trust-connection/`
- Kebab-case routes: `/api/trust-connections/` NOT `/api/trustConnections/`
- RESTful HTTP verbs:
  - `GET /api/campaigns/` - List all
  - `POST /api/campaigns/` - Create new
  - `GET /api/campaigns/:id` - Get one
  - `PUT /api/campaigns/:id` - Update
  - `DELETE /api/campaigns/:id` - Delete
  - `POST /api/campaigns/:id/join` - Custom actions as nested routes

**Never use RPC-style endpoints:**
- ❌ `/api/createCampaign`
- ❌ `/api/getUserReputation`
- ❌ `/api/acceptTrustConnection`

**Violation consequence:** Inconsistent API design, confusing endpoints, future refactoring headaches

---

### Rule 3: API Response Wrapper Format - MANDATORY

**EVERY API response MUST have this exact structure:**

Success response:
```typescript
{
  success: true,
  data: { /* actual data */ },
  meta: {
    timestamp: "2025-12-04T10:00:00Z"
    // optional pagination for lists
    pagination?: { page: 1, pageSize: 20, total: 150, pages: 8 }
  }
}
```

Error response:
```typescript
{
  success: false,
  error: {
    code: 'INSUFFICIENT_REPUTATION', // UPPER_SNAKE_CASE
    message: 'User reputation must be >= 7.0',
    details: { required: 7.0, current: 5.5 } // optional
  },
  meta: { timestamp: "2025-12-04T10:00:00Z" }
}
```

**Use helper functions:** Import from `lib/api-responses.ts`
```typescript
import { successResponse, errorResponse } from '@/lib/api-responses'

export async function POST(req: Request) {
  try {
    const data = await prisma.campaign.create(...)
    return successResponse(data)
  } catch (error) {
    return errorResponse('INVALID_INPUT', 'Campaign creation failed', 400)
  }
}
```

**Violation consequence:** Frontend can't parse responses, broken error handling, inconsistent error messages

---

### Rule 4: File Naming - Component vs Utility

**Component files (React):** PascalCase
- ✅ `UserCard.tsx`
- ✅ `TrustNetwork.tsx`
- ✅ `CampaignForm.tsx`
- ❌ `userCard.tsx`
- ❌ `trust_network.tsx`

**Utility/helper files:** camelCase
- ✅ `calculateReputation.ts`
- ✅ `auth-guard.ts` (with hyphens allowed)
- ✅ `validateTrustConnection.ts`
- ❌ `CalculateReputation.ts`
- ❌ `trust_connection_validator.ts`

**Hook files:** camelCase with `use` prefix
- ✅ `useUserProfile.ts`
- ✅ `useTrustNetwork.ts`
- ✅ `useReputation.ts`
- ❌ `UseUserProfile.ts`
- ❌ `userProfileHook.ts`

**Violation consequence:** Inconsistent imports, confusion about component vs utility purpose, build errors

---

### Rule 5: Project Structure - Feature-Based Organization

**Core organization principle:** By feature domain, NOT by file type

```
✅ CORRECT:
src/
  ├── app/profile/
  │   ├── [id]/page.tsx
  │   ├── components/
  │   │   ├── ProfileCard.tsx
  │   │   └── TrustNetwork.tsx
  │   └── hooks/
  │       └── useUserProfile.ts
  ├── app/marketplace/
  │   ├── page.tsx
  │   └── components/
  │       └── CampaignCard.tsx

❌ WRONG:
src/
  ├── components/
  │   ├── ProfileCard.tsx
  │   ├── TrustNetwork.tsx
  │   ├── CampaignCard.tsx
  │   └── ...everything mixed
  ├── pages/
  ├── hooks/
  └── utils/
```

**Rules:**
- Feature-specific components stay in feature folder
- Shared components in `components/` only if used by 3+ features
- Utilities in `lib/` organized by domain (not by type)
- Tests mirror app structure: `tests/profile/`, `tests/marketplace/`, etc.

**Violation consequence:** Hard to find code, duplication, poor feature encapsulation

---

### Rule 6: Server Components vs Client Components

**Default to Server Components** (Next.js App Router best practice)

```typescript
// ✅ Server Component (default)
export default async function ProfilePage({ params }: Props) {
  const user = await prisma.user.findUnique({ where: { id: params.id } })
  return <ProfileDisplay user={user} />
}

// ❌ Wrong - unnecessary 'use client' marker
'use client'
import { useEffect, useState } from 'react'
export default function ProfilePage({ params }: Props) {
  const [user, setUser] = useState(null)
  useEffect(() => {
    fetch(`/api/users/${params.id}`).then(r => r.json()).then(setUser)
  }, [])
  // ...
}
```

**Use 'use client' ONLY when you need:**
- React hooks (useState, useEffect, etc.)
- Event listeners
- Browser APIs
- Client-side interactivity

**Violation consequence:** Unnecessary JavaScript sent to client, slower page loads, missed Server Component benefits

---

### Rule 7: Loading States - Explicit Types, Never Undefined

**ALWAYS use explicit loading state types:**

```typescript
// ✅ CORRECT
type LoadingState = 'idle' | 'loading' | 'success' | 'error'

interface PageState {
  data: any | null
  state: LoadingState
  error: string | null
}

// ❌ WRONG - undefined is ambiguous
interface PageState {
  data?: any
  loading?: boolean
  error?: string
}
```

**In components:**
```typescript
// ✅ CORRECT with Suspense for Server Components
import { Suspense } from 'react'

export function ProfileWithTrust({ userId }) {
  return (
    <>
      <ProfileCard userId={userId} />
      <Suspense fallback={<TrustNetworkSkeleton />}>
        <TrustNetwork userId={userId} />
      </Suspense>
    </>
  )
}

// ✅ CORRECT with explicit state for client components
'use client'
export function CampaignForm() {
  const [state, setState] = useState<LoadingState>('idle')
  
  return (
    <form>
      <button disabled={state === 'loading'}>
        {state === 'loading' ? 'Creating...' : 'Create Campaign'}
      </button>
    </form>
  )
}
```

**Violation consequence:** Undefined behavior, bugs when state is neither loading nor done, confusing component logic

---

### Rule 8: Error Handling - Always Use Typed Errors

**Define error types in `lib/errors.ts`:**

```typescript
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message)
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: { code: 'UNAUTHORIZED', statusCode: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', statusCode: 403 },
  INSUFFICIENT_REPUTATION: { code: 'INSUFFICIENT_REPUTATION', statusCode: 403 },
  INVALID_INPUT: { code: 'INVALID_INPUT', statusCode: 400 },
  NOT_FOUND: { code: 'NOT_FOUND', statusCode: 404 },
  DUPLICATE_ENTRY: { code: 'DUPLICATE_ENTRY', statusCode: 409 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', statusCode: 500 },
} as const
```

**Use in API routes:**
```typescript
export async function POST(req: Request) {
  try {
    const session = await getServerSession()
    if (!session) {
      throw new ApiError(
        ErrorCodes.UNAUTHORIZED.code,
        'Authentication required',
        ErrorCodes.UNAUTHORIZED.statusCode
      )
    }
    // ... operation
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.code, error.message, error.statusCode)
    }
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred')
  }
}
```

**Violation consequence:** Inconsistent error messages, hard to debug, frontend can't parse error responses

---

### Rule 9: Database Transactions for Reputation Updates

**ALWAYS wrap reputation-affecting operations in transactions:**

```typescript
// ✅ CORRECT - atomic operation
await prisma.$transaction([
  prisma.trustEdge.update({
    where: { id: edgeId },
    data: { status: 'accepted' }
  }),
  prisma.user.update({
    where: { id: fromUserId },
    data: { reputation: { increment: 0.1 } }
  }),
  // Invalidate cache tags
])

// ❌ WRONG - could partially complete
await prisma.trustEdge.update({ ... })
await prisma.user.update({ ... })
// If second update fails, edge is accepted but reputation not updated
```

**After transactions, invalidate cache:**
```typescript
import { revalidateTag } from 'next/cache'

await prisma.$transaction([...])
revalidateTag(`reputation-${userId}`)
revalidateTag(`trust-connections-${userId}`)
```

**Violation consequence:** Data inconsistency, reputation scores out of sync, trust edges not matching user reputation

---

### Rule 10: Authentication - Trust Network Access Control

**All routes checking reputation MUST use `requireMinReputation`:**

```typescript
// lib/auth/auth-guard.ts
export async function requireMinReputation(reputation: number) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  if (session.user.reputation < reputation) {
    throw new ApiError(
      'INSUFFICIENT_REPUTATION',
      `Minimum reputation ${reputation} required`,
      403
    )
  }
  return session.user
}

// In Server Components
export default async function SponsorCampaigns() {
  const user = await requireMinReputation(7.0)
  // Only users with 7.0+ reputation reach this line
  return <CampaignSponsorship user={user} />
}

// In API routes
export async function POST(req: Request) {
  try {
    const user = await requireMinReputation(5.0)
    // ... operation
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.code, error.message, error.statusCode)
    }
    throw error
  }
}
```

**Authorization tiers:**
- Brands: Minimum 6.0 reputation to post campaigns
- Influencers: Minimum 7.0 to access premium analytics
- Followers: Minimum 5.0 to participate in collaborations

**Violation consequence:** Unauthorized users can access restricted features, security vulnerability

---

### Rule 11: Prisma Schema Relationships - Always Include Relations

**When querying with relationships, ALWAYS include the relation:**

```typescript
// ✅ CORRECT - includes related data
const influencer = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    trustGiven: {
      where: { status: 'accepted' },
      include: { to: { select: { id: true, name: true, reputation: true } } }
    },
    trustReceived: { where: { status: 'accepted' } },
    campaigns: true,
    collaborations: { include: { campaign: true } }
  }
})

// ❌ WRONG - missing relations, have to fetch separately
const influencer = await prisma.user.findUnique({
  where: { id: userId }
})
const trustGiven = await prisma.trustEdge.findMany({
  where: { fromId: userId, status: 'accepted' }
})
// Now trustGiven data is separate, hard to correlate
```

**Violation consequence:** N+1 query problem, poor performance, UI can't render related data

---

### Rule 12: Cache Invalidation - Always Use Tags

**NEVER use generic `revalidatePath` - ALWAYS use `revalidateTag`:**

```typescript
// ✅ CORRECT
import { revalidateTag } from 'next/cache'

export async function acceptTrustConnection(edgeId: string) {
  const edge = await prisma.trustEdge.update({
    where: { id: edgeId },
    data: { status: 'accepted' }
  })

  // Invalidate specific cached data
  revalidateTag(`reputation-${edge.fromId}`)
  revalidateTag(`reputation-${edge.toId}`)
  revalidateTag(`trust-connections-${edge.fromId}`)
  
  return edge
}

// ❌ WRONG - invalidates everything
export async function acceptTrustConnection(edgeId: string) {
  const edge = await prisma.trustEdge.update({ ... })
  revalidatePath('/') // Clears ENTIRE cache!
  return edge
}
```

**Server Components using tags:**
```typescript
export default async function ReputationDisplay({ userId }: Props) {
  const reputation = await getReputationScore(userId)
  // Component is automatically cached and tagged with 'reputation-{userId}'
  return <div>{reputation}</div>
}

async function getReputationScore(userId: string) {
  return unstable_cache(
    async () => {
      return prisma.reputationScore.findUnique({ where: { userId } })
    },
    [`reputation-${userId}`],
    { revalidate: 60 } // Cache for 60 seconds
  )()
}
```

**Violation consequence:** Stale cache, users see outdated data, or cache too aggressively cleared affecting performance

---

## Patterns to Follow

### Pattern 1: Server Component Data Fetching

```typescript
// ✅ CORRECT - Server Component fetches directly
export default async function ProfilePage({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { trustGiven: true, campaigns: true }
  })
  
  if (!user) notFound()
  
  return (
    <div>
      <h1>{user.name}</h1>
      <ReputationBadge score={user.reputation} />
      <TrustNetwork connections={user.trustGiven} />
    </div>
  )
}
```

### Pattern 2: API Route Mutations

```typescript
// ✅ CORRECT - API route handles state changes
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { toUserId } = await req.json()
  
  try {
    const connection = await prisma.trustEdge.create({
      data: {
        fromId: session.user.id,
        toId: toUserId,
        status: 'pending'
      }
    })
    
    revalidateTag(`trust-connections-${session.user.id}`)
    return successResponse(connection)
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return errorResponse('DUPLICATE_ENTRY', 'Connection already exists', 409)
      }
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to create connection')
  }
}
```

### Pattern 3: Form Submissions

```typescript
// ✅ CORRECT - Form action calling API route
'use client'
export function TrustRequestForm({ toUserId }: Props) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setIsPending(true)
    setError(null)
    
    try {
      const response = await fetch('/api/trust-connections', {
        method: 'POST',
        body: JSON.stringify({ toUserId })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        setError(result.error.message)
        return
      }
      
      // Success - redirect or update state
      window.location.reload()
    } catch (err) {
      setError('Failed to send request')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button onClick={handleSubmit} disabled={isPending}>
      {isPending ? 'Sending...' : 'Send Trust Request'}
      {error && <p className="text-red-500">{error}</p>}
    </button>
  )
}
```

---

## Anti-Patterns to Avoid

**❌ DO NOT:**
- Mix snake_case and camelCase in same layer (database vs application)
- Create singular API endpoints (`/api/campaign/` instead of `/api/campaigns/`)
- Return raw data from API routes without wrapper
- Use custom error formats inconsistent with ErrorCodes
- Place all components in `components/` folder (breaks feature organization)
- Use `undefined` as a state value
- Swallow errors without logging
- Query relationships without `include`
- Use `revalidatePath('/')` generically - always use specific tags
- Create client components when Server Components would work

---

## Testing Rules

**Unit Tests:** Test utilities and business logic in isolation
- Location: `tests/unit/`
- Tools: Vitest
- Pattern: Describe blocks organized by function name

**Integration Tests:** Test API routes and database interactions
- Location: `tests/integration/`
- Tools: Vitest + `@testing-library/node`
- Pattern: Test complete request/response cycles

**E2E Tests:** Test complete user journeys
- Location: `tests/e2e/`
- Tools: Playwright
- Pattern: Full user flows from login to campaign creation

**Mock Pattern:**
```typescript
// Always mock Prisma in tests
jest.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    trustEdge: { create: jest.fn() }
  }
}))
```

---

## Development Workflow

**Branch Naming:**
- Feature: `feature/trust-graph-visualization`
- Bug fix: `fix/reputation-calculation-bug`
- Chore: `chore/update-dependencies`

**Commit Messages:**
```
<type>(<scope>): <subject>

<body>

Closes #<issue-number>
```

**Code Review Checklist:**
- [ ] Follows architecture patterns exactly
- [ ] Database naming (snake_case) vs app naming (camelCase) correct
- [ ] API responses wrapped correctly
- [ ] Error handling uses typed errors
- [ ] Reputation updates in transactions
- [ ] Cache tags properly invalidated
- [ ] Tests included and passing
- [ ] No console.log statements in production code

---

## Common Mistakes to Avoid

1. **Forgetting `await` on async Prisma queries** - query returns Promise, not data
2. **Mixing `select` and `include` in Prisma** - use one or the other
3. **Not checking session before accessing user data** - always validate auth
4. **Forgetting cache invalidation after mutations** - users see stale data
5. **Wrapping unnecessarily in `'use client'`** - default to Server Components
6. **Not using transactions for reputation updates** - data becomes inconsistent
7. **Generic error messages** - use specific ErrorCodes
8. **Forgetting to handle loading states** - UI appears broken
9. **Accessing `params` in layout without `generateStaticParams`** - builds fail
10. **Not including relationships when querying** - N+1 query problem

---

**Last Updated:** 2025-12-04  
**Source:** Derived from architecture.md step-by-step validation  
**Next Review:** After first sprint implementation

