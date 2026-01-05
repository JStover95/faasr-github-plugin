/**
 * Tests for Workflow Upload Service
 *
 * Tests file validation, upload workflow, and registration triggering
 */

import { assertEquals, assert, assertRejects } from "jsr:@std/assert@1.0.16";
import { WorkflowUploadService } from "../../../../functions/_shared/workflow-upload-service.ts";
import {
  createTestUserSession,
  createMockGitHubClientService,
  createMockOctokit,
} from "./test-utils.ts";

// ============================================================================
// Tests for validateFile
// ============================================================================

Deno.test("validateFile - calls sanitizeFileName and validateWorkflowFile", () => {
  const githubClient = createMockGitHubClientService();
  const service = new WorkflowUploadService(githubClient);

  const result = service.validateFile(
    "test-workflow.json",
    '{"name": "test"}',
    100
  );

  assertEquals(result.valid, true);
  assertEquals(result.errors, []);
  assertEquals(result.sanitizedFileName, "test-workflow.json");
});

Deno.test("validateFile - returns validation errors", () => {
  const githubClient = createMockGitHubClientService();
  const service = new WorkflowUploadService(githubClient);

  const result = service.validateFile(
    "../invalid.json",
    "{invalid json}",
    100
  );

  assertEquals(result.valid, false);
  assert(result.errors.length > 0);
});

Deno.test("validateFile - sanitizes file name", () => {
  const githubClient = createMockGitHubClientService();
  const service = new WorkflowUploadService(githubClient);

  const result = service.validateFile(
    "../test-workflow.json",
    '{"name": "test"}',
    100
  );

  // File name should be sanitized (path separators removed)
  assert(result.sanitizedFileName.includes("test-workflow.json"));
});

// ============================================================================
// Tests for uploadWorkflow
// ============================================================================

Deno.test("uploadWorkflow - validates configuration", async () => {
  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: false, error: "Missing config" }),
  });
  const service = new WorkflowUploadService(githubClient);
  const session = createTestUserSession();
  const file = new File(['{"name": "test"}'], "test.json");

  await assertRejects(
    async () => {
      await service.uploadWorkflow(session, file, "test.json");
    },
    Error,
    "Missing config"
  );
});

Deno.test("uploadWorkflow - reads file content", async () => {
  const { octokit } = createMockOctokit({
    repos: {
      getContent: () => {
        throw { status: 404 };
      },
      createOrUpdateFileContents: () => ({
        data: { commit: { sha: "abc123" } },
      }),
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowUploadService(githubClient);
  const session = createTestUserSession();
  const file = new File(['{"name": "test"}'], "test.json");

  const result = await service.uploadWorkflow(session, file, "test.json");

  assertEquals(result.fileName, "test.json");
  assertEquals(result.commitSha, "abc123");
});

Deno.test("uploadWorkflow - validates and sanitizes file name", async () => {
  const { octokit } = createMockOctokit({
    repos: {
      getContent: () => {
        throw { status: 404 };
      },
      createOrUpdateFileContents: () => ({
        data: { commit: { sha: "abc123" } },
      }),
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowUploadService(githubClient);
  const session = createTestUserSession();
  // Use a filename with a path separator that will be properly sanitized
  const file = new File(['{"name": "test"}'], "test.json");

  const result = await service.uploadWorkflow(session, file, "./test.json");

  // File name should be sanitized (path separator removed)
  assertEquals(result.fileName, "test.json");
  assert(!result.fileName.includes("/"));
  assert(!result.fileName.includes("\\"));
});

Deno.test("uploadWorkflow - commits file to repository", async () => {
  let commitCalled = false;
  const { octokit } = createMockOctokit({
    repos: {
      getContent: () => {
        throw { status: 404 };
      },
      createOrUpdateFileContents: () => {
        commitCalled = true;
        return { data: { commit: { sha: "abc123" } } };
      },
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowUploadService(githubClient);
  const session = createTestUserSession();
  const file = new File(['{"name": "test"}'], "test.json");

  await service.uploadWorkflow(session, file, "test.json");

  assertEquals(commitCalled, true);
});

Deno.test("uploadWorkflow - throws on validation failure", async () => {
  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => {
      const { octokit } = createMockOctokit();
      return Promise.resolve(octokit);
    },
  });
  const service = new WorkflowUploadService(githubClient);
  const session = createTestUserSession();
  const file = new File(['{invalid json}'], "test.json");

  await assertRejects(
    async () => {
      await service.uploadWorkflow(session, file, "test.json");
    },
    Error,
    "Invalid file"
  );
});

Deno.test("uploadWorkflow - throws on missing configuration", async () => {
  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: false, error: "Config missing" }),
  });
  const service = new WorkflowUploadService(githubClient);
  const session = createTestUserSession();
  const file = new File(['{"name": "test"}'], "test.json");

  await assertRejects(
    async () => {
      await service.uploadWorkflow(session, file, "test.json");
    },
    Error,
    "Config missing"
  );
});

// ============================================================================
// Tests for triggerRegistration
// ============================================================================

Deno.test("triggerRegistration - validates configuration", async () => {
  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: false, error: "Missing config" }),
  });
  const service = new WorkflowUploadService(githubClient);
  const session = createTestUserSession();

  await assertRejects(
    async () => {
      await service.triggerRegistration(session, "test.json");
    },
    Error,
    "Missing config"
  );
});

Deno.test("triggerRegistration - triggers workflow dispatch", async () => {
  let dispatchCalled = false;
  const { octokit } = createMockOctokit({
    actions: {
      createWorkflowDispatch: () => {
        dispatchCalled = true;
      },
      listWorkflowRuns: () => ({
        data: { workflow_runs: [] },
      }),
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowUploadService(githubClient);
  const session = createTestUserSession();

  await service.triggerRegistration(session, "test.json");

  assertEquals(dispatchCalled, true);
});

Deno.test("triggerRegistration - retrieves workflow run ID from list", async () => {
  const { octokit } = createMockOctokit({
    actions: {
      createWorkflowDispatch: () => {},
      listWorkflowRuns: () => ({
        data: {
          workflow_runs: [
            {
              id: 123,
              html_url: "https://github.com/test/workflows/runs/123",
              status: "queued",
              conclusion: null,
              created_at: "2025-01-01T00:00:00Z",
            },
          ],
        },
      }),
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowUploadService(githubClient);
  const session = createTestUserSession();

  const result = await service.triggerRegistration(session, "test.json");

  assertEquals(result.workflowRunId, 123);
  assertEquals(result.workflowRunUrl, "https://github.com/test/workflows/runs/123");
});

Deno.test("triggerRegistration - handles dispatch failures gracefully", async () => {
  const { octokit } = createMockOctokit({
    actions: {
      createWorkflowDispatch: () => {
        throw new Error("Dispatch failed");
      },
      listWorkflowRuns: () => ({
        data: { workflow_runs: [] },
      }),
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowUploadService(githubClient);
  const session = createTestUserSession();

  // Should not throw, but return result without run ID
  const result = await service.triggerRegistration(session, "test.json");

  assertEquals(result.workflowRunId, undefined);
  assertEquals(result.workflowRunUrl, undefined);
});

Deno.test("triggerRegistration - handles missing run ID gracefully", async () => {
  const { octokit } = createMockOctokit({
    actions: {
      createWorkflowDispatch: () => {},
      listWorkflowRuns: () => ({
        data: { workflow_runs: [] },
      }),
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowUploadService(githubClient);
  const session = createTestUserSession();

  const result = await service.triggerRegistration(session, "test.json");

  assertEquals(result.workflowRunId, undefined);
  assertEquals(result.workflowRunUrl, undefined);
});

Deno.test("triggerRegistration - handles listWorkflowRuns error gracefully", async () => {
  const { octokit } = createMockOctokit({
    actions: {
      createWorkflowDispatch: () => {},
      listWorkflowRuns: () => {
        throw new Error("Failed to list runs");
      },
    },
  });

  const githubClient = createMockGitHubClientService({
    validateConfiguration: () => ({ valid: true }),
    getAuthenticatedOctokit: () => Promise.resolve(octokit),
  });
  const service = new WorkflowUploadService(githubClient);
  const session = createTestUserSession();

  // Should not throw, but return result without run ID
  const result = await service.triggerRegistration(session, "test.json");

  assertEquals(result.workflowRunId, undefined);
  assertEquals(result.workflowRunUrl, undefined);
});


