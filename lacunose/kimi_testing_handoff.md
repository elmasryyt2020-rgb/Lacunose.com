# Lacunose Testing Handoff Document

**Target Model:** Kimi k2.6 (or any execution model)
**Target App Package:** `com.lacunose.app`
**Project Directory:** `f:\lacunose.com\lacunose`

## Mission Objective
Your goal is to thoroughly test the Lacunose React Native / Expo app in the Android Studio Emulator. 
The testing is divided into two phases:
1. **Functional E2E Testing (OpenTest + Appium):** Ensure the app logic, navigation, and core features work exactly as expected.
2. **Chaos / Stress Testing (Android Monkey):** Bombard the UI with random, high-speed interactions to verify stability, catch memory leaks, and ensure the app never crashes under heavy user load.

---

## Phase 1: Functional Automation (OpenTest + Appium)

To verify the app works 100%, you need to use OpenTest. OpenTest requires a running Appium server to drive the Android emulator.

### 1. Environment Setup
You must verify or install the following dependencies on the system:
- **Node.js (v14+)** & **Java (JDK 8+)**
- **Appium 2.x:** `npm install -g appium`
- **UiAutomator2 Driver:** `appium driver install uiautomator2`
- **OpenTest:** `npm install -g opentest`

### 2. Start the Appium Server
Open a terminal and run:
```bash
appium
```
Keep this terminal open. It will listen on `http://127.0.0.1:4723`.

### 3. Initialize OpenTest
In a new terminal, navigate to the project or a dedicated testing folder (e.g., `f:\lacunose.com\lacunose\opentest`) and initialize it:
```bash
mkdir f:\lacunose.com\lacunose\opentest
cd f:\lacunose.com\lacunose\opentest
opentest quick-start
```
This generates a `server`, `actor1`, and `test-repo` directory.

### 4. Configure the Actor for Android
Edit the `actor1/actor.yaml` file to tell OpenTest how to connect to the Android emulator. Look for the `appium` capabilities section and modify it:

```yaml
# Inside actor1/actor.yaml
outDir: out
syncServerUrl: http://localhost:3000

capabilities:
  platformName: Android
  appium:automationName: UiAutomator2
  appium:appPackage: com.lacunose.app
  appium:appActivity: com.lacunose.app.MainActivity # Adjust if Expo uses a different main activity
  appium:ensureWebviewsHavePages: true
  appium:nativeWebScreenshot: true
```

### 5. Create a Functional Test Script
In the `test-repo/tests` folder, create a new YAML file named `LaunchAndVerify.yaml` to ensure the app boots successfully:

```yaml
description: Launch the Lacunose app and verify the main screen loads
actors:
  - actor: actor1
    segments:
      - segment: 1
        actions:
          - action: org.getopentest.appium.LaunchApp
            
          # Example: Wait for a specific UI element to be visible (Change XPath based on the app's UI)
          # - action: org.getopentest.appium.AssertElementVisible
          #   args:
          #     locator: { xpath: "//android.widget.TextView[@text='Welcome']" }
          #     timeoutSec: 10
```

### 6. Execute OpenTest
1. **Start Sync Server:** In the `server` directory, run `opentest server`.
2. **Start Actor:** In the `actor1` directory, run `opentest actor`.
3. **Run Test:** Open `http://localhost:3000` in the browser, go to "Session" -> "Create Session", and select the `LaunchAndVerify` test. 

**Kimi's Task:** You must iteratively write OpenTest YAML files for all core features (Login, Sign up, core navigation) by inspecting the Appium UI tree and ensuring each test passes green.

---

## Phase 2: Stress / Chaos Testing (Android Monkey)

Once the OpenTest functional suite confirms the core paths work perfectly, you must stress test the app using Android's UI/Application Exerciser Monkey.

### 1. Preparation
Ensure the emulator is running and the Lacunose app (`com.lacunose.app`) is installed.

### 2. Execute the Monkey Test
Run the following command in the terminal. This will inject 10,000 pseudo-random UI events (clicks, swipes, volume changes) directly into the Lacunose app.

```bash
adb shell monkey -p com.lacunose.app -v 10000 --throttle 50
```
- `-p com.lacunose.app`: Restricts the chaos *only* to the Lacunose app.
- `-v`: Verbose output (so you can see what it's doing).
- `10000`: The number of events to fire.
- `--throttle 50`: Waits 50 milliseconds between events to mimic fast, but realistic, human interaction.

### 3. Verification & Log Analysis
**Kimi's Task:** 
If the app crashes during the Monkey test, you must extract the logs to find the root cause:
```bash
adb logcat -d > crash_logs.txt
```
Look for `FATAL EXCEPTION`, `OutOfMemoryError`, or `ANR` (Application Not Responding) in the logs. Fix the underlying React Native / Expo code in the repository until the app can survive a 10,000-event monkey test without crashing.
