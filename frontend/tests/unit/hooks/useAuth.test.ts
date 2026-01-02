/**
 * Tests for useAuth hook
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "../../../src/hooks/useAuth";
import { authApi } from "../../../src/services/api";

// Mock the API
jest.mock("../../../src/services/api", () => ({
  authApi: {
    getSession: jest.fn(),
    logout: jest.fn(),
  },
}));

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns unauthenticated state initially", () => {
    (authApi.getSession as jest.Mock).mockResolvedValue({
      authenticated: false,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBe(null);
  });

  it("loads session on mount", async () => {
    (authApi.getSession as jest.Mock).mockResolvedValue({
      authenticated: true,
      user: {
        login: "testuser",
        id: 123,
        avatarUrl: "https://example.com/avatar.png",
      },
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.session).not.toBe(null);
    expect(result.current.session?.userLogin).toBe("testuser");
  });

  it("handles session loading error", async () => {
    const error = new Error("Failed to load session");
    (authApi.getSession as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe("Failed to load session");
  });

  it("refreshes session when refreshSession is called", async () => {
    (authApi.getSession as jest.Mock).mockResolvedValue({
      authenticated: true,
      user: {
        login: "testuser",
        id: 123,
        avatarUrl: "https://example.com/avatar.png",
      },
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Update mock response
    (authApi.getSession as jest.Mock).mockResolvedValue({
      authenticated: true,
      user: {
        login: "updateduser",
        id: 456,
        avatarUrl: "https://example.com/avatar2.png",
      },
    });

    await result.current.refreshSession();

    await waitFor(() => {
      expect(result.current.session?.userLogin).toBe("updateduser");
    });
  });

  it("logs out when logout is called", async () => {
    (authApi.getSession as jest.Mock).mockResolvedValue({
      authenticated: true,
      user: {
        login: "testuser",
        id: 123,
        avatarUrl: "https://example.com/avatar.png",
      },
    });

    (authApi.logout as jest.Mock).mockResolvedValue({
      success: true,
      message: "Logged out",
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await result.current.logout();

    expect(authApi.logout).toHaveBeenCalledTimes(1);
    
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.session).toBe(null);
    });
  });

  it("handles logout error", async () => {
    (authApi.getSession as jest.Mock).mockResolvedValue({
      authenticated: true,
      user: {
        login: "testuser",
        id: 123,
        avatarUrl: "https://example.com/avatar.png",
      },
    });

    const error = new Error("Logout failed");
    (authApi.logout as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await result.current.logout();

    await waitFor(() => {
      expect(result.current.error).toBe("Logout failed");
    });
  });
});

