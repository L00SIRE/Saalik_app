import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { tokenManager } from '@services/tokenManager';
import {
  login as apiLogin,
  register as apiRegister,
  getMe,
  registerAuthFailureHandler,
} from '@services/api';
import * as demoSession from '@services/demoSession';
import { AuthUserSchema } from '@app-types/auth';
import type { AuthUser, AuthState, AuthAction, AuthStatus, DemoPersona } from '@app-types/auth';

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState: AuthState = { user: null, status: 'idle', demoPersona: null };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, status: 'loading' };
    case 'RESTORE':
    case 'SIGN_IN':
      return {
        user: action.payload,
        status: 'authenticated',
        demoPersona: action.demoPersona ?? null,
      };
    case 'SIGN_OUT':
      return { user: null, status: 'unauthenticated', demoPersona: null };
    case 'UPDATE_USER':
      if (!state.user) return state;
      return { ...state, user: { ...state.user, ...action.payload } };
  }
}

// ─── Contexts ─────────────────────────────────────────────────────────────────
// Split into state + actions so components that only dispatch (e.g. a logout
// button) do not re-render on every user field change.

type AuthActions = {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Start a demo session as one of the pre-baked personas. */
  loginAsDemo: (persona: DemoPersona) => Promise<void>;
  /** Wipe session-accumulated demo state but stay logged in as the same persona. */
  resetDemo: () => Promise<void>;
  /** Exit the demo and return to the login screen. */
  exitDemo: () => Promise<void>;
  /** Patch the signed-in user's profile (name, email, etc.) in memory. */
  updateProfile: (patch: Partial<AuthUser>) => void;
};

const AuthStateContext = createContext<AuthState | null>(null);
const AuthActionsContext = createContext<AuthActions | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Bootstrap: rehydrate either a real session or a demo session on mount.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      dispatch({ type: 'SET_LOADING' });
      try {
        // Step 1 — check for a persisted demo session first. Demo state lives
        // in AsyncStorage and uses synthetic tokens; we want it to take priority
        // so reviewers don't get bumped back to login on app relaunch.
        const demoStore = await demoSession.bootstrapDemo();
        if (demoStore) {
          const persona = demoStore.persona;
          const user = demoSession.getCurrentUser();
          if (user && !cancelled) {
            dispatch({ type: 'RESTORE', payload: user, demoPersona: persona });
            return;
          }
        }

        // Step 2 — real auth bootstrap
        const [access, refresh] = await Promise.all([
          tokenManager.getAccessToken(),
          tokenManager.getRefreshToken(),
        ]);

        if (!access || !refresh) {
          dispatch({ type: 'SIGN_OUT' });
          return;
        }

        // Defensive: if a stale demo token leaked into secure storage, clear it.
        if (demoSession.isDemoToken(access)) {
          await tokenManager.clearTokens();
          dispatch({ type: 'SIGN_OUT' });
          return;
        }

        const raw = await getMe();
        const parsed = AuthUserSchema.safeParse(raw);

        if (!cancelled) {
          if (parsed.success) {
            dispatch({ type: 'RESTORE', payload: parsed.data });
          } else {
            await tokenManager.clearTokens();
            dispatch({ type: 'SIGN_OUT' });
          }
        }
      } catch {
        if (!cancelled) {
          await tokenManager.clearTokens();
          dispatch({ type: 'SIGN_OUT' });
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // Wire up the axios interceptor's "refresh failed" signal to force a logout.
  // Demo sessions never emit this because they never hit the network, so a
  // single handler is fine for both modes.
  useEffect(() => {
    registerAuthFailureHandler(async () => {
      await tokenManager.clearTokens();
      await demoSession.stop();
      dispatch({ type: 'SIGN_OUT' });
    });
  }, []);

  // ─── Real auth actions ──────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    // Defensive: a real login should always tear down any demo state first
    // so we don't end up with mixed tokens.
    await demoSession.stop();
    const response = await apiLogin(email, password);
    await tokenManager.setTokenPair(response.accessToken, response.refreshToken);
    dispatch({ type: 'SIGN_IN', payload: AuthUserSchema.parse(response.user), demoPersona: null });
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    await demoSession.stop();
    const response = await apiRegister(email, password, name);
    await tokenManager.setTokenPair(response.accessToken, response.refreshToken);
    dispatch({ type: 'SIGN_IN', payload: AuthUserSchema.parse(response.user), demoPersona: null });
  }, []);

  const logout = useCallback(async () => {
    try {
      // Demo sessions skip the server roundtrip — there's no token to invalidate.
      if (!demoSession.isActive()) {
        const refreshToken = await tokenManager.getRefreshToken();
        if (refreshToken) {
          await fetch(
            `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/auth/logout`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            },
          ).catch(() => {});
        }
      }
    } finally {
      await Promise.all([tokenManager.clearTokens(), demoSession.stop()]);
      dispatch({ type: 'SIGN_OUT' });
    }
  }, []);

  // ─── Demo auth actions ──────────────────────────────────────────────────────

  const loginAsDemo = useCallback(async (persona: DemoPersona) => {
    // Tear down any prior session (real or demo) so we start clean.
    await Promise.all([tokenManager.clearTokens(), demoSession.stop()]);
    const user = await demoSession.start(persona);
    const tokens = demoSession.demoTokensFor(persona);
    await tokenManager.setTokenPair(tokens.accessToken, tokens.refreshToken);
    dispatch({ type: 'SIGN_IN', payload: user, demoPersona: persona });
  }, []);

  const resetDemo = useCallback(async () => {
    await demoSession.reset();
    // No state change — same user, same persona, but session-accumulated state
    // (new bookings, new reviews) is wiped back to the seed.
  }, []);

  const exitDemo = useCallback(async () => {
    await Promise.all([tokenManager.clearTokens(), demoSession.stop()]);
    dispatch({ type: 'SIGN_OUT' });
  }, []);

  const updateProfile = useCallback((patch: Partial<AuthUser>) => {
    dispatch({ type: 'UPDATE_USER', payload: patch });
  }, []);

  // Stable reference — actions never change identity, preventing all downstream re-renders.
  const actions = useMemo<AuthActions>(
    () => ({ login, register, logout, loginAsDemo, resetDemo, exitDemo, updateProfile }),
    [login, register, logout, loginAsDemo, resetDemo, exitDemo, updateProfile],
  );

  return (
    <AuthStateContext.Provider value={state}>
      <AuthActionsContext.Provider value={actions}>{children}</AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuthState(): AuthState {
  const ctx = useContext(AuthStateContext);
  if (!ctx) throw new Error('useAuthState must be inside AuthProvider');
  return ctx;
}

export function useAuthActions(): AuthActions {
  const ctx = useContext(AuthActionsContext);
  if (!ctx) throw new Error('useAuthActions must be inside AuthProvider');
  return ctx;
}

/** Convenience hook — consumers that read state AND dispatch can use this. */
export function useAuth(): AuthState &
  AuthActions & { isLoggedIn: boolean; isLoading: boolean; isDemo: boolean } {
  const state = useAuthState();
  const actions = useAuthActions();
  return {
    ...state,
    ...actions,
    isLoggedIn: state.status === 'authenticated',
    isLoading: state.status === 'idle' || state.status === 'loading',
    isDemo: state.demoPersona !== null,
  };
}

/**
 * Narrowed hook for screens inside the authenticated navigator tree.
 * Throws at dev-time if called outside an authenticated context.
 */
export function useRequireAuth(): { user: AuthUser; status: AuthStatus } & AuthActions {
  const state = useAuthState();
  const actions = useAuthActions();

  if (state.status !== 'authenticated' || !state.user) {
    throw new Error('useRequireAuth called outside authenticated context');
  }

  return { user: state.user, status: state.status, ...actions };
}
