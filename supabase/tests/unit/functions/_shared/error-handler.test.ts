/**
 * Tests for error handler utilities
 *
 * Tests error message formatting and error response creation
 */

import { assert, assertEquals } from "jsr:@std/assert@1.0.16";
import {
  createAuthErrorResponse,
  createConfigurationErrorResponse,
  createErrorResponse,
  createNotFoundErrorResponse,
  createValidationErrorResponse,
  formatErrorMessage,
  handleGitHubError,
} from "../../../../functions/_shared/error-handler.ts";
import { getCorsHeaders } from "../../../../functions/_shared/cors.ts";

// ============================================================================
// Tests for formatErrorMessage
// ============================================================================

Deno.test("formatErrorMessage - rate limit error", () => {
  const error = new Error("API rate limit exceeded");
  const message = formatErrorMessage(error);

  assertEquals(
    message,
    "Too many requests. Please try again in a few minutes."
  );
});

Deno.test("formatErrorMessage - permission error", () => {
  const error = new Error("Permission denied");
  const message = formatErrorMessage(error);

  assertEquals(
    message,
    "Permission denied. Please check your GitHub App permissions."
  );
});

Deno.test("formatErrorMessage - not found error", () => {
  const error = new Error("Resource not found");
  const message = formatErrorMessage(error);

  assertEquals(
    message,
    "Resource not found. Please check your repository and workflow configuration."
  );
});

Deno.test("formatErrorMessage - generic error returns original message", () => {
  const error = new Error("Something went wrong");
  const message = formatErrorMessage(error);

  assertEquals(message, "Something went wrong");
});

Deno.test("formatErrorMessage - non-Error returns default message", () => {
  const message = formatErrorMessage("string error");

  assertEquals(message, "An error occurred");
});

Deno.test("formatErrorMessage - null returns default message", () => {
  const message = formatErrorMessage(null);

  assertEquals(message, "An error occurred");
});

Deno.test("formatErrorMessage - custom default message", () => {
  const message = formatErrorMessage(null, "Custom error message");

  assertEquals(message, "Custom error message");
});

Deno.test("formatErrorMessage - case insensitive matching", () => {
  const error1 = new Error("RATE LIMIT exceeded");
  const error2 = new Error("Permission DENIED");
  const error3 = new Error("NOT FOUND");

  assertEquals(
    formatErrorMessage(error1),
    "Too many requests. Please try again in a few minutes."
  );
  assertEquals(
    formatErrorMessage(error2),
    "Permission denied. Please check your GitHub App permissions."
  );
  assertEquals(
    formatErrorMessage(error3),
    "Resource not found. Please check your repository and workflow configuration."
  );
});

// ============================================================================
// Tests for handleGitHubError
// ============================================================================

Deno.test("handleGitHubError - Error instance uses formatErrorMessage", () => {
  const error = new Error("rate limit exceeded");
  const message = handleGitHubError(error);

  assertEquals(
    message,
    "Too many requests. Please try again in a few minutes."
  );
});

Deno.test("handleGitHubError - non-Error returns GitHub error message", () => {
  const message = handleGitHubError("string error");

  assertEquals(
    message,
    "An unexpected error occurred while communicating with GitHub."
  );
});

Deno.test("handleGitHubError - null returns GitHub error message", () => {
  const message = handleGitHubError(null);

  assertEquals(
    message,
    "An unexpected error occurred while communicating with GitHub."
  );
});

// ============================================================================
// Tests for createErrorResponse
// ============================================================================

Deno.test("createErrorResponse - creates response with correct status", () => {
  const error = new Error("Test error");
  const response = createErrorResponse(error, 500);

  assertEquals(response.status, 500);
});

Deno.test("createErrorResponse - includes CORS headers", () => {
  const error = new Error("Test error");
  const mockRequest = new Request("http://localhost");
  const response = createErrorResponse(error, 500, undefined, mockRequest);

  const headers = response.headers;
  const expectedCorsHeaders = getCorsHeaders(mockRequest);
  assertEquals(
    headers.get("Access-Control-Allow-Origin"),
    expectedCorsHeaders["Access-Control-Allow-Origin"]
  );
  assertEquals(headers.get("Content-Type"), "application/json");
});

Deno.test(
  "createErrorResponse - includes formatted error message",
  async () => {
    const error = new Error("rate limit exceeded");
    const response = createErrorResponse(error, 429);

    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(
      body.error,
      "Too many requests. Please try again in a few minutes."
    );
  }
);

Deno.test(
  "createErrorResponse - uses default message for non-Error",
  async () => {
    const response = createErrorResponse(null, 500, "Custom default");

    const body = await response.json();
    assertEquals(body.error, "Custom default");
  }
);

Deno.test(
  "createErrorResponse - uses default message when not provided",
  async () => {
    const response = createErrorResponse(null, 500);

    const body = await response.json();
    assertEquals(body.error, "An error occurred");
  }
);

// ============================================================================
// Tests for createAuthErrorResponse
// ============================================================================

Deno.test("createAuthErrorResponse - returns 401 status", () => {
  const response = createAuthErrorResponse();

  assertEquals(response.status, 401);
});

Deno.test(
  "createAuthErrorResponse - includes authentication error message",
  async () => {
    const response = createAuthErrorResponse();

    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(body.error, "Authentication required");
  }
);

Deno.test("createAuthErrorResponse - includes CORS headers", () => {
  const mockRequest = new Request("http://localhost");
  const response = createAuthErrorResponse(mockRequest);

  const headers = response.headers;
  const expectedCorsHeaders = getCorsHeaders(mockRequest);
  assertEquals(
    headers.get("Access-Control-Allow-Origin"),
    expectedCorsHeaders["Access-Control-Allow-Origin"]
  );
});

// ============================================================================
// Tests for createValidationErrorResponse
// ============================================================================

Deno.test("createValidationErrorResponse - returns 400 status", () => {
  const response = createValidationErrorResponse("Validation failed");

  assertEquals(response.status, 400);
});

Deno.test(
  "createValidationErrorResponse - includes error message",
  async () => {
    const response = createValidationErrorResponse("Invalid file format");

    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(body.error, "Invalid file format");
  }
);

Deno.test(
  "createValidationErrorResponse - includes details when provided",
  async () => {
    const details = ["Error 1", "Error 2"];
    const response = createValidationErrorResponse(
      "Validation failed",
      details
    );

    const body = await response.json();
    assertEquals(body.details, details);
  }
);

Deno.test(
  "createValidationErrorResponse - excludes details when not provided",
  async () => {
    const response = createValidationErrorResponse("Validation failed");

    const body = await response.json();
    assert(!("details" in body));
  }
);

Deno.test(
  "createValidationErrorResponse - excludes details when null",
  async () => {
    const response = createValidationErrorResponse("Validation failed", null);

    const body = await response.json();
    assert(!("details" in body));
  }
);

Deno.test("createValidationErrorResponse - includes CORS headers", () => {
  const mockRequest = new Request("http://localhost");
  const response = createValidationErrorResponse(
    "Validation failed",
    undefined,
    mockRequest
  );

  const headers = response.headers;
  const expectedCorsHeaders = getCorsHeaders(mockRequest);
  assertEquals(
    headers.get("Access-Control-Allow-Origin"),
    expectedCorsHeaders["Access-Control-Allow-Origin"]
  );
});

// ============================================================================
// Tests for createNotFoundErrorResponse
// ============================================================================

Deno.test("createNotFoundErrorResponse - returns 404 status", () => {
  const response = createNotFoundErrorResponse("Resource not found");

  assertEquals(response.status, 404);
});

Deno.test("createNotFoundErrorResponse - includes error message", async () => {
  const response = createNotFoundErrorResponse("Workflow not found");

  const body = await response.json();
  assertEquals(body.success, false);
  assertEquals(body.error, "Workflow not found");
});

Deno.test("createNotFoundErrorResponse - includes CORS headers", () => {
  const mockRequest = new Request("http://localhost");
  const response = createNotFoundErrorResponse("Not found", mockRequest);

  const headers = response.headers;
  const expectedCorsHeaders = getCorsHeaders(mockRequest);
  assertEquals(
    headers.get("Access-Control-Allow-Origin"),
    expectedCorsHeaders["Access-Control-Allow-Origin"]
  );
});

// ============================================================================
// Tests for createConfigurationErrorResponse
// ============================================================================

Deno.test("createConfigurationErrorResponse - returns 500 status", () => {
  const response = createConfigurationErrorResponse("Configuration error");

  assertEquals(response.status, 500);
});

Deno.test(
  "createConfigurationErrorResponse - includes error message",
  async () => {
    const response = createConfigurationErrorResponse(
      "GitHub App configuration missing"
    );

    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(body.error, "GitHub App configuration missing");
  }
);

Deno.test("createConfigurationErrorResponse - includes CORS headers", () => {
  const mockRequest = new Request("http://localhost");
  const response = createConfigurationErrorResponse(
    "Configuration error",
    mockRequest
  );

  const headers = response.headers;
  const expectedCorsHeaders = getCorsHeaders(mockRequest);
  assertEquals(
    headers.get("Access-Control-Allow-Origin"),
    expectedCorsHeaders["Access-Control-Allow-Origin"]
  );
});
