import * as SecureStore from 'expo-secure-store';

// Stored on keychain, inaccessible after device lock until next unlock
const STORE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const KEY = { ACCESS: 'saalik_at', REFRESH: 'saalik_rt' } as const;

export const tokenManager = {
  getAccessToken: (): Promise<string | null> =>
    SecureStore.getItemAsync(KEY.ACCESS),

  getRefreshToken: (): Promise<string | null> =>
    SecureStore.getItemAsync(KEY.REFRESH),

  async setTokenPair(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(KEY.ACCESS, accessToken, STORE_OPTS),
      SecureStore.setItemAsync(KEY.REFRESH, refreshToken, STORE_OPTS),
    ]);
  },

  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY.ACCESS),
      SecureStore.deleteItemAsync(KEY.REFRESH),
    ]);
  },
};
