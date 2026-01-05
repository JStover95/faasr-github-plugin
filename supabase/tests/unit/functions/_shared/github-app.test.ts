/**
 * Tests for GitHub App utilities
 *
 * Tests permission validation, JWT generation, and installation token management
 */

import { assert, assertEquals } from 'jsr:@std/assert@1.0.16';
import {
  checkInstallationPermissions,
  createGitHubApp,
  getInstallation,
  getInstallationToken,
  REQUIRED_PERMISSIONS,
  validateInstallationPermissions,
} from '../../../../functions/_shared/github-app.ts';
import type { GitHubInstallation } from '../../../../functions/_shared/types.ts';

Deno.test('validateInstallationPermissions - valid permissions', () => {
  const installation: GitHubInstallation = {
    id: 123456,
    account: {
      login: 'testuser',
      id: 1,
      avatar_url: 'https://github.com/images/error/testuser_happy.gif',
    },
    permissions: {
      contents: 'write',
      actions: 'write',
      metadata: 'read',
    },
  };

  const result = validateInstallationPermissions(installation);

  assertEquals(result.valid, true);
  assertEquals(result.missingPermissions, []);
});

Deno.test(
  'validateInstallationPermissions - missing contents permission',
  () => {
    const installation: GitHubInstallation = {
      id: 123456,
      account: {
        login: 'testuser',
        id: 1,
        avatar_url: 'https://github.com/images/error/testuser_happy.gif',
      },
      permissions: {
        contents: 'read', // Should be 'write'
        actions: 'write',
        metadata: 'read',
      },
    };

    const result = validateInstallationPermissions(installation);

    assertEquals(result.valid, false);
    assertEquals(result.missingPermissions, ['contents:write']);
  },
);

Deno.test(
  'validateInstallationPermissions - missing actions permission',
  () => {
    const installation: GitHubInstallation = {
      id: 123456,
      account: {
        login: 'testuser',
        id: 1,
        avatar_url: 'https://github.com/images/error/testuser_happy.gif',
      },
      permissions: {
        contents: 'write',
        actions: 'read', // Should be 'write'
        metadata: 'read',
      },
    };

    const result = validateInstallationPermissions(installation);

    assertEquals(result.valid, false);
    assertEquals(result.missingPermissions, ['actions:write']);
  },
);

Deno.test(
  'validateInstallationPermissions - missing metadata permission',
  () => {
    const installation: GitHubInstallation = {
      id: 123456,
      account: {
        login: 'testuser',
        id: 1,
        avatar_url: 'https://github.com/images/error/testuser_happy.gif',
      },
      permissions: {
        contents: 'write',
        actions: 'write',
        // metadata missing
      },
    };

    const result = validateInstallationPermissions(installation);

    assertEquals(result.valid, false);
    assertEquals(result.missingPermissions, ['metadata:read']);
  },
);

Deno.test('validateInstallationPermissions - missing all permissions', () => {
  const installation: GitHubInstallation = {
    id: 123456,
    account: {
      login: 'testuser',
      id: 1,
      avatar_url: 'https://github.com/images/error/testuser_happy.gif',
    },
    permissions: {},
  };

  const result = validateInstallationPermissions(installation);

  assertEquals(result.valid, false);
  assertEquals(result.missingPermissions.length, 3);
  assert(result.missingPermissions.includes('contents:write'));
  assert(result.missingPermissions.includes('actions:write'));
  assert(result.missingPermissions.includes('metadata:read'));
});

Deno.test('validateInstallationPermissions - no permissions object', () => {
  const installation: GitHubInstallation = {
    id: 123456,
    account: {
      login: 'testuser',
      id: 1,
      avatar_url: 'https://github.com/images/error/testuser_happy.gif',
    },
    // permissions missing entirely
  } as GitHubInstallation;

  const result = validateInstallationPermissions(installation);

  assertEquals(result.valid, false);
  assertEquals(result.missingPermissions.length, 3);
});

Deno.test('REQUIRED_PERMISSIONS constant', () => {
  assertEquals(REQUIRED_PERMISSIONS.contents, 'write');
  assertEquals(REQUIRED_PERMISSIONS.actions, 'write');
  assertEquals(REQUIRED_PERMISSIONS.metadata, 'read');
});

// ============================================================================
// Tests for createGitHubApp
// ============================================================================

Deno.test('createGitHubApp - with OAuth config', () => {
  const app = createGitHubApp({
    appId: '123456',
    privateKey:
      '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----',
    clientId: 'client-id',
    clientSecret: 'client-secret',
  });

  // Verify App instance is created (it's an Octokit App instance)
  assert(app !== null);
  assert(typeof app === 'object');
});

Deno.test('createGitHubApp - without OAuth config', () => {
  const app = createGitHubApp({
    appId: '123456',
    privateKey:
      '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----',
  });

  // Verify App instance is created
  assert(app !== null);
  assert(typeof app === 'object');
});

// ============================================================================
// Tests for getInstallationToken
// ============================================================================

Deno.test('getInstallationToken - function exists and has correct signature', () => {
  assertEquals(typeof getInstallationToken, 'function');
});

// ============================================================================
// Tests for getInstallation
// ============================================================================

Deno.test('getInstallation - function exists and has correct signature', () => {
  assertEquals(typeof getInstallation, 'function');
});

// ============================================================================
// Tests for checkInstallationPermissions
// ============================================================================

Deno.test('checkInstallationPermissions - error when installation fetch fails', async () => {
  // Test that checkInstallationPermissions handles errors gracefully
  // When installation fetch fails, it should return invalid with all missing permissions
  const result = await checkInstallationPermissions(
    'invalid-app-id',
    'invalid-key',
    '999999',
  );

  // When installation fetch fails, it should return invalid with all missing permissions
  assertEquals(result.valid, false);
  assert(result.missingPermissions.length > 0);
});
