# Backtrack Architecture Documentation

Welcome to the Backtrack architecture documentation. This documentation provides a comprehensive understanding of the system design, data flow, and technical implementation of the Backtrack application.

## Quick Start for New Developers

If you're new to the Backtrack codebase, we recommend reading the documents in this order:

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Start here to understand the core concepts and tech stack
2. **[USER_FLOWS.md](./USER_FLOWS.md)** - Learn how Producers and Consumers interact with the app
3. **[DATABASE.md](./DATABASE.md)** - Understand the data model and entity relationships
4. **[SUPABASE.md](./SUPABASE.md)** - Learn about backend integration and authentication
5. **[COMPONENTS.md](./COMPONENTS.md)** - Familiarize yourself with UI component patterns
6. **[DATA_FLOW.md](./DATA_FLOW.md)** - Deep dive into how data moves through the system

---

## Documentation Index

### System Overview

| Document | Description |
|----------|-------------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | High-level system overview including the Backtrack concept, Producer/Consumer model, technology stack (Next.js 15, React 19, Supabase, PostGIS), project structure, and key terminology |

### User Experience

| Document | Description |
|----------|-------------|
| **[USER_FLOWS.md](./USER_FLOWS.md)** | Detailed user journeys for both Producers and Consumers, including step-by-step flows for creating posts, browsing locations, matching to avatars, responding, and conversing |

### Backend & Data

| Document | Description |
|----------|-------------|
| **[DATABASE.md](./DATABASE.md)** | Entity-relationship documentation with table structures, relationships between profiles/locations/posts/conversations/messages/notifications, indexes, PostGIS geospatial features, triggers, and TypeScript type integration |
| **[SUPABASE.md](./SUPABASE.md)** | Supabase integration guide covering client setup (browser/server/middleware), authentication flow, session management, selfie storage with access control, Row Level Security (RLS) policies, and real-time subscription patterns |
| **[DATA_FLOW.md](./DATA_FLOW.md)** | Data flow architecture explaining how data moves from UI to Supabase and back, including Next.js App Router patterns, state management strategies, real-time updates, optimistic updates, and end-to-end type safety |

### Frontend & Components

| Document | Description |
|----------|-------------|
| **[COMPONENTS.md](./COMPONENTS.md)** | UI component architecture including component organization, reusable primitives (Button, Input, Modal), variant/size systems, styling patterns with Tailwind CSS, accessibility features, and type definitions |

---

## Key Concepts at a Glance

### The Backtrack Model

Backtrack is a **location-based "missed connections"** dating application where:

- **Producers** leave digital notes at physical locations for people they've noticed
- **Consumers** browse locations and respond to posts that match their appearance
- **Avatar-based anonymity** protects privacy until both parties consent to connect

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | Supabase (Auth, Database, Storage, Realtime) |
| **Database** | PostgreSQL with PostGIS for geospatial queries |
| **Avatars** | Avataaars library for customizable avatar representations |

### Core Entities

```
profiles ─┬─► posts ─┬─► conversations ─► messages
          │         │
          │         └─► (target_avatar, selfie_url)
          │
          └─► notifications
                    │
locations ─────────►│
```

---

## Finding What You Need

| I want to... | Read this |
|--------------|-----------|
| Understand what Backtrack does | [ARCHITECTURE.md - What is Backtrack?](./ARCHITECTURE.md#what-is-backtrack) |
| Learn about Producer/Consumer roles | [ARCHITECTURE.md - Core Concepts](./ARCHITECTURE.md#core-concepts) |
| See the Producer user journey | [USER_FLOWS.md - Producer Flow](./USER_FLOWS.md#producer-flow) |
| See the Consumer user journey | [USER_FLOWS.md - Consumer Flow](./USER_FLOWS.md#consumer-flow) |
| Understand the database schema | [DATABASE.md - Tables](./DATABASE.md#tables) |
| Learn about geospatial queries | [DATABASE.md - PostGIS Features](./DATABASE.md#postgis-geospatial-features) |
| Set up Supabase clients | [SUPABASE.md - Client Setup](./SUPABASE.md#client-setup) |
| Understand authentication | [SUPABASE.md - Authentication Flow](./SUPABASE.md#authentication-flow) |
| Learn about RLS security | [SUPABASE.md - Row Level Security](./SUPABASE.md#row-level-security-rls) |
| Use UI components | [COMPONENTS.md - Reusable UI Components](./COMPONENTS.md#reusable-ui-components) |
| Understand state management | [DATA_FLOW.md - State Management](./DATA_FLOW.md#state-management) |
| Implement real-time features | [DATA_FLOW.md - Real-time Data Updates](./DATA_FLOW.md#real-time-data-updates) |

---

## Contributing to Documentation

When updating architecture documentation:

1. Keep documents focused on their specific domain
2. Update cross-references if you add new sections
3. Maintain consistent formatting with existing documents
4. Include code examples where helpful
5. Update this README if adding new documents

---

## Document Versions

| Document | Last Updated | Version |
|----------|--------------|---------|
| ARCHITECTURE.md | December 2024 | 1.0 |
| USER_FLOWS.md | December 2024 | 1.0 |
| DATABASE.md | December 2024 | 1.0 |
| SUPABASE.md | December 2024 | 1.0 |
| COMPONENTS.md | December 2024 | 1.0 |
| DATA_FLOW.md | December 2024 | 1.0 |
