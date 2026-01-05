/**
 * Integration test for complete upload flow
 *
 * Tests the end-to-end flow from file upload to workflow trigger:
 * 1. Authenticated user uploads workflow JSON file → POST /workflows/upload
 * 2. File is validated (JSON syntax, file name, size)
 * 3. File is committed to user's fork
 * 4. Registration workflow is triggered
 * 5. Status can be retrieved → GET /workflows/status/{fileName}
 */

import { assert, assertEquals } from 'jsr:@std/assert@1.0.16';
import { stub } from 'jsr:@std/testing@1.0.16/mock';
import {
  deps,
  handleStatus,
  handleUpload,
} from '../../functions/workflows/index.ts';
import {
  createMockRequest,
  createMockWorkflowStatusService,
  createMockWorkflowUploadService,
  createTestUserSession,
  restoreEnvState,
  saveEnvState,
} from '../unit/functions/_shared/test-utils.ts';
import { jwt } from '../../functions/_shared/deps.ts';

Deno.test('Integration: Complete upload flow from file upload to workflow trigger', async () => {
  const saved = saveEnvState(['JWT_SECRET']);

  try {
    Deno.env.set('JWT_SECRET', 'test-secret-key');

    // Create authenticated session
    const session = createTestUserSession();
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

    // Create mock services
    const mockUploadService = createMockWorkflowUploadService({
      uploadWorkflow: async () =>
        await Promise.resolve({
          fileName: 'test-workflow.json',
          commitSha: 'abc123def456',
        }),
      triggerRegistration: async () =>
        await Promise.resolve({
          workflowRunId: 12345,
          workflowRunUrl: 'https://github.com/test/workflows/runs/12345',
        }),
    });

    const mockStatusService = createMockWorkflowStatusService({
      getWorkflowStatus: async () =>
        await Promise.resolve({
          fileName: 'test-workflow.json',
          status: 'running' as const,
          workflowRunId: 12345,
          workflowRunUrl: 'https://github.com/test/workflows/runs/12345',
          errorMessage: null,
          triggeredAt: '2024-01-01T00:00:00Z',
          completedAt: null,
        }),
    });

    // Stub service constructors
    const uploadServiceStub = stub(
      deps,
      'WorkflowUploadService',
      () => mockUploadService,
    );

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
      // Step 1: User uploads workflow JSON file → POST /workflows/upload
      const formData = new FormData();
      const file = new File(
        ['{"name": "test-workflow", "version": "1.0"}'],
        'test-workflow.json',
        {
          type: 'application/json',
        },
      );
      formData.append('file', file);

      const uploadReq = createMockRequest({
        method: 'POST',
        url: 'https://example.com/workflows/upload',
        headers: {
          cookie: `faasr_session=${encodeURIComponent(token)}`,
        },
        body: formData,
      });

      const uploadResponse = await handleUpload(uploadReq);

      // Step 2: Verify upload was successful
      assertEquals(uploadResponse.status, 200);
      const uploadBody = await uploadResponse.json();
      assertEquals(uploadBody.success, true);
      assertEquals(
        uploadBody.message,
        'Workflow uploaded and registration triggered',
      );
      assertEquals(uploadBody.fileName, 'test-workflow.json');
      assertEquals(uploadBody.commitSha, 'abc123def456');
      assertEquals(uploadBody.workflowRunId, 12345);

      // Step 3: Verify file was committed and workflow was triggered
      // (This is verified by the mock service being called)
      assert(uploadServiceStub.calls.length > 0);

      // Step 4: Retrieve workflow status → GET /workflows/status/{fileName}
      const statusReq = createMockRequest({
        method: 'GET',
        url: 'https://example.com/workflows/status/test-workflow.json',
        headers: {
          cookie: `faasr_session=${encodeURIComponent(token)}`,
        },
      });

      const statusResponse = await handleStatus(
        statusReq,
        'test-workflow.json',
      );

      // Step 5: Verify status retrieval
      assertEquals(statusResponse.status, 200);
      const statusBody = await statusResponse.json();
      assertEquals(statusBody.fileName, 'test-workflow.json');
      assertEquals(statusBody.status, 'running');
      assertEquals(statusBody.workflowRunId, 12345);
      assert(statusBody.workflowRunUrl !== null);
    } finally {
      uploadServiceStub.restore();
      statusServiceStub.restore();
      githubClientStub.restore();
    }
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test('Integration: Upload flow handles validation errors gracefully', async () => {
  const saved = saveEnvState(['JWT_SECRET']);

  try {
    Deno.env.set('JWT_SECRET', 'test-secret-key');

    const session = createTestUserSession();
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

    // Mock service that throws validation error
    const mockUploadService = createMockWorkflowUploadService({
      uploadWorkflow: () => {
        throw new Error('Invalid file: Invalid JSON format, File too large');
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

      const uploadReq = createMockRequest({
        method: 'POST',
        url: 'https://example.com/workflows/upload',
        headers: {
          cookie: `faasr_session=${encodeURIComponent(token)}`,
        },
        body: formData,
      });

      const uploadResponse = await handleUpload(uploadReq);

      // Should return validation error
      assertEquals(uploadResponse.status, 400);
      const uploadBody = await uploadResponse.json();
      assertEquals(uploadBody.success, false);
      assertEquals(uploadBody.error, 'Invalid file');
      assert(Array.isArray(uploadBody.details));
    } finally {
      uploadServiceStub.restore();
      githubClientStub.restore();
    }
  } finally {
    restoreEnvState(saved);
  }
});

Deno.test('Integration: Upload flow handles workflow status polling', async () => {
  const saved = saveEnvState(['JWT_SECRET']);

  try {
    Deno.env.set('JWT_SECRET', 'test-secret-key');

    const session = createTestUserSession();
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

    // Mock status service that returns different statuses over time
    let statusCallCount = 0;
    const mockStatusService = createMockWorkflowStatusService({
      getWorkflowStatus: async () => {
        statusCallCount++;
        if (statusCallCount === 1) {
          return await Promise.resolve({
            fileName: 'test-workflow.json',
            status: 'running' as const,
            workflowRunId: 12345,
            workflowRunUrl: 'https://github.com/test/workflows/runs/12345',
            errorMessage: null,
            triggeredAt: '2024-01-01T00:00:00Z',
            completedAt: null,
          });
        } else {
          return await Promise.resolve({
            fileName: 'test-workflow.json',
            status: 'success' as const,
            workflowRunId: 12345,
            workflowRunUrl: 'https://github.com/test/workflows/runs/12345',
            errorMessage: null,
            triggeredAt: '2024-01-01T00:00:00Z',
            completedAt: '2024-01-01T00:05:00Z',
          });
        }
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
      // First status check - workflow is running
      const statusReq1 = createMockRequest({
        method: 'GET',
        url: 'https://example.com/workflows/status/test-workflow.json',
        headers: {
          cookie: `faasr_session=${encodeURIComponent(token)}`,
        },
      });

      const statusResponse1 = await handleStatus(
        statusReq1,
        'test-workflow.json',
      );

      assertEquals(statusResponse1.status, 200);
      const statusBody1 = await statusResponse1.json();
      assertEquals(statusBody1.status, 'running');
      assertEquals(statusBody1.completedAt, null);

      // Second status check - workflow completed successfully
      const statusResponse2 = await handleStatus(
        statusReq1,
        'test-workflow.json',
      );

      assertEquals(statusResponse2.status, 200);
      const statusBody2 = await statusResponse2.json();
      assertEquals(statusBody2.status, 'success');
      assert(statusBody2.completedAt !== null);
    } finally {
      statusServiceStub.restore();
      githubClientStub.restore();
    }
  } finally {
    restoreEnvState(saved);
  }
});

