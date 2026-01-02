/**
 * Tests for GitHub App utilities
 *
 * Tests permission validation, JWT generation, and installation token management
 */

import { assertEquals, assert } from "jsr:@std/assert@1.0.16";
import {
  validateInstallationPermissions,
  REQUIRED_PERMISSIONS,
} from "../../../functions/_shared/github-app.ts";
import type { GitHubInstallation } from "../../../functions/_shared/types.ts";

Deno.test("validateInstallationPermissions - valid permissions", () => {
  const installation: GitHubInstallation = {
    id: 123456,
    account: {
      login: "testuser",
      id: 1,
      avatar_url: "https://github.com/images/error/testuser_happy.gif",
    },
    permissions: {
      contents: "write",
      actions: "write",
      metadata: "read",
    },
  };

  const result = validateInstallationPermissions(installation);

  assertEquals(result.valid, true);
  assertEquals(result.missingPermissions, []);
});

Deno.test(
  "validateInstallationPermissions - missing contents permission",
  () => {
    const installation: GitHubInstallation = {
      id: 123456,
      account: {
        login: "testuser",
        id: 1,
        avatar_url: "https://github.com/images/error/testuser_happy.gif",
      },
      permissions: {
        contents: "read", // Should be 'write'
        actions: "write",
        metadata: "read",
      },
    };

    const result = validateInstallationPermissions(installation);

    assertEquals(result.valid, false);
    assertEquals(result.missingPermissions, ["contents:write"]);
  }
);

Deno.test(
  "validateInstallationPermissions - missing actions permission",
  () => {
    const installation: GitHubInstallation = {
      id: 123456,
      account: {
        login: "testuser",
        id: 1,
        avatar_url: "https://github.com/images/error/testuser_happy.gif",
      },
      permissions: {
        contents: "write",
        actions: "read", // Should be 'write'
        metadata: "read",
      },
    };

    const result = validateInstallationPermissions(installation);

    assertEquals(result.valid, false);
    assertEquals(result.missingPermissions, ["actions:write"]);
  }
);

Deno.test(
  "validateInstallationPermissions - missing metadata permission",
  () => {
    const installation: GitHubInstallation = {
      id: 123456,
      account: {
        login: "testuser",
        id: 1,
        avatar_url: "https://github.com/images/error/testuser_happy.gif",
      },
      permissions: {
        contents: "write",
        actions: "write",
        // metadata missing
      },
    };

    const result = validateInstallationPermissions(installation);

    assertEquals(result.valid, false);
    assertEquals(result.missingPermissions, ["metadata:read"]);
  }
);

Deno.test("validateInstallationPermissions - missing all permissions", () => {
  const installation: GitHubInstallation = {
    id: 123456,
    account: {
      login: "testuser",
      id: 1,
      avatar_url: "https://github.com/images/error/testuser_happy.gif",
    },
    permissions: {},
  };

  const result = validateInstallationPermissions(installation);

  assertEquals(result.valid, false);
  assertEquals(result.missingPermissions.length, 3);
  assert(result.missingPermissions.includes("contents:write"));
  assert(result.missingPermissions.includes("actions:write"));
  assert(result.missingPermissions.includes("metadata:read"));
});

Deno.test("validateInstallationPermissions - no permissions object", () => {
  const installation: GitHubInstallation = {
    id: 123456,
    account: {
      login: "testuser",
      id: 1,
      avatar_url: "https://github.com/images/error/testuser_happy.gif",
    },
    // permissions missing entirely
  } as GitHubInstallation;

  const result = validateInstallationPermissions(installation);

  assertEquals(result.valid, false);
  assertEquals(result.missingPermissions.length, 3);
});

Deno.test("REQUIRED_PERMISSIONS constant", () => {
  assertEquals(REQUIRED_PERMISSIONS.contents, "write");
  assertEquals(REQUIRED_PERMISSIONS.actions, "write");
  assertEquals(REQUIRED_PERMISSIONS.metadata, "read");
});
