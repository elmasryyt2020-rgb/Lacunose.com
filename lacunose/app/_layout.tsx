import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useFonts, InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ThemeProvider, useTheme } from '../constants/theme';
import { AuthProvider } from '../providers/AuthProvider';
import { QueryProvider } from '../providers/QueryProvider';
import { useAuth } from '../hooks/useAuth';
import { usePushRegistration } from '../hooks/usePushRegistration';
import * as Sentry from '@sentry/react-native';
import { PostHogProvider } from 'posthog-react-native';
import { useSegments, useRouter } from 'expo-router';

// Only init Sentry when a real DSN is configured — an empty DSN makes the
// SDK throw/warn on every startup. tracesSampleRate is dropped in dev to
// avoid burning the quota on reload noise.
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: __DEV__ ? 0.05 : 0.2,
  });
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const AUTH_ROUTES = new Set(['sign-in', 'sign-up', 'sign-up-otp', 'onboarding']);

function AuthRedirector() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  // Register the device's push token with the backend once signed in.
  usePushRegistration();

  // Use a stable primitive for the effect dep (segments is a new array each render).
  const topSegment = segments[0] ?? '';
  const inTabs = topSegment === '(tabs)';
  // Root route (app/index.tsx) in expo-router types is an empty tuple; cast
  // through `unknown` to compare length safely.
  const onLanding = (segments as unknown as string[]).length === 0;
  const onAuthRoute = AUTH_ROUTES.has(topSegment) || onLanding;

  useEffect(() => {
    if (loading) return;
    if (!session && inTabs) {
      router.replace('/sign-in');
      return;
    }
    // Authenticated user landed back on an auth / get-started screen (e.g.
    // via iOS back gesture after OTP success) — push them into the app.
    if (session && onAuthRoute) {
      router.replace('/(tabs)/home');
    }
  }, [session, loading, inTabs, onAuthRoute]);

  return null;
}

function AppContent() {
  const { RGF, theme } = useTheme();
  // If no PostHog key is configured, skip the provider entirely rather than
  // shipping events to their cloud with a placeholder key.
  const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com';

  const Content = (
    <QueryProvider>
      <AuthProvider>
        <AuthRedirector />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: RGF.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="sign-up-otp" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="analyze/results" />
          <Stack.Screen name="analyze/detail" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="support" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="terms" />
        </Stack>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </AuthProvider>
    </QueryProvider>
  );

  if (!posthogKey) return Content;

  return (
    <PostHogProvider
      apiKey={posthogKey}
      options={{
        host: posthogHost,
        captureAppLifecycleEvents: true,
        enableSessionReplay: true,
        sessionReplayConfig: { maskAllTextInputs: true },
      }}
    >
      {Content}
    </PostHogProvider>
  );
}

export default Sentry.wrap(function RootLayout() {
  const [loaded] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
});
