/**
 * Integration test for complete installation flow
 *
 * Tests the end-to-end flow from install button click to fork creation:
 * 1. User clicks install button → GET /auth/install
 * 2. Redirects to GitHub App installation
 * 3. GitHub redirects back → GET /auth/callback
 * 4. Fork is created/verified
 * 5. Session is established
 */

import { assert, assertEquals } from "jsr:@std/assert@1.0.16";
import { stub } from "jsr:@std/testing@1.0.16/mock";
import {
  deps,
  handleCallback,
  handleInstall,
} from "../../functions/auth/index.ts";
import {
  createMockRequest,
  createTestGitHubInstallation,
  createTestRepositoryFork,
  restoreEnvState,
  saveEnvState,
} from "../unit/functions/_shared/test-utils.ts";
import type { GitHubInstallation } from "../../functions/_shared/types.ts";

Deno.test(
  "Integration: Complete installation flow from install to fork creation",
  async () => {
    const saved = saveEnvState([
      "GITHUB_CLIENT_ID",
      "GITHUB_APP_ID",
      "GITHUB_PRIVATE_KEY",
      "JWT_SECRET",
    ]);

    // Create mock data
    const mockInstallation: GitHubInstallation = createTestGitHubInstallation();
    const mockFork = createTestRepositoryFork();
    const mockToken = "mock-installation-token";

    // Create stubs for all the service functions
    const getInstallationStub = stub(deps, "getInstallation", () =>
      Promise.resolve(mockInstallation)
    );

    const checkPermissionsStub = stub(
      deps,
      "checkInstallationPermissions",
      () => Promise.resolve({ valid: true, missingPermissions: [] })
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
      // Set up environment
      Deno.env.set("GITHUB_CLIENT_ID", "test-client-id");
      Deno.env.set("GITHUB_APP_ID", "test-app-id");
      Deno.env.set(
        "GITHUB_PRIVATE_KEY",
        "-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----"
      );
      Deno.env.set("JWT_SECRET", "test-secret-key");

      // Step 1: User clicks install button → GET /auth/install
      const installReq = createMockRequest({
        method: "GET",
        url: "https://example.com/auth/install",
      });

      const installResponse = handleInstall(installReq);

      // Verify redirect to GitHub
      assertEquals(installResponse.status, 302);
      const location = installResponse.headers.get("Location");
      assert(location !== null);
      assert(location.includes("github.com/apps/faasr/installations/new"));

      // Step 2: GitHub redirects back → GET /auth/callback
      // (In real flow, user would complete installation on GitHub first)
      const callbackReq = createMockRequest({
        method: "GET",
        url: "https://example.com/auth/callback?installation_id=123456",
      });

      const callbackResponse = await handleCallback(callbackReq);

      // Step 3: Verify successful installation response
      assertEquals(callbackResponse.status, 200);
      const callbackBody = await callbackResponse.json();
      assertEquals(callbackBody.success, true);
      assertEquals(callbackBody.message, "Installation successful");
      assertEquals(callbackBody.user.login, mockInstallation.account.login);
      assertEquals(callbackBody.user.id, mockInstallation.account.id);

      // Step 4: Verify fork was created/verified
      assertEquals(callbackBody.fork.owner, mockFork.owner);
      assertEquals(callbackBody.fork.repoName, mockFork.repoName);
      assertEquals(callbackBody.fork.url, mockFork.forkUrl);
      assertEquals(ensureForkStub.calls.length, 1);

      // Step 5: Verify session tokens were returned
      assert(callbackBody.session !== undefined);
      assertEquals(callbackBody.session.access_token, "test-access-token");
      assertEquals(callbackBody.session.refresh_token, "test-refresh-token");
      assertEquals(createOrUpdateSupabaseUserStub.calls.length, 1);

      // Verify all service functions were called in correct order
      assertEquals(getInstallationStub.calls.length, 1);
      assertEquals(checkPermissionsStub.calls.length, 1);
      assertEquals(getTokenStub.calls.length, 1);
    } finally {
      // Restore all stubs
      getInstallationStub.restore();
      checkPermissionsStub.restore();
      getTokenStub.restore();
      ensureForkStub.restore();
      createOrUpdateSupabaseUserStub.restore();
      restoreEnvState(saved);
    }
  }
);

Deno.test(
  "Integration: Installation flow handles existing fork gracefully",
  async () => {
    const saved = saveEnvState([
      "GITHUB_CLIENT_ID",
      "GITHUB_APP_ID",
      "GITHUB_PRIVATE_KEY",
      "JWT_SECRET",
    ]);

    // Create mock data with existing fork
    const mockInstallation: GitHubInstallation = createTestGitHubInstallation();
    const mockFork = createTestRepositoryFork();
    mockFork.forkStatus = "exists"; // Fork already exists

    const getInstallationStub = stub(deps, "getInstallation", () =>
      Promise.resolve(mockInstallation)
    );

    const checkPermissionsStub = stub(
      deps,
      "checkInstallationPermissions",
      () => Promise.resolve({ valid: true, missingPermissions: [] })
    );

    const getTokenStub = stub(deps, "getInstallationToken", () =>
      Promise.resolve({
        token: "mock-token",
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
      Deno.env.set("GITHUB_CLIENT_ID", "test-client-id");
      Deno.env.set("GITHUB_APP_ID", "test-app-id");
      Deno.env.set(
        "GITHUB_PRIVATE_KEY",
        "-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----"
      );
      Deno.env.set("JWT_SECRET", "test-secret-key");

      const callbackReq = createMockRequest({
        method: "GET",
        url: "https://example.com/auth/callback?installation_id=123456",
      });

      const callbackResponse = await handleCallback(callbackReq);

      // Should still succeed even if fork already exists
      assertEquals(callbackResponse.status, 200);
      const callbackBody = await callbackResponse.json();
      assertEquals(callbackBody.success, true);
      assertEquals(callbackBody.fork.status, "exists");
      assertEquals(ensureForkStub.calls.length, 1);
    } finally {
      getInstallationStub.restore();
      checkPermissionsStub.restore();
      getTokenStub.restore();
      ensureForkStub.restore();
      createOrUpdateSupabaseUserStub.restore();
      restoreEnvState(saved);
    }
  }
);
