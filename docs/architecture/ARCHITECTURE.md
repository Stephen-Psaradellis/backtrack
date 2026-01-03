# Backtrack Architecture Overview

This document provides a high-level overview of the Backtrack application architecture, including its core concepts, technology stack, and project structure.

## Table of Contents

- [What is Backtrack?](#what-is-backtrack)
- [Core Concepts](#core-concepts)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Key Terminology](#key-terminology)
- [Related Documentation](#related-documentation)

---

## What is Backtrack?

Backtrack is a location-based "missed connections" dating application. Unlike traditional dating apps where users swipe through profiles, Backtrack enables users to leave digital notes at physical locations for specific people they've encountered in real life.

### The Core Idea

Imagine you're at a coffee shop and notice someone interesting, but the moment passes before you can introduce yourself. With Backtrack, you can leave a digital "note" at that location describing the person you saw. If that person later visits the same location in the app and recognizes themselves in your description, they can respond and start a conversation.

### Privacy-First Design

Backtrack uses **avatar-based anonymity** to protect user privacy. Instead of sharing real photos publicly, users:
1. Upload a private selfie (visible only to matched users)
2. Describe the person they're looking for using customizable cartoon avatars
3. Create their own avatar representation for their profile

This approach allows meaningful connections while maintaining privacy until both parties consent to reveal their identities.

---

## Core Concepts

### Producer/Consumer Model

Backtrack operates on a **Producer/Consumer model** that defines two distinct user roles:

#### Producer
A user who creates a post at a location. Producers:
- Visit a physical location (gym, cafe, store, etc.)
- Create a post describing someone they want to connect with
- Upload a selfie (stored securely, only revealed after matching)
- Configure a "target avatar" describing the person they saw
- Write a message for that person

#### Consumer
A user who browses location-based posts ("ledgers"). Consumers:
- Browse locations near them or locations they've visited
- View the "ledger" of posts at each location
- Look for posts where the target avatar matches their appearance
- Respond to posts they believe are meant for them
- Wait for the Producer to accept their response before messaging begins

### Location-Based Matchmaking

Posts are anchored to physical locations using Google Places integration:
- Locations are identified by their Google Place ID
- Geospatial queries (using PostGIS) enable finding nearby locations
- Each location maintains a "ledger" of active posts
- Popular locations show a post count to indicate activity

### Avatar-Based Anonymity

The Avataaars library provides customizable cartoon avatars with:
- Hair styles, colors, and accessories
- Facial features (eyes, eyebrows, mouth)
- Facial hair options
- Clothing styles and colors
- Skin tone options

Avatars serve two purposes:
1. **Target Avatar**: Describes the person a Producer is looking for
2. **Profile Avatar**: Represents the user throughout the app

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.1.3 | React framework with App Router, server components, and Turbopack |
| **React** | 19.0.0 | UI component library with latest concurrent features |
| **TypeScript** | 5.x | Type-safe JavaScript for better developer experience |
| **Tailwind CSS** | 3.4.x | Utility-first CSS framework for styling |
| **Avataaars** | 2.0.0 | SVG avatar generation library for anonymous user representation |

### Backend & Infrastructure

| Technology | Purpose |
|------------|---------|
| **Supabase** | Backend-as-a-Service providing authentication, database, and storage |
| **PostgreSQL** | Relational database (managed by Supabase) |
| **PostGIS** | PostgreSQL extension for geospatial queries and location-based features |
| **Supabase Storage** | Object storage for user selfies and media |
| **Supabase Auth** | Authentication with email/password, magic links, and OAuth |

### Maps & Location

| Technology | Purpose |
|------------|---------|
| **Google Maps** | Map display and location selection |
| **Google Places API** | Location search, details, and place identification |
| **@vis.gl/react-google-maps** | React wrapper for Google Maps integration |

### Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting and style enforcement |
| **Turbopack** | Next.js development bundler for fast builds |
| **pnpm/npm** | Package management |

---

## Project Structure

```
backtrack/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Landing page
│   └── [routes]/            # Feature-specific routes
│
├── components/               # React components
│   └── ui/                  # Reusable UI components
│       ├── Button.tsx       # Button with variants, sizes, loading states
│       ├── Input.tsx        # Form input with validation support
│       └── Modal.tsx        # Accessible modal dialog
│
├── lib/                      # Utility libraries
│   └── supabase/            # Supabase client configuration
│       ├── client.ts        # Browser-side Supabase client
│       ├── server.ts        # Server-side Supabase client (RSC)
│       └── middleware.ts    # Session refresh middleware
│
├── types/                    # TypeScript type definitions
│   ├── database.ts          # Database table types and relationships
│   └── avatar.ts            # Avataaars configuration types
│
├── supabase/                 # Supabase configuration
│   └── migrations/          # Database migration files
│       ├── 001_initial_schema.sql
│       └── 002_rls_policies.sql
│
├── docs/                     # Documentation
│   └── architecture/        # Architecture documentation
│
├── middleware.ts             # Next.js middleware (auth session)
├── tailwind.config.ts        # Tailwind CSS configuration
├── next.config.ts            # Next.js configuration
└── package.json              # Dependencies and scripts
```

### Directory Responsibilities

#### `/app` - Routes and Pages
Contains all Next.js App Router pages and layouts. Each route folder represents a URL path and can contain:
- `page.tsx` - The page component
- `layout.tsx` - Shared layout for the route and children
- `loading.tsx` - Loading UI state
- `error.tsx` - Error boundary

#### `/components` - UI Components
Reusable React components organized by purpose:
- `/ui` - Low-level UI primitives (Button, Input, Modal)
- Feature-specific components are typically co-located with their routes

#### `/lib` - Utilities and Clients
Shared utility functions and client configurations:
- Supabase client setup for different environments
- Helper functions used across the application

#### `/types` - Type Definitions
TypeScript interfaces and types:
- Database table row types (matching Supabase schema)
- Insert/Update types for mutations
- Joined types for queries with relations
- Avatar configuration types

#### `/supabase` - Database Configuration
Supabase-specific configuration and migrations:
- SQL migration files for schema changes
- Row Level Security (RLS) policies

---

## Key Terminology

| Term | Definition |
|------|------------|
| **Producer** | A user who creates a post at a location, looking to connect with someone they saw |
| **Consumer** | A user who browses location ledgers and responds to posts that match them |
| **Post** | A "missed connection" entry containing a target avatar, message, and the Producer's selfie |
| **Location** | A physical place (identified by Google Place ID) where posts are anchored |
| **Ledger** | The collection of active posts at a specific location |
| **Target Avatar** | The Avataaars configuration describing the person a Producer is looking for |
| **Conversation** | A thread between a Producer and Consumer after the Producer accepts a response |
| **Response** | When a Consumer believes they match a post and initiates contact |
| **Selfie** | The Producer's photo, stored privately and revealed only after matching |

### Conversation Status Flow

1. **Pending** - Consumer has responded to a post; awaiting Producer decision
2. **Active** - Producer accepted the response; messaging is enabled
3. **Declined** - Producer declined the response; no further interaction
4. **Blocked** - Either party blocked the other; no further interaction

---

## Related Documentation

This is the first document in the Backtrack architecture documentation series:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** (this document) - System overview
- [USER_FLOWS.md](./USER_FLOWS.md) - Producer and Consumer user journeys
- [SUPABASE.md](./SUPABASE.md) - Supabase integration details
- [DATABASE.md](./DATABASE.md) - Schema and relationship documentation
- [COMPONENTS.md](./COMPONENTS.md) - UI component patterns
- [DATA_FLOW.md](./DATA_FLOW.md) - Data flow through the application
- [README.md](./README.md) - Documentation index

---

*Last updated: December 2024*
