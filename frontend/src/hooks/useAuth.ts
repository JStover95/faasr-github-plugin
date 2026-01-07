/**
 * useAuth hook - Authentication state management
 *
 * Provides authentication state, session handling, and auth operations
 * for the FaaSr GitHub App using Supabase Auth.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import type { Session } from "@supabase/supabase-js";

interface UseAuthReturn {
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
 * useAuth hook
 *
 * Manages authentication state using Supabase Auth.
 * Automatically loads session on mount and listens for auth state changes.
 */
export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError(error.message);
        setSession(null);
      } else {
        setSession(session);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setError(null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Refresh session from Supabase
   */
  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();
      if (error) throw error;
      setSession(session);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh session"
      );
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Log out current session
   */
  const logout = useCallback(async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log out");
    }
  }, []);

  return {
    session,
    isAuthenticated: session !== null,
    isLoading,
    error,
    refreshSession,
    logout,
  };
}
