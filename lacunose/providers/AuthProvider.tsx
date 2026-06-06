import React, { createContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { initBilling } from '../lib/billing/revenuecat';
import { claimAnonymousIfPending } from '../lib/onboarding';
import * as Sentry from '@sentry/react-native';

/* ------------------------------------------------------------------ */
// Google Sign-In configuration
/* ------------------------------------------------------------------ */

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

const hasRealGoogleConfig = Boolean(
  WEB_CLIENT_ID &&
    WEB_CLIENT_ID !== 'mock_client_id' &&
    WEB_CLIENT_ID.length > 10
);

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID || 'mock_client_id',
  iosClientId: IOS_CLIENT_ID,
  // Required on Android — must match the registered Android OAuth client
  // whose SHA-1 fingerprint is registered in Google Cloud Console.
  ...(ANDROID_CLIENT_ID ? { androidClientId: ANDROID_CLIENT_ID } : {}),
});

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signUp: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ------------------------------------------------------------------ */
// Error helpers
/* ------------------------------------------------------------------ */

function isAuthApiError(err: unknown): err is AuthError {
  return (
    err instanceof AuthError ||
    (typeof err === 'object' &&
      err !== null &&
      'status' in err &&
      typeof (err as Record<string, unknown>).status === 'number')
  );
}

function googleErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { code?: string; message?: string };

    if (e.code === statusCodes.SIGN_IN_CANCELLED) {
      return 'SIGN_IN_CANCELLED';
    }
    if (e.code === statusCodes.IN_PROGRESS) {
      return 'A sign-in operation is already in progress. Please wait.';
    }
    if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return 'Google Play Services are not available on this device. Please install or update them to sign in with Google.';
    }

    const msg = e.message ?? '';
    if (msg.includes('DEVELOPER_ERROR')) {
      return 'Google Sign-In is not configured for this device. Please contact support.';
    }
    if (msg.includes('INTERNAL_ERROR')) {
      return 'A temporary Google error occurred. Please try again.';
    }
    if (msg.includes('NETWORK_ERROR')) {
      return 'Network error while signing in with Google. Please check your connection and try again.';
    }
  }

  return 'Google sign-in failed. Please try again.';
}

/* ------------------------------------------------------------------ */
// Provider
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Concurrency guards — refs so we don't trigger re-renders.
  const googleInProgress = useRef(false);
  const appleInProgress = useRef(false);
  const otpInProgress = useRef(false);

  /* ---------------------------------------------------------------- */
  // Session boot + listener
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true') {
      const nowSec = Math.floor(Date.now() / 1000);
      const nowIso = new Date().toISOString();
      setSession({
        access_token: 'mock',
        refresh_token: 'mock',
        expires_in: 3600,
        expires_at: nowSec + 3600,
        token_type: 'bearer',
        user: {
          id: 'mock-user-0000',
          app_metadata: {},
          user_metadata: { full_name: 'Mock User' },
          aud: 'authenticated',
          created_at: nowIso,
        } as unknown as User,
      });
      setUser({
        id: 'mock-user-0000',
        email: 'mock@example.com',
        app_metadata: {},
        user_metadata: { full_name: 'Mock User' },
        aud: 'authenticated',
        created_at: nowIso,
      } as unknown as User);
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        if (error) {
          Sentry.captureException(error);
          // If the session is corrupt, clear it silently.
          if (isAuthApiError(error)) {
            void supabase.auth.signOut();
          }
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user && session.access_token) {
          void initBilling(session.user.id);
          void claimAnonymousIfPending(session.access_token);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        Sentry.captureException(err);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user && session.access_token) {
          void initBilling(session.user.id);
          void claimAnonymousIfPending(session.access_token);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ---------------------------------------------------------------- */
  // OTP sign-in / sign-up
  /* ---------------------------------------------------------------- */

  const signIn = async (email: string) => {
    if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true') return;
    if (otpInProgress.current) return;
    if (email.trim().toLowerCase() === 'apple@lacunose.com') return;

    otpInProgress.current = true;
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
    } finally {
      otpInProgress.current = false;
    }
  };

  const signUp = async (email: string) => {
    if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true') return;
    if (otpInProgress.current) return;
    if (email.trim().toLowerCase() === 'apple@lacunose.com') return;

    otpInProgress.current = true;
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
    } finally {
      otpInProgress.current = false;
    }
  };

  /* ---------------------------------------------------------------- */
  // Google Sign-In
  /* ---------------------------------------------------------------- */

  const signInWithGoogle = async () => {
    if (googleInProgress.current) {
      throw new Error('A Google sign-in is already in progress.');
    }
    googleInProgress.current = true;

    try {
      if (!hasRealGoogleConfig) {
        const msg =
          Platform.OS === 'android'
            ? 'Google Sign-In is not configured for Android yet. Please sign in with email or Apple (iOS).'
            : 'Google Sign-In is not configured. Please sign in with email.';
        Sentry.captureMessage('Google Sign-In invoked without real configuration', 'warning');
        throw new Error(msg);
      }

      try {
        const hasPlay = await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: false,
        });
        if (!hasPlay) {
          throw new Error('Google Play Services are not available or need an update.');
        }
      } catch (playErr) {
        const msg = googleErrorMessage(playErr);
        if (msg.includes('Play Services')) {
          throw new Error(msg);
        }
        // Some emulators or side-loaded builds throw unrelated errors from
        // hasPlayServices. Log but continue — signIn() may still work.
        Sentry.captureException(playErr);
      }

      const userInfo = await GoogleSignin.signIn();
      if (!userInfo.data?.idToken) {
        throw new Error('Google did not return an ID token.');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
      });
      if (error) throw error;
    } catch (err) {
      // Swallow user-cancellation so the UI doesn't show an error alert.
      const code = (err as { code?: string })?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      const friendly = googleErrorMessage(err);
      Sentry.captureException(err, { extra: { friendlyMessage: friendly } });

      // Re-throw a clean message for the UI layer.
      throw new Error(friendly);
    } finally {
      googleInProgress.current = false;
    }
  };

  /* ---------------------------------------------------------------- */
  // Apple Sign-In
  /* ---------------------------------------------------------------- */

  const signInWithApple = async () => {
    if (appleInProgress.current) {
      throw new Error('An Apple sign-in is already in progress.');
    }
    appleInProgress.current = true;

    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS.');
      }
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        throw new Error('Apple Sign-In is not available on this device.');
      }

      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error('Apple did not return an identity token.');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });
      if (error) throw error;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'ERR_REQUEST_CANCELED') return;
      Sentry.captureException(err);
      throw err;
    } finally {
      appleInProgress.current = false;
    }
  };

  /* ---------------------------------------------------------------- */
  // Sign out
  /* ---------------------------------------------------------------- */

  const signOut = async () => {
    if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true') {
      setSession(null);
      setUser(null);
      return;
    }
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore — user may not have been signed in with Google.
    }
    await supabase.auth.signOut();
  };

  /* ---------------------------------------------------------------- */
  // Render
  /* ---------------------------------------------------------------- */

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, signInWithGoogle, signInWithApple, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
