/**
 * Mock utilities for useAuth hook
 *
 * Provides type-safe helpers for mocking useAuth in tests
 */

import type { Session } from "@supabase/supabase-js";

/**
 * Return type of useAuth hook - matches the interface from useAuth.ts
 */
export interface UseAuthReturn {
  /** Current user session */
  session: Session | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether session is being loaded */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh session from server */
  refreshSession: () => Promise<void>;
  /** Log out current session */
  logout: () => Promise<void>;
}

/**
 * Default mock auth state - unauthenticated
 */
export const defaultMockAuth: UseAuthReturn = {
  session: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  refreshSession: jest.fn().mockResolvedValue(undefined),
  logout: jest.fn().mockResolvedValue(undefined),
};

/**
 * Create a mock session for testing
 */
export function createMockSession(overrides?: Partial<Session>): Session {
  return {
    access_token: "test-token",
    refresh_token: "test-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "test-id",
      email: "github-123@faasr.app",
      app_metadata: {},
      user_metadata: {
        installationId: "123",
        githubLogin: "testuser",
        githubId: 1,
        avatarUrl: "https://example.com/avatar.png",
      },
      aud: "authenticated",
      created_at: new Date().toISOString(),
      ...overrides?.user,
    },
    ...overrides,
  } as Session;
}

/**
 * Create authenticated mock auth state
 */
export function createAuthenticatedMockAuth(
  sessionOverrides?: Partial<Session>
): UseAuthReturn {
  return {
    ...defaultMockAuth,
    session: createMockSession(sessionOverrides),
    isAuthenticated: true,
  };
}

/**
 * Create loading mock auth state
 */
export function createLoadingMockAuth(): UseAuthReturn {
  return {
    ...defaultMockAuth,
    isLoading: true,
  };
}

/**
 * Create error mock auth state
 */
export function createErrorMockAuth(errorMessage: string): UseAuthReturn {
  return {
    ...defaultMockAuth,
    error: errorMessage,
  };
}
