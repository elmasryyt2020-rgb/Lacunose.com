import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Lacunose',
  description: 'How Lacunose collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '24px 28px', maxWidth: 720, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/logo.png" alt="Lacunose" width={28} height={28} style={{ borderRadius: 8 }} />
          <span className="display" style={{ fontSize: 18, letterSpacing: -0.5 }}>Lacunose</span>
        </Link>
      </nav>

      <article className="legal-page">
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated: April 22, 2026</p>

        <h2>1. Introduction</h2>
        <p>Welcome to Lacunose. This Privacy Policy explains how Lacunose (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, stores, and protects your personal information when you use our mobile application and related services (collectively, the &ldquo;Service&rdquo;).</p>
        <p>Lacunose is operated by an LLC registered in Egypt. By using the Service, you agree to the collection and use of information in accordance with this policy. If you do not agree, please discontinue use of the Service.</p>

        <h2>2. Information We Collect</h2>
        <p>We collect the following categories of information:</p>
        <p><strong>Account Information</strong></p>
        <ul>
          <li>Email address (required for account creation)</li>
          <li>Full name (provided during sign-up)</li>
          <li>Phone number (optional)</li>
          <li>Authentication data from Google Sign-In or Apple Sign-In, if used</li>
        </ul>
        <p><strong>Research Data</strong></p>
        <ul>
          <li>Research queries and topics you submit for analysis</li>
          <li>Analysis results and identified research gaps</li>
          <li>Gaps you choose to save or bookmark</li>
        </ul>
        <p><strong>Device &amp; Usage Data</strong></p>
        <ul>
          <li>Device type, operating system, and app version</li>
          <li>Anonymized usage patterns (screens visited, features used)</li>
          <li>Crash reports and performance diagnostics</li>
          <li>Anonymized session recordings (see Section 5)</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, operate, and maintain the Service</li>
          <li>Process and deliver your research gap analyses</li>
          <li>Cache analysis results to deliver faster responses and reduce processing costs</li>
          <li>Manage your account and subscription</li>
          <li>Send you account-related communications (e.g., OTP codes, subscription updates)</li>
          <li>Monitor and fix errors, crashes, and bugs</li>
          <li>Improve the user experience through anonymized analytics</li>
          <li>Enforce our Terms of Service and protect against misuse</li>
        </ul>

        <h2>4. Third-Party Services</h2>
        <p>We use trusted third-party services to operate Lacunose. We do not sell, rent, or share your personal data with advertisers or data brokers. The following services process data on our behalf:</p>
        <p><strong>Supabase</strong> — Authentication and database hosting. Your account data and research results are stored on Supabase infrastructure in Frankfurt, Germany (EU).</p>
        <p><strong>RevenueCat</strong> — Subscription and billing management. Processes purchase receipts from the Apple App Store and Google Play Store to manage your subscription status.</p>
        <p><strong>Sentry</strong> — Crash reporting and error monitoring. Receives anonymized diagnostic data to help us identify and fix bugs.</p>
        <p><strong>PostHog</strong> — Product analytics and session replay. Hosted in the EU. Used to understand how users navigate the app and to identify usability issues. See Section 5 for details on session recording.</p>
        <p><strong>Google Sign-In / Apple Sign-In</strong> — Authentication only. We receive your name and email from these providers; no additional data is shared with Google or Apple through our app.</p>
        <p><strong>AI Processing</strong> — Your research request text is sent to third-party AI services for analysis. Only the research query itself is transmitted — no personal information (name, email, phone, or account data) is sent to the AI provider.</p>

        <h2>5. Session Recording</h2>
        <p>Lacunose uses anonymized session replay technology (provided by PostHog) to record how users interact with the app. This helps us identify usability issues, fix errors, and improve the overall experience.</p>
        <p><strong>What is recorded:</strong> Screen layouts, navigation paths, taps, and scrolling behavior.</p>
        <p><strong>What is NOT recorded:</strong> All text input fields (such as emails, passwords, names, and research queries) are automatically masked and are not captured in session recordings.</p>
        <p>You can opt out of session recording and all usage analytics at any time by going to <strong>Profile → Analytics preferences</strong> and enabling the opt-out toggle.</p>

        <h2>6. Data Storage &amp; Security</h2>
        <p>Your data is stored on servers located in <strong>Frankfurt, Germany</strong> (European Union). All data is encrypted in transit (TLS/SSL) and at rest. We employ commercially reasonable technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction.</p>
        <p>While we strive to protect your personal data, no method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security.</p>

        <h2>7. Data Retention</h2>
        <p>We retain your personal data for as long as your account is active or as needed to provide the Service. Cached analysis results are retained to improve response times for repeated or similar queries.</p>
        <p>When you delete your account (via <strong>Profile → Delete account</strong>), all of your personal data, research queries, saved gaps, and analysis results are permanently deleted from our servers. This action is irreversible.</p>

        <h2>8. AI &amp; Your Data</h2>
        <p><strong>We do not use your data to train or fine-tune any AI models.</strong> Your research queries, results, saved gaps, and personal information are never fed into machine learning training pipelines.</p>
        <p>When you submit a research query, only the research topic text is sent to our AI processing service for analysis. No personal identifiers are attached to or transmitted with the query.</p>

        <h2>9. Your Rights</h2>
        <p>Because your data is stored in the European Union, you benefit from rights under the General Data Protection Regulation (GDPR), regardless of where you are located. You have the right to:</p>
        <ul>
          <li><strong>Access</strong> — Request a copy of the personal data we hold about you</li>
          <li><strong>Rectification</strong> — Request correction of inaccurate or incomplete data</li>
          <li><strong>Erasure</strong> — Request deletion of your data (you can also delete your account directly in the app)</li>
          <li><strong>Portability</strong> — Request your data in a structured, machine-readable format</li>
          <li><strong>Restriction</strong> — Request that we limit how we process your data</li>
          <li><strong>Objection</strong> — Object to processing of your data for certain purposes</li>
          <li><strong>Withdraw Consent</strong> — Where processing is based on consent, you may withdraw it at any time</li>
        </ul>
        <p>To exercise any of these rights, contact us at <strong>support@lacunose.com</strong>. We will respond within 30 days.</p>

        <h2>10. Children&rsquo;s Privacy</h2>
        <p>The Service is available to users aged 13 and older. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal data, we will promptly delete it. If you believe a child under 13 has submitted data to us, please contact us at <strong>support@lacunose.com</strong>.</p>

        <h2>11. International Data Transfers</h2>
        <p>Your data is stored in Frankfurt, Germany (EU). Our team accesses this data from Egypt for operational purposes. By using the Service, you acknowledge that your data may be accessed from outside the EU, subject to appropriate safeguards and this Privacy Policy.</p>

        <h2>12. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or via email. The &ldquo;Last updated&rdquo; date at the top of this page indicates when the policy was last revised. Your continued use of the Service after any changes constitutes your acceptance of the updated policy.</p>

        <h2>13. Contact Us</h2>
        <p>If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us at:</p>
        <p><strong>Email:</strong> support@lacunose.com</p>
      </article>
    </div>
  );
}
