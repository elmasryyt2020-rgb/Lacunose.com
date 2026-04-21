import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useFonts, InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import { ThemeProvider, useTheme } from '../constants/theme';
import { AuthProvider } from '../providers/AuthProvider';
import { QueryProvider } from '../providers/QueryProvider';
import { useAuth } from '../hooks/useAuth';
import * as Sentry from '@sentry/react-native';
import { PostHogProvider } from 'posthog-react-native';
import { useSegments, useRouter } from 'expo-router';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 1.0,
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AuthRedirector() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session && segments[0] === '(tabs)') {
      router.replace('/sign-in');
    }
  }, [session, loading, segments]);

  return null;
}

function AppContent() {
  const { RGF, theme } = useTheme();
  return (
    <PostHogProvider apiKey={process.env.EXPO_PUBLIC_POSTHOG_KEY || 'mock'} options={{
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com',
      captureAppLifecycleEvents: true,
      enableSessionReplay: true,
      sessionReplayConfig: { maskAllTextInputs: true },
    }}>
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
      </Stack>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        </AuthProvider>
      </QueryProvider>
    </PostHogProvider>
  );
}

export default Sentry.wrap(function RootLayout() {
  const [loaded] = useFonts({
    InstrumentSerif_400Regular,
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
