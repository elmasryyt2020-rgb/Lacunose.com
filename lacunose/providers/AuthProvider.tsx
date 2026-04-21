import React, { createContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { initBilling } from '../lib/billing/revenuecat';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'mock_client_id',
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
      setSession({ access_token: 'mock', refresh_token: 'mock', expires_in: 3600, expires_at: Date.now() + 3600, token_type: 'bearer', user: { id: 'mock', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' } });
      setUser({ id: 'mock', email: 'mock@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' });
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // initBilling is internally guarded; safe to call but won't reconfigure.
        void initBilling(session.user.id);
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void initBilling(session.user.id);
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
