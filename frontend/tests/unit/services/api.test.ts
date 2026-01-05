/**
 * Tests for API service
 */

import { authApi, workflowsApi, healthApi } from "../../../src/services/api";

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock window.location
const mockLocation = {
  href: "",
};

describe("authApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (window as any).location;
    (window as any).location = mockLocation;
  });

  describe("install", () => {
    it("redirects to GitHub when response is 302", async () => {
      const mockHeaders = new Headers();
      mockHeaders.set(
        "Location",
        "https://github.com/apps/faasr/installations/new"
      );

      mockFetch.mockResolvedValue({
        status: 302,
        headers: mockHeaders,
        ok: false,
      } as Response);

      await authApi.install();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/install"),
        expect.objectContaining({
          method: "GET",
          redirect: "manual",
        })
      );
      expect(window.location.href).toBe(
        "https://github.com/apps/faasr/installations/new"
      );
    });

    it("throws error when response is not 302", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
      } as Response);

      await expect(authApi.install()).rejects.toThrow(
        "Failed to initiate installation"
      );
    });

    it("throws error when Location header is missing", async () => {
      const mockHeaders = new Headers();

      mockFetch.mockResolvedValue({
        status: 302,
        headers: mockHeaders,
        ok: false,
      } as Response);

      await expect(authApi.install()).rejects.toThrow(
        "Failed to initiate installation"
      );
    });
  });

  describe("callback", () => {
    it("calls callback endpoint with installation_id", async () => {
      const mockResponse = {
        success: true,
        message: "Installation successful",
        user: {
          login: "testuser",
          id: 1,
          avatarUrl: "https://example.com/avatar.png",
        },
        fork: {
          owner: "testuser",
          repoName: "FaaSr-workflow",
          url: "https://github.com/testuser/FaaSr-workflow",
          status: "created",
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authApi.callback("12345");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/callback?installation_id=12345"),
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("includes setup_action when provided", async () => {
      const mockResponse = {
        success: true,
        message: "Installation successful",
        user: {
          login: "testuser",
          id: 1,
          avatarUrl: "https://example.com/avatar.png",
        },
        fork: {
          owner: "testuser",
          repoName: "FaaSr-workflow",
          url: "https://github.com/testuser/FaaSr-workflow",
          status: "created",
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await authApi.callback("12345", "install");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("setup_action=install"),
        expect.anything()
      );
    });

    it("throws error when response is not ok", async () => {
      const mockErrorResponse = {
        success: false,
        error: "Installation failed",
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => mockErrorResponse,
      } as Response);

      await expect(authApi.callback("12345")).rejects.toThrow(
        "Installation failed"
      );
    });
  });

  describe("getSession", () => {
    it("returns session data when authenticated", async () => {
      const mockResponse = {
        authenticated: true,
        user: {
          login: "testuser",
          id: 1,
          avatarUrl: "https://example.com/avatar.png",
        },
        fork: {
          owner: "testuser",
          repoName: "FaaSr-workflow",
          url: "https://github.com/testuser/FaaSr-workflow",
          status: "created",
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authApi.getSession();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/session"),
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("returns unauthenticated session", async () => {
      const mockResponse = {
        authenticated: false,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authApi.getSession();
      expect(result).toEqual(mockResponse);
    });

    it("throws error when response is not ok", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ success: false, error: "Server error" }),
      } as Response);

      await expect(authApi.getSession()).rejects.toThrow();
    });
  });

  describe("logout", () => {
    it("calls logout endpoint successfully", async () => {
      const mockResponse = {
        success: true,
        message: "Logged out successfully",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authApi.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/logout"),
        expect.objectContaining({
          method: "POST",
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("throws error when response is not ok", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ success: false, error: "Server error" }),
      } as Response);

      await expect(authApi.logout()).rejects.toThrow();
    });
  });
});

describe("workflowsApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("upload", () => {
    it("uploads file successfully", async () => {
      const mockFile = new File(["test content"], "test.json", {
        type: "application/json",
      });
      const mockResponse = {
        success: true,
        message: "File uploaded",
        fileName: "test.json",
        commitSha: "abc123",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await workflowsApi.upload(mockFile);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/workflows/upload"),
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("throws error when response is not ok", async () => {
      const mockFile = new File(["test content"], "test.json", {
        type: "application/json",
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ success: false, error: "Invalid file" }),
      } as Response);

      await expect(workflowsApi.upload(mockFile)).rejects.toThrow(
        "Invalid file"
      );
    });
  });

  describe("getStatus", () => {
    it("returns workflow status", async () => {
      const mockResponse = {
        fileName: "test.json",
        status: "success",
        workflowRunId: 123,
        workflowRunUrl: "https://github.com/test/workflow/123",
        triggeredAt: "2025-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await workflowsApi.getStatus("test.json");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/workflows/status/test.json"),
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("encodes file name in URL", async () => {
      const mockResponse = {
        fileName: "test file.json",
        status: "pending",
        triggeredAt: "2025-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await workflowsApi.getStatus("test file.json");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("test%20file.json"),
        expect.anything()
      );
    });

    it("throws error when response is not ok", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ success: false, error: "Workflow not found" }),
      } as Response);

      await expect(workflowsApi.getStatus("test.json")).rejects.toThrow();
    });

    it("supports polling workflow status", async () => {
      // Simulate polling pattern: check status multiple times until complete
      const pendingResponse = {
        fileName: "test.json",
        status: "pending" as const,
        triggeredAt: "2025-01-01T00:00:00Z",
      };

      const runningResponse = {
        fileName: "test.json",
        status: "running" as const,
        workflowRunId: 123,
        workflowRunUrl: "https://github.com/test/workflow/123",
        triggeredAt: "2025-01-01T00:00:00Z",
      };

      const successResponse = {
        fileName: "test.json",
        status: "success" as const,
        workflowRunId: 123,
        workflowRunUrl: "https://github.com/test/workflow/123",
        triggeredAt: "2025-01-01T00:00:00Z",
        completedAt: "2025-01-01T00:05:00Z",
      };

      // First call returns pending
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => pendingResponse,
      } as Response);

      // Second call returns running
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => runningResponse,
      } as Response);

      // Third call returns success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => successResponse,
      } as Response);

      // Poll until status is complete
      let status = await workflowsApi.getStatus("test.json");
      expect(status.status).toBe("pending");

      status = await workflowsApi.getStatus("test.json");
      expect(status.status).toBe("running");

      status = await workflowsApi.getStatus("test.json");
      expect(status.status).toBe("success");
      expect(status.completedAt).toBeDefined();

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});

describe("healthApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("check", () => {
    it("returns health status", async () => {
      const mockResponse = {
        status: "healthy",
        timestamp: "2025-01-01T00:00:00Z",
        version: "1.0.0",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await healthApi.check();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/health"),
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("throws error when response is not ok", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ success: false, error: "Health check failed" }),
      } as Response);

      await expect(healthApi.check()).rejects.toThrow();
    });
  });
});

describe("handleResponse error handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles JSON parse errors gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("Invalid JSON");
      },
    } as unknown as Response);

    await expect(authApi.getSession()).rejects.toThrow("HTTP 500");
  });
});
