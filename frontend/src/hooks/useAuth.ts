/**
 * useAuth hook - Authentication state management
 *
 * Provides authentication state, session handling, and auth operations
 * for the FaaSr GitHub App.
 */

import { useState, useEffect, useCallback } from "react";
import { authApi } from "../services/api";
import type { UserSession, SessionResponse } from "../types";

interface UseAuthReturn {
  /** Current user session */
  session: UserSession | null;
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
 * useAuth hook
 *
 * Manages authentication state and provides methods for session management.
 * Automatically loads session on mount and provides reactive state updates.
 */
export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load session from server
   */
  const loadSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response: SessionResponse = await authApi.getSession();

      if (response.authenticated && response.user) {
        // Convert API response to UserSession format
        const userSession: UserSession = {
          installationId: "", // Will be set by backend in actual implementation
          userLogin: response.user.login,
          userId: response.user.id,
          avatarUrl: response.user.avatarUrl,
          jwtToken: "", // Token is stored in HTTP-only cookie
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        };

        setSession(userSession);
      } else {
        setSession(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh session from server
   */
  const refreshSession = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  /**
   * Log out current session
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
      setSession(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log out");
    }
  }, []);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return {
    session,
    isAuthenticated: session !== null,
    isLoading,
    error,
    refreshSession,
    logout,
  };
}
