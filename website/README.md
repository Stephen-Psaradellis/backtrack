# Backtrack Website

Static website for backtrack.social with legal documents and deep linking configuration.

## Structure

```
website/
├── .well-known/
│   ├── apple-app-site-association  # iOS Universal Links
│   └── assetlinks.json              # Android App Links
├── index.html                       # Landing page
├── style.css                        # Styles
├── privacy/index.html               # Privacy Policy
├── terms/index.html                 # Terms of Service
└── support/index.html               # Support page
```

## Deployment Options

### Option 1: Vercel (Recommended)
```bash
cd website
npx vercel
```

### Option 2: Netlify
1. Connect your repo to Netlify
2. Set publish directory to `website`
3. Deploy

### Option 3: GitHub Pages
1. Push to a `gh-pages` branch or use `/docs` folder
2. Configure custom domain in repo settings

### Option 4: Cloudflare Pages
1. Connect repo to Cloudflare Pages
2. Set build output to `website`

## Important Configuration

### CORS Headers
The `.well-known` files must be served with proper headers:
- `Content-Type: application/json`
- No caching recommended during setup

### Apple App Site Association
After getting your Apple Team ID:
1. Edit `.well-known/apple-app-site-association`
2. Replace `TEAM_ID` with your actual Apple Team ID

Example:
```json
"appID": "ABC123XYZ.com.backtrack.app"
```

### Android Asset Links
The SHA256 fingerprint is already configured from the keystore:
```
CE:6F:35:9B:FE:06:F0:59:48:9D:84:2B:3F:82:61:EB:C9:2D:B3:0A:AF:7D:EB:57:2F:EC:7B:A3:B0:69:3A:B9
```

## Verification

### iOS Universal Links
```bash
curl https://backtrack.social/.well-known/apple-app-site-association
```

### Android App Links
```bash
curl https://backtrack.social/.well-known/assetlinks.json
```

Use Google's verification tool:
https://developers.google.com/digital-asset-links/tools/generator

## DNS Configuration

Point your domain to your hosting provider:
- A record or CNAME as per provider instructions
- Enable HTTPS (required for deep linking)

## Email Setup (ElasticEmail)

Create these email addresses:
- support@backtrack.social
- legal@backtrack.social
- privacy@backtrack.social
- security@backtrack.social
- dpo@backtrack.social (for GDPR)
