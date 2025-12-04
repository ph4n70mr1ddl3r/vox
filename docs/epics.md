# vox - Epic Breakdown

**Author:** Riddler
**Date:** 2025-12-04
**Project Level:** MVP
**Target Scale:** 10,000 active users in first 6 months

---

## Overview

This document provides the complete epic and story breakdown for vox, decomposing the requirements from the [PRD](./prd.md) into implementable stories with full technical context from [Architecture](./architecture.md) and user experience patterns from [UX Design](./ux-design-specification.md).

Each epic delivers incremental user value. Stories incorporate:
- **WHAT to build** (from PRD functional requirements)
- **HOW to build it** (from Architecture decisions)  
- **HOW users interact** (from UX patterns)

**Epics Summary:**
- **Epic 1:** Foundation & Core Infrastructure (enables all subsequent work)
- **Epic 2:** User Authentication & Profile Management (users can join and build identity)
- **Epic 3:** Trust Network & Reputation System (core differentiation - authentic connections)
- **Epic 4:** Marketplace & Campaign Discovery (brands find verified influencers)
- **Epic 5:** Collaboration & Campaign Execution (brands + influencers work together)
- **Epic 6:** Community Verification & Moderation (prevents bots, maintains trust)
- **Epic 7:** Administration & Platform Management (ensures platform health)

---

## Functional Requirements Inventory

### User Management (5 FRs)
- FR1: Users can register accounts with email verification
- FR2: Users can log in securely using email and password
- FR3: Users can update their profile information including bio and social links
- FR4: Users can manage account settings and privacy preferences
- FR5: Users can deactivate or delete their accounts

### Trust & Reputation System (7 FRs)
- FR6: Users can search for and view other user profiles
- FR7: Users can send trust connection requests to other users
- FR8: Users can accept or reject incoming trust connection requests
- FR9: Users can remove existing trust connections
- FR10: System automatically calculates and displays reputation scores based on trust network connections
- FR11: Users can view their trust network graph visualization
- FR12: Users can earn achievement badges for reputation milestones

### Marketplace & Discovery (6 FRs)
- FR13: Brands can create and publish campaign opportunities
- FR14: Influencers can browse and filter available campaigns by reputation requirements
- FR15: System provides reputation-based influencer recommendations for brands
- FR16: Brands can initiate collaboration requests with selected influencers
- FR17: Influencers can accept or decline collaboration requests
- FR18: Users can search for influencers using reputation score filters

### Collaboration & Campaigns (5 FRs)
- FR19: Brands and influencers can communicate within campaign contexts
- FR20: Users can track collaboration progress and milestones
- FR21: Brands can provide feedback on completed collaborations
- FR22: Influencers can request payments for completed work
- FR23: System supports file sharing between collaborators

### Verification & Community (5 FRs)
- FR24: Users can participate in decentralized voting on new user authenticity
- FR25: Users can report suspicious accounts or content
- FR26: Community moderators can review and resolve reported issues
- FR27: Users can view verification status of other users
- FR28: Followers can provide feedback on influencer-brand partnerships

### Administration & Support (5 FRs)
- FR29: Administrators can manage platform settings and configurations
- FR30: Support staff can access user accounts for troubleshooting
- FR31: Moderators can suspend or ban problematic accounts
- FR32: System provides analytics dashboards for administrators
- FR33: Users can submit support tickets for assistance

---

## Epic Structure Design

### Epic 1: Foundation & Core Infrastructure
**User Value:** Development team can build features on stable, scalable foundation
**PRD Coverage:** Infrastructure for all FRs
**Technical Context:** Next.js 16 + App Router, TypeScript, PostgreSQL + Prisma, Vercel deployment
**UX Integration:** Design system setup with Tailwind CSS + Headless UI
**Dependencies:** None (foundation epic)

#### Stories:
- **Story 1.1:** Set up Next.js 16 project with TypeScript and App Router
  - **Acceptance Criteria:** Project builds successfully, TypeScript strict mode enabled, App Router configured
  - **Technical Implementation:** `create-next-app` with TypeScript template, configure tsconfig.json

- **Story 1.2:** Configure PostgreSQL database with Prisma ORM
  - **Acceptance Criteria:** Database connection established, Prisma schema defined, migrations working
  - **Technical Implementation:** Prisma setup with User, TrustEdge, Campaign models

- **Story 1.3:** Implement Tailwind CSS design system
  - **Acceptance Criteria:** Tailwind configured, design tokens defined, responsive utilities working
  - **Technical Implementation:** Tailwind config with custom colors, typography, spacing

- **Story 1.4:** Set up Vercel deployment pipeline
  - **Acceptance Criteria:** CI/CD pipeline working, environment variables configured, deployment successful
  - **Technical Implementation:** Vercel project setup, environment configs, deployment hooks

- **Story 1.5:** Configure authentication foundation with NextAuth.js
  - **Acceptance Criteria:** NextAuth.js configured, session management working, OAuth providers ready
  - **Technical Implementation:** NextAuth setup with Google/GitHub/Discord providers

### Epic 2: User Authentication & Profile Management  
**User Value:** Users can create accounts, log in, and manage their professional identity
**PRD Coverage:** FR1, FR2, FR3, FR4, FR5
**Technical Context:** NextAuth.js with OAuth + Credentials, User model with Prisma, session management
**UX Integration:** Auth flows, profile card displays, settings management UI
**Dependencies:** Epic 1 (requires infrastructure)

#### Stories:
- **Story 2.1:** Implement user registration with email verification
  - **Acceptance Criteria:** Users can register, receive verification email, verify account
  - **Technical Implementation:** Registration API route, email service integration, verification tokens

- **Story 2.2:** Build secure login system with email/password
  - **Acceptance Criteria:** Users can log in securely, session persists, logout works
  - **Technical Implementation:** Credentials provider, password hashing, session management

- **Story 2.3:** Create user profile management system
  - **Acceptance Criteria:** Users can update bio, social links, profile picture
  - **Technical Implementation:** Profile edit forms, file upload for avatars, social link validation

- **Story 2.4:** Implement account settings and privacy preferences
  - **Acceptance Criteria:** Users can manage notification settings, privacy controls, account preferences
  - **Technical Implementation:** Settings page, preference storage, privacy toggle controls

- **Story 2.5:** Build account deactivation and deletion flows
  - **Acceptance Criteria:** Users can deactivate or delete accounts with confirmation
  - **Technical Implementation:** Soft delete patterns, confirmation modals, data retention policies

### Epic 3: Trust Network & Reputation System
**User Value:** Users build authentic connections and earn verifiable reputation (core differentiator)
**PRD Coverage:** FR6, FR7, FR8, FR9, FR10, FR11, FR12
**Technical Context:** TrustEdge model with recursive CTEs, reputation calculation with materialized views, tag-based cache invalidation
**UX Integration:** Trust network cards, reputation badges, one-click connection flows, network visualization
**Dependencies:** Epic 2 (requires user profiles)

#### Stories:
- **Story 3.1:** Implement user search and profile viewing
  - **Acceptance Criteria:** Users can search for others, view profiles with reputation scores
  - **Technical Implementation:** Search API with filters, profile display components

- **Story 3.2:** Build trust connection request system
  - **Acceptance Criteria:** Users can send/accept/reject trust requests, notifications work
  - **Technical Implementation:** TrustEdge model, request API, notification system

- **Story 3.3:** Create reputation score calculation engine
  - **Acceptance Criteria:** Reputation scores calculated based on trust network depth and breadth
  - **Technical Implementation:** Recursive CTE queries, materialized views, cache invalidation

- **Story 3.4:** Implement trust network visualization
  - **Acceptance Criteria:** Users can visualize their trust network graph
  - **Technical Implementation:** Graph visualization library, network data API

- **Story 3.5:** Build achievement badge system
  - **Acceptance Criteria:** Users earn badges for reputation milestones
  - **Technical Implementation:** Achievement model, badge display components, milestone tracking

### Epic 4: Marketplace & Campaign Discovery
**User Value:** Brands discover verified influencers; influencers find relevant opportunities
**PRD Coverage:** FR13, FR14, FR15, FR16, FR17, FR18
**Technical Context:** Campaign model, reputation-based search queries, collaboration requests API
**UX Integration:** Campaign cards, reputation filters, discovery flows, collaboration request modals
**Dependencies:** Epic 3 (requires reputation system)

#### Stories:
- **Story 4.1:** Create campaign creation system for brands
  - **Acceptance Criteria:** Brands can create campaigns with requirements, budget, timeline
  - **Technical Implementation:** Campaign model, creation forms, validation rules

- **Story 4.2:** Build campaign discovery and filtering
  - **Acceptance Criteria:** Influencers can browse campaigns filtered by reputation requirements
  - **Technical Implementation:** Search API with reputation filters, campaign cards

- **Story 4.3:** Implement reputation-based influencer recommendations
  - **Acceptance Criteria:** Brands get recommendations based on campaign requirements
  - **Technical Implementation:** Recommendation algorithm, matching logic

- **Story 4.4:** Create collaboration request system
  - **Acceptance Criteria:** Brands can request collaborations, influencers can accept/decline
  - **Technical Implementation:** Collaboration request model, notification system

- **Story 4.5:** Build influencer search with reputation filters
  - **Acceptance Criteria:** Brands can search influencers by reputation score and categories
  - **Technical Implementation:** Advanced search API, filter components

### Epic 5: Collaboration & Campaign Execution
**User Value:** Brands and influencers work together on campaigns with clear tracking
**PRD Coverage:** FR19, FR20, FR21, FR22, FR23
**Technical Context:** Collaboration model with status tracking, feedback system, file storage integration
**UX Integration:** Campaign dashboards, progress tracking, feedback forms, communication interfaces
**Dependencies:** Epic 4 (requires campaigns and collaborations)

#### Stories:
- **Story 5.1:** Implement campaign communication system
  - **Acceptance Criteria:** Brands and influencers can message within campaign context
  - **Technical Implementation:** Message model, real-time updates, notification system

- **Story 5.2:** Build collaboration progress tracking
  - **Acceptance Criteria:** Users can track campaign milestones and progress
  - **Technical Implementation:** Progress tracking system, milestone management

- **Story 5.3:** Create feedback system for completed collaborations
  - **Acceptance Criteria:** Brands can provide feedback, influencers can respond
  - **Technical Implementation:** Feedback model, rating system, review display

- **Story 5.4:** Implement payment request system
  - **Acceptance Criteria:** Influencers can request payments, brands can approve
  - **Technical Implementation:** Payment request workflow, approval system

- **Story 5.5:** Build file sharing for collaborations
  - **Acceptance Criteria:** Users can share files within campaign context
  - **Technical Implementation:** File upload system, storage integration, preview functionality

### Epic 6: Community Verification & Moderation
**User Value:** Community prevents bots and maintains platform trust through decentralized verification
**PRD Coverage:** FR24, FR25, FR26, FR27, FR28
**Technical Context:** Voting system with reputation-weighted votes, reporting API, moderation dashboard
**UX Integration:** Voting interfaces, report modals, verification badges, moderation tools
**Dependencies:** Epic 3 (requires reputation for vote weighting)

#### Stories:
- **Story 6.1:** Implement decentralized user verification voting
  - **Acceptance Criteria:** Users can vote on new user authenticity with reputation-weighted votes
  - **Technical Implementation:** Voting system, reputation-based weighting, verification thresholds

- **Story 6.2:** Build reporting system for suspicious accounts
  - **Acceptance Criteria:** Users can report suspicious accounts or content
  - **Technical Implementation:** Report model, reporting interface, notification system

- **Story 6.3:** Create moderation dashboard for community moderators
  - **Acceptance Criteria:** Moderators can review and resolve reported issues
  - **Technical Implementation:** Moderation interface, action tracking, resolution workflows

- **Story 6.4:** Implement user verification status display
  - **Acceptance Criteria:** Users can view verification status of other users
  - **Technical Implementation:** Verification badges, status indicators, verification history

- **Story 6.5:** Build follower feedback system for partnerships
  - **Acceptance Criteria:** Followers can provide feedback on influencer-brand partnerships
  - **Technical Implementation:** Feedback collection, aggregation, display system

### Epic 7: Administration & Platform Management
**User Value:** Administrators maintain platform health, support users, and monitor system performance
**PRD Coverage:** FR29, FR30, FR31, FR32, FR33
**Technical Context:** Admin panel with role-based access, analytics queries, support ticket system
**UX Integration:** Admin dashboards, user management tools, analytics visualizations, support interfaces
**Dependencies:** Epic 2 (requires user management foundation)

#### Stories:
- **Story 7.1:** Build platform configuration management
  - **Acceptance Criteria:** Administrators can manage platform settings and configurations
  - **Technical Implementation:** Configuration management system, admin settings interface

- **Story 7.2:** Create user account management tools
  - **Acceptance Criteria:** Support staff can access user accounts for troubleshooting
  - **Technical Implementation:** Admin user management, account access controls

- **Story 7.3:** Implement account suspension and banning system
  - **Acceptance Criteria:** Moderators can suspend or ban problematic accounts
  - **Technical Implementation:** Account status management, suspension workflows

- **Story 7.4:** Build analytics dashboards for administrators
  - **Acceptance Criteria:** System provides analytics dashboards for administrators
  - **Technical Implementation:** Analytics queries, dashboard components, data visualization

- **Story 7.5:** Create support ticket system
  - **Acceptance Criteria:** Users can submit support tickets for assistance
  - **Technical Implementation:** Ticket management system, support workflows, response tracking

---

## Story Sequencing & Dependencies

### Critical Path (Must-Have Sequence)
1. **Epic 1** → Foundation & Core Infrastructure
2. **Epic 2** → User Authentication & Profile Management  
3. **Epic 3** → Trust Network & Reputation System
4. **Epic 4** → Marketplace & Campaign Discovery
5. **Epic 5** → Collaboration & Campaign Execution

### Development Phases

**Phase 1: Core Platform (Epics 1-3)**
- **Week 1-2:** Epic 1 (Foundation)
- **Week 3-4:** Epic 2 (Authentication)
- **Week 5-6:** Epic 3 (Trust Network)
- **Deliverable:** Users can register, build trust networks, and earn reputation

**Phase 2: Marketplace (Epics 4-5)**
- **Week 7-8:** Epic 4 (Marketplace Discovery)
- **Week 9-10:** Epic 5 (Collaboration Execution)
- **Deliverable:** Brands and influencers can discover and collaborate on campaigns

**Phase 3: Community & Administration (Epics 6-7)**
- **Week 11-12:** Epic 6 (Community Verification)
- **Week 13-14:** Epic 7 (Administration)

### Cross-Epic Dependencies
- **All Epics** → Depend on Epic 1 (Foundation)
- **Epic 3** → Requires Epic 2 (User profiles)
- **Epic 4** → Requires Epic 3 (Reputation system)
- **Epic 5** → Requires Epic 4 (Campaigns and collaborations)
- **Epic 6** → Requires Epic 3 (Reputation for vote weighting)
- **Epic 7** → Requires Epic 2 (User management)

### Risk Mitigation
- **Epic 1** → No dependencies, lowest risk
- **Epic 3** → Core differentiator, highest technical complexity
- **Epic 6** → Community-driven, requires critical mass of users

---

