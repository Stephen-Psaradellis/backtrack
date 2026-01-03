# Security Documentation

**Backtrack App Security Measures**

This document outlines the security measures implemented in the Backtrack app to protect user data and prevent common vulnerabilities.

---

## 1. Authentication & Authorization

### 1.1 Supabase Auth
- **Password-based authentication** using Supabase Auth
- **Secure password hashing** (bcrypt with salt)
- **Email verification** required before account activation
- **Session management** with JWT tokens
- **Automatic token refresh** handled by Supabase client

### 1.2 Row Level Security (RLS)
All database tables have RLS policies enforcing:
- Users can only read/modify their own profile
- Users can only see conversations they're participants in
- Users can only read messages in their conversations
- Posts are publicly readable but only modifiable by the creator
- Location data is publicly readable

RLS Policy Files:
- `supabase/migrations/015_rls_policies.sql`
- `supabase/migrations/018_rls_policies.sql`
- `supabase/migrations/019_storage_policies.sql`

---

## 2. Input Validation & Sanitization

### 2.1 Validation Service (`lib/validation.ts`)
Comprehensive input validation including:

**Email Validation**
- RFC 5322 compliant regex validation
- Trimming and normalization
- Maximum length check (254 characters)

**Password Validation**
- Minimum 8 characters required
- Maximum 128 characters
- Strength assessment (weak/fair/good/strong)
- Character variety checks (lowercase, uppercase, numbers, special)

**Text Sanitization**
- HTML stripping
- XSS pattern removal
- Dangerous script removal
- SQL injection pattern detection

**Username Validation**
- Alphanumeric and underscores only
- No consecutive underscores
- 3-30 characters
- Cannot start/end with underscore

### 2.2 Content Limits
```typescript
CONTENT_LIMITS = {
  username: { min: 3, max: 30 },
  displayName: { min: 1, max: 50 },
  postMessage: { min: 1, max: 500 },
  postNote: { min: 0, max: 200 },
  chatMessage: { min: 1, max: 1000 },
  bio: { min: 0, max: 300 },
  customLocationName: { min: 1, max: 50 },
  reportDescription: { min: 10, max: 500 },
}
```

---

## 3. Data Protection

### 3.1 Encryption
- **Data in transit**: TLS/SSL encryption for all API calls
- **Data at rest**: Supabase handles encryption at rest
- **Secure storage**: Expo SecureStore for sensitive tokens

### 3.2 Photo Storage
- Photos stored in Supabase Storage with bucket policies
- Content moderation via Google Cloud Vision SafeSearch
- Photo access controlled by RLS policies
- Photo shares have expiration dates

### 3.3 Location Data
- Location data only collected with explicit permission
- Geolocation precision is user-controlled
- Location history associated with posts only
- No background location tracking

---

## 4. Privacy Protection

### 4.1 Anonymous Interaction
- Users interact via avatars, not real identities
- Real photos only shared after mutual consent
- No public user profiles
- No user searchability by personal info

### 4.2 User Controls
- Block users to prevent all interaction
- Report inappropriate content
- Delete account with data removal within 30 days
- Revoke photo shares

### 4.3 Data Minimization
- Only collect data necessary for features
- No third-party analytics without consent
- No selling of user data

---

## 5. Network Security

### 5.1 Network Error Handling (`lib/network.ts`)
- Automatic retry with exponential backoff
- Offline queue for pending operations
- Network status monitoring
- Graceful degradation for offline use

### 5.2 Request Protection
- Timeout enforcement (30 seconds default)
- Request rate limiting (server-side)
- Error categorization for appropriate responses

---

## 6. Error Handling

### 6.1 Error Boundaries (`components/ErrorBoundary.tsx`)
- Catches JavaScript errors in component tree
- Displays user-friendly error screen
- Prevents full app crashes
- Provides retry functionality

### 6.2 Error Logging
- Development: Full error details shown
- Production: User-friendly messages only
- Errors logged for debugging (no PII)

---

## 7. Age Verification

### 7.1 Requirements
- Users must be 18+ to create an account
- Age confirmation checkbox during signup
- Terms and privacy policy acceptance required
- Acceptance timestamp stored in database

### 7.2 Content Restrictions
- App designed for adults only
- Photo moderation blocks inappropriate content
- User reporting for content violations

---

## 8. Third-Party Services

### 8.1 Supabase
- **Purpose**: Database, Auth, Storage, Realtime
- **Security**: SOC 2 Type II certified
- **Data location**: Configurable by project
- **Privacy**: https://supabase.com/privacy

### 8.2 Google Maps Platform
- **Purpose**: Location services, geocoding
- **Data shared**: Location coordinates, search queries
- **Privacy**: https://policies.google.com/privacy

### 8.3 Expo
- **Purpose**: App framework, push notifications
- **Data shared**: Device tokens, crash reports (opt-in)
- **Privacy**: https://expo.dev/privacy

---

## 9. OWASP Top 10 Mitigation

| Vulnerability | Mitigation |
|--------------|------------|
| A01 Broken Access Control | RLS policies, JWT validation |
| A02 Cryptographic Failures | TLS, secure password hashing |
| A03 Injection | Input sanitization, parameterized queries |
| A04 Insecure Design | Privacy-by-design, minimal data collection |
| A05 Security Misconfiguration | Secure defaults, environment isolation |
| A06 Vulnerable Components | Regular dependency updates |
| A07 Auth Failures | Supabase Auth, secure sessions |
| A08 Data Integrity Failures | Input validation, content moderation |
| A09 Logging Failures | Error logging (no PII) |
| A10 SSRF | No user-controlled URLs to backend |

---

## 10. Incident Response

### 10.1 Security Issues
Report security vulnerabilities to: security@backtrack.social

### 10.2 Data Breaches
- Immediate notification to affected users
- Investigation and remediation
- Regulatory notification as required

### 10.3 User Reports
- In-app reporting for content/user issues
- Support email: support@backtrack.social
- Response within 24-48 hours

---

## 11. Compliance

### 11.1 GDPR (European Users)
- Consent before data collection
- Right to access, correction, deletion
- Data portability on request
- Standard Contractual Clauses for transfers

### 11.2 CCPA (California Users)
- No sale of personal information
- Right to know and delete
- Non-discrimination

### 11.3 App Store Requirements
- Apple App Store Guidelines compliance
- Google Play Policies compliance
- Age rating: 17+ (mature content themes)

---

## 12. Security Updates

This document is updated with each release. Last updated: December 30, 2025

### Version History
- **v1.0.0**: Initial security documentation
