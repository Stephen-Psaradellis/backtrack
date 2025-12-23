# Love Ledger

> **A location-based anonymous matchmaking app for "missed connections"**

[![React Native](https://img.shields.io/badge/React%20Native-Expo-blue.svg?style=flat-square&logo=react)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E.svg?style=flat-square&logo=supabase)](https://supabase.com/)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-lightgrey.svg?style=flat-square&logo=apple)](https://expo.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## Overview

Love Ledger is a cross-platform mobile application for **iOS and Android** that enables anonymous "missed connection" style matchmaking tied to physical locations.

Have you ever noticed someone interesting at a coffee shop, gym, or bookstore but didn't have the chance to say hello? Love Ledger creates a digital ledger for each location where you can leave an anonymous note describing that person - and if they're on the app, they might just find your message.

### How It Works

```
   You see someone                Create an avatar             They browse the
   interesting at a    ────►     describing them     ────►    location's ledger
   physical location             + leave a note               & find your post
        │                             │                             │
        │                             │                             │
        ▼                             ▼                             ▼
   ┌─────────────┐            ┌─────────────────┐          ┌───────────────┐
   │  📍 Visit   │            │  👤 Build Avatar │          │ 📖 Browse &   │
   │   Location  │            │  + Write Note   │          │    Match      │
   └─────────────┘            └─────────────────┘          └───────────────┘
                                                                   │
                                                                   ▼
                                                           ┌───────────────┐
                                                           │ 💬 Start      │
                                                           │  Anonymous    │
                                                           │    Chat       │
                                                           └───────────────┘
```

---

## Key Features

### For Producers (Post Creators)

- **Location Discovery** - Find venues using Google Maps integration
- **Selfie Verification** - Take a photo to verify you were actually there
- **Avatar Builder** - Create a customizable Bitmoji-style avatar describing the person you noticed
- **Anonymous Notes** - Write a message about your missed connection

### For Consumers (Post Browsers)

- **Location-Based Browsing** - Browse posts at specific venues
- **Description Matching** - Create your own avatar and get matched with posts describing you
- **Anonymous Conversations** - Connect through real-time messaging without revealing identities

### Core Platform Features

| Feature | Description |
|---------|-------------|
| **Cross-Platform** | Runs natively on both iOS and Android |
| **Real-Time Chat** | Instant messaging powered by Supabase Realtime |
| **Privacy First** | Anonymous interactions with no personal data exposed |
| **Content Moderation** | Reporting and blocking for a safe community |
| **Secure Authentication** | Sign up and login with email/password via Supabase Auth |

---

## Screenshots

> *Coming soon - Screenshots will be added as the app is developed*

---

## Tech Stack & Architecture

Love Ledger is built with modern, production-ready technologies designed for cross-platform mobile development.

### Frontend / Mobile

| Technology | Purpose | Documentation |
|------------|---------|---------------|
| [**Expo SDK**](https://expo.dev/) | React Native framework with managed workflow | [Expo Docs](https://docs.expo.dev/) |
| [**React Native**](https://reactnative.dev/) | Cross-platform native mobile development | [RN Docs](https://reactnative.dev/docs/getting-started) |
| [**TypeScript**](https://www.typescriptlang.org/) | Type-safe JavaScript for reliability | [TS Docs](https://www.typescriptlang.org/docs/) |
| [**Expo Router**](https://docs.expo.dev/router/introduction/) | File-based navigation for React Native | [Router Docs](https://docs.expo.dev/router/introduction/) |
| [**Zustand**](https://zustand-demo.pmnd.rs/) | Lightweight state management | [Zustand Docs](https://docs.pmnd.rs/zustand/getting-started/introduction) |

### Backend & Infrastructure

| Technology | Purpose | Documentation |
|------------|---------|---------------|
| [**Supabase**](https://supabase.com/) | Backend-as-a-Service (BaaS) platform | [Supabase Docs](https://supabase.com/docs) |
| [**PostgreSQL**](https://www.postgresql.org/) | Relational database (via Supabase) | [PostgreSQL Docs](https://www.postgresql.org/docs/) |
| [**Supabase Auth**](https://supabase.com/auth) | Authentication and user management | [Auth Docs](https://supabase.com/docs/guides/auth) |
| [**Supabase Realtime**](https://supabase.com/realtime) | Real-time subscriptions for live chat | [Realtime Docs](https://supabase.com/docs/guides/realtime) |
| [**Supabase Storage**](https://supabase.com/storage) | File storage for images and media | [Storage Docs](https://supabase.com/docs/guides/storage) |

### External Integrations

| Integration | Purpose | Documentation |
|-------------|---------|---------------|
| [**Google Maps**](https://developers.google.com/maps) | Location discovery and venue selection | [Maps SDK Docs](https://developers.google.com/maps/documentation) |
| [**react-native-maps**](https://github.com/react-native-maps/react-native-maps) | Native map component for React Native | [RN Maps Docs](https://github.com/react-native-maps/react-native-maps#readme) |
| [**Avataaars**](https://getavataaars.com/) | Customizable avatar builder library | [Avataaars Docs](https://github.com/fangpenlin/avataaars) |

### Native Device Features (via Expo)

| Feature | Expo Module | Purpose |
|---------|-------------|---------|
| Camera | [`expo-camera`](https://docs.expo.dev/versions/latest/sdk/camera/) | Selfie verification for post creation |
| Image Picker | [`expo-image-picker`](https://docs.expo.dev/versions/latest/sdk/imagepicker/) | Gallery access for profile images |
| Location | [`expo-location`](https://docs.expo.dev/versions/latest/sdk/location/) | GPS for proximity-based features |
| SVG Rendering | [`react-native-svg`](https://github.com/software-mansion/react-native-svg) | Vector graphics for avatars |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Mobile App                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Expo / React Native                            │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │   │
│  │  │   Screens  │  │ Components │  │   Hooks    │  │   Store    │  │   │
│  │  │ (Expo      │  │ (UI, Map,  │  │ (Auth,     │  │ (Zustand)  │  │   │
│  │  │  Router)   │  │  Avatar)   │  │  Location) │  │            │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                         Supabase Client                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Supabase Cloud                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   Auth       │  │  PostgreSQL  │  │   Realtime   │  │   Storage   │  │
│  │ (Users &     │  │  (Database)  │  │ (WebSocket)  │  │  (Files)    │  │
│  │  Sessions)   │  │              │  │              │  │             │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          External Services                               │
│  ┌────────────────────────────────┐  ┌───────────────────────────────┐  │
│  │        Google Maps API         │  │        Avataaars Library       │  │
│  │   (Venue Search & Display)     │  │    (Avatar Customization)      │  │
│  └────────────────────────────────┘  └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why These Technologies?

| Choice | Rationale |
|--------|-----------|
| **Expo** | Simplifies React Native development with managed workflow, OTA updates, and easy deployment |
| **TypeScript** | Catches bugs at compile-time and improves code maintainability |
| **Supabase** | Open-source Firebase alternative with PostgreSQL, real-time, and auth out of the box |
| **Google Maps** | Industry-standard location services with excellent POI data |
| **Avataaars** | Privacy-preserving visual descriptions without requiring actual photos |

---

## Prerequisites

Before you begin, ensure you have the following installed on your development machine:

| Requirement | Minimum Version | Recommended | Check Command |
|-------------|-----------------|-------------|---------------|
| **Node.js** | 18.x | 20.x LTS | `node --version` |
| **npm** | 9.x | 10.x | `npm --version` |
| **Git** | 2.x | Latest | `git --version` |

### Mobile Development Requirements

| Platform | Requirement | Notes |
|----------|-------------|-------|
| **iOS** | macOS + Xcode | Required for iOS simulator and builds |
| **Android** | Android Studio | Required for Android emulator and builds |
| **Physical Device** | [Expo Go](https://expo.dev/go) app | Scan QR code to run on device |

> 💡 **Tip:** For the fastest setup, use the [Expo Go](https://expo.dev/go) app on your physical device - no simulator setup required!

---

## Quick Start

Get up and running in minutes with these essential steps:

### Prerequisites

- **Node.js** 18.0.0 or higher ([download](https://nodejs.org/))
- **npm** or **pnpm** package manager
- **Git** for version control
- **Supabase** account ([sign up free](https://supabase.com/))
- **Google Cloud** account with Maps API ([get started](https://console.cloud.google.com/))

### Setup Steps

1. Clone the repository

```bash
git clone https://github.com/shortforge/love-ledger.git
cd love-ledger
```

2. Install dependencies

```bash
npm install
```

This installs all required dependencies including:
- React Native / Expo SDK
- Supabase client
- Navigation libraries
- Map and avatar components

3. Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
# Copy the example file
cp .env.example .env.local
```

Then add your API keys:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Maps Configuration
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

For detailed setup instructions, see our [Contributing Guide](CONTRIBUTING.md).

4. Start the Development Server

```bash
npx expo start
```

This will start the Expo development server and display a QR code.

5. Run on Your Device or Simulator

| Method | Command/Action |
|--------|----------------|
| **Physical Device** | Scan the QR code with Expo Go app |
| **iOS Simulator** | Press `i` in terminal (macOS only) |
| **Android Emulator** | Press `a` in terminal |
| **Web Browser** | Press `w` in terminal |

---

## Essential Commands

Here's a quick reference for common development commands:

```bash
# Start development server
npx expo start

# Start with tunnel (for devices on different networks)
npx expo start --tunnel

# Start with cache cleared
npx expo start --clear

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Install a new Expo-compatible package
npx expo install <package-name>

# Check for Expo SDK compatibility issues
npx expo-doctor

# Build for production (requires EAS)
npx eas build --platform all
```

---

## Documentation

For detailed setup instructions and guides, see:

- **[Contributing Guide](CONTRIBUTING.md)** - Complete developer setup with step-by-step instructions for:
  - Supabase project configuration
  - Google Maps API setup
  - Environment variables
  - Development workflow
  - Troubleshooting

- **[Database Guide](docs/DATABASE.md)** - Database setup and management:
  - Schema overview
  - Running migrations
  - PostGIS configuration
  - Row Level Security (RLS) policies

---

## Project Structure

The project follows an Expo Router file-based routing pattern with organized folders for components, hooks, and utilities.

```
love-ledger/
├── app/                       # 📱 Expo Router app directory (screens/routes)
│   ├── (auth)/               # Authentication routes (login, signup)
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/               # Main tabbed navigation
│   │   ├── home.tsx          # Home/Feed screen
│   │   ├── explore.tsx       # Location exploration/map
│   │   ├── create.tsx        # Create post screen
│   │   ├── messages.tsx      # Conversations list
│   │   ├── profile.tsx       # User profile
│   │   └── _layout.tsx
│   ├── chat/                 # Chat screens
│   │   └── [id].tsx          # Dynamic chat view
│   ├── post/                 # Post detail screens
│   │   └── [id].tsx          # Dynamic post view
│   ├── _layout.tsx           # Root layout
│   └── index.tsx             # Entry point
│
├── components/                # 🧩 Reusable React components
│   ├── ui/                   # Generic UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Avatar.tsx
│   ├── avatar/               # Avataaars-related components
│   │   ├── AvatarBuilder.tsx
│   │   └── AvatarPreview.tsx
│   ├── map/                  # Map-related components
│   │   ├── MapView.tsx
│   │   └── LocationPicker.tsx
│   ├── post/                 # Post-related components
│   │   ├── PostCard.tsx
│   │   └── PostForm.tsx
│   └── chat/                 # Chat-related components
│       ├── MessageBubble.tsx
│       └── ChatInput.tsx
│
├── hooks/                     # 🪝 Custom React hooks
│   ├── useAuth.ts            # Authentication hook
│   ├── useLocation.ts        # Location services hook
│   ├── usePosts.ts           # Posts data hook
│   ├── useChat.ts            # Real-time chat hook
│   └── useProfile.ts         # Profile management hook
│
├── lib/                       # 📚 Core libraries and utilities
│   ├── supabase.ts           # Supabase client configuration
│   ├── api/                  # API functions
│   │   ├── auth.ts
│   │   ├── posts.ts
│   │   ├── messages.ts
│   │   └── profiles.ts
│   └── utils/                # Utility functions
│       ├── formatting.ts
│       └── validation.ts
│
├── store/                     # 🗄️ State management (Zustand)
│   ├── auth.ts               # Auth state store
│   ├── posts.ts              # Posts state store
│   ├── chat.ts               # Chat state store
│   └── ui.ts                 # UI state store
│
├── types/                     # 📘 TypeScript type definitions
│   ├── index.ts              # Shared types
│   ├── database.ts           # Database schema types
│   ├── api.ts                # API response types
│   └── ui.ts                 # Component prop types
│
├── app.json                   # Expo configuration
├── tsconfig.json              # TypeScript configuration
├── .env.example               # Environment variable template
├── .gitignore                 # Git ignore rules
├── package.json               # Project dependencies
├── eas.json                   # EAS Build configuration
├── CONTRIBUTING.md            # Developer setup guide
└── LICENSE                    # MIT License
```

---

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on setting up your development environment and our coding standards.

## License

[MIT](LICENSE)