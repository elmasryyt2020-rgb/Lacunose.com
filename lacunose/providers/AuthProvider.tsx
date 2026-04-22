import React, { createContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { initBilling } from '../lib/billing/revenuecat';
import { claimAnonymousIfPending } from '../lib/onboarding';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'mock_client_id',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  // Android Google Sign-In requires a separate OAuth 2.0 client in Google
  // Cloud Console with the app's SHA-1 fingerprint registered. See
  // POST_HACKATHON_ROADMAP.md. Missing SHA-1 is the most common DEVELOPER_ERROR.
  ...(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
    ? { androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID }
    : {}),
});

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true') {
      // Supabase Session.expires_at is seconds-since-epoch, NOT milliseconds.
      const nowSec = Math.floor(Date.now() / 1000);
      const nowIso = new Date().toISOString();
      setSession({
        access_token: 'mock', refresh_token: 'mock',
        expires_in: 3600, expires_at: nowSec + 3600,
        token_type: 'bearer',
        user: { id: 'mock-user-0000', app_metadata: {}, user_metadata: { full_name: 'Mock User' }, aud: 'authenticated', created_at: nowIso },
      });
      setUser({
        id: 'mock-user-0000', email: 'mock@example.com',
        app_metadata: {}, user_metadata: { full_name: 'Mock User' },
        aud: 'authenticated', created_at: nowIso,
      });
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user && session.access_token) {
        // initBilling is internally guarded; safe to call but won't reconfigure.
        void initBilling(session.user.id);
        // Transfer any pending onboarding teaser analysis to this user's
        // library. No-op if nothing is pending.
        void claimAnonymousIfPending(session.access_token);
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user && session.access_token) {
        void initBilling(session.user.id);
        void claimAnonymousIfPending(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string) => {
    if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true') return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  };

  const signUp = async (email: string) => {
    if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true') return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if (userInfo.data?.idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS.');
    }
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      throw new Error('Apple Sign-In is not available on this device.');
    }

    // Supabase requires a nonce for Apple tokens. Apple hashes the nonce
    // we send it; Supabase checks our RAW nonce against the hashed claim.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    try {
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
    } catch (error) {
      // ERR_REQUEST_CANCELED is user-initiated cancellation; swallow.
      const code = (error as { code?: string })?.code;
      if (code === 'ERR_REQUEST_CANCELED') return;
      throw error;
    }
  };

  const signOut = async () => {
    if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true') {
      setSession(null);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
