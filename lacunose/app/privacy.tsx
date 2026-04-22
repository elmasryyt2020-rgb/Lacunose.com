import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../constants/theme';
import { ChipIcon } from '../components/Shared';

/* ─────────────────────── helpers ─────────────────────── */

function SectionTitle({ children }: { children: string }) {
  const { RGF } = useTheme();
  return (
    <Text style={[s.sectionTitle, { fontFamily: RGF.display, color: RGF.ink }]}>
      {children}
    </Text>
  );
}

function P({ children }: { children: React.ReactNode }) {
  const { RGF } = useTheme();
  return (
    <Text style={[s.paragraph, { fontFamily: RGF.sans, color: RGF.inkSoft }]}>
      {children}
    </Text>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  const { RGF } = useTheme();
  return (
    <View style={s.bulletRow}>
      <Text style={[s.bulletDot, { color: RGF.muted }]}>•</Text>
      <Text style={[s.bulletText, { fontFamily: RGF.sans, color: RGF.inkSoft }]}>
        {children}
      </Text>
    </View>
  );
}

function B({ children }: { children: React.ReactNode }) {
  const { RGF } = useTheme();
  return <Text style={{ fontFamily: RGF.sansSemiBold, color: RGF.ink }}>{children}</Text>;
}

/* ─────────────────────── screen ─────────────────────── */

export default function ScreenPrivacy() {
  const router = useRouter();
  const { RGF } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: RGF.bg }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChipIcon name="chevL" size={40} iconSize={14} bg={RGF.surface} />
          </TouchableOpacity>
        </View>

        <Text style={[s.title, { fontFamily: RGF.display, color: RGF.ink }]}>
          Privacy Policy
        </Text>
        <Text style={[s.updated, { fontFamily: RGF.sans, color: RGF.muted }]}>
          Last updated: April 22, 2026
        </Text>

        {/* ── 1. Introduction ── */}
        <SectionTitle>1. Introduction</SectionTitle>
        <P>
          Welcome to Lacunose. This Privacy Policy explains how Lacunose ("we," "us," or "our") collects, uses, stores, and protects your personal information when you use our mobile application and related services (collectively, the "Service").
        </P>
        <P>
          Lacunose is operated by an LLC registered in Egypt. By using the Service, you agree to the collection and use of information in accordance with this policy. If you do not agree, please discontinue use of the Service.
        </P>

        {/* ── 2. Information We Collect ── */}
        <SectionTitle>2. Information We Collect</SectionTitle>
        <P>We collect the following categories of information:</P>

        <P><B>Account Information</B></P>
        <Bullet>Email address (required for account creation)</Bullet>
        <Bullet>Full name (provided during sign-up)</Bullet>
        <Bullet>Phone number (optional)</Bullet>
        <Bullet>Authentication data from Google Sign-In or Apple Sign-In, if used</Bullet>

        <P><B>Research Data</B></P>
        <Bullet>Research queries and topics you submit for analysis</Bullet>
        <Bullet>Analysis results and identified research gaps</Bullet>
        <Bullet>Gaps you choose to save or bookmark</Bullet>

        <P><B>Device & Usage Data</B></P>
        <Bullet>Device type, operating system, and app version</Bullet>
        <Bullet>Anonymized usage patterns (screens visited, features used)</Bullet>
        <Bullet>Crash reports and performance diagnostics</Bullet>
        <Bullet>Anonymized session recordings (see Section 5)</Bullet>

        {/* ── 3. How We Use Your Information ── */}
        <SectionTitle>3. How We Use Your Information</SectionTitle>
        <P>We use the information we collect to:</P>
        <Bullet>Provide, operate, and maintain the Service</Bullet>
        <Bullet>Process and deliver your research gap analyses</Bullet>
        <Bullet>Cache analysis results to deliver faster responses and reduce processing costs</Bullet>
        <Bullet>Manage your account and subscription</Bullet>
        <Bullet>Send you account-related communications (e.g., OTP codes, subscription updates)</Bullet>
        <Bullet>Monitor and fix errors, crashes, and bugs</Bullet>
        <Bullet>Improve the user experience through anonymized analytics</Bullet>
        <Bullet>Enforce our Terms of Service and protect against misuse</Bullet>

        {/* ── 4. Third-Party Services ── */}
        <SectionTitle>4. Third-Party Services</SectionTitle>
        <P>
          We use trusted third-party services to operate Lacunose. We do not sell, rent, or share your personal data with advertisers or data brokers. The following services process data on our behalf:
        </P>

        <P><B>Supabase</B> — Authentication and database hosting. Your account data and research results are stored on Supabase infrastructure in Frankfurt, Germany (EU).</P>
        <P><B>RevenueCat</B> — Subscription and billing management. Processes purchase receipts from the Apple App Store and Google Play Store to manage your subscription status.</P>
        <P><B>Sentry</B> — Crash reporting and error monitoring. Receives anonymized diagnostic data to help us identify and fix bugs.</P>
        <P><B>PostHog</B> — Product analytics and session replay. Hosted in the EU. Used to understand how users navigate the app and to identify usability issues. See Section 5 for details on session recording.</P>
        <P><B>Google Sign-In / Apple Sign-In</B> — Authentication only. We receive your name and email from these providers; no additional data is shared with Google or Apple through our app.</P>
        <P><B>AI Processing</B> — Your research request text is sent to third-party AI services for analysis. Only the research query itself is transmitted — no personal information (name, email, phone, or account data) is sent to the AI provider. We do not disclose which AI provider(s) we use for competitive reasons.</P>

        {/* ── 5. Session Recording ── */}
        <SectionTitle>5. Session Recording</SectionTitle>
        <P>
          Lacunose uses anonymized session replay technology (provided by PostHog) to record how users interact with the app. This helps us identify usability issues, fix errors, and improve the overall experience.
        </P>
        <P><B>What is recorded:</B> Screen layouts, navigation paths, taps, and scrolling behavior.</P>
        <P><B>What is NOT recorded:</B> All text input fields (such as emails, passwords, names, and research queries) are automatically masked and are not captured in session recordings.</P>
        <P>
          You can opt out of session recording and all usage analytics at any time by going to <B>Profile → Analytics preferences</B> and enabling the opt-out toggle. This setting takes effect immediately on your device.
        </P>

        {/* ── 6. Data Storage & Security ── */}
        <SectionTitle>6. Data Storage & Security</SectionTitle>
        <P>
          Your data is stored on servers located in <B>Frankfurt, Germany</B> (European Union). All data is encrypted in transit (TLS/SSL) and at rest. We employ commercially reasonable technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction.
        </P>
        <P>
          While we strive to protect your personal data, no method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security.
        </P>

        {/* ── 7. Data Retention ── */}
        <SectionTitle>7. Data Retention</SectionTitle>
        <P>
          We retain your personal data for as long as your account is active or as needed to provide the Service. Cached analysis results are retained to improve response times for repeated or similar queries.
        </P>
        <P>
          When you delete your account (via <B>Profile → Delete account</B>), all of your personal data, research queries, saved gaps, and analysis results are permanently deleted from our servers. This action is irreversible.
        </P>

        {/* ── 8. AI & Your Data ── */}
        <SectionTitle>8. AI & Your Data</SectionTitle>
        <P>
          <B>We do not use your data to train or fine-tune any AI models.</B> Your research queries, results, saved gaps, and personal information are never fed into machine learning training pipelines.
        </P>
        <P>
          When you submit a research query, only the research topic text is sent to our AI processing service for analysis. No personal identifiers are attached to or transmitted with the query.
        </P>

        {/* ── 9. Your Rights (GDPR) ── */}
        <SectionTitle>9. Your Rights</SectionTitle>
        <P>
          Because your data is stored in the European Union, you benefit from rights under the General Data Protection Regulation (GDPR), regardless of where you are located. You have the right to:
        </P>
        <Bullet><B>Access</B> — Request a copy of the personal data we hold about you</Bullet>
        <Bullet><B>Rectification</B> — Request correction of inaccurate or incomplete data</Bullet>
        <Bullet><B>Erasure</B> — Request deletion of your data (you can also delete your account directly in the app)</Bullet>
        <Bullet><B>Portability</B> — Request your data in a structured, machine-readable format</Bullet>
        <Bullet><B>Restriction</B> — Request that we limit how we process your data</Bullet>
        <Bullet><B>Objection</B> — Object to processing of your data for certain purposes</Bullet>
        <Bullet><B>Withdraw Consent</B> — Where processing is based on consent, you may withdraw it at any time</Bullet>
        <P>
          To exercise any of these rights, contact us at <B>support@lacunose.com</B>. We will respond within 30 days.
        </P>

        {/* ── 10. Children's Privacy ── */}
        <SectionTitle>10. Children's Privacy</SectionTitle>
        <P>
          The Service is available to users aged 13 and older. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal data, we will promptly delete it. If you believe a child under 13 has submitted data to us, please contact us at <B>support@lacunose.com</B>.
        </P>

        {/* ── 11. International Data Transfers ── */}
        <SectionTitle>11. International Data Transfers</SectionTitle>
        <P>
          Your data is stored in Frankfurt, Germany (EU). Our team accesses this data from Egypt for operational purposes. By using the Service, you acknowledge that your data may be accessed from outside the EU, subject to appropriate safeguards and this Privacy Policy.
        </P>

        {/* ── 12. Changes to This Policy ── */}
        <SectionTitle>12. Changes to This Policy</SectionTitle>
        <P>
          We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or via email. The "Last updated" date at the top of this page indicates when the policy was last revised. Your continued use of the Service after any changes constitutes your acceptance of the updated policy.
        </P>

        {/* ── 13. Contact Us ── */}
        <SectionTitle>13. Contact Us</SectionTitle>
        <P>
          If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us at:
        </P>
        <P><B>Email:</B> support@lacunose.com</P>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

/* ─────────────────────── styles ─────────────────────── */

const s = StyleSheet.create({
  scroll: { paddingTop: 60, paddingHorizontal: 28, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 36, letterSpacing: -1, marginBottom: 6 },
  updated: { fontSize: 13, marginBottom: 28 },
  sectionTitle: { fontSize: 22, letterSpacing: -0.4, marginTop: 28, marginBottom: 10 },
  paragraph: { fontSize: 15, lineHeight: 24, marginBottom: 10 },
  bulletRow: { flexDirection: 'row', paddingLeft: 4, marginBottom: 6 },
  bulletDot: { fontSize: 15, lineHeight: 24, width: 16 },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 24 },
});
