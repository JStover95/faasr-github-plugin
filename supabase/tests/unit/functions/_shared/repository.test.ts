/**
 * Tests for repository utilities (fork detection and creation)
 */

import { assertEquals, assertRejects } from 'jsr:@std/assert@1.0.16';
import {
  checkForkExists,
  createFork,
  ensureForkExists,
  pollUntilForkReady,
} from '../../../../functions/_shared/repository.ts';
import { createMockOctokit } from './test-utils.ts';

Deno.test('checkForkExists returns fork info when fork exists', async () => {
  const { octokit } = createMockOctokit({
    repos: {
      get: (params: { owner: string; repo: string }) => {
        if (params.owner === 'testuser' && params.repo === 'FaaSr-workflow') {
          return {
            data: {
              fork: true,
              parent: {
                owner: { login: 'FaaSr' },
                name: 'FaaSr-workflow',
              },
              html_url: 'https://github.com/testuser/FaaSr-workflow',
              default_branch: 'main',
              created_at: '2025-01-01T00:00:00Z',
            },
          };
        }
        throw { status: 404 };
      },
    },
  });

  const fork = await checkForkExists(octokit, 'testuser');

  assertEquals(fork !== null, true);
  if (fork) {
    assertEquals(fork.owner, 'testuser');
    assertEquals(fork.repoName, 'FaaSr-workflow');
    assertEquals(fork.forkStatus, 'exists');
  }
});

Deno.test('checkForkExists returns null when fork does not exist', async () => {
  const { octokit } = createMockOctokit({
    repos: {
      get: () => {
        throw { status: 404 };
      },
    },
  });

  const fork = await checkForkExists(octokit, 'nonexistentuser');

  assertEquals(fork, null);
});

Deno.test('createFork creates fork successfully', async () => {
  const { octokit } = createMockOctokit({
    repos: {
      get: (params: { owner: string; repo: string }) => {
        // After fork is created, get should return the fork (for polling)
        if (params.owner === 'testuser' && params.repo === 'FaaSr-workflow') {
          return {
            data: {
              fork: true,
              parent: {
                owner: { login: 'FaaSr' },
                name: 'FaaSr-workflow',
              },
              html_url: 'https://github.com/testuser/FaaSr-workflow',
              default_branch: 'main',
              created_at: '2025-01-01T00:00:00Z',
            },
          };
        }
        throw { status: 404 };
      },
      createFork: (params: { owner: string; repo: string }) => {
        if (params.owner === 'FaaSr' && params.repo === 'FaaSr-workflow') {
          return {
            data: {
              fork: true,
              parent: {
                owner: { login: 'FaaSr' },
                name: 'FaaSr-workflow',
              },
              html_url: 'https://github.com/testuser/FaaSr-workflow',
              default_branch: 'main',
              created_at: '2025-01-01T00:00:00Z',
            },
          };
        }
        throw { status: 404 };
      },
    },
  });

  const fork = await createFork(octokit, 'testuser');
  assertEquals(fork.owner, 'testuser');
  assertEquals(fork.repoName, 'FaaSr-workflow');
  assertEquals(fork.forkStatus, 'created');
});

Deno.test('ensureForkExists returns existing fork if it exists', async () => {
  const { octokit } = createMockOctokit({
    repos: {
      get: (params: { owner: string; repo: string }) => {
        if (params.owner === 'testuser' && params.repo === 'FaaSr-workflow') {
          return {
            data: {
              fork: true,
              parent: {
                owner: { login: 'FaaSr' },
                name: 'FaaSr-workflow',
              },
              html_url: 'https://github.com/testuser/FaaSr-workflow',
              default_branch: 'main',
              created_at: '2025-01-01T00:00:00Z',
            },
          };
        }
        throw { status: 404 };
      },
    },
  });

  const fork = await ensureForkExists(octokit, 'testuser');

  assertEquals(fork !== null, true);
  if (fork) {
    assertEquals(fork.owner, 'testuser');
  }
});

Deno.test('ensureForkExists creates fork if it does not exist', async () => {
  let checkCallCount = 0;
  const { octokit } = createMockOctokit({
    repos: {
      get: () => {
        checkCallCount++;
        if (checkCallCount === 1) {
          throw { status: 404 };
        }
        // After fork is created, return the fork
        return {
          data: {
            fork: true,
            parent: {
              owner: { login: 'FaaSr' },
              name: 'FaaSr-workflow',
            },
            html_url: 'https://github.com/newuser/FaaSr-workflow',
            default_branch: 'main',
            created_at: '2025-01-01T00:00:00Z',
          },
        };
      },
      createFork: () => {
        return {
          data: {
            fork: true,
            parent: {
              owner: { login: 'FaaSr' },
              name: 'FaaSr-workflow',
            },
            html_url: 'https://github.com/newuser/FaaSr-workflow',
            default_branch: 'main',
            created_at: '2025-01-01T00:00:00Z',
          },
        };
      },
    },
  });

  const fork = await ensureForkExists(octokit, 'newuser');
  assertEquals(fork.owner, 'newuser');
  assertEquals(fork.repoName, 'FaaSr-workflow');
});

// ============================================================================
// Tests for pollUntilForkReady
// ============================================================================

Deno.test('pollUntilForkReady - success on first attempt', async () => {
  const { octokit } = createMockOctokit({
    repos: {
      get: () => ({
        data: {
          fork: true,
          parent: {
            owner: { login: 'FaaSr' },
            name: 'FaaSr-workflow',
          },
          html_url: 'https://github.com/testuser/FaaSr-workflow',
          default_branch: 'main',
          created_at: '2025-01-01T00:00:00Z',
        },
      }),
    },
  });

  const fork = await pollUntilForkReady(octokit, 'testuser', 30, 1000);
  assertEquals(fork.owner, 'testuser');
  assertEquals(fork.repoName, 'FaaSr-workflow');
  assertEquals(fork.forkStatus, 'exists');
});

Deno.test('pollUntilForkReady - success after multiple attempts', async () => {
  let attemptCount = 0;
  const { octokit } = createMockOctokit({
    repos: {
      get: () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw { status: 404 };
        }
        return {
          data: {
            fork: true,
            parent: {
              owner: { login: 'FaaSr' },
              name: 'FaaSr-workflow',
            },
            html_url: 'https://github.com/testuser/FaaSr-workflow',
            default_branch: 'main',
            created_at: '2025-01-01T00:00:00Z',
          },
        };
      },
    },
  });

  const fork = await pollUntilForkReady(octokit, 'testuser', 5, 1);
  assertEquals(fork.owner, 'testuser');
  assertEquals(attemptCount, 3);
});

Deno.test('pollUntilForkReady - timeout after max attempts', async () => {
  const { octokit } = createMockOctokit({
    repos: {
      get: () => {
        throw { status: 404 };
      },
    },
  });

  await assertRejects(
    async () => {
      await pollUntilForkReady(octokit, 'testuser', 3, 1);
    },
    Error,
    'is not ready after 3 attempts',
  );
});

// ============================================================================
// Tests for checkForkExists error handling
// ============================================================================

Deno.test('checkForkExists - non-404 error throws', async () => {
  const { octokit } = createMockOctokit({
    repos: {
      get: () => {
        throw { status: 403 };
      },
    },
  });

  await assertRejects(
    async () => await checkForkExists(octokit, 'testuser'),
    Error,
    undefined,
    'Should throw on non-404 error',
  );
});

Deno.test('checkForkExists - 500 error throws', async () => {
  const { octokit } = createMockOctokit({
    repos: {
      get: () => {
        throw { status: 500 };
      },
    },
  });

  await assertRejects(
    async () => await checkForkExists(octokit, 'testuser'),
    Error,
    undefined,
    'Should throw on 500 error',
  );
});

Deno.test('checkForkExists - repository exists but not a fork', async () => {
  const { octokit } = createMockOctokit({
    repos: {
      get: () => ({
        data: {
          fork: false,
          html_url: 'https://github.com/testuser/FaaSr-workflow',
          default_branch: 'main',
        },
      }),
    },
  });

  const fork = await checkForkExists(octokit, 'testuser');
  assertEquals(fork, null);
});

Deno.test('checkForkExists - repository exists but wrong parent', async () => {
  const { octokit } = createMockOctokit({
    repos: {
      get: () => ({
        data: {
          fork: true,
          parent: {
            owner: { login: 'OtherOwner' },
            name: 'OtherRepo',
          },
          html_url: 'https://github.com/testuser/FaaSr-workflow',
          default_branch: 'main',
        },
      }),
    },
  });

  const fork = await checkForkExists(octokit, 'testuser');
  assertEquals(fork, null);
});

// ============================================================================
// Tests for createFork error handling
// ============================================================================

Deno.test('createFork - 403 error checks for existing fork', async () => {
  let checkCalled = false;
  const { octokit } = createMockOctokit({
    repos: {
      get: () => {
        checkCalled = true;
        return {
          data: {
            fork: true,
            parent: {
              owner: { login: 'FaaSr' },
              name: 'FaaSr-workflow',
            },
            html_url: 'https://github.com/testuser/FaaSr-workflow',
            default_branch: 'main',
            created_at: '2025-01-01T00:00:00Z',
          },
        };
      },
      createFork: () => {
        throw { status: 403 };
      },
    },
  });

  const fork = await createFork(octokit, 'testuser');
  assertEquals(fork.owner, 'testuser');
  assertEquals(checkCalled, true);
});

Deno.test('createFork - 500 error throws', async () => {
  const { octokit } = createMockOctokit({
    repos: {
      get: () => {
        throw { status: 404 };
      },
      createFork: () => {
        throw { status: 500 };
      },
    },
  });

  await assertRejects(
    async () => await createFork(octokit, 'testuser'),
    Error,
    undefined,
    'Should throw on 500 error',
  );
});

Deno.test('ensureForkExists - fork check fails with non-404 error', async () => {
  const { octokit } = createMockOctokit({
    repos: {
      get: () => {
        throw { status: 403 };
      },
      createFork: () => {
        return {
          data: {
            fork: true,
            parent: {
              owner: { login: 'FaaSr' },
              name: 'FaaSr-workflow',
            },
            html_url: 'https://github.com/testuser/FaaSr-workflow',
            default_branch: 'main',
            created_at: '2025-01-01T00:00:00Z',
          },
        };
      },
    },
  });

  // Should throw because checkForkExists throws on non-404
  await assertRejects(
    async () => await ensureForkExists(octokit, 'testuser'),
    Error,
    undefined,
    'Should throw when check fails with non-404',
  );
});
