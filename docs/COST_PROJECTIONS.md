# Backtrack - Cost Projection & Operational Expenses

> Comprehensive analysis of hosting, API, and operational costs at different scales

**Last Updated:** December 2024
**Version:** 1.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Service Dependencies Overview](#service-dependencies-overview)
3. [Cost Projections by Scale](#cost-projections-by-scale)
4. [Detailed Service Breakdown](#detailed-service-breakdown)
5. [Cost Optimization Strategies](#cost-optimization-strategies)
6. [Financial Projections](#financial-projections)
7. [Risk Factors & Variables](#risk-factors--variables)

---

## Executive Summary

Backtrack's infrastructure costs are primarily driven by:

| Cost Driver | Impact | Scalability |
|-------------|--------|-------------|
| **Supabase** (Database/Auth/Storage) | High | Linear with users |
| **Google Maps APIs** | High | Per-interaction |
| **Google Cloud Vision** | Medium | Per-photo upload |
| **Hosting (Web/Mobile)** | Low-Medium | Step function |
| **Ready Player Me** | Low | Free tier available |

### Quick Cost Overview

| Scale | Monthly Users | Est. Monthly Cost |
|-------|---------------|-------------------|
| **MVP/Beta** | 100-500 | $25 - $75 |
| **Early Growth** | 1,000-5,000 | $150 - $400 |
| **Growth** | 10,000-25,000 | $500 - $1,500 |
| **Scale** | 50,000-100,000 | $2,000 - $6,000 |
| **Enterprise** | 250,000+ | $10,000+ |

---

## Service Dependencies Overview

### Critical Services (Required)

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKTRACK STACK                        │
├─────────────────────────────────────────────────────────────┤
│  FRONTEND                                                   │
│  ├── Expo (iOS/Android)     → App Store/Play Store fees     │
│  └── Next.js (Web)          → Vercel/AWS/Other hosting      │
├─────────────────────────────────────────────────────────────┤
│  BACKEND (Supabase)                                         │
│  ├── PostgreSQL + PostGIS   → Database storage & queries    │
│  ├── Auth                   → User authentication           │
│  ├── Realtime               → Chat & live updates           │
│  ├── Storage                → Selfies & profile photos      │
│  └── Edge Functions         → Image moderation              │
├─────────────────────────────────────────────────────────────┤
│  EXTERNAL APIs                                              │
│  ├── Google Maps SDK        → Map display                   │
│  ├── Google Places API      → Location search               │
│  ├── Google Geocoding API   → Coordinate lookups            │
│  └── Google Vision API      → Content moderation            │
├─────────────────────────────────────────────────────────────┤
│  OPTIONAL                                                   │
│  └── Ready Player Me        → 3D Avatar creation            │
└─────────────────────────────────────────────────────────────┘
```

---

## Cost Projections by Scale

### Tier 1: MVP / Beta (100-500 MAU)

**Use Case:** Initial launch, beta testing, early adopters

| Service | Tier | Monthly Cost | Notes |
|---------|------|--------------|-------|
| Supabase | Free | $0 | 500MB DB, 1GB storage, 2GB bandwidth |
| Google Maps | Free tier | $0 | $200/month credit covers usage |
| Google Vision | Pay-as-go | $5-15 | ~3,000-10,000 photo moderations |
| Vercel (Web) | Hobby | $0 | Free tier sufficient |
| Expo/EAS | Free | $0 | Development builds |
| **Total** | | **$5 - $25** | |

**Assumptions:**
- 5 posts per user per month
- 2 profile photos per user
- 10 location searches per user per month
- 50 messages per user per month

---

### Tier 2: Early Growth (1,000-5,000 MAU)

**Use Case:** Post-launch growth, product-market fit testing

| Service | Tier | Monthly Cost | Notes |
|---------|------|--------------|-------|
| Supabase | Pro | $25 | 8GB DB, 100GB storage |
| Google Maps | Paid | $50-150 | Beyond free tier |
| Google Vision | Paid | $15-50 | 10,000-35,000 moderations |
| Vercel (Web) | Pro | $20 | Better performance |
| Expo/EAS | Production | $0-29 | Priority builds optional |
| Domain/SSL | - | $15 | Annual amortized |
| **Total** | | **$125 - $290** | |

**Additional Considerations:**
- Customer support tooling (~$50/month)
- Error monitoring (Sentry: $26/month)
- Analytics (Mixpanel free tier or $25/month)

**Realistic Total: $150 - $400/month**

---

### Tier 3: Growth (10,000-25,000 MAU)

**Use Case:** Proven traction, scaling operations

| Service | Tier | Monthly Cost | Notes |
|---------|------|--------------|-------|
| Supabase | Pro + Add-ons | $75-150 | Increased compute, storage |
| Google Maps | Paid | $200-500 | 100K-250K API calls |
| Google Vision | Paid | $75-150 | 50K-100K moderations |
| Vercel (Web) | Pro | $20-50 | Increased bandwidth |
| Expo/EAS | Production | $99 | Priority builds, more builds |
| CDN (optional) | - | $50-100 | If needed beyond Supabase |
| **Total** | | **$520 - $1,050** | |

**Operational Overhead:**
| Item | Monthly Cost |
|------|--------------|
| Error Monitoring (Sentry) | $80 |
| Analytics (Mixpanel/Amplitude) | $100 |
| Customer Support (Intercom/Zendesk) | $150 |
| Email Service (if needed) | $50 |
| **Overhead Total** | **$380** |

**Realistic Total: $900 - $1,500/month**

---

### Tier 4: Scale (50,000-100,000 MAU)

**Use Case:** Established product, regional/national presence

| Service | Tier | Monthly Cost | Notes |
|---------|------|--------------|-------|
| Supabase | Team/Enterprise | $300-600 | Dedicated resources |
| Google Maps | Premium | $800-2,000 | 500K-1M API calls |
| Google Vision | Volume | $200-400 | 150K-300K moderations |
| Hosting (Multi-region) | - | $200-400 | Redundancy, performance |
| Expo/EAS | Enterprise | $200+ | Custom builds, support |
| **Total** | | **$1,700 - $3,600** | |

**Operational Overhead:**
| Item | Monthly Cost |
|------|--------------|
| DevOps/Monitoring Stack | $300 |
| Customer Support Platform | $500 |
| Analytics Suite | $300 |
| Security/Compliance | $200 |
| Legal/Privacy (amortized) | $200 |
| **Overhead Total** | **$1,500** |

**Realistic Total: $3,200 - $5,100/month**

---

### Tier 5: Enterprise (250,000+ MAU)

**Use Case:** Market leader, multiple regions

| Service | Tier | Monthly Cost | Notes |
|---------|------|--------------|-------|
| Supabase Enterprise | Enterprise | $1,500-3,000+ | Dedicated, SLA |
| Google Maps | Enterprise | $3,000-8,000+ | Volume discounts |
| Google Vision | Enterprise | $500-1,500 | Volume pricing |
| Multi-Cloud Hosting | - | $1,000-3,000 | AWS/GCP redundancy |
| CDN (Cloudflare/Fastly) | Business | $500-1,000 | Global distribution |
| **Total** | | **$6,500 - $16,500** | |

**Enterprise Operational Overhead:**
| Item | Monthly Cost |
|------|--------------|
| 24/7 DevOps/SRE | $2,000+ |
| Enterprise Support Tools | $1,500 |
| Security & Compliance | $1,000 |
| Legal & Privacy | $500 |
| Business Analytics | $500 |
| **Overhead Total** | **$5,500+** |

**Realistic Total: $12,000 - $22,000+/month**

---

## Detailed Service Breakdown

### 1. Supabase (Primary Backend)

#### Pricing Tiers (as of 2024)

| Tier | Price | Database | Storage | Bandwidth | Best For |
|------|-------|----------|---------|-----------|----------|
| Free | $0 | 500MB | 1GB | 2GB | Development |
| Pro | $25/mo | 8GB | 100GB | 250GB | Production |
| Team | $599/mo | 100GB+ | 500GB+ | Custom | Scale |
| Enterprise | Custom | Custom | Custom | Custom | Enterprise |

#### Usage-Based Costs (Pro tier add-ons)

| Resource | Included | Overage Cost |
|----------|----------|--------------|
| Database | 8GB | $0.125/GB |
| Storage | 100GB | $0.021/GB |
| Bandwidth | 250GB | $0.09/GB |
| Edge Function Invocations | 500K | $2/million |
| Realtime Messages | 200K | $2.50/million |
| Auth MAU | 50K | $0.00325/MAU |

#### Backtrack Specific Usage Patterns

```
Per Active User (Monthly Estimates):
├── Database Writes
│   ├── Posts created: 3-5 posts × 2KB = 10KB
│   ├── Messages sent: 50 messages × 0.5KB = 25KB
│   ├── Location visits: 10 visits × 1KB = 10KB
│   └── Profile updates: 2 updates × 1KB = 2KB
│   Total: ~50KB/user/month writes
│
├── Database Reads
│   ├── Feed loads: 20 loads × 50 posts × 1KB = 1MB
│   ├── Chat history: 30 loads × 20 messages = 0.6MB
│   ├── Location queries: 15 queries × 10KB = 0.15MB
│   └── Profile lookups: 50 lookups × 2KB = 0.1MB
│   Total: ~2MB/user/month reads
│
├── Storage
│   ├── Selfies: 3 posts × 500KB = 1.5MB
│   └── Profile photos: 3 photos × 500KB = 1.5MB
│   Total: ~3MB/user storage
│
└── Realtime
    ├── Chat subscriptions: 100 messages received
    └── Typing indicators: 50 events
    Total: ~150 realtime events/user/month
```

#### Supabase Cost Projections

| MAU | Database Size | Storage | Realtime Events | Est. Cost |
|-----|---------------|---------|-----------------|-----------|
| 500 | 100MB | 1.5GB | 75K | $0 (Free) |
| 2,500 | 500MB | 7.5GB | 375K | $25-35 |
| 10,000 | 2GB | 30GB | 1.5M | $50-100 |
| 50,000 | 10GB | 150GB | 7.5M | $200-400 |
| 100,000 | 20GB | 300GB | 15M | $400-800 |

---

### 2. Google Maps Platform

#### API Pricing (per 1,000 requests)

| API | Price/1K | Free Tier | Notes |
|-----|----------|-----------|-------|
| Maps SDK (Mobile) | $7.00 | $200 credit | Per map load |
| Maps JavaScript | $7.00 | $200 credit | Per map load |
| Places - Find Place | $17.00 | $200 credit | Location search |
| Places - Details | $17.00 | $200 credit | Get place info |
| Places - Autocomplete | $2.83/session | $200 credit | Search suggestions |
| Geocoding | $5.00 | $200 credit | Lat/lng lookup |

#### Backtrack Usage Patterns

```
Per Active User (Monthly):
├── Map Loads
│   ├── Home screen: 5 loads
│   ├── Location picker: 10 loads
│   └── Post detail: 15 loads
│   Total: ~30 map loads
│
├── Places API
│   ├── Location searches: 8 searches
│   ├── Autocomplete sessions: 5 sessions
│   └── Place details: 10 requests
│   Total: ~23 Places requests
│
└── Geocoding
    └── Reverse geocoding: 5 requests
```

#### Google Maps Cost Projections

| MAU | Map Loads | Places Requests | Geocoding | Est. Cost* |
|-----|-----------|-----------------|-----------|------------|
| 500 | 15K | 11.5K | 2.5K | $0 (Free credit) |
| 2,500 | 75K | 57.5K | 12.5K | $50-100 |
| 10,000 | 300K | 230K | 50K | $250-500 |
| 50,000 | 1.5M | 1.15M | 250K | $1,200-2,500 |
| 100,000 | 3M | 2.3M | 500K | $2,500-5,000 |

*After $200 monthly free credit

---

### 3. Google Cloud Vision API

#### Pricing

| Feature | Price per 1,000 | Notes |
|---------|-----------------|-------|
| Safe Search Detection | $1.50 | Used for content moderation |
| Label Detection | $1.50 | Optional enhancement |
| First 1,000/month | Free | Per feature |

#### Backtrack Usage

```
Per Active User (Monthly):
├── Selfie uploads: 3 photos (per post)
├── Profile photo uploads: 1 photo
└── Re-uploads/edits: 1 photo
Total: ~5 moderation requests/user/month
```

#### Vision API Cost Projections

| MAU | Moderation Requests | Est. Cost |
|-----|---------------------|-----------|
| 500 | 2,500 | $2.25 |
| 2,500 | 12,500 | $17.25 |
| 10,000 | 50,000 | $73.50 |
| 50,000 | 250,000 | $373.50 |
| 100,000 | 500,000 | $748.50 |

---

### 4. Hosting & Distribution

#### Web Hosting (Next.js)

| Provider | Free Tier | Pro Tier | Enterprise |
|----------|-----------|----------|------------|
| **Vercel** | 100GB bandwidth | $20/mo | Custom |
| **Netlify** | 100GB bandwidth | $19/mo | Custom |
| **AWS Amplify** | 5GB storage | ~$15/mo | Custom |
| **Cloudflare Pages** | Unlimited | $20/mo | Custom |

**Recommendation:** Vercel (optimized for Next.js)

#### Mobile Distribution

| Platform | One-Time | Annual | Notes |
|----------|----------|--------|-------|
| Apple App Store | - | $99 | Required for iOS |
| Google Play Store | $25 | - | One-time fee |
| Expo EAS | Free-$99/mo | - | Build service |

#### CDN (if needed beyond Supabase)

| Provider | Free Tier | Paid Starting |
|----------|-----------|---------------|
| Cloudflare | Generous | $20/mo |
| Fastly | 50GB | ~$50/mo |
| AWS CloudFront | 1TB/yr | Pay-as-go |

---

### 5. Ready Player Me (Avatar Service)

#### Pricing Model

| Tier | Cost | Features |
|------|------|----------|
| Demo | Free | Watermarked, limited |
| Starter | Contact | Custom subdomain |
| Pro | Contact | Full customization |
| Enterprise | Custom | Volume, SLA |

**Note:** Free demo tier is sufficient for MVP. Contact for production pricing.

---

## Cost Optimization Strategies

### 1. Supabase Optimization

```typescript
// ✅ Use connection pooling
const supabase = createClient(url, key, {
  db: { schema: 'public' },
  global: {
    headers: { 'x-connection-pooling': 'true' }
  }
})

// ✅ Select only needed columns
const { data } = await supabase
  .from('posts')
  .select('id, note, created_at') // Not '*'
  .limit(20)

// ✅ Use indexes for common queries
// Already implemented: PostGIS spatial index

// ✅ Implement pagination
const { data } = await supabase
  .from('posts')
  .select('*')
  .range(0, 19) // First 20 items
```

**Estimated Savings:** 20-40% on database costs

### 2. Google Maps Optimization

```typescript
// ✅ Cache location data
// Store Google Place data in Supabase 'locations' table
// Avoid repeated Places API calls for same locations

// ✅ Use session tokens for Autocomplete
const sessionToken = new google.maps.places.AutocompleteSessionToken()

// ✅ Debounce search input
const debouncedSearch = useMemo(
  () => debounce(searchPlaces, 300),
  []
)

// ✅ Limit map loads
// Use static maps for list views
// Only load interactive maps when needed
```

**Estimated Savings:** 30-50% on Maps API costs

### 3. Image Optimization

```typescript
// ✅ Compress before upload
import * as ImageManipulator from 'expo-image-manipulator'

const compressed = await ImageManipulator.manipulateAsync(
  uri,
  [{ resize: { width: 800 } }],
  { compress: 0.7, format: SaveFormat.JPEG }
)

// ✅ Use Supabase image transforms (built-in)
const url = supabase.storage
  .from('selfies')
  .getPublicUrl(path, {
    transform: { width: 400, height: 400 }
  })
```

**Estimated Savings:** 40-60% on storage costs

### 4. Caching Strategy

| Data Type | Cache Duration | Location |
|-----------|----------------|----------|
| Location data | 24 hours | AsyncStorage |
| User profile | 1 hour | Memory + AsyncStorage |
| Post list | 5 minutes | Memory |
| Chat messages | Realtime | Memory |

---

## Financial Projections

### Year 1 Projection (Growth Scenario)

| Month | MAU | Monthly Cost | Cumulative |
|-------|-----|--------------|------------|
| 1-3 | 500 | $50 | $150 |
| 4-6 | 2,000 | $200 | $750 |
| 7-9 | 8,000 | $600 | $2,550 |
| 10-12 | 20,000 | $1,200 | $6,150 |
| **Year 1 Total** | | | **$6,150** |

### Year 2 Projection (Scale Scenario)

| Quarter | MAU | Monthly Cost | Quarterly |
|---------|-----|--------------|-----------|
| Q1 | 35,000 | $2,000 | $6,000 |
| Q2 | 55,000 | $3,500 | $10,500 |
| Q3 | 80,000 | $5,000 | $15,000 |
| Q4 | 120,000 | $8,000 | $24,000 |
| **Year 2 Total** | | | **$55,500** |

### Cost per User Analysis

| Scale | MAU | Monthly Cost | Cost/User |
|-------|-----|--------------|-----------|
| Beta | 500 | $50 | $0.10 |
| Early | 5,000 | $350 | $0.07 |
| Growth | 25,000 | $1,200 | $0.048 |
| Scale | 100,000 | $5,000 | $0.05 |

**Key Insight:** Cost per user decreases with scale due to:
- Fixed costs spread across more users
- Volume discounts on APIs
- Efficiency optimizations

---

## Risk Factors & Variables

### High Impact Variables

| Factor | Impact | Mitigation |
|--------|--------|------------|
| **User engagement** | Higher activity = higher costs | Implement rate limits, caching |
| **Photo uploads** | Storage + moderation costs | Compress images, limit uploads |
| **Chat volume** | Realtime + storage costs | Message limits, archival policy |
| **Map usage** | API costs scale linearly | Aggressive caching, static maps |

### External Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Google Maps price increase | Medium | High | Cache aggressively, consider alternatives |
| Supabase pricing changes | Low | High | Abstract DB layer, evaluate alternatives |
| Vision API deprecation | Low | Medium | Build fallback moderation system |

### Alternative Services (Contingency)

| Current | Alternative | Trade-off |
|---------|-------------|-----------|
| Supabase | PlanetScale + Auth0 | More complex, similar cost |
| Google Maps | MapBox | Different pricing model |
| Google Vision | AWS Rekognition | Similar pricing |
| Vercel | Cloudflare Pages | Cheaper, less Next.js optimized |

---

## Appendix: Monthly Cost Calculator

### Quick Estimation Formula

```
Monthly Cost ≈
  Supabase Base ($25 at Pro) +
  (MAU × 0.05KB × $0.125/GB) +           // DB storage
  (MAU × 3MB × $0.021/GB) +              // File storage
  (MAU × 30 × $0.007) +                  // Map loads
  (MAU × 23 × $0.017) +                  // Places API
  (MAU × 5 × $0.0015) +                  // Vision API
  Hosting ($20) +
  Overhead (20%)
```

### Example: 10,000 MAU

```
= $25 +                    // Supabase Pro
  (10000 × 0.00005 × 125) + // ~$62.50 DB
  (10000 × 0.003 × 21) +    // ~$630 storage
  (300000 × 0.007) +        // ~$2,100 maps (minus $200 credit = $1,900)
  (230000 × 0.017) +        // ~$3,910 places
  (50000 × 0.0015) +        // ~$75 vision
  $20 +                     // Hosting
  20%                       // Overhead

= ~$800-1,200/month (with optimizations and caching)
```

---

## Summary

Backtrack's infrastructure is designed to scale cost-effectively:

1. **Start cheap:** Free tiers cover MVP through ~1,000 users
2. **Scale predictably:** Costs grow roughly linearly with users
3. **Optimize continuously:** Caching and optimization can reduce costs 30-50%
4. **Plan for growth:** Enterprise tiers offer volume discounts

**Key Recommendations:**
- Implement aggressive caching from day one
- Monitor API usage closely with alerts
- Review costs monthly and optimize
- Negotiate enterprise pricing early (50K+ users)
- Maintain abstraction layers for service portability
