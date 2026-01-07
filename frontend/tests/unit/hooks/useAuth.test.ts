/**
 * Tests for useAuth hook
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "../../../src/hooks/useAuth";
import { supabase } from "../../../src/services/supabase";

// Mock Supabase
jest.mock("../../../src/services/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      setSession: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it("returns unauthenticated state initially", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBe(null);
  });

  it("loads session from Supabase on mount", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: "test-token",
          refresh_token: "test-refresh-token",
          user: {
            id: "test-id",
            email: "github-123@faasr.app",
            user_metadata: {
              installationId: "123456",
              githubLogin: "testuser",
              githubId: 123,
              avatarUrl: "https://example.com/avatar.png",
            },
            created_at: new Date().toISOString(),
          },
        },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.session).not.toBe(null);
    expect(result.current.session?.user.user_metadata.githubLogin).toBe(
      "testuser"
    );
    expect(result.current.session?.user.user_metadata.installationId).toBe(
      "123456"
    );
  });

  it("handles session loading error", async () => {
    const error = new Error("Failed to load session");
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe("Failed to load session");
  });

  it("refreshes session when refreshSession is called", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: "test-token",
          refresh_token: "test-refresh-token",
          user: {
            id: "test-id",
            email: "github-123@faasr.app",
            user_metadata: {
              installationId: "123456",
              githubLogin: "testuser",
              githubId: 123,
            },
            created_at: new Date().toISOString(),
          },
        },
      },
      error: null,
    });

    (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: "new-token",
          refresh_token: "new-refresh-token",
          user: {
            id: "test-id",
            email: "github-123@faasr.app",
            user_metadata: {
              installationId: "123456",
              githubLogin: "updateduser",
              githubId: 456,
            },
            created_at: new Date().toISOString(),
          },
        },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshSession();
    });

    await waitFor(() => {
      expect(result.current.session?.user.user_metadata.githubLogin).toBe(
        "updateduser"
      );
    });
  });

  it("logs out when logout is called", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: "test-token",
          refresh_token: "test-refresh-token",
          user: {
            id: "test-id",
            email: "github-123@faasr.app",
            user_metadata: {
              installationId: "123456",
              githubLogin: "testuser",
              githubId: 123,
            },
            created_at: new Date().toISOString(),
          },
        },
      },
      error: null,
    });

    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.session).toBe(null);
    });
  });

  it("handles logout error", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: "test-token",
          refresh_token: "test-refresh-token",
          user: {
            id: "test-id",
            email: "github-123@faasr.app",
            user_metadata: {
              installationId: "123456",
              githubLogin: "testuser",
              githubId: 123,
            },
            created_at: new Date().toISOString(),
          },
        },
      },
      error: null,
    });

    const error = new Error("Logout failed");
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Logout failed");
    });
  });

  it("updates session when onAuthStateChange is triggered", async () => {
    let authStateChangeCallback: (event: string, session: any) => void;

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation(
      (callback) => {
        authStateChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      }
    );

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Trigger auth state change with a new session
    const newSession = {
      access_token: "new-token",
      refresh_token: "new-refresh-token",
      user: {
        id: "test-id",
        email: "github-123@faasr.app",
        user_metadata: {
          installationId: "123456",
          githubLogin: "testuser",
          githubId: 123,
        },
        created_at: new Date().toISOString(),
      },
    };

    act(() => {
      authStateChangeCallback!("SIGNED_IN", newSession);
    });

    await waitFor(() => {
      expect(result.current.session).not.toBe(null);
      expect(result.current.session?.access_token).toBe("new-token");
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it("clears error when onAuthStateChange is triggered", async () => {
    let authStateChangeCallback: (event: string, session: any) => void;

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: new Error("Initial error"),
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation(
      (callback) => {
        authStateChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      }
    );

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.error).toBe("Initial error");
    });

    // Trigger auth state change - should clear error
    act(() => {
      authStateChangeCallback!("SIGNED_IN", null);
    });

    await waitFor(() => {
      expect(result.current.error).toBe(null);
    });
  });

  it("handles refreshSession error with non-Error types", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: "test-token",
          refresh_token: "test-refresh-token",
          user: {
            id: "test-id",
            email: "github-123@faasr.app",
            user_metadata: {
              installationId: "123456",
              githubLogin: "testuser",
              githubId: 123,
            },
            created_at: new Date().toISOString(),
          },
        },
      },
      error: null,
    });

    // Test with string error
    (supabase.auth.refreshSession as jest.Mock).mockRejectedValue(
      "String error"
    );

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshSession();
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to refresh session");
      expect(result.current.session).toBe(null);
    });
  });

  it("handles refreshSession error with object error", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: "test-token",
          refresh_token: "test-refresh-token",
          user: {
            id: "test-id",
            email: "github-123@faasr.app",
            user_metadata: {
              installationId: "123456",
              githubLogin: "testuser",
              githubId: 123,
            },
            created_at: new Date().toISOString(),
          },
        },
      },
      error: null,
    });

    // Test with object error
    (supabase.auth.refreshSession as jest.Mock).mockRejectedValue({
      message: "Object error",
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshSession();
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to refresh session");
      expect(result.current.session).toBe(null);
    });
  });
});
