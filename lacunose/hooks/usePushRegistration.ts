import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuth } from './useAuth';
import { fetchApi } from '../lib/api/client';
import { isMockMode } from '../lib/mocks';

/**
 * Registers the device's Expo push token with the backend once the user is
 * signed in. Noop in mock mode and on web. Requests permission only after
 * onboarding (caller gates via the screen that mounts this hook).
 */
export function usePushRegistration() {
  const { user } = useAuth();
  const registered = useRef<string | null>(null);

  useEffect(() => {
    if (isMockMode || !user?.id || Platform.OS === 'web') return;
    if (registered.current === user.id) return;

    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;
        if (status !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          status = req.status;
        }
        if (status !== 'granted') return;

        const projectId =
          (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
          (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

        const tokenResult = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        const token = tokenResult.data;
        if (!token) return;

        await fetchApi('/v1/push/register', {
          method: 'POST',
          body: JSON.stringify({ token, platform: Platform.OS }),
        });
        registered.current = user.id;
      } catch (err) {
        console.warn('push-registration failed', err);
      }
    })();
  }, [user?.id]);
}
