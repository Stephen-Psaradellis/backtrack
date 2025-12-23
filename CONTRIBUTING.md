# Contributing to Love Ledger

Welcome! This guide will help you set up your local development environment for Love Ledger.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Repository Setup](#repository-setup)
- [Supabase Setup](#supabase-setup)
- [Google Maps API Setup](#google-maps-api-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following software installed on your machine:

### Node.js (v18.0.0 or higher)

Love Ledger is built with Next.js 15 and React 19, which require Node.js 18 or later.

**Check your version:**
```bash
node --version
# Should output: v18.x.x or higher (e.g., v20.10.0)
```

**Installation options:**
- **Recommended:** Use [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm) for easy version management
  ```bash
  # Install nvm, then:
  nvm install 20
  nvm use 20
  ```
- **Windows:** Use [nvm-windows](https://github.com/coreybutler/nvm-windows) or download from [nodejs.org](https://nodejs.org/)
- **macOS/Linux:** Download from [nodejs.org](https://nodejs.org/) or use your package manager

### Package Manager (npm or pnpm)

You can use either **npm** (comes with Node.js) or **pnpm** (faster, more efficient).

**Check npm version:**
```bash
npm --version
# Should output: 9.x.x or higher
```

**Check pnpm version (if using pnpm):**
```bash
pnpm --version
# Should output: 8.x.x or higher
```

**Installing pnpm (optional, but recommended):**
```bash
# Using npm
npm install -g pnpm

# Or using Corepack (included with Node.js 16.10+)
corepack enable
corepack prepare pnpm@latest --activate
```

**Learn more:**
- [npm documentation](https://docs.npmjs.com/)
- [pnpm documentation](https://pnpm.io/)

### Git

Git is required for version control and cloning the repository.

**Check your version:**
```bash
git --version
# Should output: git version 2.x.x or higher
```

**Installation:**
- **Windows:** Download from [git-scm.com](https://git-scm.com/download/win) or use [Git for Windows](https://gitforwindows.org/)
- **macOS:** Install via Xcode Command Line Tools (`xcode-select --install`) or [Homebrew](https://brew.sh/) (`brew install git`)
- **Linux:** Use your distribution's package manager:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install git

  # Fedora
  sudo dnf install git

  # Arch Linux
  sudo pacman -S git
  ```

**Learn more:** [Git documentation](https://git-scm.com/doc)

### Quick Version Check

Run all version checks at once:

```bash
echo "Node.js: $(node --version)" && \
echo "npm: $(npm --version)" && \
echo "Git: $(git --version)"
```

**Windows (PowerShell):**
```powershell
Write-Host "Node.js: $(node --version)"
Write-Host "npm: $(npm --version)"
Write-Host "Git: $(git --version)"
```

### Minimum Version Summary

| Tool    | Minimum Version | Recommended Version |
|---------|-----------------|---------------------|
| Node.js | 18.0.0          | 20.x (LTS)          |
| npm     | 9.0.0           | 10.x                |
| pnpm    | 8.0.0           | 9.x                 |
| Git     | 2.0.0           | Latest              |

---

## Repository Setup

### Clone the Repository

Clone the Love Ledger repository to your local machine:

```bash
# Using HTTPS
git clone https://github.com/your-username/love-ledger.git

# Or using SSH (if you have SSH keys set up)
git clone git@github.com:your-username/love-ledger.git
```

Navigate to the project directory:

```bash
cd love-ledger
```

### Install Dependencies

Love Ledger uses Node.js packages managed by npm or pnpm. Install all required dependencies:

**Using npm:**
```bash
npm install
```

**Using pnpm (recommended for faster installs):**
```bash
pnpm install
```

> **Note:** The first install may take a few minutes as it downloads all dependencies including Next.js, React, Supabase client libraries, and Google Maps components.

### Project Structure

After cloning, you'll find the following key directories and files:

```
love-ledger/
├── app/                    # Next.js App Router pages and layouts
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Home page
│   └── ...                 # Other routes
├── components/             # Reusable React components
├── lib/                    # Utility functions and configurations
│   └── supabase/           # Supabase client setup
│       ├── client.ts       # Browser client
│       └── server.ts       # Server-side client
├── supabase/               # Supabase configuration
│   └── migrations/         # Database migration files
├── public/                 # Static assets
├── .env.example            # Environment variable template
├── package.json            # Project dependencies and scripts
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

**Key Directories:**

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js 15 App Router - contains pages, layouts, and route handlers |
| `components/` | Reusable UI components |
| `lib/` | Shared utilities, hooks, and service configurations |
| `lib/supabase/` | Supabase client initialization for browser and server contexts |
| `supabase/migrations/` | SQL migration files for database schema |
| `public/` | Static files served at the root URL |

### Verify Installation

After installing dependencies, verify everything is set up correctly:

```bash
# Check that all dependencies are installed
npm list --depth=0

# Or with pnpm
pnpm list --depth=0
```

You should see packages including:
- `next` - The Next.js framework
- `react` and `react-dom` - React library
- `@supabase/supabase-js` - Supabase JavaScript client
- `@supabase/ssr` - Supabase server-side rendering helpers
- `@vis.gl/react-google-maps` - Google Maps React components

> **Next Steps:** Before running the application, you'll need to set up external services (Supabase and Google Maps). Continue to the [Supabase Setup](#supabase-setup) section.

---

## Supabase Setup

Love Ledger uses [Supabase](https://supabase.com/) as its backend, providing PostgreSQL database, authentication, and real-time capabilities. Follow these steps to create and configure your Supabase project.

### Step 1: Create a Supabase Account

1. Go to [supabase.com](https://supabase.com/)
2. Click **Start your project** or **Sign Up**
3. Sign up with GitHub, Google, or email
4. Verify your email if required

### Step 2: Create a New Project

1. From the [Supabase Dashboard](https://supabase.com/dashboard), click **New Project**
2. Fill in the project details:
   - **Name:** `love-ledger-dev` (or any name you prefer)
   - **Database Password:** Create a strong password and **save it securely** - you'll need it for database access
   - **Region:** Choose the region closest to you for lower latency
   - **Pricing Plan:** Free tier works for development
3. Click **Create new project**
4. Wait 1-2 minutes for your project to be provisioned

### Step 3: Get Your API Credentials

Once your project is ready, you'll need two values for your environment configuration:

1. Navigate to **Project Settings** (gear icon in the sidebar)
2. Click **API** in the left menu
3. Find and copy these values:

| Setting | Location | Description |
|---------|----------|-------------|
| **Project URL** | Under "Project URL" | Your unique Supabase URL (e.g., `https://abc123xyz.supabase.co`) |
| **anon public key** | Under "Project API keys" | The `anon` `public` key (safe for browser use) |

> **Security Note:** Never expose the `service_role` key in client-side code. Only use the `anon` key for the `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variable.

**Quick Reference Screenshot Location:**
```
Dashboard → Settings (⚙️) → API
├── Project URL: Copy the URL under "Project URL"
└── API Keys: Copy the "anon" "public" key (NOT service_role)
```

### Step 4: Enable PostGIS Extension

Love Ledger uses the PostGIS extension for geospatial queries (finding nearby locations). You must enable this extension before running migrations:

1. In your Supabase Dashboard, go to the **SQL Editor** (sidebar)
2. Click **New query**
3. Run the following SQL command:

```sql
-- Enable the PostGIS extension for geospatial features
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
```

4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)
5. You should see a success message: "Success. No rows returned."

**Alternative Method - Using Extensions UI:**
1. Go to **Database** → **Extensions** in the sidebar
2. Search for "postgis"
3. Toggle the switch to enable it

> **Learn more:** [Supabase PostGIS documentation](https://supabase.com/docs/guides/database/extensions/postgis)

### Step 5: Run Database Migrations

Love Ledger's database schema is defined in migration files located in `supabase/migrations/`. These create the necessary tables, indexes, and Row Level Security (RLS) policies.

**Option A: Using the Supabase SQL Editor (Recommended for beginners)**

1. Open your project's **SQL Editor**
2. For each migration file in `supabase/migrations/` (in order):
   - Open the `.sql` file in your code editor
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **Run**

**Option B: Using Supabase CLI (Recommended for advanced users)**

If you prefer using the command line:

1. **Install the Supabase CLI:**
   ```bash
   # Using npm
   npm install -g supabase

   # Or using Homebrew (macOS)
   brew install supabase/tap/supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link your project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```
   > Find your project ref in Dashboard → Settings → General → Reference ID

4. **Push migrations:**
   ```bash
   supabase db push
   ```

**Learn more:**
- [Supabase CLI documentation](https://supabase.com/docs/guides/cli)
- [Database Migrations](https://supabase.com/docs/guides/cli/managing-environments#migrations)

### Step 6: Verify Database Setup

After running migrations, verify your database is correctly set up:

1. Go to **Table Editor** in your Supabase Dashboard
2. You should see the following tables:
   - `profiles` - User profile information
   - `locations` - Places where missed connections can occur
   - `posts` - Missed connection posts
   - `conversations` - Chat conversations between users
   - `messages` - Individual messages in conversations
   - `notifications` - User notifications

3. Verify PostGIS is working by running this query in the SQL Editor:
   ```sql
   SELECT PostGIS_Version();
   ```
   You should see a version string like `3.3 USE_GEOS=1 USE_PROJ=1...`

### Database Schema Overview

Here's a quick overview of the main tables:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Database Schema                              │
├─────────────────────────────────────────────────────────────────────┤
│  profiles        ←──────── auth.users (Supabase Auth)               │
│  ├── id (uuid)                                                      │
│  ├── username                                                       │
│  └── avatar_config (JSON)                                           │
│                                                                     │
│  locations                                                          │
│  ├── id (uuid)                                                      │
│  ├── name, address                                                  │
│  ├── google_place_id                                                │
│  └── coordinates (PostGIS geography point)                          │
│                                                                     │
│  posts                                                              │
│  ├── id (uuid)                                                      │
│  ├── author_id → profiles.id                                        │
│  ├── location_id → locations.id                                     │
│  └── target_avatar (JSON)                                           │
│                                                                     │
│  conversations ←→ messages (1:many)                                 │
│  profiles ←→ notifications (1:many)                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Supabase Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostGIS Extension Guide](https://supabase.com/docs/guides/database/extensions/postgis)

> **Next Steps:** Continue to [Google Maps API Setup](#google-maps-api-setup) to configure the Maps integration.

---

## Google Maps API Setup

Love Ledger uses the Google Maps JavaScript API and Places API for location search and map display. Follow these steps to set up your Google Cloud project and obtain an API key.

### Step 1: Create a Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account (or create one)
3. Accept the terms of service if prompted

> **Note:** Google Cloud offers a free tier with $200 credit for new users, and the Maps APIs have generous free usage tiers. For development purposes, you're unlikely to incur any charges.

### Step 2: Create a New Project

1. In the [Google Cloud Console](https://console.cloud.google.com/), click the project dropdown at the top of the page
2. Click **New Project**
3. Enter the project details:
   - **Project name:** `love-ledger-dev` (or any name you prefer)
   - **Organization:** Leave as "No organization" for personal projects
   - **Location:** Leave as default
4. Click **Create**
5. Wait a few seconds for the project to be created
6. Ensure your new project is selected in the project dropdown

### Step 3: Enable Required APIs

You need to enable two Google Maps APIs for Love Ledger:

#### Enable Maps JavaScript API

1. Go to [APIs & Services → Library](https://console.cloud.google.com/apis/library)
2. Search for "Maps JavaScript API"
3. Click on **Maps JavaScript API**
4. Click **Enable**
5. Wait for the API to be enabled

#### Enable Places API

1. Return to [APIs & Services → Library](https://console.cloud.google.com/apis/library)
2. Search for "Places API"
3. Click on **Places API** (Note: There's also "Places API (New)" - either works, but we recommend the standard "Places API")
4. Click **Enable**

**Quick Navigation:**
```
Google Cloud Console → APIs & Services → Library
├── Search: "Maps JavaScript API" → Click → Enable
└── Search: "Places API" → Click → Enable
```

**Verify APIs are Enabled:**

Go to [APIs & Services → Enabled APIs](https://console.cloud.google.com/apis/dashboard) and confirm you see:
- Maps JavaScript API
- Places API

### Step 4: Create an API Key

1. Go to [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **+ Create Credentials** at the top
3. Select **API key**
4. A dialog will appear with your new API key
5. Click **Edit API key** to configure restrictions (recommended) or copy the key first

> **Important:** Keep your API key secure. Never commit it to version control or expose it in client-side code without restrictions.

### Step 5: Restrict Your API Key (Recommended)

For security, always restrict your API key. Unrestricted keys can be abused if exposed.

#### Application Restrictions

Set up HTTP referrer restrictions to limit where the key can be used:

1. In the API key edit screen, under **Application restrictions**, select **Websites**
2. Click **Add** under "Website restrictions"
3. Add the following referrers for development:

| Referrer Pattern | Purpose |
|-----------------|---------|
| `http://localhost:3000/*` | Local development server |
| `http://localhost/*` | Any localhost port |
| `http://127.0.0.1:3000/*` | Alternative localhost |

For production, you'll add your actual domain:
```
https://yourdomain.com/*
https://www.yourdomain.com/*
```

#### API Restrictions

Limit which APIs the key can access:

1. Under **API restrictions**, select **Restrict key**
2. Check the following APIs:
   - ✅ Maps JavaScript API
   - ✅ Places API
3. Click **Save**

**Restriction Summary:**
```
API Key Settings
├── Application restrictions: Websites
│   └── Allowed referrers:
│       ├── http://localhost:3000/*
│       ├── http://localhost/*
│       └── http://127.0.0.1:3000/*
└── API restrictions: Restrict key
    ├── Maps JavaScript API ✓
    └── Places API ✓
```

### Step 6: Copy Your API Key

1. Return to [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Find your API key in the list
3. Click the **Copy** button (📋) next to the key
4. Save this key - you'll need it for your `.env.local` file

The key will look something like: `AIzaSyC1234567890abcdefghijklmnopqrstuvwx`

### Step 7: Enable Billing (If Required)

Google Maps APIs require a billing account to be linked, even for free tier usage:

1. If prompted, go to [Billing](https://console.cloud.google.com/billing)
2. Click **Link a billing account**
3. Create a billing account or select an existing one
4. Add a payment method

> **Don't worry about charges:** Google provides:
> - $200 free credit for new Google Cloud accounts
> - Free monthly usage for Maps APIs:
>   - Maps JavaScript API: 28,000 free loads/month
>   - Places API: 5,000 free requests/month
> - For development, you're unlikely to exceed these limits

### Verify Your Setup

Test that your API key is working:

1. Open a new browser tab
2. Go to this URL (replace `YOUR_API_KEY` with your actual key):
   ```
   https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places
   ```
3. If successful, you'll see JavaScript code (not an error)
4. If you see an error, check:
   - APIs are enabled
   - Billing is set up
   - Key restrictions allow your current domain

### Troubleshooting Google Maps API

| Issue | Solution |
|-------|----------|
| "This API project is not authorized" | Enable the required APIs (Maps JavaScript, Places) |
| "API key not valid" | Check key was copied correctly, no extra spaces |
| "Referer not allowed" | Add your development URL to website restrictions |
| "Billing not enabled" | Link a billing account to your project |
| "You have exceeded your quota" | Wait until quota resets (monthly) or enable billing |
| Map shows "For development purposes only" watermark | This is normal if billing isn't set up - add billing to remove |

### Google Maps Resources

- [Google Cloud Console](https://console.cloud.google.com/)
- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Google Maps Platform Pricing](https://cloud.google.com/maps-platform/pricing)

> **Next Steps:** Continue to [Environment Configuration](#environment-configuration) to set up your `.env.local` file with the credentials you've gathered.

---

## Environment Configuration

Now that you've set up Supabase and Google Maps, it's time to configure your environment variables so the application can connect to these services.

### Step 1: Create Your Environment File

Love Ledger uses a `.env.local` file to store sensitive configuration values. This file is specific to your local machine and should **never be committed to version control**.

Copy the example environment file to create your local configuration:

```bash
# From the project root directory
cp .env.example .env.local
```

**Windows (Command Prompt):**
```cmd
copy .env.example .env.local
```

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env.local
```

> **Security Note:** The `.env.local` file is already listed in `.gitignore`. If you accidentally commit it, immediately rotate your API keys and secrets.

### Step 2: Configure Required Variables

Open `.env.local` in your code editor and configure the following **required** variables:

#### Supabase Configuration

```env
# Your Supabase project URL
# Where to find it: Supabase Dashboard → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Your Supabase anonymous (public) key
# Where to find it: Supabase Dashboard → Settings → API → Project API keys → anon public
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key...
```

| Variable | Where to Find | Notes |
|----------|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard → Settings → API → Project URL | Looks like `https://abc123xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard → Settings → API → anon public key | Long JWT string starting with `eyJ...` |

> **⚠️ Warning:** Only use the `anon` (public) key here. Never use the `service_role` key in environment variables prefixed with `NEXT_PUBLIC_` as they are exposed to the browser.

#### Google Maps Configuration

```env
# Your Google Maps API key
# Where to find it: Google Cloud Console → APIs & Services → Credentials
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy-your-google-maps-api-key-here
```

| Variable | Where to Find | Notes |
|----------|---------------|-------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Cloud Console → Credentials → API key | Looks like `AIzaSyC1234567890abcdef...` |

### Step 3: Configure Optional Variables (If Needed)

These variables are **optional** and provide additional functionality:

```env
# [OPTIONAL] Supabase Service Role Key - for admin/server operations
# Only needed if you're building features that bypass RLS
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# [OPTIONAL] App base URL - for generating absolute URLs
# NEXT_PUBLIC_APP_URL=http://localhost:3000

# [OPTIONAL] Enable verbose debugging
# DEBUG=true
```

| Variable | Purpose | When to Use |
|----------|---------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses Row Level Security | Admin operations, migrations |
| `NEXT_PUBLIC_APP_URL` | Base URL for absolute links | Email templates, meta tags |
| `DEBUG` | Enables detailed console logs | Troubleshooting issues |

### Step 4: Verify Your Configuration

After setting your environment variables, verify they're correctly configured:

**Quick Check (bash):**
```bash
# This should print your configured values (redacted)
grep "NEXT_PUBLIC" .env.local
```

**Check for common issues:**
```bash
# Ensure no trailing whitespace or quotes around values
cat .env.local | grep -E '=.*"' && echo "⚠️  Remove quotes around values" || echo "✓ No quoted values"
```

### Environment Variable Reference

Here's a complete reference of all environment variables used by Love Ledger:

| Variable | Required | Exposed to Browser | Description |
|----------|----------|-------------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | ✅ Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | ✅ Yes | Supabase anonymous key (safe for client) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ✅ Yes | ✅ Yes | Google Maps API key |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ No | ❌ No | Supabase admin key (server-only) |
| `NEXT_PUBLIC_APP_URL` | ❌ No | ✅ Yes | Application base URL |
| `DEBUG` | ❌ No | ❌ No | Enable debug logging |

### Understanding `NEXT_PUBLIC_` Prefix

Next.js has a special convention for environment variables:

- **`NEXT_PUBLIC_*`** variables are **bundled into the browser** and accessible in client-side code
- **Without prefix** variables are **only available on the server** (API routes, server components)

```javascript
// ✅ Accessible everywhere (client + server)
process.env.NEXT_PUBLIC_SUPABASE_URL

// ✅ Server-side only (API routes, Server Components)
process.env.SUPABASE_SERVICE_ROLE_KEY

// ❌ Won't work in browser - will be undefined
process.env.SECRET_KEY // No NEXT_PUBLIC_ prefix
```

**Rule of thumb:** Only use `NEXT_PUBLIC_` prefix for values that are safe to expose in the browser (like your Supabase anon key or restricted Google Maps key).

### Security Best Practices

Follow these practices to keep your credentials secure:

1. **Never commit `.env.local`** - It's gitignored by default, keep it that way
2. **Use the anon key, not service_role** - The anon key respects RLS policies
3. **Restrict your Google Maps key** - Add referrer restrictions in Cloud Console
4. **Rotate leaked credentials immediately** - If you accidentally expose a key, regenerate it
5. **Use different keys per environment** - Separate development, staging, and production

### Example Complete `.env.local`

Here's what a properly configured `.env.local` file looks like:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://abc123xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYzEyM3h5eiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjc2OTIzMDAwLCJleHAiOjE5OTI0OTkwMDB9.your-signature-here

# Google Maps (Required)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz
```

> **Reminder:** Replace the example values above with your actual credentials from Supabase and Google Cloud Console.

### Environment Files Priority

Next.js loads environment files in this order (later files override earlier ones):

1. `.env` - Default values (committed to repo)
2. `.env.local` - Local overrides (gitignored) ← **Your configuration goes here**
3. `.env.development` - Development-specific defaults
4. `.env.development.local` - Local development overrides (gitignored)

For most developers, you only need `.env.local`.

> **Next Steps:** Continue to [Running the Application](#running-the-application) to start the development server.

---

## Running the Application

With all your environment variables configured, you're ready to start the development server and verify your setup.

### Starting the Development Server

Run the following command from the project root directory:

**Using npm:**
```bash
npm run dev
```

**Using pnpm:**
```bash
pnpm dev
```

You should see output similar to:
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in X.Xs
```

### Accessing the Application

Once the server is running, open your browser and navigate to:

```
http://localhost:3000
```

> **Tip:** The development server supports hot reload - any changes you make to the code will automatically refresh in your browser.

### Using a Different Port

If port 3000 is already in use, you can specify a different port:

```bash
# Using npm
npm run dev -- -p 3001

# Using pnpm
pnpm dev -p 3001
```

Or set it via environment variable:

```bash
PORT=3001 npm run dev
```

**Windows (PowerShell):**
```powershell
$env:PORT=3001; npm run dev
```

### Verifying Your Setup

After starting the development server, verify that all integrations are working correctly:

#### ✅ Step 1: Verify the Application Loads

1. Open `http://localhost:3000` in your browser
2. You should see the Love Ledger homepage
3. Check the browser console (F12 → Console tab) for any errors

**What to look for:**
| Status | Meaning |
|--------|---------|
| ✅ Homepage loads without errors | Basic setup is working |
| ❌ "Failed to load resource" | Check if dev server is running |
| ❌ Blank page with console errors | Check for syntax errors in code |

#### ✅ Step 2: Verify Supabase Connection

Test that your Supabase configuration is correct:

**Method 1: Check the Authentication Page**

1. Navigate to the sign-in or sign-up page (e.g., `http://localhost:3000/auth/signin`)
2. If the authentication form loads, Supabase Auth is connected
3. Try creating a test account or signing in

**Method 2: Check Browser Console**

1. Open browser developer tools (F12)
2. Go to the Console tab
3. Look for any Supabase-related errors:

| Console Message | Meaning | Solution |
|----------------|---------|----------|
| No errors | ✅ Supabase connected | All good! |
| `supabaseUrl is required` | Missing `NEXT_PUBLIC_SUPABASE_URL` | Check `.env.local` configuration |
| `supabaseKey is required` | Missing `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Check `.env.local` configuration |
| `Invalid API key` | Incorrect anon key | Copy the correct key from Supabase Dashboard |
| `FetchError` or `CORS error` | Network/URL issue | Verify your Supabase URL is correct |

**Method 3: Check Network Tab**

1. Open browser developer tools (F12)
2. Go to the Network tab
3. Refresh the page
4. Look for requests to `*.supabase.co`:
   - **Status 200**: ✅ Connection successful
   - **Status 401/403**: Check API key configuration
   - **Status 0 or Failed**: Check URL configuration

#### ✅ Step 3: Verify Google Maps Integration

Test that your Google Maps configuration is correct:

**Method 1: Check a Map Page**

1. Navigate to a page that displays a map (e.g., the location picker or explore page)
2. The map should render showing an interactive Google Map
3. Verify you can:
   - Pan and zoom the map
   - See map tiles loading correctly
   - Click on the map

**Method 2: Check for Map Errors**

Common map-related issues and their appearance:

| What You See | Meaning | Solution |
|-------------|---------|----------|
| ✅ Interactive map with controls | All good! | Google Maps is working |
| Gray box with "Oops! Something went wrong" | API key error | Check API key is correct and APIs are enabled |
| Map with "For development purposes only" watermark | Billing not enabled | [Enable billing](#step-7-enable-billing-if-required) in Google Cloud Console |
| Map loads but Places search doesn't work | Places API not enabled | Enable Places API in Cloud Console |
| "RefererNotAllowedMapError" in console | Referrer restrictions | Add `localhost:3000` to allowed referrers |

**Method 3: Test Places Autocomplete**

1. Navigate to a page with location search
2. Start typing a place name (e.g., "Starbucks")
3. Autocomplete suggestions should appear
4. If suggestions appear, the Places API is working

#### ✅ Step 4: Verify Database Tables (Optional)

Confirm your database migrations were applied:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Table Editor**
4. Verify these tables exist:
   - `profiles`
   - `locations`
   - `posts`
   - `conversations`
   - `messages`
   - `notifications`

### Verification Checklist

Use this checklist to confirm your setup is complete:

```markdown
## Setup Verification Checklist

- [ ] Development server starts without errors
- [ ] Application loads at http://localhost:3000
- [ ] No errors in browser console
- [ ] Authentication page loads (Supabase Auth working)
- [ ] Map displays correctly (Google Maps working)
- [ ] Places autocomplete shows suggestions (Places API working)
- [ ] Database tables exist in Supabase Dashboard
```

### Quick Verification Commands

Run these commands to check your setup status:

```bash
# Check that .env.local exists and has required variables
test -f .env.local && echo "✓ .env.local exists" || echo "✗ Missing .env.local"

# Check for required environment variables
grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && echo "✓ Supabase URL configured" || echo "✗ Missing Supabase URL"
grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local && echo "✓ Supabase key configured" || echo "✗ Missing Supabase key"
grep -q "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" .env.local && echo "✓ Google Maps key configured" || echo "✗ Missing Google Maps key"

# Verify dependencies are installed
test -d node_modules && echo "✓ Dependencies installed" || echo "✗ Run npm install first"
```

**Windows (PowerShell):**
```powershell
# Check for .env.local and required variables
if (Test-Path .env.local) { Write-Host "✓ .env.local exists" -ForegroundColor Green } else { Write-Host "✗ Missing .env.local" -ForegroundColor Red }
if (Select-String -Path .env.local -Pattern "NEXT_PUBLIC_SUPABASE_URL" -Quiet) { Write-Host "✓ Supabase URL configured" -ForegroundColor Green }
if (Select-String -Path .env.local -Pattern "NEXT_PUBLIC_SUPABASE_ANON_KEY" -Quiet) { Write-Host "✓ Supabase key configured" -ForegroundColor Green }
if (Select-String -Path .env.local -Pattern "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" -Quiet) { Write-Host "✓ Google Maps key configured" -ForegroundColor Green }
if (Test-Path node_modules) { Write-Host "✓ Dependencies installed" -ForegroundColor Green }
```

### Common Startup Issues

If you encounter issues starting the development server, see the [Troubleshooting](#troubleshooting) section below.

| Issue | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| `ENOENT: no such file or directory` | Missing dependencies | Run `npm install` |
| `Port 3000 is already in use` | Another process using the port | Use `-p 3001` or stop the other process |
| `Module not found` | Missing or corrupted dependencies | Delete `node_modules` and run `npm install` |
| `Environment variable not set` | Missing `.env.local` | Copy `.env.example` to `.env.local` |

> **🎉 Congratulations!** If all verifications pass, your development environment is fully set up and ready for development!

> **Next Steps:** Continue to [Development Workflow](#development-workflow) to learn about common development commands and practices.

---

## Development Workflow

This section covers the common development commands and workflows you'll use while working on Love Ledger.

### Available npm Scripts

Here are the main npm scripts available for development:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Create a production-optimized build |
| `npm run start` | Start the production server (requires build first) |
| `npm run lint` | Run ESLint to check for code issues |

### Running the Linter

Love Ledger uses [ESLint](https://eslint.org/) for code quality and consistency. Always run the linter before committing code:

**Run linting:**
```bash
# Using npm
npm run lint

# Using pnpm
pnpm lint
```

**Expected output (when no issues):**
```
✔ No ESLint warnings or errors
```

**Fixing lint errors:**

Many lint issues can be auto-fixed:

```bash
# Auto-fix issues where possible
npm run lint -- --fix

# Using pnpm
pnpm lint --fix
```

**Common lint issues and solutions:**

| Issue | Example | Solution |
|-------|---------|----------|
| Unused variable | `'x' is assigned a value but never used` | Remove the variable or use it |
| Missing dependency in useEffect | `React Hook useEffect has missing dependency` | Add the dependency to the array |
| Import order | `Import order violation` | Let `--fix` auto-organize imports |
| Unused imports | `'Component' is defined but never used` | Remove the unused import |

### Building for Production

Before deploying or to verify your changes compile correctly, run a production build:

```bash
# Using npm
npm run build

# Using pnpm
pnpm build
```

**Successful build output:**
```
▲ Next.js 15.x.x

   Creating an optimized production build ...
 ✓ Compiled successfully
 ✓ Linting and checking validity of types
 ✓ Collecting page data
 ✓ Generating static pages
 ✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    5.2 kB        89.1 kB
├ ○ /auth/signin                         3.1 kB        87.0 kB
└ ...
```

**Common build errors:**

| Error Type | Example | Solution |
|------------|---------|----------|
| Type error | `Type 'string' is not assignable to type 'number'` | Fix TypeScript type mismatch |
| Import error | `Module not found: Can't resolve 'component'` | Check import path and file existence |
| Build error | `Failed to compile` | Check console for specific error |

**Test the production build locally:**

```bash
# Build then start production server
npm run build && npm run start
```

### Code Style Guidelines

Love Ledger follows these code style conventions:

#### TypeScript
- Use TypeScript for all new files (`.ts`, `.tsx`)
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Export types that are used across files

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Avoid
function getUser(id: any): any {
  // ...
}
```

#### React Components
- Use functional components with hooks
- Name components in PascalCase
- One component per file (with exceptions for small related components)
- Prefer named exports over default exports for components

```typescript
// ✅ Good - components/UserCard.tsx
export function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
}

// ✅ Good - with explicit props interface
interface UserCardProps {
  user: User;
  onSelect?: (user: User) => void;
}

export function UserCard({ user, onSelect }: UserCardProps) {
  return (
    <div onClick={() => onSelect?.(user)}>
      {user.name}
    </div>
  );
}
```

#### File Naming Conventions
- **Components:** PascalCase (`UserCard.tsx`, `LocationPicker.tsx`)
- **Utilities:** camelCase (`formatDate.ts`, `apiClient.ts`)
- **Hooks:** camelCase starting with `use` (`useUser.ts`, `useLocation.ts`)
- **Types:** PascalCase with `types.ts` suffix or in-file (`types.ts`, `User.types.ts`)

#### Imports
- Group imports in order: external packages, internal modules, relative imports
- Use absolute imports from `@/` for cleaner paths

```typescript
// ✅ Good import order
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/Button';

import { formatDate } from './utils';
import type { Props } from './types';
```

#### CSS and Styling
- Use Tailwind CSS for styling
- Prefer utility classes over custom CSS
- Use the `cn()` utility for conditional classes (if available)

```tsx
// ✅ Good - Tailwind utilities
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
  Submit
</button>

// ✅ Good - Conditional classes
<button className={cn(
  "px-4 py-2 rounded",
  isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
)}>
  Toggle
</button>
```

### Git Commit Conventions

Love Ledger follows conventional commit messages for clear project history:

#### Commit Message Format

```
<type>: <short description>

[optional body]

[optional footer]
```

#### Commit Types

| Type | When to Use | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add location search autocomplete` |
| `fix` | Bug fix | `fix: resolve map marker positioning issue` |
| `docs` | Documentation only | `docs: update setup instructions` |
| `style` | Code style (formatting, semicolons, etc.) | `style: format components with prettier` |
| `refactor` | Code refactoring (no feature/bug change) | `refactor: extract user validation logic` |
| `test` | Adding or updating tests | `test: add unit tests for auth flow` |
| `chore` | Build process, dependencies, tooling | `chore: update dependencies` |

#### Commit Message Guidelines

1. **Keep the subject line short** (50 characters or less)
2. **Use the imperative mood** ("add feature" not "added feature")
3. **Don't end with a period**
4. **Capitalize the first letter** after the type

**Good commit messages:**
```bash
git commit -m "feat: add user profile avatar customization"
git commit -m "fix: prevent duplicate form submission"
git commit -m "docs: add Google Maps API setup instructions"
git commit -m "refactor: simplify authentication flow"
```

**Avoid:**
```bash
git commit -m "Fixed stuff"           # Too vague
git commit -m "WIP"                   # Not descriptive
git commit -m "feat: Add feature."    # Period and capitalization
git commit -m "made changes to code"  # Past tense, not imperative
```

#### Working with Git

**Common Git workflow:**

```bash
# 1. Create a feature branch
git checkout -b feat/location-search

# 2. Make your changes, then stage them
git add .

# 3. Commit with a descriptive message
git commit -m "feat: add location search with Google Places"

# 4. Push to remote
git push origin feat/location-search

# 5. Create a Pull Request on GitHub
```

**Before committing, always:**

1. ✅ Run the linter: `npm run lint`
2. ✅ Verify the build: `npm run build`
3. ✅ Test your changes in the browser
4. ✅ Write a clear commit message

### Development Tips

#### Hot Reload
The development server automatically reloads when you save changes. If hot reload isn't working:
- Check for syntax errors in your code
- Restart the dev server (`Ctrl+C`, then `npm run dev`)

#### TypeScript Errors
TypeScript errors appear in:
- Your code editor (VSCode with TypeScript extension)
- The browser console during development
- The terminal when running `npm run build`

**Quick fix for persistent type errors:**
```bash
# Clear Next.js cache and restart
rm -rf .next
npm run dev
```

#### Browser DevTools
- Use React DevTools extension for component debugging
- Network tab to inspect Supabase API calls
- Console for runtime errors and logs

### Quick Reference Card

```bash
# Daily development commands
npm run dev          # Start development server
npm run lint         # Check code quality
npm run lint -- --fix # Auto-fix lint issues
npm run build        # Verify production build

# Git workflow
git add .
git commit -m "type: description"
git push origin branch-name
```

> **Next Steps:** If you encounter any issues during development, check the [Troubleshooting](#troubleshooting) section below.

---

## Troubleshooting

This section covers common issues you might encounter during development and their solutions.

### Node.js Version Issues

#### Problem: "Node.js version not supported" or build failures

If you see errors related to Node.js version incompatibility:

```
error engine: Unsupported engine
error Found: node@16.x.x
error Required: node@>=18.0.0
```

**Solution:**

1. Check your current Node.js version:
   ```bash
   node --version
   ```

2. If below v18, update Node.js:
   ```bash
   # Using nvm (recommended)
   nvm install 20
   nvm use 20

   # Verify the new version
   node --version  # Should show v20.x.x
   ```

3. Reinstall dependencies after updating Node.js:
   ```bash
   rm -rf node_modules
   npm install
   ```

**Windows (PowerShell):**
```powershell
# Remove node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

#### Problem: Multiple Node.js versions causing conflicts

If you have multiple Node.js versions installed:

**Solution:**

```bash
# List installed versions
nvm list

# Use the correct version for this project
nvm use 20

# Optionally, set as default
nvm alias default 20
```

**Windows (nvm-windows):**
```powershell
nvm list
nvm use 20.x.x
```

### Port Already in Use Issues

#### Problem: "Port 3000 is already in use"

You'll see this error when trying to start the development server:

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution 1: Find and stop the process using port 3000**

**macOS/Linux:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 <PID>
```

**Windows (PowerShell):**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID from last column)
taskkill /PID <PID> /F
```

**Solution 2: Use a different port**

```bash
# Use port 3001 instead
npm run dev -- -p 3001
```

Or set via environment variable:

```bash
# macOS/Linux
PORT=3001 npm run dev

# Windows (PowerShell)
$env:PORT=3001; npm run dev

# Windows (CMD)
set PORT=3001 && npm run dev
```

**Solution 3: Kill all Node.js processes (last resort)**

```bash
# macOS/Linux
killall node

# Windows
taskkill /F /IM node.exe
```

### Supabase Connection Issues

#### Problem: "supabaseUrl is required" or "supabaseKey is required"

This error means your Supabase environment variables are not configured:

```
Error: supabaseUrl is required
Error: supabaseKey is required
```

**Solution:**

1. Ensure `.env.local` exists:
   ```bash
   # Check if file exists
   ls -la .env.local

   # If not, create it
   cp .env.example .env.local
   ```

2. Verify required variables are set:
   ```bash
   grep "NEXT_PUBLIC_SUPABASE" .env.local
   ```

3. Ensure values are properly formatted (no quotes, no trailing spaces):
   ```env
   # ✅ Correct
   NEXT_PUBLIC_SUPABASE_URL=https://abc123xyz.supabase.co

   # ❌ Incorrect - remove quotes
   NEXT_PUBLIC_SUPABASE_URL="https://abc123xyz.supabase.co"
   ```

4. Restart the development server after updating `.env.local`:
   ```bash
   # Stop the server (Ctrl+C) then restart
   npm run dev
   ```

#### Problem: "Invalid API key" or 401 Unauthorized errors

```
Error: Invalid API key
POST https://xxx.supabase.co/rest/v1/... 401 (Unauthorized)
```

**Solution:**

1. Verify you copied the correct key from Supabase Dashboard:
   - Go to Dashboard → Settings → API → Project API keys
   - Copy the `anon` `public` key (NOT `service_role`)

2. Ensure the key is pasted correctly without extra characters:
   ```bash
   # Key should start with "eyJ" and be a long string
   cat .env.local | grep NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

3. Check for typos or truncation - the key is quite long

4. If using a new project, wait a few minutes for the project to fully provision

#### Problem: CORS errors or "Failed to fetch"

```
Access to fetch at 'https://xxx.supabase.co' has been blocked by CORS policy
```

**Solution:**

1. Verify your Supabase URL is correct:
   ```bash
   # Should look like: https://abc123xyz.supabase.co
   grep NEXT_PUBLIC_SUPABASE_URL .env.local
   ```

2. Ensure you're using HTTPS (not HTTP):
   ```env
   # ✅ Correct
   NEXT_PUBLIC_SUPABASE_URL=https://abc123xyz.supabase.co

   # ❌ Incorrect
   NEXT_PUBLIC_SUPABASE_URL=http://abc123xyz.supabase.co
   ```

3. Check your Supabase project status in the dashboard - it may be paused

#### Problem: "relation 'xxx' does not exist"

```
Error: relation "profiles" does not exist
```

**Solution:**

This means database migrations haven't been run. See [Step 5: Run Database Migrations](#step-5-run-database-migrations) in the Supabase Setup section.

Quick fix:
1. Go to your Supabase Dashboard → SQL Editor
2. Run the migration files from `supabase/migrations/` in order

### PostGIS Extension Issues

#### Problem: "function st_point does not exist" or geography errors

```
Error: function st_point(numeric, numeric) does not exist
Error: type "geography" does not exist
```

**Solution:**

PostGIS extension is not enabled. Enable it using the SQL Editor:

```sql
-- Enable the PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
```

**Alternative - Using Dashboard UI:**
1. Go to Supabase Dashboard → Database → Extensions
2. Search for "postgis"
3. Toggle the switch to enable it

#### Problem: "permission denied to create extension"

```
Error: permission denied to create extension "postgis"
```

**Solution:**

1. Make sure you're running the command in your own Supabase project (not a shared one)
2. Try enabling via the Dashboard UI instead of SQL (requires appropriate permissions)
3. Contact Supabase support if the issue persists

#### Problem: PostGIS queries returning unexpected results

**Solution:**

1. Verify PostGIS is installed and working:
   ```sql
   -- Run in SQL Editor
   SELECT PostGIS_Version();
   ```

   Should return something like: `3.3 USE_GEOS=1 USE_PROJ=1...`

2. Check coordinate ordering - PostGIS uses (longitude, latitude), not (latitude, longitude):
   ```sql
   -- Correct: longitude first, latitude second
   ST_Point(-122.4194, 37.7749)  -- San Francisco

   -- Incorrect order will produce wrong results
   ST_Point(37.7749, -122.4194)
   ```

### Google Maps API Key Issues

#### Problem: "This API project is not authorized to use this API"

```
Google Maps JavaScript API error: ApiNotActivatedMapError
```

**Solution:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Library
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API

4. Wait a few minutes for activation to propagate

#### Problem: "ApiKeyNotValidError" or API key not working

```
Google Maps JavaScript API error: InvalidKeyMapError
```

**Solution:**

1. Verify your API key is correctly copied:
   ```bash
   # Key should start with "AIza" and be 39 characters
   grep NEXT_PUBLIC_GOOGLE_MAPS_API_KEY .env.local
   ```

2. Check for extra spaces or newlines:
   ```env
   # ✅ Correct
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuvwx

   # ❌ Incorrect - extra space
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY= AIzaSyC1234567890abcdefghijklmnopqrstuvwx
   ```

3. Ensure the API key hasn't been deleted or regenerated in Cloud Console

#### Problem: "RefererNotAllowedMapError" - Referrer restriction blocking requests

```
Google Maps JavaScript API error: RefererNotAllowedMapError
```

**Solution:**

Your API key's website restrictions are blocking requests from localhost:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your API key
3. Under "Application restrictions" → "Websites", add:
   ```
   http://localhost:3000/*
   http://localhost/*
   http://127.0.0.1:3000/*
   http://127.0.0.1/*
   ```

4. Click **Save** and wait a few minutes for changes to propagate

**Note:** If you're using a different port (e.g., 3001), add that too:
```
http://localhost:3001/*
```

#### Problem: "For development purposes only" watermark on map

The map displays but has a dark "For development purposes only" watermark.

**Solution:**

This appears when billing is not enabled on your Google Cloud project:

1. Go to [Google Cloud Console → Billing](https://console.cloud.google.com/billing)
2. Link a billing account to your project
3. Add a payment method

**Note:** Google provides:
- $200 free credit for new accounts
- Free monthly usage for Maps APIs (28,000 map loads/month)
- You're unlikely to incur charges during development

#### Problem: Places autocomplete not showing results

**Solution:**

1. Verify Places API is enabled in Cloud Console

2. Check API restrictions on your key include Places API:
   - Go to Cloud Console → Credentials
   - Edit your API key
   - Under "API restrictions", ensure "Places API" is checked

3. Test the API directly in browser console:
   ```javascript
   // Should return true if Places library is loaded
   google.maps.places !== undefined
   ```

4. Check for JavaScript errors in browser console that might indicate the issue

### Environment Variable Issues

#### Problem: Environment variables not loading

**Solution:**

1. Verify file naming - must be `.env.local` (not `.env.local.txt` on Windows):
   ```bash
   ls -la .env*
   ```

2. Check file location - must be in project root:
   ```
   love-ledger/
   ├── .env.local     ✅ Correct location
   ├── app/
   ├── components/
   └── ...
   ```

3. Restart the development server after changes:
   ```bash
   # Stop with Ctrl+C, then restart
   npm run dev
   ```

4. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run dev
   ```

#### Problem: "process.env.X is undefined" in browser

**Solution:**

For variables to be accessible in browser code, they must have the `NEXT_PUBLIC_` prefix:

```env
# ✅ Accessible in browser
NEXT_PUBLIC_SUPABASE_URL=https://...

# ❌ Server-side only (will be undefined in browser)
SUPABASE_URL=https://...
```

### Build and Compilation Issues

#### Problem: "Module not found" errors during build

```
Error: Cannot find module '@/components/SomeComponent'
Module not found: Can't resolve './missing-file'
```

**Solution:**

1. Check if the file exists at the specified path
2. Verify import path is correct (case-sensitive on Linux/macOS):
   ```typescript
   // File is: components/UserCard.tsx
   import { UserCard } from '@/components/UserCard';  // ✅ Correct
   import { UserCard } from '@/components/usercard';  // ❌ Wrong case
   ```

3. Reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```

#### Problem: TypeScript type errors

```
Type error: Property 'x' does not exist on type 'Y'
```

**Solution:**

1. Run type checking to see all errors:
   ```bash
   npx tsc --noEmit
   ```

2. Fix type mismatches or add proper type definitions

3. For third-party libraries missing types:
   ```bash
   npm install --save-dev @types/library-name
   ```

#### Problem: Build succeeds but page shows errors

**Solution:**

1. Clear the `.next` cache:
   ```bash
   rm -rf .next
   npm run build
   ```

2. Check for hydration mismatches (client/server content differs):
   - Look for date/time rendering without proper hydration handling
   - Check for browser-only APIs used during SSR

3. Verify all required environment variables are set for production

### Dependency Issues

#### Problem: "npm install" fails with permission errors

**Solution:**

**macOS/Linux:**
```bash
# Fix npm permissions (don't use sudo for npm install)
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Then retry
npm install
```

**Alternative:** Use nvm to manage Node.js (automatically handles permissions)

#### Problem: Conflicting dependency versions

```
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution:**

```bash
# Option 1: Use legacy peer deps
npm install --legacy-peer-deps

# Option 2: Clean install
rm -rf node_modules package-lock.json
npm install
```

### Quick Diagnostic Commands

Run these commands to quickly diagnose common issues:

**bash (macOS/Linux):**
```bash
echo "=== Environment Check ==="
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Git: $(git --version)"

echo ""
echo "=== File Check ==="
test -f .env.local && echo "✓ .env.local exists" || echo "✗ Missing .env.local"
test -d node_modules && echo "✓ node_modules exists" || echo "✗ Run npm install"
test -f package-lock.json && echo "✓ package-lock.json exists" || echo "✗ Run npm install"

echo ""
echo "=== Environment Variables ==="
grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null && echo "✓ Supabase URL set" || echo "✗ Missing Supabase URL"
grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local 2>/dev/null && echo "✓ Supabase key set" || echo "✗ Missing Supabase key"
grep -q "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" .env.local 2>/dev/null && echo "✓ Maps key set" || echo "✗ Missing Maps key"

echo ""
echo "=== Port Check ==="
lsof -i :3000 >/dev/null 2>&1 && echo "⚠ Port 3000 is in use" || echo "✓ Port 3000 is available"
```

**PowerShell (Windows):**
```powershell
Write-Host "=== Environment Check ===" -ForegroundColor Cyan
Write-Host "Node.js: $(node --version)"
Write-Host "npm: $(npm --version)"
Write-Host "Git: $(git --version)"

Write-Host ""
Write-Host "=== File Check ===" -ForegroundColor Cyan
if (Test-Path .env.local) { Write-Host "✓ .env.local exists" -ForegroundColor Green } else { Write-Host "✗ Missing .env.local" -ForegroundColor Red }
if (Test-Path node_modules) { Write-Host "✓ node_modules exists" -ForegroundColor Green } else { Write-Host "✗ Run npm install" -ForegroundColor Red }

Write-Host ""
Write-Host "=== Environment Variables ===" -ForegroundColor Cyan
if (Select-String -Path .env.local -Pattern "NEXT_PUBLIC_SUPABASE_URL" -Quiet 2>$null) { Write-Host "✓ Supabase URL set" -ForegroundColor Green } else { Write-Host "✗ Missing Supabase URL" -ForegroundColor Red }
if (Select-String -Path .env.local -Pattern "NEXT_PUBLIC_SUPABASE_ANON_KEY" -Quiet 2>$null) { Write-Host "✓ Supabase key set" -ForegroundColor Green } else { Write-Host "✗ Missing Supabase key" -ForegroundColor Red }
if (Select-String -Path .env.local -Pattern "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" -Quiet 2>$null) { Write-Host "✓ Maps key set" -ForegroundColor Green } else { Write-Host "✗ Missing Maps key" -ForegroundColor Red }

Write-Host ""
Write-Host "=== Port Check ===" -ForegroundColor Cyan
$port = netstat -ano | findstr ":3000"
if ($port) { Write-Host "⚠ Port 3000 is in use" -ForegroundColor Yellow } else { Write-Host "✓ Port 3000 is available" -ForegroundColor Green }
```

### Getting Help

If you're still experiencing issues after trying the solutions above:

1. **Search existing issues:** Check the [GitHub Issues](https://github.com/your-username/love-ledger/issues) for similar problems

2. **Check service status:**
   - [Supabase Status](https://status.supabase.com/)
   - [Google Cloud Status](https://status.cloud.google.com/)

3. **Open a new issue:** If your problem isn't documented, [open a new issue](https://github.com/your-username/love-ledger/issues/new) with:
   - Your operating system and version
   - Node.js version (`node --version`)
   - Error message (full text)
   - Steps to reproduce
   - What you've already tried

4. **Community resources:**
   - [Supabase Discord](https://discord.supabase.com/)
   - [Next.js Discord](https://nextjs.org/discord)
   - [Stack Overflow](https://stackoverflow.com/) with relevant tags

---

**Happy coding! 🎉** If this guide helped you get started or you found an issue not covered here, consider contributing improvements to this documentation.
