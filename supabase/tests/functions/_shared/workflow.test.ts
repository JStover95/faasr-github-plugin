/**
 * Tests for workflow utilities
 *
 * Tests file validation, commit, and workflow dispatch functions
 */

import { assertEquals, assert } from "jsr:@std/assert@1.0.16";
import {
  validateWorkflowFile,
  sanitizeFileName,
  commitFileToRepository,
  triggerWorkflowDispatch,
  getWorkflowRunStatus,
  getWorkflowRunById,
} from "../../../functions/_shared/workflow.ts";
import { createMockOctokit } from "./test-utils.ts";

// ============================================================================
// Tests for validateWorkflowFile
// ============================================================================

Deno.test("validateWorkflowFile - valid file", () => {
  const result = validateWorkflowFile(
    "my-workflow.json",
    '{"name": "test"}',
    100
  );

  assertEquals(result.valid, true);
  assertEquals(result.errors, []);
});

Deno.test("validateWorkflowFile - valid file with hyphens and underscores", () => {
  const result = validateWorkflowFile(
    "my_workflow-file.json",
    '{"name": "test"}',
    100
  );

  assertEquals(result.valid, true);
  assertEquals(result.errors, []);
});

Deno.test("validateWorkflowFile - path traversal attempt with ../", () => {
  const result = validateWorkflowFile(
    "../file.json",
    '{"name": "test"}',
    100
  );

  assertEquals(result.valid, false);
  assert(result.errors.some((e) => e.includes("path separators")));
});

Deno.test("validateWorkflowFile - path traversal attempt with ./", () => {
  const result = validateWorkflowFile(
    "./file.json",
    '{"name": "test"}',
    100
  );

  assertEquals(result.valid, false);
  assert(result.errors.some((e) => e.includes("path separators")));
});

Deno.test("validateWorkflowFile - path traversal with backslash", () => {
  const result = validateWorkflowFile(
    "..\\file.json",
    '{"name": "test"}',
    100
  );

  assertEquals(result.valid, false);
  assert(result.errors.some((e) => e.includes("path separators")));
});

Deno.test("validateWorkflowFile - wrong extension .txt", () => {
  const result = validateWorkflowFile(
    "file.txt",
    '{"name": "test"}',
    100
  );

  assertEquals(result.valid, false);
  assert(result.errors.some((e) => e.includes(".json extension")));
});

Deno.test("validateWorkflowFile - wrong extension .js", () => {
  const result = validateWorkflowFile(
    "file.js",
    '{"name": "test"}',
    100
  );

  assertEquals(result.valid, false);
  assert(result.errors.some((e) => e.includes(".json extension")));
});

Deno.test("validateWorkflowFile - invalid characters (spaces)", () => {
  const result = validateWorkflowFile(
    "my workflow.json",
    '{"name": "test"}',
    100
  );

  assertEquals(result.valid, false);
  assert(
    result.errors.some((e) =>
      e.includes("letters, numbers, hyphens, and underscores")
    )
  );
});

Deno.test("validateWorkflowFile - invalid characters (special chars)", () => {
  const result = validateWorkflowFile(
    "my@workflow.json",
    '{"name": "test"}',
    100
  );

  assertEquals(result.valid, false);
  assert(
    result.errors.some((e) =>
      e.includes("letters, numbers, hyphens, and underscores")
    )
  );
});

Deno.test("validateWorkflowFile - empty file name", () => {
  const result = validateWorkflowFile("", '{"name": "test"}', 100);

  assertEquals(result.valid, false);
  assert(result.errors.some((e) => e.includes("required")));
});

Deno.test("validateWorkflowFile - null file name", () => {
  const result = validateWorkflowFile(
    null as unknown as string,
    '{"name": "test"}',
    100
  );

  assertEquals(result.valid, false);
  assert(result.errors.some((e) => e.includes("required")));
});

Deno.test("validateWorkflowFile - file size exactly at limit", () => {
  const maxSize = 1024 * 1024; // 1MB
  const largeContent = "x".repeat(maxSize);
  const jsonContent = JSON.stringify({ data: largeContent });

  const result = validateWorkflowFile("file.json", jsonContent, maxSize);

  assertEquals(result.valid, true);
});

Deno.test("validateWorkflowFile - file size exceeds limit", () => {
  const maxSize = 1024 * 1024; // 1MB
  const largeContent = "x".repeat(maxSize + 1);
  const jsonContent = JSON.stringify({ data: largeContent });

  const result = validateWorkflowFile("file.json", jsonContent, maxSize + 1);

  assertEquals(result.valid, false);
  assert(result.errors.some((e) => e.includes("exceeds maximum")));
});

Deno.test("validateWorkflowFile - invalid JSON syntax", () => {
  const result = validateWorkflowFile(
    "file.json",
    '{"name": "test",}', // trailing comma
    100
  );

  assertEquals(result.valid, false);
  assert(result.errors.some((e) => e.includes("Invalid JSON")));
});

Deno.test("validateWorkflowFile - malformed JSON", () => {
  const result = validateWorkflowFile("file.json", "{name: test}", 100);

  assertEquals(result.valid, false);
  assert(result.errors.some((e) => e.includes("Invalid JSON")));
});

Deno.test("validateWorkflowFile - multiple validation errors", () => {
  const result = validateWorkflowFile(
    "../file.txt",
    "{invalid json}",
    1024 * 1024 + 1
  );

  assertEquals(result.valid, false);
  assert(result.errors.length > 1);
});

// ============================================================================
// Tests for sanitizeFileName
// ============================================================================

Deno.test("sanitizeFileName - removes path traversal", () => {
  // The function removes / and \ and leading dots, so ../ becomes file.json
  const result = sanitizeFileName("../file.json");
  assertEquals(result, "file.json");
});

Deno.test("sanitizeFileName - removes multiple path separators", () => {
  // The function removes / and \ and leading dots
  const result = sanitizeFileName("../../file.json");
  assertEquals(result, "file.json");
});

Deno.test("sanitizeFileName - removes backslash separators", () => {
  // The function removes / and \ and leading dots
  const result = sanitizeFileName("..\\file.json");
  assertEquals(result, "file.json");
});

Deno.test("sanitizeFileName - removes invalid characters", () => {
  const result = sanitizeFileName("my@file#name.json");
  assertEquals(result, "myfilename.json");
});

Deno.test("sanitizeFileName - ensures .json extension", () => {
  const result = sanitizeFileName("file");
  assertEquals(result, "file.json");
});

Deno.test("sanitizeFileName - already sanitized file", () => {
  const result = sanitizeFileName("my-workflow.json");
  assertEquals(result, "my-workflow.json");
});

Deno.test("sanitizeFileName - preserves valid characters", () => {
  const result = sanitizeFileName("my_workflow-file.json");
  assertEquals(result, "my_workflow-file.json");
});

// ============================================================================
// Tests for commitFileToRepository
// ============================================================================

Deno.test("commitFileToRepository - create new file", async () => {
  const { octokit } = createMockOctokit({
    repos: {
      getContent: () => {
        throw { status: 404 }; // File doesn't exist
      },
      createOrUpdateFileContents: () => ({
        data: {
          commit: {
            sha: "abc123",
          },
        },
      }),
    },
  });

  const commitSha = await commitFileToRepository(
    octokit,
    "testuser",
    "FaaSr-workflow",
    "workflow.json",
    '{"name": "test"}',
    "main"
  );

  assertEquals(commitSha, "abc123");
});

Deno.test("commitFileToRepository - update existing file", async () => {
  const { octokit } = createMockOctokit({
    repos: {
      getContent: () => ({
        data: {
          sha: "existing-sha",
        },
      }),
      createOrUpdateFileContents: () => ({
        data: {
          commit: {
            sha: "new-commit-sha",
          },
        },
      }),
    },
  });

  const commitSha = await commitFileToRepository(
    octokit,
    "testuser",
    "FaaSr-workflow",
    "workflow.json",
    '{"name": "updated"}',
    "main"
  );

  assertEquals(commitSha, "new-commit-sha");
});

Deno.test("commitFileToRepository - custom commit message", async () => {
  let capturedMessage = "";
  const { octokit } = createMockOctokit({
    repos: {
      getContent: () => {
        throw { status: 404 };
      },
      createOrUpdateFileContents: (params) => {
        capturedMessage = params.message;
        return {
          data: {
            commit: {
              sha: "abc123",
            },
          },
        };
      },
    },
  });

  await commitFileToRepository(
    octokit,
    "testuser",
    "FaaSr-workflow",
    "workflow.json",
    '{"name": "test"}',
    "main",
    "Custom commit message"
  );

  assertEquals(capturedMessage, "Custom commit message");
});

Deno.test("commitFileToRepository - default commit message", async () => {
  let capturedMessage = "";
  const { octokit } = createMockOctokit({
    repos: {
      getContent: () => {
        throw { status: 404 };
      },
      createOrUpdateFileContents: (params) => {
        capturedMessage = params.message;
        return {
          data: {
            commit: {
              sha: "abc123",
            },
          },
        };
      },
    },
  });

  await commitFileToRepository(
    octokit,
    "testuser",
    "FaaSr-workflow",
    "workflow.json",
    '{"name": "test"}',
    "main"
  );

  assert(capturedMessage.includes("Add workflow file"));
  assert(capturedMessage.includes("workflow.json"));
});

Deno.test("commitFileToRepository - error on non-404 during SHA fetch", async () => {
  const { octokit } = createMockOctokit({
    repos: {
      getContent: () => {
        const error: unknown = { status: 500 };
        throw error;
      },
    },
  });

  // The function throws the error object directly, not an Error instance
  let errorThrown = false;
  try {
    await commitFileToRepository(
      octokit,
      "testuser",
      "FaaSr-workflow",
      "workflow.json",
      '{"name": "test"}',
      "main"
    );
  } catch (error) {
    errorThrown = true;
    assert(error && typeof error === "object" && "status" in error);
    assertEquals((error as { status: number }).status, 500);
  }
  assert(errorThrown, "Should throw on non-404 error");
});

Deno.test("commitFileToRepository - error when commit fails", async () => {
  const { octokit } = createMockOctokit({
    repos: {
      getContent: () => {
        throw { status: 404 };
      },
      createOrUpdateFileContents: () => {
        throw { status: 403 };
      },
    },
  });

  // The function throws the error object directly, not an Error instance
  let errorThrown = false;
  try {
    await commitFileToRepository(
      octokit,
      "testuser",
      "FaaSr-workflow",
      "workflow.json",
      '{"name": "test"}',
      "main"
    );
  } catch (error) {
    errorThrown = true;
    assert(error && typeof error === "object" && "status" in error);
    assertEquals((error as { status: number }).status, 403);
  }
  assert(errorThrown, "Should throw when commit fails");
});

// ============================================================================
// Tests for triggerWorkflowDispatch
// ============================================================================

Deno.test("triggerWorkflowDispatch - with inputs", async () => {
  let capturedInputs: Record<string, string> | undefined;
  const { octokit } = createMockOctokit({
    actions: {
      createWorkflowDispatch: (params) => {
        capturedInputs = params.inputs;
      },
    },
  });

  await triggerWorkflowDispatch(
    octokit,
    "testuser",
    "FaaSr-workflow",
    "register-workflow.yml",
    "main",
    { workflowFile: "test.json" }
  );

  assertEquals(capturedInputs, { workflowFile: "test.json" });
});

Deno.test("triggerWorkflowDispatch - without inputs", async () => {
  let capturedInputs: Record<string, string> | undefined;
  const { octokit } = createMockOctokit({
    actions: {
      createWorkflowDispatch: (params) => {
        capturedInputs = params.inputs;
      },
    },
  });

  await triggerWorkflowDispatch(
    octokit,
    "testuser",
    "FaaSr-workflow",
    "register-workflow.yml",
    "main"
  );

  assertEquals(capturedInputs, {});
});

Deno.test("triggerWorkflowDispatch - error when workflow not found", async () => {
  const { octokit } = createMockOctokit({
    actions: {
      createWorkflowDispatch: () => {
        throw { status: 404 };
      },
    },
  });

  // The function throws the error object directly, not an Error instance
  let errorThrown = false;
  try {
    await triggerWorkflowDispatch(
      octokit,
      "testuser",
      "FaaSr-workflow",
      "nonexistent.yml",
      "main"
    );
  } catch (error) {
    errorThrown = true;
    assert(error && typeof error === "object" && "status" in error);
    assertEquals((error as { status: number }).status, 404);
  }
  assert(errorThrown, "Should throw when workflow not found");
});

Deno.test("triggerWorkflowDispatch - error on permission denied", async () => {
  const { octokit } = createMockOctokit({
    actions: {
      createWorkflowDispatch: () => {
        throw { status: 403 };
      },
    },
  });

  // The function throws the error object directly, not an Error instance
  let errorThrown = false;
  try {
    await triggerWorkflowDispatch(
      octokit,
      "testuser",
      "FaaSr-workflow",
      "register-workflow.yml",
      "main"
    );
  } catch (error) {
    errorThrown = true;
    assert(error && typeof error === "object" && "status" in error);
    assertEquals((error as { status: number }).status, 403);
  }
  assert(errorThrown, "Should throw on permission denied");
});

// ============================================================================
// Tests for getWorkflowRunStatus
// ============================================================================

Deno.test("getWorkflowRunStatus - pending status", async () => {
  const { octokit } = createMockOctokit({
    actions: {
      getWorkflowRun: () => ({
        data: {
          status: "queued",
          conclusion: null,
          html_url: "https://github.com/testuser/FaaSr-workflow/actions/runs/123",
          created_at: "2025-01-01T00:00:00Z",
        },
      }),
    },
  });

  const status = await getWorkflowRunStatus(octokit, "testuser", "FaaSr-workflow", 123);
  assertEquals(status.status, "pending");
  assertEquals(status.conclusion, null);
  assertEquals(
    status.htmlUrl,
    "https://github.com/testuser/FaaSr-workflow/actions/runs/123"
  );
});

Deno.test("getWorkflowRunStatus - running status", async () => {
  const { octokit } = createMockOctokit({
    actions: {
      getWorkflowRun: () => ({
        data: {
          status: "in_progress",
          conclusion: null,
          html_url: "https://github.com/testuser/FaaSr-workflow/actions/runs/123",
          created_at: "2025-01-01T00:00:00Z",
        },
      }),
    },
  });

  const status = await getWorkflowRunStatus(octokit, "testuser", "FaaSr-workflow", 123);
  assertEquals(status.status, "running");
});

Deno.test("getWorkflowRunStatus - success conclusion", async () => {
  const { octokit } = createMockOctokit({
    actions: {
      getWorkflowRun: () => ({
        data: {
          status: "completed",
          conclusion: "success",
          html_url: "https://github.com/testuser/FaaSr-workflow/actions/runs/123",
          created_at: "2025-01-01T00:00:00Z",
        },
      }),
    },
  });

  const status = await getWorkflowRunStatus(octokit, "testuser", "FaaSr-workflow", 123);
  assertEquals(status.status, "success");
  assertEquals(status.conclusion, "success");
});

Deno.test("getWorkflowRunStatus - failed conclusion", async () => {
  const { octokit } = createMockOctokit({
    actions: {
      getWorkflowRun: () => ({
        data: {
          status: "completed",
          conclusion: "failure",
          html_url: "https://github.com/testuser/FaaSr-workflow/actions/runs/123",
          created_at: "2025-01-01T00:00:00Z",
        },
      }),
    },
  });

  const status = await getWorkflowRunStatus(octokit, "testuser", "FaaSr-workflow", 123);
  assertEquals(status.status, "failed");
  assertEquals(status.conclusion, "failure");
});

// ============================================================================
// Tests for getWorkflowRunById
// ============================================================================

Deno.test("getWorkflowRunById - success with valid run ID", async () => {
  const { octokit } = createMockOctokit({
    actions: {
      getWorkflowRun: () => ({
        data: {
          status: "completed",
          conclusion: "success",
          html_url: "https://github.com/testuser/FaaSr-workflow/actions/runs/123",
          created_at: "2025-01-01T00:00:00Z",
        },
      }),
    },
  });

  const run = await getWorkflowRunById(octokit, "testuser", "FaaSr-workflow", 123);
  assert(run !== null);
  if (run) {
    assertEquals(run.id, 123);
    assertEquals(run.status, "success");
    assertEquals(run.conclusion, "success");
    assertEquals(
      run.htmlUrl,
      "https://github.com/testuser/FaaSr-workflow/actions/runs/123"
    );
  }
});

Deno.test("getWorkflowRunById - returns null when run not found", async () => {
  const { octokit } = createMockOctokit({
    actions: {
      getWorkflowRun: () => {
        throw { status: 404 };
      },
    },
  });

  const run = await getWorkflowRunById(octokit, "testuser", "FaaSr-workflow", 999);
  assertEquals(run, null);
});

Deno.test("getWorkflowRunById - throws on other errors", async () => {
  const { octokit } = createMockOctokit({
    actions: {
      getWorkflowRun: () => {
        throw { status: 500 };
      },
    },
  });

  // The function throws the error object directly, not an Error instance
  let errorThrown = false;
  try {
    await getWorkflowRunById(octokit, "testuser", "FaaSr-workflow", 123);
  } catch (error) {
    errorThrown = true;
    assert(error && typeof error === "object" && "status" in error);
    assertEquals((error as { status: number }).status, 500);
  }
  assert(errorThrown, "Should throw on non-404 errors");
});

