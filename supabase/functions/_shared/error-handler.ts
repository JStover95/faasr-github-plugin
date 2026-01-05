/**
 * Error Handler Utility
 *
 * Provides centralized error handling and user-friendly error message formatting.
 * Converts technical errors into user-friendly messages for API responses.
 */

import { corsHeaders } from './cors.ts';

/**
 * Format error message to be user-friendly
 *
 * @param error - Error object or unknown error
 * @param defaultMessage - Default message if error cannot be formatted
 * @returns User-friendly error message
 */
export function formatErrorMessage(
  error: unknown,
  defaultMessage: string = 'An error occurred',
): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('rate limit')) {
      return 'Too many requests. Please try again in a few minutes.';
    }

    if (message.includes('permission')) {
      return 'Permission denied. Please check your GitHub App permissions.';
    }

    if (message.includes('not found')) {
      return 'Resource not found. Please check your repository and workflow configuration.';
    }

    // Return the original error message if it's already user-friendly
    return error.message;
  }

  return defaultMessage;
}

/**
 * Handle GitHub API-specific errors
 *
 * @param error - Unknown error that might be from GitHub API
 * @returns Formatted error message
 */
export function handleGitHubError(error: unknown): string {
  if (error instanceof Error) {
    return formatErrorMessage(error, 'GitHub API error occurred');
  }

  return 'An unexpected error occurred while communicating with GitHub.';
}

/**
 * Create standardized error response
 *
 * @param error - Error object or unknown error
 * @param status - HTTP status code
 * @param defaultMessage - Default error message
 * @returns HTTP Response with error details
 */
export function createErrorResponse(
  error: unknown,
  status: number,
  defaultMessage: string = 'An error occurred',
): Response {
  const errorMessage = formatErrorMessage(error, defaultMessage);

  return new Response(
    JSON.stringify({
      success: false,
      error: errorMessage,
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

/**
 * Create authentication error response
 *
 * @returns HTTP Response for authentication errors
 */
export function createAuthErrorResponse(): Response {
  return createErrorResponse(
    new Error('Authentication required'),
    401,
    'Authentication required',
  );
}

/**
 * Create validation error response
 *
 * @param error - Error message or validation errors
 * @param details - Optional additional error details
 * @returns HTTP Response for validation errors
 */
export function createValidationErrorResponse(
  error: string,
  details?: unknown,
): Response {
  const responseBody: Record<string, unknown> = {
    success: false,
    error,
  };

  if (details !== undefined && details !== null) {
    responseBody.details = details;
  }

  return new Response(
    JSON.stringify(responseBody),
    {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

/**
 * Create not found error response
 *
 * @param error - Error message
 * @returns HTTP Response for not found errors
 */
export function createNotFoundErrorResponse(error: string): Response {
  // Use the error message directly without formatting
  return new Response(
    JSON.stringify({
      success: false,
      error,
    }),
    {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

/**
 * Create configuration error response
 *
 * @param error - Error message
 * @returns HTTP Response for configuration errors
 */
export function createConfigurationErrorResponse(error: string): Response {
  // Use the error message directly without formatting
  return new Response(
    JSON.stringify({
      success: false,
      error,
    }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}
