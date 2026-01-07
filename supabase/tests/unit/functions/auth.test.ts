/**
 * Tests for authentication edge function handlers
 *
 * Tests GitHub App installation, callback handling, session management, and logout
 */

import { assert, assertEquals } from "jsr:@std/assert@1.0.16";
import { stub } from "jsr:@std/testing@1.0.16/mock";
import {
  deps,
  handleCallback,
  handleInstall,
} from "../../../functions/auth/index.ts";
import {
  createMockRequest,
  createTestGitHubInstallation,
  createTestRepositoryFork,
  restoreEnvState,
  saveEnvState,
} from "./_shared/test-utils.ts";
import type { GitHubInstallation } from "../../../functions/_shared/types.ts";

// ============================================================================
// Tests for handleInstall
// ============================================================================

Deno.test("handleInstall - redirects to GitHub App installation URL", () => {
  const saved = saveEnvState(["GITHUB_CLIENT_ID"]);
  try {
    Deno.env.set("GITHUB_CLIENT_ID", "test-client-id");
    const req = createMockRequest({
      method: "GET",
      url: "https://example.com",
    });

    const response = handleInstall(req);

    assertEquals(response.status, 302);
    const location = response.headers.get("Location");
    assert(location !== null);
    assert(location.includes("github.com/apps/faasr/installations/new"));
    assert(location.includes("state=install"));
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test(
  "handleInstall - returns error when client ID is missing",
  async () => {
    const saved = saveEnvState(["GITHUB_CLIENT_ID"]);
    try {
      Deno.env.delete("GITHUB_CLIENT_ID");
      const req = createMockRequest({
        method: "GET",
        url: "https://example.com",
      });

      const response = handleInstall(req);

      assertEquals(response.status, 500);
      const body = await response.json();
      assertEquals(body.success, false);
      assertEquals(body.error, "GitHub App client ID not configured");
    } finally {
      restoreEnvState(saved);
    }
  }
);

// ============================================================================
// Tests for handleCallback
// ============================================================================

Deno.test(
  "handleCallback - returns error when installation_id is missing",
  async () => {
    const req = createMockRequest({
      method: "GET",
      url: "https://example.com/auth/callback",
    });

    const response = await handleCallback(req);

    assertEquals(response.status, 400);
    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(body.error, "Missing installation_id parameter");
  }
);

Deno.test(
  "handleCallback - returns error when GitHub App config is missing",
  async () => {
    const saved = saveEnvState(["GITHUB_APP_ID", "GITHUB_PRIVATE_KEY"]);
    try {
      Deno.env.delete("GITHUB_APP_ID");
      Deno.env.delete("GITHUB_PRIVATE_KEY");

      const req = createMockRequest({
        method: "GET",
        url: "https://example.com/auth/callback?installation_id=123456",
      });

      const response = await handleCallback(req);

      assertEquals(response.status, 500);
      const body = await response.json();
      assertEquals(body.success, false);
      assertEquals(body.error, "GitHub App configuration missing");
    } finally {
      restoreEnvState(saved);
    }
  }
);

Deno.test("handleCallback - successful installation flow", async () => {
  const saved = saveEnvState([
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);

  // Create mock data
  const mockInstallation: GitHubInstallation = createTestGitHubInstallation();
  const mockFork = createTestRepositoryFork();
  const mockToken = "mock-installation-token";

  // Create stubs for all the service functions
  const getInstallationStub = stub(deps, "getInstallation", () =>
    Promise.resolve(mockInstallation)
  );

  const checkPermissionsStub = stub(deps, "checkInstallationPermissions", () =>
    Promise.resolve({ valid: true, missingPermissions: [] })
  );

  const getTokenStub = stub(deps, "getInstallationToken", () =>
    Promise.resolve({
      token: mockToken,
      expiresAt: new Date().toISOString(),
    })
  );

  const ensureForkStub = stub(deps, "ensureForkExists", () =>
    Promise.resolve(mockFork)
  );

  const createOrUpdateSupabaseUserStub = stub(
    deps,
    "createOrUpdateSupabaseUser",
    () =>
      Promise.resolve({
        user: {
          id: "test-user-id",
          email: "github-123@faasr.app",
          user_metadata: {
            installationId: "123456",
            githubLogin: mockInstallation.account.login,
            githubId: mockInstallation.account.id,
            avatarUrl: mockInstallation.account.avatar_url,
          },
          created_at: new Date().toISOString(),
        },
        session: {
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
        },
      })
  );

  try {
    Deno.env.set("GITHUB_APP_ID", "test-app-id");
    Deno.env.set(
      "GITHUB_PRIVATE_KEY",
      "-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----"
    );
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

    const req = createMockRequest({
      method: "GET",
      url: "https://example.com/auth/callback?installation_id=123456",
    });

    const response = await handleCallback(req);

    // Verify successful response
    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.success, true);
    assertEquals(body.message, "Installation successful");
    assertEquals(body.user.login, mockInstallation.account.login);
    assertEquals(body.user.id, mockInstallation.account.id);
    assertEquals(body.fork.owner, mockFork.owner);
    assertEquals(body.fork.repoName, mockFork.repoName);

    // Verify session tokens are present
    assert(body.session !== undefined);
    assertEquals(body.session.access_token, "test-access-token");
    assertEquals(body.session.refresh_token, "test-refresh-token");

    // Verify Set-Cookie header is NOT present (using Authorization header instead)
    const setCookie = response.headers.get("Set-Cookie");
    assertEquals(setCookie, null);

    // Verify stubs were called
    assertEquals(getInstallationStub.calls.length, 1);
    assertEquals(checkPermissionsStub.calls.length, 1);
    assertEquals(getTokenStub.calls.length, 1);
    assertEquals(ensureForkStub.calls.length, 1);
    assertEquals(createOrUpdateSupabaseUserStub.calls.length, 1);
  } finally {
    // Restore all stubs
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    getTokenStub.restore();
    ensureForkStub.restore();
    createOrUpdateSupabaseUserStub.restore();
    restoreEnvState(saved);
  }
});

Deno.test("handleCallback - handles rate limit errors", async () => {
  const saved = saveEnvState(["GITHUB_APP_ID", "GITHUB_PRIVATE_KEY"]);

  // Stub getInstallation to throw a rate limit error
  const getInstallationStub = stub(deps, "getInstallation", () =>
    Promise.reject(new Error("API rate limit exceeded"))
  );

  try {
    Deno.env.set("GITHUB_APP_ID", "test-app-id");
    Deno.env.set(
      "GITHUB_PRIVATE_KEY",
      "-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----"
    );

    const req = createMockRequest({
      method: "GET",
      url: "https://example.com/auth/callback?installation_id=123456",
    });

    const response = await handleCallback(req);

    // Should return an error response with user-friendly message
    assertEquals(response.status, 500);
    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(
      body.error,
      "Too many requests. Please try again in a few minutes."
    );
  } finally {
    getInstallationStub.restore();
    restoreEnvState(saved);
  }
});

Deno.test("handleCallback - handles permission errors", async () => {
  const saved = saveEnvState(["GITHUB_APP_ID", "GITHUB_PRIVATE_KEY"]);

  const mockInstallation: GitHubInstallation = createTestGitHubInstallation();

  const getInstallationStub = stub(deps, "getInstallation", () =>
    Promise.resolve(mockInstallation)
  );

  const checkPermissionsStub = stub(deps, "checkInstallationPermissions", () =>
    Promise.resolve({
      valid: false,
      missingPermissions: ["contents:write", "actions:write"],
    })
  );

  try {
    Deno.env.set("GITHUB_APP_ID", "test-app-id");
    Deno.env.set(
      "GITHUB_PRIVATE_KEY",
      "-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----"
    );

    const req = createMockRequest({
      method: "GET",
      url: "https://example.com/auth/callback?installation_id=123456",
    });

    const response = await handleCallback(req);

    // Should return permission error
    assertEquals(response.status, 403);
    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(body.error, "Missing required permissions");
    assertEquals(body.details, ["contents:write", "actions:write"]);
  } finally {
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    restoreEnvState(saved);
  }
});
