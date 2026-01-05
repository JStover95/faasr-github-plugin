/**
 * Tests for workflows edge function handlers
 *
 * Tests workflow file upload, status retrieval, and FormData parsing
 */

import { assertEquals, assert } from 'jsr:@std/assert@1.0.16';
import { stub } from 'jsr:@std/testing@1.0.16/mock';
import {
  parseFormData,
  handleUpload,
  handleStatus,
  deps,
} from '../../../functions/workflows/index.ts';
import {
  createTestUserSession,
  createMockRequest,
  restoreEnvState,
  saveEnvState,
  createMockWorkflowUploadService,
  createMockWorkflowStatusService,
} from './_shared/test-utils.ts';

// ============================================================================
// Tests for parseFormData
// ============================================================================

Deno.test('parseFormData - extracts file and fileName from FormData', async () => {
  const formData = new FormData();
  const file = new File(['{"name": "test"}'], 'test-workflow.json', {
    type: 'application/json',
  });
  formData.append('file', file);

  const req = createMockRequest({
    method: 'POST',
    url: 'https://example.com/workflows/upload',
    body: formData,
  });

  const result = await parseFormData(req);

  assert(result.file !== null);
  assertEquals(result.fileName, 'test-workflow.json');
  assertEquals(result.file.name, 'test-workflow.json');
});

Deno.test('parseFormData - returns null when no file is present', async () => {
  const formData = new FormData();
  formData.append('other', 'value');

  const req = createMockRequest({
    method: 'POST',
    url: 'https://example.com/workflows/upload',
    body: formData,
  });

  const result = await parseFormData(req);

  assertEquals(result.file, null);
  assertEquals(result.fileName, null);
});

Deno.test('parseFormData - handles empty FormData', async () => {
  const formData = new FormData();

  const req = createMockRequest({
    method: 'POST',
    url: 'https://example.com/workflows/upload',
    body: formData,
  });

  const result = await parseFormData(req);

  assertEquals(result.file, null);
  assertEquals(result.fileName, null);
});

// ============================================================================
// Tests for handleUpload
// ============================================================================

Deno.test('handleUpload - returns auth error when no session', async () => {
  const req = createMockRequest({
    method: 'POST',
    url: 'https://example.com/workflows/upload',
  });

  const response = await handleUpload(req);

  assertEquals(response.status, 401);
  const body = await response.json();
  assertEquals(body.success, false);
  assertEquals(body.error, 'Authentication required');
});

Deno.test('handleUpload - returns validation error when file is missing', async () => {
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

    const formData = new FormData();

    const req = createMockRequest({
      method: 'POST',
      url: 'https://example.com/workflows/upload',
      headers: {
        cookie: `faasr_session=${encodeURIComponent(token)}`,
      },
      body: formData,
    });

    const response = await handleUpload(req);

    assertEquals(response.status, 400);
    const body = await response.json();
    assertEquals(body.success, false);
    assert(body.error.includes('File is required') || body.error.includes('required'));
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test('handleUpload - returns error when GitHub App config is missing', async () => {
  const saved = saveEnvState(['JWT_SECRET', 'GITHUB_APP_ID', 'GITHUB_PRIVATE_KEY']);
  try {
    Deno.env.set('JWT_SECRET', 'test-secret-key');
    Deno.env.delete('GITHUB_APP_ID');
    Deno.env.delete('GITHUB_PRIVATE_KEY');

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

    const formData = new FormData();
    const file = new File(['{"name": "test"}'], 'test-workflow.json');
    formData.append('file', file);

    const req = createMockRequest({
      method: 'POST',
      url: 'https://example.com/workflows/upload',
      headers: {
        cookie: `faasr_session=${encodeURIComponent(token)}`,
      },
      body: formData,
    });

    const response = await handleUpload(req);

    // Should return configuration error
    assertEquals(response.status, 500);
    const body = await response.json();
    assertEquals(body.success, false);
    assert(
      body.error.includes('GitHub App configuration missing') ||
        body.error.includes('configuration'),
    );
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test('handleUpload - handles validation errors from service', async () => {
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

    const formData = new FormData();
    // Create an invalid file (empty or malformed)
    const file = new File([''], 'invalid.json');
    formData.append('file', file);

    const req = createMockRequest({
      method: 'POST',
      url: 'https://example.com/workflows/upload',
      headers: {
        cookie: `faasr_session=${encodeURIComponent(token)}`,
      },
      body: formData,
    });

    const response = await handleUpload(req);

    // Should return validation error or configuration error
    assert(response.status >= 400);
    const body = await response.json();
    assertEquals(body.success, false);
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test('handleUpload - handles validation errors with specific format', async () => {
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

    const mockUploadService = createMockWorkflowUploadService({
      uploadWorkflow: () => {
        throw new Error('Invalid file: File too large, Invalid JSON format');
      },
    });

    const uploadServiceStub = stub(
      deps,
      'WorkflowUploadService',
      () => mockUploadService,
    );

    const githubClientStub = stub(
      deps,
      'GitHubClientService',
      () => ({} as unknown as InstanceType<typeof deps.GitHubClientService>),
    );

    try {
      const formData = new FormData();
      const file = new File(['{"invalid": json}'], 'test.json');
      formData.append('file', file);

      const req = createMockRequest({
        method: 'POST',
        url: 'https://example.com/workflows/upload',
        headers: {
          cookie: `faasr_session=${encodeURIComponent(token)}`,
        },
        body: formData,
      });

      const response = await handleUpload(req);

      assertEquals(response.status, 400);
      const body = await response.json();
      assertEquals(body.success, false);
      assertEquals(body.error, 'Invalid file');
      assert(Array.isArray(body.details));
    } finally {
      uploadServiceStub.restore();
      githubClientStub.restore();
    }
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test('handleStatus - handles not found errors with specific message', async () => {
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

    const mockStatusService = createMockWorkflowStatusService({
      getWorkflowStatus: () => {
        throw new Error('Workflow run not found');
      },
    });

    const statusServiceStub = stub(
      deps,
      'WorkflowStatusService',
      () => mockStatusService,
    );

    const githubClientStub = stub(
      deps,
      'GitHubClientService',
      () => ({} as unknown as InstanceType<typeof deps.GitHubClientService>),
    );

    try {
      const req = createMockRequest({
        method: 'GET',
        url: 'https://example.com/workflows/status/nonexistent.json',
        headers: {
          cookie: `faasr_session=${encodeURIComponent(token)}`,
        },
      });

      const response = await handleStatus(req, 'nonexistent.json');

      assertEquals(response.status, 404);
      const body = await response.json();
      assertEquals(body.success, false);
      assert(body.error.includes('Workflow run not found'));
    } finally {
      statusServiceStub.restore();
      githubClientStub.restore();
    }
  } finally {
    restoreEnvState(saved);
  }
});

// ============================================================================
// Tests for handleStatus
// ============================================================================

Deno.test('handleStatus - returns auth error when no session', async () => {
  const req = createMockRequest({
    method: 'GET',
    url: 'https://example.com/workflows/status/test.json',
  });

  const response = await handleStatus(req, 'test.json');

  assertEquals(response.status, 401);
  const body = await response.json();
  assertEquals(body.success, false);
  assertEquals(body.error, 'Authentication required');
});

Deno.test('handleStatus - returns error when GitHub App config is missing', async () => {
  const saved = saveEnvState(['JWT_SECRET', 'GITHUB_APP_ID', 'GITHUB_PRIVATE_KEY']);
  try {
    Deno.env.set('JWT_SECRET', 'test-secret-key');
    Deno.env.delete('GITHUB_APP_ID');
    Deno.env.delete('GITHUB_PRIVATE_KEY');

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
      url: 'https://example.com/workflows/status/test.json',
      headers: {
        cookie: `faasr_session=${encodeURIComponent(token)}`,
      },
    });

    const response = await handleStatus(req, 'test.json');

    // Should return configuration error
    assertEquals(response.status, 500);
    const body = await response.json();
    assertEquals(body.success, false);
    assert(
      body.error.includes('GitHub App configuration missing') ||
        body.error.includes('configuration'),
    );
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test('handleStatus - handles not found errors', async () => {
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
      url: 'https://example.com/workflows/status/nonexistent.json',
      headers: {
        cookie: `faasr_session=${encodeURIComponent(token)}`,
      },
    });

    const response = await handleStatus(req, 'nonexistent.json');

    // Should return not found error or configuration error
    assert(response.status >= 400);
    const body = await response.json();
    assertEquals(body.success, false);
  } finally {
    restoreEnvState(saved);
  }
});

// ============================================================================
// Success path tests for handleUpload
// ============================================================================

Deno.test('handleUpload - successful upload with valid workflow file', async () => {
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

    const mockUploadService = createMockWorkflowUploadService({
      uploadWorkflow: async () => await Promise.resolve({
        fileName: 'test-workflow.json',
        commitSha: 'abc123def456',
      }),
      triggerRegistration: async () => await Promise.resolve({
        workflowRunId: 12345,
        workflowRunUrl: 'https://github.com/test/workflows/runs/12345',
      }),
    });

    // Stub the service constructor
    const uploadServiceStub = stub(
      deps,
      'WorkflowUploadService',
      () => mockUploadService,
    );

    const githubClientStub = stub(
      deps,
      'GitHubClientService',
      () => ({} as unknown as InstanceType<typeof deps.GitHubClientService>),
    );

    try {
      const formData = new FormData();
      const file = new File(['{"name": "test-workflow"}'], 'test-workflow.json', {
        type: 'application/json',
      });
      formData.append('file', file);

      const req = createMockRequest({
        method: 'POST',
        url: 'https://example.com/workflows/upload',
        headers: {
          cookie: `faasr_session=${encodeURIComponent(token)}`,
        },
        body: formData,
      });

      const response = await handleUpload(req);

      assertEquals(response.status, 200);
      const body = await response.json();
      assertEquals(body.success, true);
      assertEquals(body.message, 'Workflow uploaded and registration triggered');
      assertEquals(body.fileName, 'test-workflow.json');
      assertEquals(body.commitSha, 'abc123def456');
      assertEquals(body.workflowRunId, 12345);
      assertEquals(body.workflowRunUrl, 'https://github.com/test/workflows/runs/12345');
    } finally {
      uploadServiceStub.restore();
      githubClientStub.restore();
    }
  } finally {
    restoreEnvState(saved);
  }
});

// ============================================================================
// Success path tests for handleStatus
// ============================================================================

Deno.test('handleStatus - successful status retrieval', async () => {
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

    const mockStatusService = createMockWorkflowStatusService({
      getWorkflowStatus: async () => await Promise.resolve({
        fileName: 'test-workflow.json',
        status: 'success' as const,
        workflowRunId: 12345,
        workflowRunUrl: 'https://github.com/test/workflows/runs/12345',
        errorMessage: null,
        triggeredAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T00:05:00Z',
      }),
    });

    // Stub the service constructor
    const statusServiceStub = stub(
      deps,
      'WorkflowStatusService',
      () => mockStatusService,
    );

    const githubClientStub = stub(
      deps,
      'GitHubClientService',
      () => ({} as unknown as InstanceType<typeof deps.GitHubClientService>),
    );

    try {
      const req = createMockRequest({
        method: 'GET',
        url: 'https://example.com/workflows/status/test-workflow.json',
        headers: {
          cookie: `faasr_session=${encodeURIComponent(token)}`,
        },
      });

      const response = await handleStatus(req, 'test-workflow.json');

      assertEquals(response.status, 200);
      const body = await response.json();
      assertEquals(body.fileName, 'test-workflow.json');
      assertEquals(body.status, 'success');
      assertEquals(body.workflowRunId, 12345);
      assertEquals(body.workflowRunUrl, 'https://github.com/test/workflows/runs/12345');
      assertEquals(body.errorMessage, null);
      assertEquals(body.triggeredAt, '2024-01-01T00:00:00Z');
      assertEquals(body.completedAt, '2024-01-01T00:05:00Z');
    } finally {
      statusServiceStub.restore();
      githubClientStub.restore();
    }
  } finally {
    restoreEnvState(saved);
  }
});

