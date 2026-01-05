/**
 * Tests for GitHub Client Service
 *
 * Tests credential retrieval, configuration validation, and Octokit instance creation
 */

import { assertEquals, assert, assertRejects } from "jsr:@std/assert@1.0.16";
import { GitHubClientService } from "../../../functions/_shared/github-client.ts";
import { createTestUserSession, withEnvState } from "./test-utils.ts";

// ============================================================================
// Tests for getCredentials
// ============================================================================

Deno.test("getCredentials - returns credentials when env vars set", async () => {
  await withEnvState(["GITHUB_APP_ID", "GITHUB_PRIVATE_KEY"], () => {
    Deno.env.set("GITHUB_APP_ID", "test-app-id");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-private-key");

    const service = new GitHubClientService();
    const credentials = service.getCredentials();

    assert(credentials !== null);
    if (credentials) {
      assertEquals(credentials.appId, "test-app-id");
      assertEquals(credentials.privateKey, "test-private-key");
    }
  });
});

Deno.test("getCredentials - returns null when app ID missing", async () => {
  await withEnvState(["GITHUB_APP_ID", "GITHUB_PRIVATE_KEY"], () => {
    Deno.env.delete("GITHUB_APP_ID");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-private-key");

    const service = new GitHubClientService();
    const credentials = service.getCredentials();

    assertEquals(credentials, null);
  });
});

Deno.test("getCredentials - returns null when private key missing", async () => {
  await withEnvState(["GITHUB_APP_ID", "GITHUB_PRIVATE_KEY"], () => {
    Deno.env.set("GITHUB_APP_ID", "test-app-id");
    Deno.env.delete("GITHUB_PRIVATE_KEY");

    const service = new GitHubClientService();
    const credentials = service.getCredentials();

    assertEquals(credentials, null);
  });
});

Deno.test("getCredentials - returns null when both env vars missing", async () => {
  await withEnvState(["GITHUB_APP_ID", "GITHUB_PRIVATE_KEY"], () => {
    Deno.env.delete("GITHUB_APP_ID");
    Deno.env.delete("GITHUB_PRIVATE_KEY");

    const service = new GitHubClientService();
    const credentials = service.getCredentials();

    assertEquals(credentials, null);
  });
});

// ============================================================================
// Tests for validateConfiguration
// ============================================================================

Deno.test("validateConfiguration - returns valid when credentials present", async () => {
  await withEnvState(["GITHUB_APP_ID", "GITHUB_PRIVATE_KEY"], () => {
    Deno.env.set("GITHUB_APP_ID", "test-app-id");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-private-key");

    const service = new GitHubClientService();
    const result = service.validateConfiguration();

    assertEquals(result.valid, true);
    assertEquals(result.error, undefined);
  });
});

Deno.test("validateConfiguration - returns invalid with error when missing", async () => {
  await withEnvState(["GITHUB_APP_ID", "GITHUB_PRIVATE_KEY"], () => {
    Deno.env.delete("GITHUB_APP_ID");
    Deno.env.delete("GITHUB_PRIVATE_KEY");

    const service = new GitHubClientService();
    const result = service.validateConfiguration();

    assertEquals(result.valid, false);
    assertEquals(result.error, "GitHub App configuration missing");
  });
});

Deno.test("validateConfiguration - returns invalid when app ID missing", async () => {
  await withEnvState(["GITHUB_APP_ID", "GITHUB_PRIVATE_KEY"], () => {
    Deno.env.delete("GITHUB_APP_ID");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-private-key");

    const service = new GitHubClientService();
    const result = service.validateConfiguration();

    assertEquals(result.valid, false);
    assertEquals(result.error, "GitHub App configuration missing");
  });
});

Deno.test("validateConfiguration - returns invalid when private key missing", async () => {
  await withEnvState(["GITHUB_APP_ID", "GITHUB_PRIVATE_KEY"], () => {
    Deno.env.set("GITHUB_APP_ID", "test-app-id");
    Deno.env.delete("GITHUB_PRIVATE_KEY");

    const service = new GitHubClientService();
    const result = service.validateConfiguration();

    assertEquals(result.valid, false);
    assertEquals(result.error, "GitHub App configuration missing");
  });
});

// ============================================================================
// Tests for getAuthenticatedOctokit
// ============================================================================

Deno.test("getAuthenticatedOctokit - throws when credentials missing", async () => {
  await withEnvState(["GITHUB_APP_ID", "GITHUB_PRIVATE_KEY"], async () => {
    Deno.env.delete("GITHUB_APP_ID");
    Deno.env.delete("GITHUB_PRIVATE_KEY");

    const service = new GitHubClientService();
    const session = createTestUserSession();

    await assertRejects(
      async () => {
        await service.getAuthenticatedOctokit(session);
      },
      Error,
      "GitHub App configuration missing"
    );
  });
});


