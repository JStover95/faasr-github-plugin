/**
 * Tests for Workflow Status Service
 *
 * Tests workflow run status retrieval and formatting
 */

import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1.0.16';
import { WorkflowStatusService } from '../../../../functions/_shared/workflow-status-service.ts';
import {
  createMockGitHubClientService,
  createMockOctokit,
  createTestUserSession,
} from './test-utils.ts';

// ============================================================================
// Tests for getWorkflowStatus
// ============================================================================

Deno.test('getWorkflowStatus - validates configuration', async () => {
  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: false, error: 'Missing config' }),
  });
  const service = new WorkflowStatusService(githubClient);
  const session = createTestUserSession();

  await assertRejects(
    async () => {
      await service.getWorkflowStatus(session, 'test.json');
    },
    Error,
    'Missing config',
  );
});

Deno.test('getWorkflowStatus - sanitizes file name', async () => {
  const { octokit } = createMockOctokit({
    actions: {
      listWorkflowRuns: () => ({
        data: {
          workflow_runs: [
            {
              id: 123,
              html_url: 'https://github.com/test/workflows/runs/123',
              status: 'completed',
              conclusion: 'success',
              created_at: '2025-01-01T00:00:00Z',
            },
          ],
        },
      }),
      getWorkflowRun: () => ({
        data: {
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/test/workflows/runs/123',
          created_at: '2025-01-01T00:00:00Z',
        },
      }),
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowStatusService(githubClient);
  const session = createTestUserSession();

  const result = await service.getWorkflowStatus(session, '../test.json');

  // File name should be sanitized
  assert(!result.fileName.includes('../'));
});

Deno.test('getWorkflowStatus - lists workflow runs', async () => {
  let listCalled = false;
  const { octokit } = createMockOctokit({
    actions: {
      listWorkflowRuns: () => {
        listCalled = true;
        return {
          data: {
            workflow_runs: [
              {
                id: 123,
                html_url: 'https://github.com/test/workflows/runs/123',
                status: 'completed',
                conclusion: 'success',
                created_at: '2025-01-01T00:00:00Z',
              },
            ],
          },
        };
      },
      getWorkflowRun: () => ({
        data: {
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/test/workflows/runs/123',
          created_at: '2025-01-01T00:00:00Z',
        },
      }),
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowStatusService(githubClient);
  const session = createTestUserSession();

  await service.getWorkflowStatus(session, 'test.json');

  assertEquals(listCalled, true);
});

Deno.test('getWorkflowStatus - throws when no runs found', async () => {
  const { octokit } = createMockOctokit({
    actions: {
      listWorkflowRuns: () => ({
        data: { workflow_runs: [] },
      }),
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowStatusService(githubClient);
  const session = createTestUserSession();

  await assertRejects(
    async () => {
      await service.getWorkflowStatus(session, 'test.json');
    },
    Error,
    'Workflow run not found',
  );
});

Deno.test('getWorkflowStatus - gets run by ID', async () => {
  let getRunCalled = false;
  const { octokit } = createMockOctokit({
    actions: {
      listWorkflowRuns: () => ({
        data: {
          workflow_runs: [
            {
              id: 123,
              html_url: 'https://github.com/test/workflows/runs/123',
              status: 'completed',
              conclusion: 'success',
              created_at: '2025-01-01T00:00:00Z',
            },
          ],
        },
      }),
      getWorkflowRun: () => {
        getRunCalled = true;
        return {
          data: {
            status: 'completed',
            conclusion: 'success',
            html_url: 'https://github.com/test/workflows/runs/123',
            created_at: '2025-01-01T00:00:00Z',
          },
        };
      },
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowStatusService(githubClient);
  const session = createTestUserSession();

  await service.getWorkflowStatus(session, 'test.json');

  assertEquals(getRunCalled, true);
});

Deno.test('getWorkflowStatus - formats response correctly', async () => {
  const { octokit } = createMockOctokit({
    actions: {
      listWorkflowRuns: () => ({
        data: {
          workflow_runs: [
            {
              id: 123,
              html_url: 'https://github.com/test/workflows/runs/123',
              status: 'completed',
              conclusion: 'success',
              created_at: '2025-01-01T00:00:00Z',
            },
          ],
        },
      }),
      getWorkflowRun: () => ({
        data: {
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/test/workflows/runs/123',
          created_at: '2025-01-01T00:00:00Z',
        },
      }),
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowStatusService(githubClient);
  const session = createTestUserSession();

  const result = await service.getWorkflowStatus(session, 'test.json');

  assertEquals(result.fileName, 'test.json');
  assertEquals(result.status, 'success');
  assertEquals(result.workflowRunId, 123);
  assertEquals(
    result.workflowRunUrl,
    'https://github.com/test/workflows/runs/123',
  );
  assertEquals(result.errorMessage, null);
  assert(result.triggeredAt !== undefined);
  assert(result.completedAt !== null);
});

Deno.test('getWorkflowStatus - includes error message for failed runs', async () => {
  const { octokit } = createMockOctokit({
    actions: {
      listWorkflowRuns: () => ({
        data: {
          workflow_runs: [
            {
              id: 123,
              html_url: 'https://github.com/test/workflows/runs/123',
              status: 'completed',
              conclusion: 'failure',
              created_at: '2025-01-01T00:00:00Z',
            },
          ],
        },
      }),
      getWorkflowRun: () => ({
        data: {
          status: 'completed',
          conclusion: 'failure',
          html_url: 'https://github.com/test/workflows/runs/123',
          created_at: '2025-01-01T00:00:00Z',
        },
      }),
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowStatusService(githubClient);
  const session = createTestUserSession();

  const result = await service.getWorkflowStatus(session, 'test.json');

  assertEquals(result.status, 'failed');
  assertEquals(result.errorMessage, 'failure');
});

Deno.test('getWorkflowStatus - sets completedAt for completed runs', async () => {
  const { octokit } = createMockOctokit({
    actions: {
      listWorkflowRuns: () => ({
        data: {
          workflow_runs: [
            {
              id: 123,
              html_url: 'https://github.com/test/workflows/runs/123',
              status: 'completed',
              conclusion: 'success',
              created_at: '2025-01-01T00:00:00Z',
            },
          ],
        },
      }),
      getWorkflowRun: () => ({
        data: {
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/test/workflows/runs/123',
          created_at: '2025-01-01T00:00:00Z',
        },
      }),
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowStatusService(githubClient);
  const session = createTestUserSession();

  const result = await service.getWorkflowStatus(session, 'test.json');

  assert(result.completedAt !== null);
  assert(typeof result.completedAt === 'string');
});

Deno.test('getWorkflowStatus - sets completedAt to null for pending runs', async () => {
  const { octokit } = createMockOctokit({
    actions: {
      listWorkflowRuns: () => ({
        data: {
          workflow_runs: [
            {
              id: 123,
              html_url: 'https://github.com/test/workflows/runs/123',
              status: 'queued',
              conclusion: null,
              created_at: '2025-01-01T00:00:00Z',
            },
          ],
        },
      }),
      getWorkflowRun: () => ({
        data: {
          status: 'queued',
          conclusion: null,
          html_url: 'https://github.com/test/workflows/runs/123',
          created_at: '2025-01-01T00:00:00Z',
        },
      }),
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowStatusService(githubClient);
  const session = createTestUserSession();

  const result = await service.getWorkflowStatus(session, 'test.json');

  assertEquals(result.status, 'pending');
  assertEquals(result.completedAt, null);
});

Deno.test('getWorkflowStatus - throws on missing configuration', async () => {
  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: false, error: 'Config missing' }),
  });
  const service = new WorkflowStatusService(githubClient);
  const session = createTestUserSession();

  await assertRejects(
    async () => {
      await service.getWorkflowStatus(session, 'test.json');
    },
    Error,
    'Config missing',
  );
});
