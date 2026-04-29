# Lacunose Testing Handoff Document

**From:** Kimi k2.6 (OpenCode)  
**To:** ChemiK8.6 (next session)  
**Date:** 2026-04-29  
**Project:** `F:\lacunose.com\lacunose`  
**App Package:** `com.lacunose.app`  
**App Activity:** `com.lacunose.app.MainActivity`

---

## 1. Environment Status (Verified & Running)

Everything is installed and operational. Do NOT reinstall unless something breaks.

| Component | Version | Status | Notes |
|-----------|---------|--------|-------|
| Node.js | v22.19.0 | Installed | |
| Java (JRE) | 1.8.0_471 | **Required for OpenTest** | Path: `C:\Program Files\Java\jre1.8.0_471` |
| Java (JDK) | 17.0.18 | Installed | Used by Appium; NOT by OpenTest actor |
| Appium | 3.3.1 | **Running** | `http://127.0.0.1:4723/wd/hub` |
| UiAutomator2 Driver | 7.1.2 | Installed | Compatible |
| OpenTest | latest | Installed | Server + Actor configured |
| Android SDK | at `F:\build\Android\Sdk` | Verified | `adb`, `emulator` in PATH |
| Emulator | emulator-5554 | **Running** | Google Pixel, Android API 37 |
| App | Installed | `com.lacunose.app` | Release build, live backend |

**Critical Note:** OpenTest's JARs are from 2022 and depend on Nashorn (removed in Java 17). The actor **must** run with Java 8 JRE or it will crash with `NoClassDefFoundError: jdk/nashorn/api/scripting/NashornScriptEngineFactory`.

### Background Processes Currently Running
- **Appium Server:** Node process on port 4723
- **OpenTest Server:** Node process on port 3000
- **OpenTest Actor:** Java process (PID varies), connected to localhost:3000

If any process dies, restart instructions are in Section 6.

---

## 2. OpenTest Configuration

### Actor Config
**File:** `F:\lacunose.com\lacunose\opentest\actor1\actor.yaml`

Key settings:
- `actorType: ACTOR1`
- `syncServerUrl: http://localhost:3000`
- `appium.appiumServerUrl: http://127.0.0.1:4723/wd/hub`
- `appium.desiredCapabilities.platformName: Android`
- `appium.desiredCapabilities.automationName: UiAutomator2`
- `appium.desiredCapabilities.appPackage: com.lacunose.app`
- `appium.desiredCapabilities.appActivity: com.lacunose.app.MainActivity`
- `appium.desiredCapabilities.noReset: false`
- `appium.reuseDriver: false` (creates fresh driver per test session)

### Server Config
**File:** `F:\lacunose.com\lacunose\opentest\server\server.yaml`
- `testRepoDir: F:\lacunose.com\lacunose\opentest\test-repo`
- `serverPort: 3000`

---

## 3. Test Files Created

All tests live in `F:\lacunose.com\lacunose\opentest\test-repo\tests\mobile\`.

### Passing Tests (6/6 green)
1. **`LaunchAndVerify.yaml`** — Verifies landing screen renders ("Get started", "Already have an account? Sign in")
2. **`NavigateToOnboarding.yaml`** — Taps "Get started", verifies onboarding Step 1 renders
3. **`NavigateToSignIn.yaml`** — Taps "Sign in", verifies sign-in screen renders
4. **`NavigateToSignUp.yaml`** — From sign-in, taps "Create account", verifies sign-up screen renders
5. **`OnboardingFieldSelect.yaml`** — On onboarding, taps "Economics" chip, verifies UI updates
6. **`TermsAndPrivacy.yaml`** — Verifies Terms & Privacy disclaimer exists on sign-up screen

### Auth Tests (Mixed Results)
7. **`FullAuthFlow.yaml`** — Combined test: Login → Tab Navigation → Sign Out
   - **Login portion passes** (reviewer bypass `apple@lacunose.com` / `123456` works)
   - **Tab navigation fails** at Library tab tap (xpath complexity with SVG tabs)
   - **Sign out portion never reached** due to prior failure
   - **Root cause:** The custom floating nav uses SVG icons without text labels, making xpath-based tab tapping unreliable via OpenTest's old Appium client.

### Template Files
- **`templates/mobile/Lacunose Functional Tests.yaml`** — Runs all 6 pre-auth tests (100% pass)
- **`templates/mobile/Lacunose Auth Tests.yaml`** — Runs `FullAuthFlow` only

---

## 4. Manual Verification Results (Confirmed Working)

These were verified via direct `adb shell uiautomator dump` + `adb shell input tap` and are **known good**:

### Pre-Auth Navigation
- [x] Landing screen renders correctly
- [x] "Get started" → Onboarding Step 1
- [x] "Already have an account? Sign in" → Sign-in screen
- [x] "Create an account" → Sign-up screen
- [x] Terms & Privacy text visible on sign-up
- [x] Field chips (Medicine, Economics, etc.) selectable on onboarding

### Authenticated Flows (via Reviewer Bypass)
- [x] Sign in with `apple@lacunose.com` → Send Code → OTP `123456` → **Logs in successfully**
- [x] Lands on **Home tab** showing "Hi apple,"
- [x] **Library tab** loads showing "Library" header, "Saved", "All", filter chips
- [x] **Analyze tab** loads showing structured ontology form (POPULATION, INTERVENTION, COMPARISON, OUTCOME)
- [x] **Me tab** loads showing Profile, "apple@lacunose.com", "Free Plan", "Sign out"
- [x] **Sign out** from Me tab returns to sign-in screen

### Stress Testing
- [x] Monkey test: ~27,500 random events across 3 runs
- [x] **Zero app crashes** in `com.lacunose.app`
- [x] No `FATAL EXCEPTION`, `ANR`, or `OutOfMemoryError` in app logs
- [x] App process remained alive after all stress runs
- [x] App launches and renders correctly post-stress

---

## 5. Known Issues & Pending Tasks

### Must Fix Before Launch
1. **Google Sign-In `DEVELOPER_ERROR`** (Sentry Issue 114305615)
   - **Impact:** Users on physical Android devices cannot sign in with Google
   - **Device:** JKM-LX1 (Honor/Huawei), Android 9, low-end
   - **Root Cause:** SHA-1 fingerprint of the release signing keystore is NOT registered in Google Cloud Console / Firebase OAuth 2.0 credentials
   - **Fix:** Add the release keystore SHA-1 to the Google Cloud project
   - **File to check:** `android/app/google-services.json` or `app.json` plugin config for `@react-native-google-signin/google-signin`

2. **Apple Sign-In** — Untested (requires iOS device/simulator)

### Nice to Have / Testing Gaps
3. **Email OTP sign-up E2E** — Requires real email inbox access; reviewer bypass bypasses this
4. **Onboarding analysis submission** — Never tested end-to-end with live backend (topic → submit → polling → reveal)
5. **Analyze tab form submission** — Never tested (enter topic + structured ontology → submit → results)
6. **Library → Results detail navigation** — Untested
7. **Me tab sub-screens** — Edit Profile, Upgrade, Notifications, Analytics preferences, Delete account — all untested
8. **Offline handling** — No tests performed with airplane mode
9. **Account deletion flow** — Apple requires this; verify it works
10. **OpenTest tab navigation** — The SVG-based floating nav breaks xpath-based automation. Consider adding `testID` or `accessibilityLabel` to tab buttons in `(tabs)/_layout.tsx` for reliable automation.

---

## 6. Quick Reference: Commands

### Check if services are running
```powershell
Get-NetTCPConnection -LocalPort 4723,3000 | Select-Object LocalPort,State
Get-Process -Name "node","java" | Select-Object Id,ProcessName
```

### Restart Appium (if needed)
```powershell
# Find and kill old appium process, then:
appium --base-path /wd/hub
```

### Restart OpenTest Server (if needed)
```powershell
# In new terminal:
opentest server F:\lacunose.com\lacunose\opentest\server
```

### Restart OpenTest Actor (if needed)
```powershell
# Must use Java 8!
$env:JAVA_HOME = "C:\Program Files\Java\jre1.8.0_471"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
opentest actor F:\lacunose.com\lacunose\opentest\actor1
```

### Run Pre-Auth Tests (6 tests, ~2 min)
```powershell
opentest session create --template "mobile/Lacunose Functional Tests" --wait 300
```

### Run Auth Tests (1 combined test, ~2 min)
```powershell
# Ensure app is force-stopped first:
adb shell am force-stop com.lacunose.app
adb shell am start -n com.lacunose.app/com.lacunose.app.MainActivity

# Then run:
opentest session create --template "mobile/Lacunose Auth Tests" --wait 300
```

### Run Monkey Stress Test
```powershell
adb shell am force-stop com.lacunose.app
adb logcat -c
adb shell monkey -p com.lacunose.app -v 10000 --throttle 50 --pct-touch 70 --pct-motion 30 --pct-trackball 0 --pct-nav 0 --pct-syskeys 0 --pct-flip 0 --pct-appswitch 0 --pct-anyevent 0 --pct-rotation 0
```

### Dump UI for Debugging
```powershell
adb shell uiautomator dump /sdcard/window_dump.xml
adb pull /sdcard/window_dump.xml F:\lacunose.com\lacunose\opentest\window_dump.xml
```

---

## 7. How to Continue Testing

### Option A: Fix the Auth Test Tab Navigation
The `FullAuthFlow.yaml` test fails because the floating nav tabs are SVG icons without text. To fix:
1. Open `F:\lacunose.com\lacunose\app\(tabs)\_layout.tsx`
2. Add `testID` or `accessibilityLabel` to each `<TouchableOpacity>` in `FloatingNav`
3. Rebuild the APK (or test in Expo dev mode if available)
4. Update `FullAuthFlow.yaml` to use the new testIDs/accessibilityLabels for tab taps
5. Re-run the auth test template

### Option B: Test the Onboarding Analysis Flow
1. Fresh install or clear app data
2. Launch app
3. Tap "Get started"
4. Enter a topic (e.g., "GLP-1 agonists in pediatric cohorts")
5. Tap "Continue" → "Find gaps"
6. Wait for backend polling (~30-90s)
7. Verify the reveal screen shows a real gap with teaser/blur
8. Tap "Sign up to reveal" → verify sign-up screen

### Option C: Test Authenticated Sub-Screens
1. Log in via reviewer bypass (`apple@lacunose.com` / `123456`)
2. Navigate to each tab and test core interactions:
   - **Home:** Tap "Analyze something" → verify pushed to Analyze tab
   - **Library:** Tap an analysis card (if any exist) → verify `/analyze/results` screen
   - **Analyze:** Fill form, submit → verify results screen loads
   - **Me:** Test Edit Profile, Upgrade, Notifications, Sign out
3. Test airplane mode at each screen to verify error handling

### Option D: Fix Google Sign-In
1. Generate SHA-1 of release keystore:
   ```bash
   cd android
   ./gradlew signingReport
   ```
2. Copy the release SHA-1
3. Go to Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
4. Find the Android client ID for `com.lacunose.app`
5. Add the release SHA-1 fingerprint
6. Rebuild release APK and test on physical device

---

## 8. Key Files Modified

- `F:\lacunose.com\lacunose\opentest\actor1\actor.yaml` — Android capabilities configured
- `F:\lacunose.com\lacunose\opentest\test-repo\tests\mobile\*.yaml` — 7 test files created
- `F:\lacunose.com\lacunose\opentest\test-repo\templates\mobile\*.yaml` — 2 templates created
- **No source code in `lacunose/` was modified.**

---

## 9. Summary

**Current State:** The app is **stable and launch-ready from a crash/stability perspective**. All pre-auth navigation works. The authenticated shell (tabs) works. The reviewer bypass login works. Stress testing proved the app survives extreme random interaction without crashing.

**Blockers for Store Submission:**
1. Google Sign-In `DEVELOPER_ERROR` on physical Android devices (configuration issue, not code)
2. Untested: Email OTP flow, onboarding analysis E2E, account deletion, offline handling, iOS Apple Sign-In

**Recommended Next Steps:**
1. Fix Google Sign-In SHA-1 in Google Cloud Console
2. Add `testID`/`accessibilityLabel` to floating nav tabs to fix automated auth tests
3. Manually test the full onboarding → analysis → reveal → sign-up flow on a physical device
4. Verify account deletion works (Apple requirement)
5. Run the app on iOS Simulator to catch platform-specific issues before Apple review

---

*End of handoff. Good luck, ChemiK8.6.*
