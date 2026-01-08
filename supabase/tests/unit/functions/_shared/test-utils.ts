// deno-coverage-ignore-file

/**
 * Shared test utilities and mock factories
 *
 * Provides reusable mocks and utilities for testing Supabase Edge Functions
 */

import { App, Octokit } from '../../../../functions/_shared/deps.ts';
import type {
  GitHubInstallation,
  RepositoryFork,
  UserSession,
} from '../../../../functions/_shared/types.ts';

// ============================================================================
// 1. Octokit Mock Factory
// ============================================================================

export interface MockOctokitConfig {
  repos?: {
    get?: (params: { owner: string; repo: string }) =>
      | Promise<{
        data: {
          fork?: boolean;
          parent?: { owner: { login: string }; name: string };
          html_url?: string;
          default_branch?: string;
          created_at?: string;
        };
      }>
      | {
        data: {
          fork?: boolean;
          parent?: { owner: { login: string }; name: string };
          html_url?: string;
          default_branch?: string;
          created_at?: string;
        };
      };
    createFork?: (params: { owner: string; repo: string }) =>
      | Promise<{
        data: {
          fork: boolean;
          parent: { owner: { login: string }; name: string };
          html_url: string;
          default_branch: string;
          created_at: string;
        };
      }>
      | {
        data: {
          fork: boolean;
          parent: { owner: { login: string }; name: string };
          html_url: string;
          default_branch: string;
          created_at: string;
        };
      };
    getContent?: (params: {
      owner: string;
      repo: string;
      path: string;
      ref?: string;
    }) => Promise<{ data: { sha: string } }> | { data: { sha: string } };
    createOrUpdateFileContents?: (params: {
      owner: string;
      repo: string;
      path: string;
      message: string;
      content: string;
      branch: string;
      sha?: string;
    }) => Promise<{ data: { commit: { sha: string } } }> | {
      data: { commit: { sha: string } };
    };
  };
  actions?: {
    createWorkflowDispatch?: (params: {
      owner: string;
      repo: string;
      workflow_id: string;
      ref: string;
      inputs?: Record<string, string>;
    }) => Promise<void> | void;
    getWorkflowRun?: (params: {
      owner: string;
      repo: string;
      run_id: number;
    }) =>
      | Promise<{
        data: {
          status: string;
          conclusion: string | null;
          html_url: string;
          created_at: string;
        };
      }>
      | {
        data: {
          status: string;
          conclusion: string | null;
          html_url: string;
          created_at: string;
        };
      };
    listWorkflowRuns?: (params: {
      owner: string;
      repo: string;
      workflow_id: string;
      per_page?: number;
    }) =>
      | Promise<{
        data: {
          workflow_runs: Array<{
            id: number;
            html_url: string;
            status: string;
            conclusion: string | null;
            created_at: string;
          }>;
        };
      }>
      | {
        data: {
          workflow_runs: Array<{
            id: number;
            html_url: string;
            status: string;
            conclusion: string | null;
            created_at: string;
          }>;
        };
      };
  };
  auth?: () => Promise<{ token: string; expiresAt: string }> | {
    token: string;
    expiresAt: string;
  };
  request?: (route: string, options?: Record<string, unknown>) =>
    | Promise<{
      data: unknown;
    }>
    | { data: unknown };
}

export interface MockOctokitCallTracker {
  repos: {
    get: number;
    createFork: number;
    getContent: number;
    createOrUpdateFileContents: number;
  };
  actions: {
    createWorkflowDispatch: number;
    getWorkflowRun: number;
    listWorkflowRuns: number;
  };
  auth: number;
  request: number;
}

export function createMockOctokit(
  config: MockOctokitConfig = {},
): { octokit: Octokit; tracker: MockOctokitCallTracker } {
  const tracker: MockOctokitCallTracker = {
    repos: {
      get: 0,
      createFork: 0,
      getContent: 0,
      createOrUpdateFileContents: 0,
    },
    actions: {
      createWorkflowDispatch: 0,
      getWorkflowRun: 0,
      listWorkflowRuns: 0,
    },
    auth: 0,
    request: 0,
  };

  const mockOctokit = {
    rest: {
      repos: {
        get: async (params: { owner: string; repo: string }) => {
          tracker.repos.get++;
          if (config.repos?.get) {
            const result = config.repos.get(params);
            return result instanceof Promise ? await result : result;
          }
          throw { status: 404 };
        },
        createFork: async (params: { owner: string; repo: string }) => {
          tracker.repos.createFork++;
          if (config.repos?.createFork) {
            const result = config.repos.createFork(params);
            return result instanceof Promise ? await result : result;
          }
          throw { status: 404 };
        },
        getContent: async (params: {
          owner: string;
          repo: string;
          path: string;
          ref?: string;
        }) => {
          tracker.repos.getContent++;
          if (config.repos?.getContent) {
            const result = config.repos.getContent(params);
            return result instanceof Promise ? await result : result;
          }
          throw { status: 404 };
        },
        createOrUpdateFileContents: async (params: {
          owner: string;
          repo: string;
          path: string;
          message: string;
          content: string;
          branch: string;
          sha?: string;
        }) => {
          tracker.repos.createOrUpdateFileContents++;
          if (config.repos?.createOrUpdateFileContents) {
            const result = config.repos.createOrUpdateFileContents(params);
            return result instanceof Promise ? await result : result;
          }
          throw { status: 500 };
        },
      },
      actions: {
        createWorkflowDispatch: async (params: {
          owner: string;
          repo: string;
          workflow_id: string;
          ref: string;
          inputs?: Record<string, string>;
        }) => {
          tracker.actions.createWorkflowDispatch++;
          if (config.actions?.createWorkflowDispatch) {
            const result = config.actions.createWorkflowDispatch(params);
            return result instanceof Promise ? await result : result;
          }
        },
        getWorkflowRun: async (params: {
          owner: string;
          repo: string;
          run_id: number;
        }) => {
          tracker.actions.getWorkflowRun++;
          if (config.actions?.getWorkflowRun) {
            const result = config.actions.getWorkflowRun(params);
            return result instanceof Promise ? await result : result;
          }
          throw { status: 404 };
        },
        listWorkflowRuns: async (params: {
          owner: string;
          repo: string;
          workflow_id: string;
          per_page?: number;
        }) => {
          tracker.actions.listWorkflowRuns++;
          if (config.actions?.listWorkflowRuns) {
            const result = config.actions.listWorkflowRuns(params);
            return result instanceof Promise ? await result : result;
          }
          return {
            data: {
              workflow_runs: [],
            },
          };
        },
      },
    },
    auth: async () => {
      tracker.auth++;
      if (config.auth) {
        const result = config.auth();
        return result instanceof Promise ? await result : result;
      }
      return { token: 'mock-token', expiresAt: new Date().toISOString() };
    },
    request: async (route: string, options?: Record<string, unknown>) => {
      tracker.request++;
      if (config.request) {
        const result = config.request(route, options);
        return result instanceof Promise ? await result : result;
      }
      return { data: {} };
    },
  } as unknown as Octokit;

  return { octokit: mockOctokit, tracker };
}

// ============================================================================
// 2. GitHub App Mock Factory
// ============================================================================

export interface MockAppConfig {
  getInstallationOctokit?: (
    installationId: number,
  ) => Promise<Octokit> | Octokit;
  auth?: () => Promise<{ token: string; expiresAt: string }> | {
    token: string;
    expiresAt: string;
  };
}

export function createMockApp(
  config: MockAppConfig = {},
): App {
  const mockApp = {
    getInstallationOctokit: async (installationId: number) => {
      if (config.getInstallationOctokit) {
        const result = config.getInstallationOctokit(installationId);
        return result instanceof Promise ? await result : result;
      }
      // Default: return a basic mock Octokit
      const { octokit } = createMockOctokit();
      return octokit;
    },
    auth: async () => {
      if (config.auth) {
        const result = config.auth();
        return result instanceof Promise ? await result : result;
      }
      return { token: 'mock-token', expiresAt: new Date().toISOString() };
    },
  } as unknown as App;

  return mockApp;
}

// ============================================================================
// 3. JWT Mock Utilities
// ============================================================================

export interface MockJWTConfig {
  sign?: (payload: unknown, secret: string, options?: unknown) => string;
  verify?: (
    token: string,
    secret: string,
    options?: unknown,
  ) => unknown | null;
}

let jwtMocks: MockJWTConfig = {};

export function setupJWTMocks(config: MockJWTConfig): void {
  jwtMocks = config;
}

export function resetJWTMocks(): void {
  jwtMocks = {};
}

export function getJWTMocks(): MockJWTConfig {
  return jwtMocks;
}

// ============================================================================
// 4. Environment Variable Mocking
// ============================================================================

export interface EnvState {
  [key: string]: string | undefined;
}

export function saveEnvState(keys: string[]): EnvState {
  const state: EnvState = {};
  for (const key of keys) {
    state[key] = Deno.env.get(key);
  }
  return state;
}

export function restoreEnvState(state: EnvState): void {
  for (const [key, value] of Object.entries(state)) {
    if (value !== undefined) {
      Deno.env.set(key, value);
    } else {
      Deno.env.delete(key);
    }
  }
}

export async function withEnvState<T>(
  keys: string[],
  fn: () => T | Promise<T>,
): Promise<T> {
  const saved = saveEnvState(keys);
  try {
    return await fn();
  } finally {
    restoreEnvState(saved);
  }
}

// ============================================================================
// 6. Test Data Factories
// ============================================================================

export function createTestGitHubInstallation(
  overrides?: Partial<GitHubInstallation>,
): GitHubInstallation {
  return {
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
    ...overrides,
  };
}

export function createTestRepositoryFork(
  overrides?: Partial<RepositoryFork>,
): RepositoryFork {
  return {
    owner: 'testuser',
    repoName: 'FaaSr-workflow',
    forkUrl: 'https://github.com/testuser/FaaSr-workflow',
    forkStatus: 'exists',
    defaultBranch: 'main',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createTestUserSession(
  overrides?: Partial<UserSession>,
): UserSession {
  return {
    installationId: '123456',
    userLogin: 'testuser',
    userId: 1,
    avatarUrl: 'https://github.com/images/error/testuser_happy.gif',
    jwtToken: 'mock-jwt-token',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

// ============================================================================
// 7. GitHub Client Service Mock Factory
// ============================================================================

import { GitHubClientService } from '../../../../functions/_shared/github-client.ts';

export interface MockGitHubClientServiceConfig {
  getCredentials?: () => { appId: string; privateKey: string } | null;
  validateConfiguration?: () => { valid: boolean; error?: string };
  getAuthenticatedOctokit?: (session: UserSession) => Promise<Octokit>;
}

export function createMockGitHubClientService(
  config: MockGitHubClientServiceConfig = {},
): GitHubClientService {
  const mockService = {
    getCredentials: () => {
      if (config.getCredentials) {
        return config.getCredentials();
      }
      return { appId: 'test-app-id', privateKey: 'test-private-key' };
    },
    validateConfiguration: () => {
      if (config.validateConfiguration) {
        return config.validateConfiguration();
      }
      return { valid: true };
    },
    getAuthenticatedOctokit: async (session: UserSession) => {
      if (config.getAuthenticatedOctokit) {
        return await config.getAuthenticatedOctokit(session);
      }
      const { octokit } = createMockOctokit();
      return octokit;
    },
  } as unknown as GitHubClientService;

  return mockService;
}

// ============================================================================
// 8. Workflow Upload Service Mock Factory
// ============================================================================

import { WorkflowUploadService } from '../../../../functions/_shared/workflow-upload-service.ts';

export interface MockWorkflowUploadServiceConfig {
  validateFile?: (
    fileName: string,
    fileContent: string,
    fileSize: number,
  ) => { valid: boolean; errors: string[]; sanitizedFileName: string };
  uploadWorkflow?: (
    session: UserSession,
    file: File,
    fileName: string,
  ) => Promise<{ fileName: string; commitSha: string }>;
  triggerRegistration?: (
    session: UserSession,
    fileName: string,
  ) => Promise<{ workflowRunId?: number; workflowRunUrl?: string }>;
}

export function createMockWorkflowUploadService(
  config: MockWorkflowUploadServiceConfig = {},
): WorkflowUploadService {
  const mockService = {
    validateFile: (
      fileName: string,
      fileContent: string,
      fileSize: number,
    ) => {
      if (config.validateFile) {
        return config.validateFile(fileName, fileContent, fileSize);
      }
      return {
        valid: true,
        errors: [],
        sanitizedFileName: fileName,
      };
    },
    uploadWorkflow: async (
      session: UserSession,
      file: File,
      fileName: string,
    ) => {
      if (config.uploadWorkflow) {
        return await config.uploadWorkflow(session, file, fileName);
      }
      return {
        fileName: 'test-workflow.json',
        commitSha: 'abc123',
      };
    },
    triggerRegistration: async (
      session: UserSession,
      fileName: string,
    ) => {
      if (config.triggerRegistration) {
        return await config.triggerRegistration(session, fileName);
      }
      return {
        workflowRunId: 123,
        workflowRunUrl: 'https://github.com/test/workflows/runs/123',
      };
    },
  } as unknown as WorkflowUploadService;

  return mockService;
}

// ============================================================================
// 9. Workflow Status Service Mock Factory
// ============================================================================

import { WorkflowStatusService } from '../../../../functions/_shared/workflow-status-service.ts';

export interface MockWorkflowStatusServiceConfig {
  getWorkflowStatus?: (
    session: UserSession,
    fileName: string,
  ) => Promise<{
    fileName: string;
    status: 'pending' | 'running' | 'success' | 'failed';
    workflowRunId: number;
    workflowRunUrl: string;
    errorMessage?: string | null;
    triggeredAt: string;
    completedAt: string | null;
  }>;
}

export function createMockWorkflowStatusService(
  config: MockWorkflowStatusServiceConfig = {},
): WorkflowStatusService {
  const mockService = {
    getWorkflowStatus: async (session: UserSession, fileName: string) => {
      if (config.getWorkflowStatus) {
        return await config.getWorkflowStatus(session, fileName);
      }
      return {
        fileName: 'test-workflow.json',
        status: 'success' as const,
        workflowRunId: 123,
        workflowRunUrl: 'https://github.com/test/workflows/runs/123',
        errorMessage: null,
        triggeredAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
    },
  } as unknown as WorkflowStatusService;

  return mockService;
}

// ============================================================================
// 10. Supabase Auth Mocks
// ============================================================================

export {
  createMockSupabaseAdmin,
  createMockSupabaseClient,
} from './supabase-auth-mocks.ts';

// ============================================================================
// 11. Request Mock Factory
// ============================================================================

export interface MockRequestConfig {
  method?: string;
  url?: string;
  headers?: Headers | Record<string, string>;
  body?: BodyInit | null;
}

export function createMockRequest(
  config: MockRequestConfig = {},
): Request {
  const method = config.method || 'GET';
  const url = config.url || 'https://example.com';
  const headers = config.headers || {};

  let headersObj: Headers;
  if (headers instanceof Headers) {
    headersObj = headers;
  } else {
    headersObj = new Headers();
    for (const [key, value] of Object.entries(headers)) {
      headersObj.set(key, value);
    }
  }

  return new Request(url, {
    method,
    headers: headersObj,
    body: config.body,
  });
}
