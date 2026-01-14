import { Metadata } from 'next';
import {
  LegalPageLayout,
  LegalSection,
  LegalSubsection,
  LegalList,
  LegalTable,
  ContactInfo,
} from '@/components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy | Backtrack',
  description: 'Privacy Policy for Backtrack - How we collect, use, and protect your personal information',
  robots: 'noindex, nofollow',
  openGraph: {
    title: 'Privacy Policy | Backtrack',
    description: 'Privacy Policy for Backtrack',
    type: 'website',
  },
};

const tableOfContents = [
  { id: 'introduction', title: '1. Introduction', level: 2 },
  { id: 'info-we-collect', title: '2. Information We Collect', level: 2 },
  { id: 'how-we-use', title: '3. How We Use Your Information', level: 2 },
  { id: 'how-we-share', title: '4. How We Share Your Information', level: 2 },
  { id: 'data-retention', title: '5. Data Retention', level: 2 },
  { id: 'your-rights', title: '6. Your Rights and Choices', level: 2 },
  { id: 'regional-rights', title: '7. Regional Privacy Rights', level: 2 },
  { id: 'data-security', title: '8. Data Security', level: 2 },
  { id: 'children', title: "9. Children's Privacy", level: 2 },
  { id: 'anonymous-use', title: '10. Anonymous and Pseudonymous Use', level: 2 },
  { id: 'third-party-links', title: '11. Third-Party Links', level: 2 },
  { id: 'changes', title: '12. Changes to This Privacy Policy', level: 2 },
  { id: 'contact', title: '13. Contact Us', level: 2 },
  { id: 'summary', title: '14. Summary of Key Points', level: 2 },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="December 30, 2025"
      effectiveDate="December 30, 2025"
      tableOfContents={tableOfContents}
    >
      <LegalSection id="introduction" title="1. Introduction">
        <p>
          Welcome to Backtrack (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). This Privacy Policy explains how we
          collect, use, disclose, and safeguard your information when you use our mobile application
          Backtrack (the &quot;App&quot;).
        </p>
        <p>
          Please read this Privacy Policy carefully. By using the App, you agree to the collection
          and use of information in accordance with this policy. If you do not agree with the terms
          of this Privacy Policy, please do not access the App.
        </p>
      </LegalSection>

      <LegalSection id="info-we-collect" title="2. Information We Collect">
        <LegalSubsection title="2.1 Information You Provide Directly">
          <p>
            <strong>Account Information</strong>
          </p>
          <LegalList
            items={[
              'Email address',
              'Password (encrypted)',
              'Date of birth (for age verification)',
              'Profile information',
            ]}
          />

          <p>
            <strong>Avatar Data</strong>
          </p>
          <LegalList
            items={[
              'Custom avatar configurations you create',
              'Avatar appearance settings (hair color, skin tone, clothing, accessories, etc.)',
            ]}
          />

          <p>
            <strong>User Content</strong>
          </p>
          <LegalList
            items={[
              'Posts and messages you create',
              'Photos you upload (selfie verification photos, shared photos in conversations)',
              'Text notes attached to posts',
            ]}
          />

          <p>
            <strong>Communications</strong>
          </p>
          <LegalList
            items={[
              'Messages exchanged with other users',
              'Reports and feedback you submit',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="2.2 Information Collected Automatically">
          <p>
            <strong>Location Data</strong>
          </p>
          <LegalList
            items={[
              'Precise GPS location when you create posts',
              'General location data for discovering nearby venues',
              'Location history associated with your posts',
            ]}
          />
          <p>
            We collect location data only when you grant permission and actively use location-based
            features. You can disable location access in your device settings at any time.
          </p>

          <p>
            <strong>Device Information</strong>
          </p>
          <LegalList
            items={[
              'Device type and model',
              'Operating system version',
              'Unique device identifiers',
              'App version',
            ]}
          />

          <p>
            <strong>Usage Data</strong>
          </p>
          <LegalList
            items={[
              'Features you use',
              'Interactions within the App',
              'Time and date of visits',
              'Time spent on screens',
            ]}
          />

          <p>
            <strong>Push Notification Tokens</strong>
          </p>
          <LegalList
            items={[
              'Device tokens for sending push notifications (if you enable notifications)',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="2.3 Information from Third Parties">
          <p>
            <strong>Authentication Providers</strong>
          </p>
          <p>
            If you sign up using third-party authentication (future feature), we may receive basic
            profile information from those providers.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="how-we-use" title="3. How We Use Your Information">
        <p>We use your information for the following purposes:</p>

        <LegalSubsection title="3.1 Core App Functionality">
          <LegalList
            items={[
              'Create and manage your account',
              'Enable you to create and view posts at locations',
              'Match you with other users based on avatar descriptions',
              'Facilitate messaging between matched users',
              'Display posts and venues on the map',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="3.2 Location-Based Services">
          <LegalList
            items={[
              'Show nearby venues and posts',
              'Calculate distances to locations',
              'Enable location-based post discovery',
              'Associate posts with physical locations',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="3.3 Communication">
          <LegalList
            items={[
              'Send push notifications about new matches and messages',
              'Respond to your inquiries and support requests',
              'Send important service-related communications',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="3.4 Safety and Security">
          <LegalList
            items={[
              'Verify user identity through selfie verification',
              'Investigate and prevent fraudulent or illegal activity',
              'Enforce our Terms of Service',
              'Moderate content and respond to reports',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="3.5 Improvement and Analytics">
          <LegalList
            items={[
              'Analyze usage patterns to improve the App',
              'Debug and fix technical issues',
              'Develop new features',
            ]}
          />
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="how-we-share" title="4. How We Share Your Information">
        <LegalSubsection title="4.1 With Other Users">
          <LegalList
            items={[
              'Your avatar (not your personal identity) is visible to other users',
              'Posts you create are visible at the associated location',
              'Messages are shared with the users you communicate with',
              'Shared photos in conversations are visible to conversation participants',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="4.2 Service Providers">
          <p>We work with third-party service providers who assist us in operating the App:</p>

          <p>
            <strong>Supabase, Inc.</strong>
          </p>
          <LegalList
            items={[
              'Purpose: Database hosting, user authentication, real-time messaging, file storage',
              'Data shared: Account data, posts, messages, photos',
              <>
                Privacy Policy:{' '}
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
                  https://supabase.com/privacy
                </a>
              </>,
            ]}
          />

          <p>
            <strong>Google (Google Maps Platform)</strong>
          </p>
          <LegalList
            items={[
              'Purpose: Map display, location search, geocoding',
              'Data shared: Location coordinates, location searches',
              <>
                Privacy Policy:{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                  https://policies.google.com/privacy
                </a>
              </>,
            ]}
          />

          <p>
            <strong>Expo (Expo.dev)</strong>
          </p>
          <LegalList
            items={[
              'Purpose: App development framework, push notifications',
              'Data shared: Device tokens, crash reports',
              <>
                Privacy Policy:{' '}
                <a href="https://expo.dev/privacy" target="_blank" rel="noopener noreferrer">
                  https://expo.dev/privacy
                </a>
              </>,
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="4.3 Legal Requirements">
          <p>We may disclose your information if required to do so by law or in response to:</p>
          <LegalList
            items={[
              'Court orders or legal processes',
              'Government requests',
              'To protect our rights, privacy, safety, or property',
              'To enforce our Terms of Service',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="4.4 Business Transfers">
          <p>
            In the event of a merger, acquisition, or sale of assets, your information may be
            transferred as part of that transaction.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="data-retention" title="5. Data Retention">
        <LegalSubsection title="5.1 Active Accounts">
          <p>We retain your data for as long as your account is active. This includes:</p>
          <LegalList
            items={[
              'Account information',
              'Posts and messages',
              'Avatar configurations',
              'Location history associated with posts',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="5.2 Deleted Content">
          <LegalList
            items={[
              'Deleted posts are removed from public view immediately',
              'Deleted messages may be retained for a brief period for legal/safety purposes',
              'Deleted accounts and associated data are permanently removed within 30 days',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="5.3 Anonymized Data">
          <p>
            We may retain anonymized, aggregated data indefinitely for analytics purposes.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="your-rights" title="6. Your Rights and Choices">
        <LegalSubsection title="6.1 Access and Portability">
          <p>
            You can access your account data through the App&apos;s profile settings. You may request a
            copy of your personal data by contacting us.
          </p>
        </LegalSubsection>

        <LegalSubsection title="6.2 Correction">
          <p>You can update or correct your account information through the App settings.</p>
        </LegalSubsection>

        <LegalSubsection title="6.3 Deletion">
          <p>You can delete your account at any time through the App settings. Upon deletion:</p>
          <LegalList
            items={[
              'Your profile and avatar will be removed',
              'Your posts will be deleted',
              'Your messages will be removed from conversations',
              'Associated data will be permanently deleted within 30 days',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="6.4 Location Permissions">
          <p>
            You can disable location access at any time through your device settings. Note that some
            features require location access to function.
          </p>
        </LegalSubsection>

        <LegalSubsection title="6.5 Push Notifications">
          <p>
            You can enable or disable push notifications through the App settings or your device
            settings.
          </p>
        </LegalSubsection>

        <LegalSubsection title="6.6 Marketing Communications">
          <p>
            We do not currently send marketing emails. If we do in the future, you will be able to
            opt out.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="regional-rights" title="7. Regional Privacy Rights">
        <LegalSubsection title="7.1 European Economic Area (GDPR)">
          <p>If you are located in the EEA, you have additional rights:</p>

          <p>
            <strong>Legal Bases for Processing</strong>
          </p>
          <LegalList
            items={[
              "Contract: Processing necessary to provide the App's services",
              'Legitimate Interests: Analytics, security, and fraud prevention',
              'Consent: Push notifications, location services (when separately obtained)',
            ]}
          />

          <p>
            <strong>Your Additional Rights</strong>
          </p>
          <LegalList
            items={[
              'Right to object to processing',
              'Right to restrict processing',
              'Right to data portability',
              'Right to withdraw consent',
              'Right to lodge a complaint with a supervisory authority',
            ]}
          />

          <p>
            <strong>Data Transfers</strong>
          </p>
          <p>
            Your data may be transferred to and processed in the United States. We rely on Standard
            Contractual Clauses and other appropriate safeguards for such transfers.
          </p>
        </LegalSubsection>

        <LegalSubsection title="7.2 California Residents (CCPA/CPRA)">
          <p>If you are a California resident, you have additional rights:</p>

          <p>
            <strong>Categories of Personal Information Collected</strong>
          </p>
          <LegalList
            items={[
              'Identifiers (email, device ID)',
              'Geolocation data',
              'Internet activity (usage data)',
              'Audio/visual information (photos)',
              'Inferences (match predictions)',
            ]}
          />

          <p>
            <strong>Your Rights</strong>
          </p>
          <LegalList
            items={[
              'Right to know what personal information is collected',
              'Right to know whether personal information is sold or disclosed',
              'Right to say no to the sale of personal information (we do not sell data)',
              'Right to deletion',
              'Right to equal service and price',
            ]}
          />

          <p>
            <strong>Do Not Sell My Personal Information</strong>
          </p>
          <p>We do not sell your personal information to third parties.</p>
        </LegalSubsection>

        <LegalSubsection title="7.3 Other Jurisdictions">
          <p>
            If you are located in other jurisdictions with data protection laws, you may have similar
            rights. Please contact us to exercise your rights.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="data-security" title="8. Data Security">
        <p>
          We implement appropriate technical and organizational security measures to protect your
          information:
        </p>
        <LegalList
          items={[
            'Encryption of data in transit (TLS/SSL)',
            'Encryption of data at rest',
            'Secure password hashing',
            'Access controls and authentication',
            'Regular security assessments',
            'Row-Level Security (RLS) policies on database tables',
          ]}
        />
        <p>
          However, no method of transmission over the internet or electronic storage is 100% secure.
          While we strive to protect your personal information, we cannot guarantee absolute
          security.
        </p>
      </LegalSection>

      <LegalSection id="children" title="9. Children's Privacy">
        <p>
          <strong>Age Restriction:</strong> Backtrack is intended for users who are at least 18 years
          old. We do not knowingly collect personal information from anyone under the age of 18.
        </p>
        <p>
          <strong>Age Verification:</strong> During account registration, you must confirm that you
          are at least 18 years old by providing your date of birth.
        </p>
        <p>
          <strong>Parental Rights:</strong> If you believe we have collected information from a child
          under 18, please contact us immediately at{' '}
          <a href="mailto:privacy@backtrack.social">privacy@backtrack.social</a>. We will promptly
          delete such information.
        </p>
      </LegalSection>

      <LegalSection id="anonymous-use" title="10. Anonymous and Pseudonymous Use">
        <p>Backtrack is designed with privacy in mind:</p>
        <LegalList
          items={[
            <>
              <strong>Avatar-Based Identity:</strong> Your real identity is not displayed to other
              users. Instead, you are represented by an avatar.
            </>,
            <>
              <strong>No Public Profiles:</strong> Your personal information is not publicly
              searchable.
            </>,
            <>
              <strong>Controlled Disclosure:</strong> You choose when and how to share personal
              photos with matched users.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection id="third-party-links" title="11. Third-Party Links">
        <p>
          The App may contain links to third-party websites or services. We are not responsible for
          the privacy practices of these third parties. We encourage you to read the privacy policies
          of any third-party sites you visit.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes to This Privacy Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by:
        </p>
        <LegalList
          items={[
            'Posting the new Privacy Policy in the App',
            'Updating the "Last Updated" date',
            'Sending a notification if changes are significant',
          ]}
        />
        <p>
          Your continued use of the App after changes are posted constitutes acceptance of the
          revised Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="13. Contact Us">
        <p>
          If you have any questions about this Privacy Policy or our data practices, please contact
          us:
        </p>
        <ContactInfo
          email="privacy@backtrack.social"
          address={[
            'Backtrack Privacy Team',
            '1332 N Vail Ave',
            'Arlington Heights, IL 60004',
            'USA',
          ]}
        />
        <p>
          <strong>Data Protection Officer</strong> (for EEA users):{' '}
          <a href="mailto:dpo@backtrack.social">dpo@backtrack.social</a>
        </p>
      </LegalSection>

      <LegalSection id="summary" title="14. Summary of Key Points">
        <LegalTable
          headers={['What We Collect', 'Why We Collect It', 'Your Control']}
          rows={[
            ['Email & Password', 'Account authentication', 'Can delete account'],
            ['Location', 'Show nearby venues, create posts', 'Can disable in settings'],
            ['Photos', 'Selfie verification, sharing', 'Can delete content'],
            ['Messages', 'Communication with matches', 'Can delete conversations'],
            ['Avatar config', 'Matching and identity', 'Can modify anytime'],
            ['Device info', 'App functionality, security', 'Limited - necessary for app'],
            ['Usage data', 'Improve the app', 'Can opt-out of analytics'],
          ]}
        />
        <p className="mt-8 text-muted-foreground italic">
          This Privacy Policy is provided in compliance with applicable data protection laws
          including GDPR, CCPA, and other regional regulations.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
