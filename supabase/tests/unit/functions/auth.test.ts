/**
 * Tests for authentication edge function handlers
 *
 * Tests GitHub App installation, callback handling, session management, and logout
 */

import { assertEquals, assert } from 'jsr:@std/assert@1.0.16';
import { stub } from 'jsr:@std/testing@1.0.16/mock';
import {
  handleInstall,
  handleCallback,
  handleGetSession,
  handleLogout,
} from '../../../functions/auth/index.ts';
import {
  createTestGitHubInstallation,
  createTestRepositoryFork,
  createTestUserSession,
  createMockRequest,
  restoreEnvState,
  saveEnvState,
} from './_shared/test-utils.ts';
import type { GitHubInstallation } from '../../../functions/_shared/types.ts';
import * as githubApp from '../../../functions/_shared/github-app.ts';
import * as repository from '../../../functions/_shared/repository.ts';
import * as auth from '../../../functions/_shared/auth.ts';

// ============================================================================
// Tests for handleInstall
// ============================================================================

Deno.test('handleInstall - redirects to GitHub App installation URL', () => {
  const saved = saveEnvState(['GITHUB_CLIENT_ID']);
  try {
    Deno.env.set('GITHUB_CLIENT_ID', 'test-client-id');
    const req = createMockRequest({ method: 'GET', url: 'https://example.com' });

    const response = handleInstall(req);

    assertEquals(response.status, 302);
    const location = response.headers.get('Location');
    assert(location !== null);
    assert(location.includes('github.com/apps/faasr/installations/new'));
    assert(location.includes('state=install'));
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test('handleInstall - returns error when client ID is missing', async () => {
  const saved = saveEnvState(['GITHUB_CLIENT_ID']);
  try {
    Deno.env.delete('GITHUB_CLIENT_ID');
    const req = createMockRequest({ method: 'GET', url: 'https://example.com' });

    const response = handleInstall(req);

    assertEquals(response.status, 500);
    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(body.error, 'GitHub App client ID not configured');
  } finally {
    restoreEnvState(saved);
  }
});

// ============================================================================
// Tests for handleCallback
// ============================================================================

Deno.test('handleCallback - returns error when installation_id is missing', async () => {
  const req = createMockRequest({
    method: 'GET',
    url: 'https://example.com/auth/callback',
  });

  const response = await handleCallback(req);

  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.success, false);
  assertEquals(body.error, 'Missing installation_id parameter');
});

Deno.test('handleCallback - returns error when GitHub App config is missing', async () => {
  const saved = saveEnvState(['GITHUB_APP_ID', 'GITHUB_PRIVATE_KEY']);
  try {
    Deno.env.delete('GITHUB_APP_ID');
    Deno.env.delete('GITHUB_PRIVATE_KEY');

    const req = createMockRequest({
      method: 'GET',
      url: 'https://example.com/auth/callback?installation_id=123456',
    });

    const response = await handleCallback(req);

    assertEquals(response.status, 500);
    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(body.error, 'GitHub App configuration missing');
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test('handleCallback - successful installation flow', async () => {
  const saved = saveEnvState([
    'GITHUB_APP_ID',
    'GITHUB_PRIVATE_KEY',
    'JWT_SECRET',
  ]);
  
  // Create mock data
  const mockInstallation: GitHubInstallation = createTestGitHubInstallation();
  const mockFork = createTestRepositoryFork();
  const mockToken = 'mock-installation-token';

  // Create stubs for all the imported functions
  const getInstallationStub = stub(
    githubApp,
    'getInstallation',
    () => Promise.resolve(mockInstallation),
  );

  const checkPermissionsStub = stub(
    githubApp,
    'checkInstallationPermissions',
    () => Promise.resolve({ valid: true, missingPermissions: [] }),
  );

  const getTokenStub = stub(
    githubApp,
    'getInstallationToken',
    () => Promise.resolve({ token: mockToken, expiresAt: new Date().toISOString() }),
  );

  const ensureForkStub = stub(
    repository,
    'ensureForkExists',
    () => Promise.resolve(mockFork),
  );

  const createSessionTokenStub = stub(
    auth,
    'createSessionToken',
    () => 'mock-session-token',
  );

  const createSessionCookieStub = stub(
    auth,
    'createSessionCookie',
    () => 'faasr_session=mock-session-token; Path=/; HttpOnly; SameSite=Lax',
  );

  try {
    Deno.env.set('GITHUB_APP_ID', 'test-app-id');
    Deno.env.set(
      'GITHUB_PRIVATE_KEY',
      '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----',
    );
    Deno.env.set('JWT_SECRET', 'test-secret-key');

    const req = createMockRequest({
      method: 'GET',
      url: 'https://example.com/auth/callback?installation_id=123456',
    });

    const response = await handleCallback(req);

    // Verify successful response
    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.success, true);
    assertEquals(body.message, 'Installation successful');
    assertEquals(body.user.login, mockInstallation.account.login);
    assertEquals(body.user.id, mockInstallation.account.id);
    assertEquals(body.fork.owner, mockFork.owner);
    assertEquals(body.fork.repoName, mockFork.repoName);

    // Verify Set-Cookie header is present
    const setCookie = response.headers.get('Set-Cookie');
    assert(setCookie !== null);
    assert(setCookie.includes('faasr_session='));

    // Verify stubs were called
    assertEquals(getInstallationStub.calls.length, 1);
    assertEquals(checkPermissionsStub.calls.length, 1);
    assertEquals(getTokenStub.calls.length, 1);
    assertEquals(ensureForkStub.calls.length, 1);
    assertEquals(createSessionTokenStub.calls.length, 1);
    assertEquals(createSessionCookieStub.calls.length, 1);
  } finally {
    // Restore all stubs
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    getTokenStub.restore();
    ensureForkStub.restore();
    createSessionTokenStub.restore();
    createSessionCookieStub.restore();
    restoreEnvState(saved);
  }
});

Deno.test('handleCallback - handles rate limit errors', async () => {
  const saved = saveEnvState(['GITHUB_APP_ID', 'GITHUB_PRIVATE_KEY']);
  
  // Stub getInstallation to throw a rate limit error
  const getInstallationStub = stub(
    githubApp,
    'getInstallation',
    () => Promise.reject(new Error('API rate limit exceeded')),
  );

  try {
    Deno.env.set('GITHUB_APP_ID', 'test-app-id');
    Deno.env.set(
      'GITHUB_PRIVATE_KEY',
      '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----',
    );

    const req = createMockRequest({
      method: 'GET',
      url: 'https://example.com/auth/callback?installation_id=123456',
    });

    const response = await handleCallback(req);

    // Should return an error response with user-friendly message
    assertEquals(response.status, 500);
    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(
      body.error,
      'Too many requests. Please try again in a few minutes.',
    );
  } finally {
    getInstallationStub.restore();
    restoreEnvState(saved);
  }
});

Deno.test('handleCallback - handles permission errors', async () => {
  const saved = saveEnvState(['GITHUB_APP_ID', 'GITHUB_PRIVATE_KEY']);
  
  const mockInstallation: GitHubInstallation = createTestGitHubInstallation();
  
  const getInstallationStub = stub(
    githubApp,
    'getInstallation',
    () => Promise.resolve(mockInstallation),
  );

  const checkPermissionsStub = stub(
    githubApp,
    'checkInstallationPermissions',
    () => Promise.resolve({
      valid: false,
      missingPermissions: ['contents:write', 'actions:write'],
    }),
  );

  try {
    Deno.env.set('GITHUB_APP_ID', 'test-app-id');
    Deno.env.set(
      'GITHUB_PRIVATE_KEY',
      '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----',
    );

    const req = createMockRequest({
      method: 'GET',
      url: 'https://example.com/auth/callback?installation_id=123456',
    });

    const response = await handleCallback(req);

    // Should return permission error
    assertEquals(response.status, 403);
    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(body.error, 'Missing required permissions');
    assertEquals(body.details, ['contents:write', 'actions:write']);
  } finally {
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    restoreEnvState(saved);
  }
});

// ============================================================================
// Tests for handleGetSession
// ============================================================================

Deno.test('handleGetSession - returns unauthenticated when no session', async () => {
  const req = createMockRequest({
    method: 'GET',
    url: 'https://example.com/auth/session',
  });

  const response = handleGetSession(req);

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.authenticated, false);
});

Deno.test('handleGetSession - returns authenticated user when session exists', async () => {
  const saved = saveEnvState(['JWT_SECRET']);
  try {
    Deno.env.set('JWT_SECRET', 'test-secret-key');

    const session = createTestUserSession();
    const { jwt } = await import('../../../functions/_shared/deps.ts');
    const token = jwt.sign(
      {
        installationId: session.installationId,
        userLogin: session.userLogin,
        userId: session.userId,
        avatarUrl: session.avatarUrl,
      },
      'test-secret-key',
      { algorithm: 'HS256', expiresIn: '24h' },
    );

    const req = createMockRequest({
      method: 'GET',
      url: 'https://example.com/auth/session',
      headers: {
        cookie: `faasr_session=${encodeURIComponent(token)}`,
      },
    });

    const response = handleGetSession(req);

    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.authenticated, true);
    assert(body.user !== undefined);
    assertEquals(body.user.login, session.userLogin);
    assertEquals(body.user.id, session.userId);
    assertEquals(body.user.avatarUrl, session.avatarUrl);
  } finally {
    restoreEnvState(saved);
  }
});

// ============================================================================
// Tests for handleLogout
// ============================================================================

Deno.test('handleLogout - clears session cookie and returns success', async () => {
  const req = createMockRequest({
    method: 'POST',
    url: 'https://example.com/auth/logout',
  });

  const response = handleLogout(req);

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.success, true);
  assertEquals(body.message, 'Logged out successfully');

  // Check that Set-Cookie header is present
  const setCookie = response.headers.get('Set-Cookie');
  assert(setCookie !== null);
  assert(setCookie.includes('faasr_session='));
  assert(setCookie.includes('Max-Age=0') || setCookie.includes('Expires='));
});

Deno.test('handleLogout - works with any request', async () => {
  const req = createMockRequest({
    method: 'POST',
    url: 'https://example.com/auth/logout',
    headers: {
      cookie: 'faasr_session=some-token',
    },
  });

  const response = handleLogout(req);

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.success, true);
});

