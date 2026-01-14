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
  title: 'Terms of Service | Backtrack',
  description: 'Terms of Service for Backtrack - Location-based anonymous matchmaking application',
  robots: 'noindex, nofollow',
  openGraph: {
    title: 'Terms of Service | Backtrack',
    description: 'Terms of Service for Backtrack',
    type: 'website',
  },
};

const tableOfContents = [
  { id: 'agreement', title: '1. Agreement to Terms', level: 2 },
  { id: 'eligibility', title: '2. Eligibility', level: 2 },
  { id: 'description', title: '3. Description of Service', level: 2 },
  { id: 'conduct', title: '4. User Conduct', level: 2 },
  { id: 'content', title: '5. Content', level: 2 },
  { id: 'safety', title: '6. Safety and Reporting', level: 2 },
  { id: 'privacy', title: '7. Privacy', level: 2 },
  { id: 'ip', title: '8. Intellectual Property', level: 2 },
  { id: 'third-party', title: '9. Third-Party Services', level: 2 },
  { id: 'disclaimers', title: '10. Disclaimers', level: 2 },
  { id: 'liability', title: '11. Limitation of Liability', level: 2 },
  { id: 'indemnification', title: '12. Indemnification', level: 2 },
  { id: 'termination', title: '13. Account Termination', level: 2 },
  { id: 'disputes', title: '14. Dispute Resolution', level: 2 },
  { id: 'governing-law', title: '15. Governing Law', level: 2 },
  { id: 'general', title: '16. General Provisions', level: 2 },
  { id: 'changes', title: '17. Changes to Terms', level: 2 },
  { id: 'contact', title: '18. Contact Information', level: 2 },
  { id: 'summary', title: '19. Summary of Key Points', level: 2 },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="December 30, 2025"
      effectiveDate="December 30, 2025"
      tableOfContents={tableOfContents}
    >
      <LegalSection id="agreement" title="1. Agreement to Terms">
        <p>
          By accessing or using the Backtrack mobile application (&quot;App&quot;), you agree to be
          bound by these Terms of Service (&quot;Terms&quot;) and our Privacy Policy. If you do not
          agree to these Terms, you may not use the App.
        </p>
        <p>
          These Terms constitute a legally binding agreement between you and Backtrack (&quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;).
        </p>
      </LegalSection>

      <LegalSection id="eligibility" title="2. Eligibility">
        <LegalSubsection title="2.1 Age Requirement">
          <p>
            You must be at least <strong>18 years old</strong> to use Backtrack. By creating an
            account, you represent and warrant that:
          </p>
          <LegalList
            items={[
              'You are at least 18 years of age',
              'You have the legal capacity to enter into these Terms',
              'You are not prohibited from using the App under applicable laws',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="2.2 Account Requirements">
          <p>To use certain features of the App, you must:</p>
          <LegalList
            items={[
              'Create an account with accurate and complete information',
              'Maintain the security of your account credentials',
              'Promptly update your information if it changes',
              'Notify us immediately of any unauthorized access',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="2.3 One Account Per Person">
          <p>
            You may only create and maintain one account. Creating multiple accounts is prohibited
            and may result in termination of all accounts.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="description" title="3. Description of Service">
        <p>Backtrack is a location-based social networking app that enables users to:</p>
        <LegalList
          items={[
            'Create "missed connection" posts at physical locations',
            'Describe people you\'ve seen using avatar customization',
            'Browse posts to find potential matches',
            'Communicate with matched users through in-app messaging',
            'Share photos with matched users',
          ]}
        />
        <p>
          The App is designed to facilitate connections while maintaining user privacy through
          avatar-based representation.
        </p>
      </LegalSection>

      <LegalSection id="conduct" title="4. User Conduct">
        <LegalSubsection title="4.1 Acceptable Use">
          <p>
            You agree to use the App only for lawful purposes and in accordance with these Terms.
            You agree NOT to:
          </p>

          <p>
            <strong>Harmful Content</strong>
          </p>
          <LegalList
            items={[
              'Post content that is defamatory, obscene, pornographic, or sexually explicit',
              'Post content that promotes violence, hatred, or discrimination',
              'Harass, abuse, stalk, or threaten other users',
              'Post content that exploits minors in any way',
            ]}
          />

          <p>
            <strong>Deceptive Behavior</strong>
          </p>
          <LegalList
            items={[
              'Impersonate any person or entity',
              'Provide false or misleading information',
              'Create fake accounts or use the App for catfishing',
              'Misrepresent your identity, age, or intentions',
            ]}
          />

          <p>
            <strong>Illegal Activities</strong>
          </p>
          <LegalList
            items={[
              'Use the App for any illegal purpose',
              'Solicit illegal activities or encourage illegal behavior',
              'Post content that infringes intellectual property rights',
              'Engage in commercial activities without authorization',
            ]}
          />

          <p>
            <strong>Technical Violations</strong>
          </p>
          <LegalList
            items={[
              'Attempt to gain unauthorized access to the App or its systems',
              'Use automated tools, bots, or scripts',
              'Interfere with or disrupt the App\'s functionality',
              'Reverse engineer, decompile, or disassemble the App',
            ]}
          />

          <p>
            <strong>Spam and Abuse</strong>
          </p>
          <LegalList
            items={[
              'Send unsolicited or bulk messages',
              'Post repetitive or irrelevant content',
              'Abuse the reporting or blocking features',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="4.2 Location-Based Conduct">
          <p>When using location features, you agree to:</p>
          <LegalList
            items={[
              'Create posts only at locations you have actually visited',
              'Provide accurate descriptions in your posts',
              'Respect the privacy of people at physical locations',
              'Not use location data to stalk or track individuals',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="4.3 Communication Standards">
          <p>When communicating with other users:</p>
          <LegalList
            items={[
              'Be respectful and courteous',
              'Do not send explicit content without consent',
              'Do not share personal contact information unsolicited',
              'Report inappropriate behavior rather than retaliating',
            ]}
          />
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="content" title="5. Content">
        <LegalSubsection title="5.1 Your Content">
          <p>
            You retain ownership of content you post (&quot;User Content&quot;). By posting content, you
            grant us a worldwide, non-exclusive, royalty-free license to:
          </p>
          <LegalList
            items={[
              'Display your content within the App',
              'Store and process your content',
              'Use your content to provide and improve the service',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="5.2 Content Removal">
          <p>We reserve the right to remove any content that:</p>
          <LegalList
            items={[
              'Violates these Terms',
              'Is reported by other users and found to violate our policies',
              'We believe may create liability for us',
              'Is otherwise objectionable',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="5.3 Content Responsibility">
          <p>
            You are solely responsible for your User Content. We do not endorse or guarantee the
            accuracy of any User Content.
          </p>
        </LegalSubsection>

        <LegalSubsection title="5.4 DMCA and Copyright">
          <p>
            If you believe content infringes your copyright, please contact us at{' '}
            <a href="mailto:legal@backtrack.social">legal@backtrack.social</a> with:
          </p>
          <LegalList
            items={[
              'Description of the copyrighted work',
              'Location of the infringing content',
              'Your contact information',
              'A statement of good faith belief',
              'A statement under penalty of perjury',
            ]}
          />
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="safety" title="6. Safety and Reporting">
        <LegalSubsection title="6.1 Reporting Violations">
          <p>
            If you encounter content or behavior that violates these Terms, please report it using
            the in-app reporting feature or by contacting{' '}
            <a href="mailto:support@backtrack.social">support@backtrack.social</a>.
          </p>
        </LegalSubsection>

        <LegalSubsection title="6.2 Blocking Users">
          <p>You can block users who you do not wish to interact with. Blocked users cannot:</p>
          <LegalList
            items={[
              'View your posts',
              'Send you messages',
              'See that you exist on the platform',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="6.3 Our Response">
          <p>
            We investigate all reports and take appropriate action, which may include:
          </p>
          <LegalList
            items={[
              'Issuing warnings',
              'Removing content',
              'Temporarily suspending accounts',
              'Permanently banning users',
              'Reporting to law enforcement when appropriate',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="6.4 Cooperation with Authorities">
          <p>
            We will cooperate with law enforcement agencies in investigating illegal activities and
            may share user information when legally required.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="privacy" title="7. Privacy">
        <p>
          Your use of the App is also governed by our{' '}
          <a href="/privacy">Privacy Policy</a>, which describes how we collect, use, and protect
          your personal information. By using the App, you consent to our Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection id="ip" title="8. Intellectual Property">
        <LegalSubsection title="8.1 Our Intellectual Property">
          <p>
            The App, including its design, features, content, and code, is owned by us and protected
            by intellectual property laws. You may not:
          </p>
          <LegalList
            items={[
              'Copy, modify, or distribute the App',
              'Use our trademarks without permission',
              'Create derivative works based on the App',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="8.2 Feedback">
          <p>
            If you provide feedback or suggestions, you grant us the right to use them without
            restriction or compensation.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="third-party" title="9. Third-Party Services">
        <LegalSubsection title="9.1 Third-Party Integrations">
          <p>The App integrates with third-party services including:</p>
          <LegalList
            items={[
              'Google Maps (for location features)',
              'Supabase (for data storage)',
            ]}
          />
          <p>
            Your use of these services is subject to their respective terms and privacy policies.
          </p>
        </LegalSubsection>

        <LegalSubsection title="9.2 Third-Party Links">
          <p>
            The App may contain links to third-party websites. We are not responsible for these
            sites and encourage you to review their terms.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="disclaimers" title="10. Disclaimers">
        <LegalSubsection title='10.1 "As Is" Service'>
          <p className="uppercase">
            THE APP IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS
            OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
          </p>
          <LegalList
            items={[
              'MERCHANTABILITY',
              'FITNESS FOR A PARTICULAR PURPOSE',
              'NON-INFRINGEMENT',
              'UNINTERRUPTED OR ERROR-FREE SERVICE',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="10.2 No Guarantee of Results">
          <p>We do not guarantee that you will:</p>
          <LegalList
            items={['Find matches', 'Have successful interactions', 'Achieve any particular outcome']}
          />
        </LegalSubsection>

        <LegalSubsection title="10.3 User Interactions">
          <p>
            We are not responsible for the conduct of users on or off the App. You interact with
            other users at your own risk.
          </p>
        </LegalSubsection>

        <LegalSubsection title="10.4 Accuracy of Information">
          <p>
            We do not verify the identity or accuracy of information provided by users. Users may
            misrepresent themselves.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="liability" title="11. Limitation of Liability">
        <LegalSubsection title="11.1 Limited Liability">
          <p className="uppercase">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR:
          </p>
          <LegalList
            items={[
              'ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES',
              'ANY LOSS OF PROFITS, DATA, OR GOODWILL',
              'ANY DAMAGES RESULTING FROM USER CONDUCT OR THIRD PARTIES',
              'ANY DAMAGES EXCEEDING THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS (OR $100 IF NO PAYMENT)',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="11.2 Essential Purpose">
          <p className="uppercase">
            THE LIMITATIONS ABOVE APPLY EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH
            DAMAGES AND EVEN IF A REMEDY FAILS OF ITS ESSENTIAL PURPOSE.
          </p>
        </LegalSubsection>

        <LegalSubsection title="11.3 Jurisdictional Variations">
          <p>
            Some jurisdictions do not allow certain limitations. In such jurisdictions, our
            liability is limited to the maximum extent permitted by law.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="indemnification" title="12. Indemnification">
        <p>
          You agree to indemnify, defend, and hold harmless Backtrack and its officers, directors,
          employees, agents, and affiliates from any claims, damages, losses, liabilities, costs,
          and expenses (including attorney fees) arising from:
        </p>
        <LegalList
          items={[
            'Your use of the App',
            'Your violation of these Terms',
            'Your User Content',
            'Your violation of any third-party rights',
            'Your interactions with other users',
          ]}
        />
      </LegalSection>

      <LegalSection id="termination" title="13. Account Termination">
        <LegalSubsection title="13.1 Termination by You">
          <p>
            You may delete your account at any time through the App settings. Upon deletion:
          </p>
          <LegalList
            items={[
              'Your profile will be removed',
              'Your posts will be deleted',
              'Your messages will be removed',
              'Your data will be permanently deleted within 30 days',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="13.2 Termination by Us">
          <p>We may suspend or terminate your account if you:</p>
          <LegalList
            items={[
              'Violate these Terms',
              'Engage in fraudulent activity',
              'Pose a risk to other users',
              'Fail to comply with our requests',
              'Have been inactive for an extended period',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="13.3 Effect of Termination">
          <p>Upon termination:</p>
          <LegalList
            items={[
              'Your right to use the App ceases immediately',
              'Provisions that should survive termination will remain in effect',
              'We may retain certain information as required by law',
            ]}
          />
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="disputes" title="14. Dispute Resolution">
        <LegalSubsection title="14.1 Informal Resolution">
          <p>
            Before filing a formal dispute, you agree to contact us at{' '}
            <a href="mailto:legal@backtrack.social">legal@backtrack.social</a> to attempt informal
            resolution. We will attempt to resolve your concern within 30 days.
          </p>
        </LegalSubsection>

        <LegalSubsection title="14.2 Arbitration Agreement">
          <p>
            If informal resolution fails, you agree that any dispute will be resolved through
            binding arbitration rather than in court, except:
          </p>
          <LegalList
            items={[
              'You may bring claims in small claims court',
              'Either party may seek injunctive relief in court',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="14.3 Class Action Waiver">
          <p className="uppercase">
            YOU AGREE TO RESOLVE DISPUTES ONLY ON AN INDIVIDUAL BASIS AND NOT AS PART OF A CLASS,
            CONSOLIDATED, OR REPRESENTATIVE ACTION.
          </p>
        </LegalSubsection>

        <LegalSubsection title="14.4 Arbitration Procedure">
          <LegalList
            items={[
              'Arbitration will be conducted by a neutral arbitrator',
              'The arbitration will be conducted in English',
              "The arbitrator's decision will be final and binding",
              'Each party will bear their own costs',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="14.5 Exceptions">
          <p>This arbitration agreement does not apply to:</p>
          <LegalList
            items={[
              'Claims for injunctive or equitable relief',
              'Claims related to intellectual property',
              'Claims that cannot legally be arbitrated',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="14.6 Opt-Out">
          <p>
            You may opt out of arbitration by sending written notice within 30 days of creating
            your account to <a href="mailto:legal@backtrack.social">legal@backtrack.social</a>.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="governing-law" title="15. Governing Law">
        <p>
          These Terms are governed by the laws of the State of Illinois, without regard to conflict
          of law principles. Any litigation will take place in the courts of Cook County, Illinois.
        </p>
      </LegalSection>

      <LegalSection id="general" title="16. General Provisions">
        <LegalSubsection title="16.1 Entire Agreement">
          <p>
            These Terms, along with the Privacy Policy, constitute the entire agreement between you
            and us regarding the App.
          </p>
        </LegalSubsection>

        <LegalSubsection title="16.2 Severability">
          <p>
            If any provision of these Terms is found unenforceable, the remaining provisions will
            continue in effect.
          </p>
        </LegalSubsection>

        <LegalSubsection title="16.3 Waiver">
          <p>Our failure to enforce any provision does not waive our right to enforce it later.</p>
        </LegalSubsection>

        <LegalSubsection title="16.4 Assignment">
          <p>
            You may not assign these Terms. We may assign them to any successor entity.
          </p>
        </LegalSubsection>

        <LegalSubsection title="16.5 No Third-Party Beneficiaries">
          <p>These Terms do not create any third-party beneficiary rights.</p>
        </LegalSubsection>

        <LegalSubsection title="16.6 Force Majeure">
          <p>
            We are not liable for delays or failures due to circumstances beyond our reasonable
            control.
          </p>
        </LegalSubsection>

        <LegalSubsection title="16.7 Notices">
          <p>
            We may provide notices through the App, email, or other electronic means. You may
            contact us at <a href="mailto:legal@backtrack.social">legal@backtrack.social</a>.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="changes" title="17. Changes to Terms">
        <p>
          We may update these Terms from time to time. We will notify you of material changes by:
        </p>
        <LegalList
          items={[
            'Posting the updated Terms in the App',
            'Updating the "Last Updated" date',
            'Sending a notification for significant changes',
          ]}
        />
        <p>
          Your continued use of the App after changes take effect constitutes acceptance of the
          revised Terms. If you do not agree to the changes, you must stop using the App.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="18. Contact Information">
        <p>For questions about these Terms, please contact us:</p>
        <ContactInfo
          email="legal@backtrack.social"
          address={[
            'Backtrack Legal Team',
            '1332 N Vail Ave',
            'Arlington Heights, IL 60004',
            'USA',
          ]}
        />
        <p>
          <strong>Support:</strong>{' '}
          <a href="mailto:support@backtrack.social">support@backtrack.social</a>
        </p>
      </LegalSection>

      <LegalSection id="summary" title="19. Summary of Key Points">
        <LegalTable
          headers={['Topic', 'Summary']}
          rows={[
            [<strong key="age">Age</strong>, 'Must be 18 or older'],
            [<strong key="conduct">Conduct</strong>, 'Be respectful, no harassment, no illegal activity'],
            [<strong key="content">Content</strong>, 'You own it, but grant us license to display it'],
            [<strong key="safety">Safety</strong>, 'Report violations, use blocking feature'],
            [<strong key="privacy">Privacy</strong>, 'See Privacy Policy for details'],
            [<strong key="disputes">Disputes</strong>, 'Arbitration required, no class actions'],
            [<strong key="termination">Termination</strong>, 'Either party can terminate; data deleted within 30 days'],
          ]}
        />
        <p className="mt-8 text-muted-foreground italic">
          By using Backtrack, you acknowledge that you have read, understood, and agree to be bound
          by these Terms of Service.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
