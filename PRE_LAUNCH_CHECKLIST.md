# Lacunose — Pre-Launch Checklist

Everything that MUST be verified before submitting to App Store + Google Play. Runs in order. Do not skip steps.

Last updated: 2026-04-22

---

## 1. Round 4 edge-case testing (from Seif's 2026-04-22 test round)

These were deferred to pre-launch because Seif didn't have time during the hackathon itself. Run each before submitting the production build:

### 1a. Very niche topic stress test

**Topic**: `Semaglutide effects on bone mineral density in postmenopausal women with prior bariatric surgery`
**Field**: Medicine
**Filters**: default (OA off, preprints on, 2020-2025, All designs)

**Pass criteria**:
- Analysis completes (status=done, not failed)
- At least 4 gaps produced
- All gaps have evidence arrays with ≥1 citation
- No "insufficient-signal" error — if it hits that, the MIN_SIGNALS threshold needs lowering or the adapter needs tuning

If it fails: review `src/gap/pipeline.ts` MIN_SIGNALS and the ingest adapter results. Niche topics have sparse corpora and may need the min threshold dropped to 3 (from 5).

### 1b. Topic with known contradictions

**Topic**: `Statins for primary prevention in the very elderly over 75`
**Field**: Medicine
**Filters**: default

**Pass criteria**:
- At least one gap with `category='contradiction'`
- Evidence quotes should come from papers on BOTH sides of the guideline debate (e.g. one pro-statin, one skeptical)
- If no contradiction gap appears, the map phase is missing signal — check that the map prompt still emits `kind: 'contradiction-cue'`

### 1c. Pre-filled PICO rows

**Topic**: `Obesity pharmacotherapy in adolescents`
**PICO**:
- P: `adolescents 12-17 with BMI >= 95th percentile`
- I: `semaglutide 2.4mg weekly`
- C: `lifestyle intervention alone`
- O: `cardiometabolic outcomes at 24 months`

**Pass criteria**:
- Gaps should be notably more specific than the empty-PICO version
- At least one gap should mention the comparator (lifestyle alone) specifically
- At least one gap should touch the 24-month outcome window

If they don't: the `structured_frame` field isn't flowing through to the map prompts. Inspect the path in `src/gap/prompts/map.ts` and `mapUserPrompt`.

### 1d. Cross-field stress test

Run one analysis in each of: Medicine, Biology, Chemistry, Physics, Computer Science, Economics, History, Art.
**Pass criteria**: at least 6 of 8 complete with ≥3 gaps. Humanities fields (History, Art) are expected to be weaker — note which ones fail for v1.1 prioritization.

### 1e. Free-tier quota enforcement

Sign up a fresh free user. Run 3 analyses. Try to run a 4th.
**Pass criteria**: 4th attempt returns HTTP 402 with `quota_exceeded`. Paywall modal triggers on the mobile side.

### 1f. Sign out + sign back in

**Pass criteria**: library shows your previous analyses (not empty). All Realtime subscriptions re-bind. No leftover subscriptions from the old session.

### 1g. Airplane mode behavior

Queue an analysis. Enable airplane mode. Re-enable.
**Pass criteria**: results screen reconnects, shows current state. Does NOT crash or spin forever.

---

## 2. Mobile UI regressions

After any code change in the last hackathon week, verify:

- [ ] Onboarding flow works end-to-end (index → onboarding → sign-up)
- [ ] Apple Sign-In works (confirmed working 2026-04-22)
- [ ] Google Sign-In works — **requires dev client rebuild from 2026-04-22 for iosClientId fix**
- [ ] Email OTP works — **blocked on Zoho email setup (funds pending)**
- [ ] Forgot password flow (if wired)
- [ ] Delete account works and actually deletes the user
- [ ] Restore purchases works with sandbox tester
- [ ] Edit Profile persists name + phone to `user_metadata` and survives logout
- [ ] Analytics opt-out toggle persists across sessions
- [ ] Light/dark mode swap doesn't break any screen
- [ ] Tab bar icons show correctly on both themes
- [ ] Me screen scrolls fully on small phones (iPhone SE)
- [ ] Paywall modal displays correctly and navigates away cleanly
- [ ] Library empty state renders (new user with 0 analyses)
- [ ] Library search filters work
- [ ] Library category chips filter correctly
- [ ] Notifications empty state renders
- [ ] Support screen opens (may fail gracefully until Zoho is set up)
- [ ] Terms + Privacy links open correctly
- [ ] Deep link `lacunose://` opens the app from Safari

---

## 3. Backend stability

- [ ] All 8 docker containers `Up` for 24+ hours without restart
- [ ] `/v1/health` returns 200 consistently
- [ ] `/v1/ready` returns both redis + supabase as ok
- [ ] No error spike in Sentry over 24h window
- [ ] BullMQ queue backlogs drain (parse queue is expected to have backlog — verify it's not growing unbounded)
- [ ] Analysis success rate > 90% over the last 24h
- [ ] Average analysis cost < $5 (to stay within $500 Anthropic budget)
- [ ] No `insufficient-signal` rate > 25%

---

## 4. IAP / payments

- [ ] App Store Connect: all 4 subscription products show "Ready for Sale" or equivalent
- [ ] 7-day free trial appears on iOS paywall (visible in StoreKit sandbox)
- [ ] Play Console: all subscriptions are "Active" (after initial build upload)
- [ ] RevenueCat: offerings show all 4 packages in production context
- [ ] RevenueCat webhook delivers to `https://fn.lacunose.com/v1/webhooks/revenuecat` with 200 response
- [ ] Sandbox purchase → RC webhook → `subscriptions` table reflects tier change within 10s
- [ ] Restore purchases from a signed-out user restores tier correctly
- [ ] Unsubscribe flow works (user cancels in iOS Settings → tier reverts at period_end)

---

## 5. Legal + compliance

- [ ] Privacy Policy is hosted at `https://lacunose.com/privacy` (static page)
- [ ] Terms of Service at `https://lacunose.com/terms`
- [ ] Both link to a physical mailing address (App Store requires)
- [ ] Privacy Policy explicitly covers:
  - Phone number collection (added 2026-04-22) — purpose, retention, marketing opt-out
  - Sentry + PostHog analytics
  - RevenueCat receipt data
  - Supabase as data processor
  - GDPR delete-my-data flow → how (email support@)
- [ ] Terms mention auto-renewing subscription disclosure (Apple mandatory)
- [ ] App Store privacy questionnaire answered truthfully:
  - Collects: identifiers (user ID), contact info (email + phone), usage data, diagnostics
  - Linked to identity: yes (user ID + email)
  - Used for tracking: no (not across other apps/sites)

---

## 6. Content + copy review

- [ ] All UI strings checked for typos
- [ ] Paywall "Start 7-day trial" copy matches actual IAP offer configured
- [ ] Support screen ticket code format matches backend (`LNS-NNNN`)
- [ ] Onboarding copy doesn't promise features that aren't shipping
- [ ] Claim of "1,500 papers" on analyze CTA matches actual typical ingest count
- [ ] No references to "mock" / "example" / "placeholder" / "TODO" / "FIXME" in shipping code

---

## 7. Pre-submission binary checks

### iOS
- [ ] `npx eas build --platform ios --profile production` runs clean
- [ ] Build size < 100 MB (usually, else needs asset audit)
- [ ] No `console.log` from dev builds in production output
- [ ] Crash-free rate > 99.5% in TestFlight
- [ ] 3 beta testers have completed an analysis end-to-end
- [ ] App icon + splash screen render correctly on iPhone + iPad + dark mode

### Android
- [ ] `npx eas build --platform android --profile production` runs clean
- [ ] AAB (not APK) uploaded to Play Console
- [ ] targetSdk matches Google's current requirement (34+ as of 2026)
- [ ] No permissions in manifest we don't actually use
- [ ] Play Console pre-launch report has no blocking issues
- [ ] 3 beta testers on internal track have completed an analysis

---

## 8. Observability & ops

- [ ] Sentry alerts fire for: error spike > 1%, p95 latency > 5s, any 5xx
- [ ] PostHog dashboards set up: retention, funnel (signup → first analysis → paywall → purchase), feature usage
- [ ] Backup cron runs daily (`infra/scripts/backup-db.sh`) to Hostinger Object Storage
- [ ] Restore script tested at least once (monthly drill)
- [ ] SSH key for VPS stored in 1Password (not just local)
- [ ] Supabase service role key + Anthropic key rotation plan documented

---

## 9. Post-launch hot-fix readiness

- [ ] EAS Update channel (`production`) configured for OTA JS fixes without full rebuild
- [ ] Feature flag in PostHog: `kill_switch_analyses` — set to true disables POST /v1/analyses immediately
- [ ] On-call rotation agreed (who handles a 3am Sentry alert?)
- [ ] Rollback plan for backend: keep last 2 docker image versions tagged, one command to revert

---

## 10. Marketing readiness

- [ ] Website landing page at `https://lacunose.com` live with App Store + Play badges
- [ ] Demo video (90s) uploaded to YouTube + embedded on landing
- [ ] "How it works" page with example gap output
- [ ] Press kit: logo pack, 3 screenshots, 1-paragraph description, founder bio
- [ ] Twitter account `@lacunose` registered and posting
- [ ] Launch post drafted for Hacker News + r/PhDStudents + r/labrats

---

## Pre-submission signoff

When every checkbox above is ticked, and no item in Section 3 shows a regression, ready to submit. Date the signoff here:

- Tested by: ________________
- Date: ________________
- iOS build ID: ________________
- Android build ID: ________________
- Backend commit SHA: ________________
